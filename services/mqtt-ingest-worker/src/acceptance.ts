/**
 * Worker acceptance mode.
 *
 * Purpose: prove that the durable Supabase write paths the MQTT worker depends
 * on actually work from the deployed runtime, using a service-role token that
 * is INJECTED by the platform (env, mounted file or secrets-manager blob).
 * No developer-owned key is required and no key is ever printed.
 *
 * It touches no broker and fabricates no telemetry. Every row it writes is
 * marked ACCEPTANCE_EVIDENCE, uses a reserved probe identity, is read back to
 * prove durability, and is deleted again unless --keep-evidence is passed.
 */
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { WorkerEnv } from './env.js';

export const ACCEPTANCE_EVIDENCE_CLASS = 'ACCEPTANCE_EVIDENCE';
export const ACCEPTANCE_TARGET_ENTITY = 'AURA-ACCEPTANCE-PROBE';

export interface AcceptanceStep {
  step: string;
  table: string;
  operation: 'insert' | 'update' | 'select' | 'delete';
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  detail: string;
  durationMs: number;
}

export interface AcceptanceReport {
  mode: 'acceptance';
  verdict: 'PASS' | 'FAIL';
  correlationId: string;
  connectionId: string;
  tenantId: string | null;
  tokenSource: string;
  tokenFingerprint: string;
  evidenceClass: string;
  evidenceRetained: boolean;
  steps: AcceptanceStep[];
}

async function step(
  steps: AcceptanceStep[],
  meta: Omit<AcceptanceStep, 'status' | 'detail' | 'durationMs'>,
  fn: () => Promise<string>,
): Promise<boolean> {
  const started = Date.now();
  try {
    const detail = await fn();
    steps.push({ ...meta, status: 'PASS', detail, durationMs: Date.now() - started });
    return true;
  } catch (error) {
    steps.push({
      ...meta,
      status: 'FAIL',
      detail: (error as Error).message,
      durationMs: Date.now() - started,
    });
    return false;
  }
}

function assertNoError(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function runAcceptance(env: WorkerEnv): Promise<AcceptanceReport> {
  const client: SupabaseClient = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false },
  });
  const correlationId = randomUUID();
  const workerId = `${env.workerId}-acceptance`;
  const steps: AcceptanceStep[] = [];

  const report: AcceptanceReport = {
    mode: 'acceptance',
    verdict: 'FAIL',
    correlationId,
    connectionId: env.connectionId,
    tenantId: null,
    tokenSource: env.serviceRoleKeySource,
    tokenFingerprint: env.serviceRoleKeyFingerprint,
    evidenceClass: ACCEPTANCE_EVIDENCE_CLASS,
    evidenceRetained: env.keepAcceptanceEvidence,
    steps,
  };

  let tenantId: string | null = null;
  let runId: string | null = null;
  let messageId: string | null = null;
  let twinValueId: string | null = null;

  const reachable = await step(
    steps,
    { step: 'resolve connection', table: 'connection_instances', operation: 'select' },
    async () => {
      const { data, error } = await client
        .from('connection_instances')
        .select('id, tenant_id, connector_id, status')
        .eq('id', env.connectionId)
        .maybeSingle();
      assertNoError('connection read', error);
      if (!data) throw new Error(`connection ${env.connectionId} does not exist`);
      tenantId = (data.tenant_id as string | null) ?? null;
      report.tenantId = tenantId;
      return `connector=${data.connector_id} status=${data.status} tenant=${tenantId ?? 'null'}`;
    },
  );

  if (reachable) {
    await step(
      steps,
      { step: 'register worker row', table: 'connection_runtime_workers', operation: 'insert' },
      async () => {
        const { error } = await client.from('connection_runtime_workers').upsert(
          {
            worker_id: workerId,
            runtime: env.runtime,
            connection_id: env.connectionId,
            tenant_id: tenantId,
            state: 'ACCEPTANCE',
            protocol: 'mqtt',
            evidence_class: ACCEPTANCE_EVIDENCE_CLASS,
            broker_url: null,
            last_error: null,
            started_at: new Date().toISOString(),
          },
          { onConflict: 'worker_id' },
        );
        assertNoError('worker upsert', error);
        const { data, error: readError } = await client
          .from('connection_runtime_workers')
          .select('worker_id, state')
          .eq('worker_id', workerId)
          .maybeSingle();
        assertNoError('worker read-back', readError);
        if (!data) throw new Error('worker row was not durable');
        return `worker_id=${workerId} state=${data.state}`;
      },
    );

    await step(
      steps,
      { step: 'open ingest run', table: 'connection_ingest_runs', operation: 'insert' },
      async () => {
        const { data, error } = await client
          .from('connection_ingest_runs')
          .insert({
            connection_id: env.connectionId,
            tenant_id: tenantId,
            worker_id: workerId,
            correlation_id: correlationId,
            source_endpoint: 'acceptance://durable-write-path',
            evidence_class: ACCEPTANCE_EVIDENCE_CLASS,
            final_status: 'RUNNING',
          })
          .select('id')
          .single();
        assertNoError('ingest run insert', error);
        runId = data!.id as string;
        return `run_id=${runId}`;
      },
    );

    if (runId) {
      await step(
        steps,
        { step: 'write message evidence', table: 'connection_ingest_messages', operation: 'insert' },
        async () => {
          const { data, error } = await client
            .from('connection_ingest_messages')
            .insert({
              connection_id: env.connectionId,
              ingest_run_id: runId,
              tenant_id: tenantId,
              worker_id: workerId,
              correlation_id: correlationId,
              topic: `acceptance/${env.connectionId}/probe`,
              qos: 1,
              payload_bytes: 0,
              payload_hash: null,
              event_id: `acceptance-${correlationId}`,
              observed_at: new Date().toISOString(),
              outcome: 'REJECTED',
              rejection_reason: 'ACCEPTANCE_PROBE',
              detail: 'durable write-path probe; not telemetry',
              processing_latency_ms: 0,
              evidence_class: ACCEPTANCE_EVIDENCE_CLASS,
            })
            .select('id')
            .single();
          assertNoError('message insert', error);
          messageId = data!.id as string;
          return `message_id=${messageId}`;
        },
      );

      await step(
        steps,
        { step: 'close ingest run', table: 'connection_ingest_runs', operation: 'update' },
        async () => {
          const { error } = await client
            .from('connection_ingest_runs')
            .update({
              records_received: 1,
              records_accepted: 0,
              records_rejected: 1,
              final_status: 'ACCEPTANCE_PASSED',
              completed_at: new Date().toISOString(),
            })
            .eq('id', runId);
          assertNoError('ingest run update', error);
          const { data, error: readError } = await client
            .from('connection_ingest_runs')
            .select('final_status, completed_at')
            .eq('id', runId)
            .maybeSingle();
          assertNoError('ingest run read-back', readError);
          if (!data?.completed_at) throw new Error('ingest run completion was not durable');
          return `final_status=${data.final_status}`;
        },
      );
    }

    await step(
      steps,
      { step: 'write twin property', table: 'twin_property_values', operation: 'insert' },
      async () => {
        const now = new Date().toISOString();
        const { data, error } = await client
          .from('twin_property_values')
          .insert({
            tenant_id: tenantId,
            target_entity: ACCEPTANCE_TARGET_ENTITY,
            target_property: 'acceptanceProbe',
            value_numeric: 1,
            unit: 'count',
            observed_at: now,
            received_at: now,
            applied_at: now,
            source_connection_id: env.connectionId,
            source_message_id: messageId,
            correlation_id: correlationId,
            provenance_class: 'ACCEPTANCE',
            provenance_reason: 'worker acceptance mode durable write probe',
            updated_at: now,
          })
          .select('id')
          .single();
        assertNoError('twin property insert', error);
        twinValueId = data!.id as string;
        return `twin_property_value_id=${twinValueId}`;
      },
    );

    await step(
      steps,
      { step: 'write audit event', table: 'connection_audit_events', operation: 'insert' },
      async () => {
        const { error } = await client.from('connection_audit_events').insert({
          connection_id: env.connectionId,
          actor_type: 'service',
          actor_id: null,
          action: 'runtime.worker.acceptance',
          previous_state: null,
          new_state: 'ACCEPTANCE',
          correlation_id: correlationId,
          detail: {
            worker_id: workerId,
            runtime: env.runtime,
            token_source: env.serviceRoleKeySource,
            token_fingerprint: env.serviceRoleKeyFingerprint,
            evidence_class: ACCEPTANCE_EVIDENCE_CLASS,
          },
        });
        assertNoError('audit insert', error);
        const { count, error: readError } = await client
          .from('connection_audit_events')
          .select('id', { count: 'exact', head: true })
          .eq('correlation_id', correlationId);
        assertNoError('audit read-back', readError);
        if (!count) throw new Error('audit event was not durable');
        return `audit_events=${count}`;
      },
    );
  }

  if (!env.keepAcceptanceEvidence) {
    await step(
      steps,
      { step: 'clean up probe rows', table: 'multiple', operation: 'delete' },
      async () => {
        if (twinValueId) {
          const { error } = await client.from('twin_property_values').delete().eq('id', twinValueId);
          assertNoError('twin property delete', error);
        }
        if (messageId) {
          const { error } = await client.from('connection_ingest_messages').delete().eq('id', messageId);
          assertNoError('message delete', error);
        }
        if (runId) {
          const { error } = await client.from('connection_ingest_runs').delete().eq('id', runId);
          assertNoError('ingest run delete', error);
        }
        const { error: auditError } = await client
          .from('connection_audit_events')
          .delete()
          .eq('correlation_id', correlationId);
        assertNoError('audit delete', auditError);
        const { error: workerError } = await client
          .from('connection_runtime_workers')
          .delete()
          .eq('worker_id', workerId);
        assertNoError('worker delete', workerError);
        return 'all acceptance rows removed';
      },
    );
  } else {
    steps.push({
      step: 'clean up probe rows',
      table: 'multiple',
      operation: 'delete',
      status: 'SKIPPED',
      detail: '--keep-evidence was passed; acceptance rows were retained',
      durationMs: 0,
    });
  }

  report.verdict = steps.some((s) => s.status === 'FAIL') ? 'FAIL' : 'PASS';
  return report;
}
