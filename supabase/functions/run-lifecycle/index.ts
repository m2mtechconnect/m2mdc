/**
 * /v1/run-lifecycle - trusted server write boundary for simulation runs.
 *
 * The browser may never author an authoritative run or promote a preview.
 * This function derives every security- and lifecycle-critical field from the
 * authenticated session, active organization and server clock:
 *   - authenticated creator, active tenant membership and facility access
 *   - server timestamps
 *   - legal lifecycle transitions (terminal runs cannot be reopened)
 *   - provider readiness -> preview / authoritative classification
 *   - canonical serialization version and hashes
 *   - tenant-scoped idempotency
 *
 * The AURA scenario engine still executes in the browser. This boundary does
 * NOT claim those results were server-executed: a browser-produced run is
 * persisted as `preview` / `client-generated-unverified`. Only a provider
 * that the server itself can verify may reach `authoritative`.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHandler } from "../_shared/handler.ts";
import { CANONICAL_SCHEMA_VERSION, canonicalHash } from "../_shared/canonicalHash.ts";

/** Lifecycle states of the canonical persisted run. */
export const LIFECYCLE = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "unavailable",
  "cancelled",
] as const;
type Lifecycle = (typeof LIFECYCLE)[number];

const TERMINAL: Lifecycle[] = ["succeeded", "failed", "cancelled"];

/** Only these transitions are legal. Terminal states are absorbing. */
const LEGAL: Record<Lifecycle, Lifecycle[]> = {
  queued: ["running", "failed", "cancelled", "unavailable"],
  running: ["succeeded", "failed", "cancelled", "unavailable"],
  unavailable: ["queued", "running", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

/** Organization roles allowed to create or advance simulation runs. */
const RUN_ROLES = ["owner", "admin", "operator", "engineer", "manager"] as const;

/**
 * Providers the server can itself verify. Empty until a real server-executed
 * provider exists, so nothing can currently be persisted as authoritative.
 */
const SERVER_VERIFIABLE_PROVIDERS: string[] = [];

const CreateSchema = z.object({
  op: z.literal("create"),
  twinId: z.string().uuid(),
  scenarioKey: z.string().min(1).max(200),
  scenarioName: z.string().max(300).optional(),
  scenarioType: z.enum(["operational", "design"]).default("operational"),
  requestedProvider: z.string().min(1).max(120),
  providerVersion: z.string().max(120).nullable().optional(),
  requestedExecutionClass: z.string().min(1).max(120),
  requestedIntent: z.enum(["preview", "authoritative"]).default("preview"),
  inputSnapshot: z.record(z.unknown()),
  configuration: z.record(z.unknown()).default({}),
  seed: z.string().max(120).nullable().optional(),
  prngVersion: z.string().max(120).nullable().optional(),
  seedDerivationVersion: z.string().max(120).nullable().optional(),
  telemetrySnapshotId: z.string().max(200).nullable().optional(),
  telemetrySnapshotHash: z.string().max(200).nullable().optional(),
  retryOfRunId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().min(8).max(200),
});

const TransitionSchema = z.object({
  op: z.literal("transition"),
  runId: z.string().uuid(),
  to: z.enum(LIFECYCLE),
  outputSnapshot: z.record(z.unknown()).optional(),
  baselineKpis: z.record(z.number()).optional(),
  finalKpis: z.record(z.number()).optional(),
  events: z.array(z.record(z.unknown())).optional(),
  metricProvenance: z.record(z.unknown()).optional(),
  actualProvider: z.string().max(120).optional(),
  outcomeExecutionClass: z.string().max(120).optional(),
  measuredDurationMs: z.number().int().nonnegative().nullable().optional(),
  externalJobId: z.string().max(200).nullable().optional(),
  failureCode: z.string().max(120).nullable().optional(),
  failureMessage: z.string().max(1000).nullable().optional(),
});

const InputSchema = z.discriminatedUnion("op", [CreateSchema, TransitionSchema]);

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

serve(
  createHandler({
    name: "run-lifecycle",
    authLevel: "user",
    inputSchema: InputSchema,
    handler: async (input, context) => {
      const { userId, supabase, log } = context;
      if (!userId) throw { code: "UNAUTHORIZED", message: "Sign-in required", status: 401 };

      // Tenant authority is always resolved from the caller-scoped client. A
      // service-role client is never allowed to choose the active organization.
      const { data: activeOrgRaw, error: activeOrgError } = await supabase.rpc("active_org_id");
      const activeOrgId = !activeOrgError && typeof activeOrgRaw === "string" ? activeOrgRaw : null;
      if (!activeOrgId) {
        throw { code: "FORBIDDEN", message: "An active organization is required.", status: 403 };
      }
      const { data: canRun, error: roleError } = await supabase.rpc("org_has_role", {
        _org_id: activeOrgId,
        _user_id: userId,
        _roles: [...RUN_ROLES],
      });
      if (roleError || canRun !== true) {
        throw { code: "FORBIDDEN", message: "Your organization role cannot run simulations.", status: 403 };
      }

      const svc = admin();

      if (input.op === "create") {
        // Facility access and organization ownership are proven through the
        // caller's RLS-scoped client, never through the service role.
        const { data: twin, error: twinError } = await supabase
          .from("data_centre_twins")
          .select("id, org_id")
          .eq("id", input.twinId)
          .maybeSingle();
        if (twinError || !twin) {
          throw { code: "FORBIDDEN", message: "Facility not accessible to this organization", status: 403 };
        }
        if (!twin.org_id || twin.org_id !== activeOrgId) {
          throw { code: "FORBIDDEN", message: "Facility belongs to another organization", status: 403 };
        }

        // Idempotency is tenant + actor scoped. Reusing the same key in a
        // different organization can never resolve to another tenant's run.
        const { data: existing } = await svc
          .from("simulation_runs")
          .select("id, lifecycle_status, run_intent, verification_level")
          .eq("tenant_id", activeOrgId)
          .eq("user_id", userId)
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();
        if (existing) return { run: existing, idempotent: true };

        // Provider readiness decides the honest classification. A requested
        // authoritative intent is downgraded, never granted on request.
        const verifiable = SERVER_VERIFIABLE_PROVIDERS.includes(input.requestedProvider);
        const runIntent = verifiable && input.requestedIntent === "authoritative"
          ? "authoritative"
          : "preview";
        const verificationLevel = verifiable ? "server-validated" : "client-generated-unverified";

        const nowIso = new Date().toISOString();
        const inputHash = await canonicalHash(input.inputSnapshot);
        const configurationHash = await canonicalHash(input.configuration);

        const row = {
          twin_id: input.twinId,
          user_id: userId,
          tenant_id: activeOrgId,
          scenario_key: input.scenarioKey,
          scenario_name: input.scenarioName ?? input.scenarioKey,
          scenario_type: input.scenarioType,
          status: "pending",
          lifecycle_status: "queued" as Lifecycle,
          started_at: nowIso,
          server_created_at: nowIso,
          input_snapshot: input.inputSnapshot,
          output_snapshot: {},
          metric_provenance: {},
          engine_version: input.providerVersion ?? "unknown",
          execution_origin: verifiable ? "server-edge-function" : "client-browser",
          validation_status: verifiable ? "server-validated" : "client-produced-unverified",
          requested_provider: input.requestedProvider,
          actual_provider: null,
          provider_version: input.providerVersion ?? null,
          requested_execution_class: input.requestedExecutionClass,
          outcome_execution_class: null,
          run_intent: runIntent,
          verification_level: verificationLevel,
          seed: input.seed ?? null,
          prng_version: input.prngVersion ?? null,
          seed_derivation_version: input.seedDerivationVersion ?? null,
          canonical_schema_version: CANONICAL_SCHEMA_VERSION,
          input_hash: inputHash,
          configuration_hash: configurationHash,
          output_hash: null,
          telemetry_snapshot_id: input.telemetrySnapshotId ?? null,
          telemetry_snapshot_hash: input.telemetrySnapshotHash ?? null,
          retry_of_run_id: input.retryOfRunId ?? null,
          idempotency_key: input.idempotencyKey,
          provenance_envelope: {
            boundary: "run-lifecycle@2",
            tenantId: activeOrgId,
            requestedIntent: input.requestedIntent,
            grantedIntent: runIntent,
            providerVerifiable: verifiable,
          },
        };

        if (input.retryOfRunId) {
          const { data: prior } = await svc
            .from("simulation_runs")
            .select("id, attempt, user_id, tenant_id")
            .eq("id", input.retryOfRunId)
            .maybeSingle();
          if (!prior || prior.user_id !== userId || prior.tenant_id !== activeOrgId) {
            throw { code: "FORBIDDEN", message: "Retry target not accessible in this organization", status: 403 };
          }
          (row as Record<string, unknown>).attempt = (prior.attempt ?? 1) + 1;
        }

        const { data, error } = await svc
          .from("simulation_runs")
          .insert(row)
          .select("id, lifecycle_status, run_intent, verification_level")
          .single();
        if (error) {
          if ((error as { code?: string }).code === "23505") {
            const { data: dup } = await svc
              .from("simulation_runs")
              .select("id, lifecycle_status, run_intent, verification_level")
              .eq("tenant_id", activeOrgId)
              .eq("user_id", userId)
              .eq("idempotency_key", input.idempotencyKey)
              .maybeSingle();
            if (dup) return { run: dup, idempotent: true };
          }
          throw { code: "INTERNAL_ERROR", message: error.message, status: 500 };
        }
        log("run created", { runId: data.id, runIntent, tenantId: activeOrgId });
        return { run: data, idempotent: false };
      }

      // ---- transition ----
      const { data: current, error: readError } = await supabase
        .from("simulation_runs")
        .select("id, user_id, tenant_id, lifecycle_status, started_at, run_intent, verification_level")
        .eq("id", input.runId)
        .maybeSingle();
      if (readError || !current) {
        throw { code: "NOT_FOUND", message: "Run not visible to this organization", status: 404 };
      }
      if (!current.tenant_id || current.tenant_id !== activeOrgId || current.user_id !== userId) {
        throw { code: "FORBIDDEN", message: "Run belongs to another organization", status: 403 };
      }

      const from = (current.lifecycle_status ?? "unavailable") as Lifecycle;
      if (TERMINAL.includes(from)) {
        throw {
          code: "CONFLICT",
          message: `Run is ${from}; a terminal run cannot be reopened. Create a retry instead.`,
          status: 409,
        };
      }
      if (!LEGAL[from].includes(input.to)) {
        throw { code: "CONFLICT", message: `Illegal transition ${from} -> ${input.to}`, status: 409 };
      }

      const nowIso = new Date().toISOString();
      const patch: Record<string, unknown> = {
        lifecycle_status: input.to,
        status: input.to === "succeeded" ? "completed" : input.to === "queued" ? "pending" : input.to,
        updated_at: nowIso,
      };
      if (input.actualProvider) patch.actual_provider = input.actualProvider;
      if (input.outcomeExecutionClass) patch.outcome_execution_class = input.outcomeExecutionClass;
      if (input.externalJobId !== undefined) patch.external_job_id = input.externalJobId;
      if (input.measuredDurationMs !== undefined) patch.measured_duration_ms = input.measuredDurationMs;
      if (input.failureCode !== undefined) patch.failure_code = input.failureCode;
      if (input.failureMessage !== undefined) patch.failure_message = input.failureMessage;
      if (input.baselineKpis) patch.baseline_kpis = input.baselineKpis;
      if (input.finalKpis) patch.final_kpis = input.finalKpis;
      if (input.events) patch.events = input.events;
      if (input.metricProvenance) patch.metric_provenance = input.metricProvenance;
      if (input.outputSnapshot) {
        patch.output_snapshot = input.outputSnapshot;
        patch.output_hash = await canonicalHash(input.outputSnapshot);
      }
      if (TERMINAL.includes(input.to)) {
        patch.finished_at = nowIso;
        patch.duration_ms =
          input.measuredDurationMs ??
          Math.max(0, Date.parse(nowIso) - Date.parse(current.started_at));
      }

      const { data, error } = await svc
        .from("simulation_runs")
        .update(patch)
        .eq("id", input.runId)
        .eq("tenant_id", activeOrgId)
        .eq("user_id", userId)
        .select("id, lifecycle_status, run_intent, verification_level, output_hash")
        .single();
      if (error) throw { code: "INTERNAL_ERROR", message: error.message, status: 500 };
      log("run transitioned", { runId: input.runId, from, to: input.to, tenantId: activeOrgId });
      return { run: data };
    },
  }),
);
