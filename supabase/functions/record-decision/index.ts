/**
 * /v1/record-decision - Phase 3 server-owned human decision append.
 *
 * The browser submits intent only. Every field that carries authority is
 * derived here: approver identity, tenant, timestamp, the canonical evidence
 * snapshot (read from the persisted run, not from the caller), the snapshot
 * hash, the decision record hash and the prior-record hash link.
 *
 * The append is rejected when the run does not exist, belongs to another
 * tenant, is an unpersisted preview receiving an authoritative approval, the
 * caller's expected hash is stale, or an idempotency key is reused for
 * different content.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHandler } from "../_shared/handler.ts";
import { EVIDENCE_SCHEMA_VERSION, canonicalHash } from "../_shared/canonicalHash.ts";

const InputSchema = z.object({
  runId: z.string().uuid(),
  recommendationId: z.string().min(1).max(200),
  outcome: z.enum(["approved", "rejected", "escalated"]),
  rationale: z.string().min(10).max(4000),
  comment: z.string().max(4000).nullable().optional(),
  escalatedTo: z.string().max(200).nullable().optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
  /** Conflict detection: the output hash the operator saw. */
  expectedOutputHash: z.string().max(200).nullable().optional(),
  supersedesDecisionId: z.string().uuid().nullable().optional(),
});

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

serve(
  createHandler({
    name: "record-decision",
    authLevel: "user",
    inputSchema: InputSchema,
    handler: async (input, context) => {
      const { userId, user, supabase, log } = context;
      if (!userId) throw { code: "UNAUTHORIZED", message: "Sign-in required", status: 401 };
      const svc = admin();

      // Canonical run, read through the caller's RLS scope so cross-tenant
      // ids fail closed before any privileged work happens.
      const { data: run, error: runError } = await supabase
        .from("simulation_runs")
        .select(
          "id, user_id, tenant_id, twin_id, lifecycle_status, run_intent, verification_level, " +
            "actual_provider, requested_provider, provider_version, outcome_execution_class, " +
            "input_hash, configuration_hash, output_hash, telemetry_snapshot_id, " +
            "telemetry_snapshot_hash, external_job_id, failure_code, failure_message, " +
            "canonical_schema_version, final_kpis, metric_provenance, server_created_at, finished_at",
        )
        .eq("id", input.runId)
        .maybeSingle();
      if (runError || !run) {
        throw { code: "NOT_FOUND", message: "Run not found for this account", status: 404 };
      }
      if (run.user_id !== userId) {
        throw { code: "FORBIDDEN", message: "Run belongs to another tenant", status: 403 };
      }
      if (run.lifecycle_status !== "succeeded") {
        throw {
          code: "CONFLICT",
          message: `Run is ${run.lifecycle_status}; required evidence is missing.`,
          status: 409,
        };
      }
      // An unverified preview may be annotated, never authoritatively approved.
      if (input.outcome === "approved" && run.run_intent !== "authoritative") {
        throw {
          code: "FORBIDDEN",
          message:
            "This run is an unverified preview. It can be commented on or escalated, but not approved.",
          status: 403,
        };
      }
      if (
        input.expectedOutputHash !== undefined &&
        input.expectedOutputHash !== null &&
        input.expectedOutputHash !== run.output_hash
      ) {
        throw {
          code: "CONFLICT",
          message: "The evidence changed since it was displayed. Reload before deciding.",
          status: 409,
        };
      }

      // Server-authored evidence snapshot: taken from the persisted run.
      const snapshotBody = {
        evidence_schema_version: EVIDENCE_SCHEMA_VERSION,
        run_id: run.id,
        twin_id: run.twin_id,
        lifecycle_status: run.lifecycle_status,
        run_intent: run.run_intent,
        verification_level: run.verification_level,
        requested_provider: run.requested_provider,
        actual_provider: run.actual_provider,
        provider_version: run.provider_version,
        outcome_execution_class: run.outcome_execution_class,
        canonical_schema_version: run.canonical_schema_version,
        input_hash: run.input_hash,
        configuration_hash: run.configuration_hash,
        output_hash: run.output_hash,
        telemetry_snapshot_id: run.telemetry_snapshot_id,
        telemetry_snapshot_hash: run.telemetry_snapshot_hash,
        external_job_id: run.external_job_id,
        failure_code: run.failure_code,
        failure_message: run.failure_message,
        final_kpis: run.final_kpis,
        metric_provenance: run.metric_provenance,
        recommendation_id: input.recommendationId,
      };
      const snapshotHash = await canonicalHash(snapshotBody);
      const decidedAt = new Date().toISOString();

      if (input.idempotencyKey) {
        const { data: prior } = await svc
          .from("decision_records")
          .select("id, snapshot_hash, outcome, rationale")
          .eq("user_id", userId)
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();
        if (prior) {
          const same =
            prior.snapshot_hash === snapshotHash &&
            prior.outcome === input.outcome &&
            prior.rationale === input.rationale.trim();
          if (!same) {
            throw {
              code: "CONFLICT",
              message: "Idempotency key reused for different decision content.",
              status: 409,
            };
          }
          return { decision: prior, idempotent: true };
        }
      }

      // Hash chain: link to this operator's most recent record.
      const { data: last } = await svc
        .from("decision_records")
        .select("id, decision_hash")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const recordBody = {
        run_id: run.id,
        recommendation_id: input.recommendationId,
        outcome: input.outcome,
        rationale: input.rationale.trim(),
        approver: user?.email ?? userId,
        decided_at: decidedAt,
        snapshot_hash: snapshotHash,
        prior_decision_hash: last?.decision_hash ?? null,
      };
      const decisionHash = await canonicalHash(recordBody);

      const { data, error } = await svc
        .from("decision_records")
        .insert({
          user_id: userId,
          tenant_id: userId,
          run_id: run.id,
          recommendation_id: input.recommendationId,
          outcome: input.outcome,
          rationale: input.rationale.trim(),
          approver: user?.email ?? userId,
          comment: input.comment ?? null,
          escalated_to: input.escalatedTo ?? null,
          execution_status:
            input.outcome === "approved" ? "manual_execution_pending" : "not_executed",
          decided_at: decidedAt,
          timeline_id: `run:${run.id}`,
          data_mode: "SIMULATED",
          observation_tick: 0,
          evidence_snapshot: snapshotBody,
          snapshot_hash: snapshotHash,
          decision_hash: decisionHash,
          prior_decision_id: last?.id ?? null,
          prior_decision_hash: last?.decision_hash ?? null,
          supersedes_decision_id: input.supersedesDecisionId ?? null,
          idempotency_key: input.idempotencyKey ?? null,
          evidence_schema_version: EVIDENCE_SCHEMA_VERSION,
          decision_status: "recorded",
          authored_by: "record-decision@1",
        })
        .select("id, run_id, outcome, decided_at, snapshot_hash, decision_hash")
        .single();
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw { code: "CONFLICT", message: "Duplicate decision submission.", status: 409 };
        }
        throw { code: "INTERNAL_ERROR", message: error.message, status: 500 };
      }
      log("decision recorded", { decisionId: data.id, runId: run.id });
      return { decision: data, idempotent: false };
    },
  }),
);