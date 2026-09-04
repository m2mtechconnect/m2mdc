/**
 * Durable server persistence for workspace simulation runs.
 *
 * Authority rules:
 *  - The database row is the authoritative record of a completed run.
 *  - The browser deterministic engine is always persisted as preview evidence,
 *    never as an authoritative or server-validated result.
 *  - User identity and tenant come from the authenticated session and the
 *    server-evaluated active_org_id() RPC. Caller-supplied tenant ids are never used.
 *  - A duplicate submission resolves to the original row via its idempotency key.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ConfigOverrides, KpiValues } from './facilityModel';
import type { DecisionState, WorkspaceRun } from './scenarioEngine';

export const RUN_ENGINE_VERSION = 'aura-workspace-scenario-engine@1.0.0';
export const RUN_SCHEMA_VERSION = '2.0.0';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function runChecksum(input: unknown): string {
  const text = JSON.stringify(input);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
}

export function idempotencyKeyFor(params: {
  facilityId: string;
  scenarioId: string;
  overrides: ConfigOverrides;
  startedAt: string;
}): string {
  return runChecksum(params);
}

export type PersistOutcome =
  | { status: 'saved'; id: string; runKey: string }
  | { status: 'duplicate'; id: string; runKey: string }
  | { status: 'unsaved'; reason: string };

interface PersistParams {
  run: WorkspaceRun;
  twinId: string;
  blueprintId?: string | null;
  blueprintVersion?: string | null;
  scenarioType?: 'operational' | 'design';
  idempotencyKey: string;
}

interface LifecycleCreatePayload {
  run?: { id?: string; lifecycle_status?: string };
  idempotent?: boolean;
}

/** Accept the standardized Edge envelope and the legacy flat response shape. */
function lifecycleCreatePayload(raw: unknown): LifecycleCreatePayload {
  if (!raw || typeof raw !== 'object') return {};
  const outer = raw as Record<string, unknown>;
  const nested = outer.data;
  return nested && typeof nested === 'object'
    ? (nested as LifecycleCreatePayload)
    : (outer as LifecycleCreatePayload);
}

function snapshotOf(run: WorkspaceRun) {
  return {
    input: {
      facilityId: run.facilityId,
      facilityName: run.facilityName,
      scenarioId: run.scenarioId,
      scenarioLabel: run.scenarioLabel,
      overrides: run.overrides,
      baseline: run.baseline,
    },
    output: {
      result: run.result,
      events: run.events,
      recommendations: run.recommendations,
    },
  };
}

export function metricProvenanceFor(result: KpiValues): Record<string, unknown> {
  const entries = Object.keys(result).map((key) => [
    key,
    {
      provenance: 'simulated',
      source: 'AURA deterministic scenario engine',
      executionOrigin: 'client-browser',
      liveTelemetryUsed: false,
    },
  ]);
  return Object.fromEntries(entries);
}

async function activeOrganizationId(): Promise<string | null> {
  try {
    const result = await (supabase as unknown as {
      rpc: (name: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
    }).rpc('active_org_id');
    const data = result?.data;
    const error = result?.error;
    return !error && typeof data === 'string' && isUuid(data) ? data : null;
  } catch {
    // Treat an unavailable context lookup as no context. The caller must not
    // continue into a write boundary after an unresolved tenant check.
    return null;
  }
}

export async function persistRun(params: PersistParams): Promise<PersistOutcome> {
  const { run, twinId, idempotencyKey } = params;

  if (!isUuid(twinId)) {
    return {
      status: 'unsaved',
      reason: 'This facility is not a stored record, so the run cannot be saved as a durable operational record.',
    };
  }

  // Resolve the caller's active tenant before invoking the write boundary so
  // a missing session or organization fails closed with a stable UI message.
  // The tenant is intentionally not sent by the browser; run-lifecycle
  // resolves and verifies it again from the authenticated request context.
  const tenantId = await activeOrganizationId();
  if (!tenantId) {
    return {
      status: 'unsaved',
      reason: 'An active organization is required before a simulation run can be saved.',
    };
  }

  const snap = snapshotOf(run);
  const durationMs = Math.max(0, new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime());
  const createResult = await supabase.functions.invoke('run-lifecycle', {
    body: {
      op: 'create',
      twinId,
      runKey: run.id,
      scenarioKey: run.scenarioId,
      scenarioName: run.scenarioLabel,
      scenarioType: params.scenarioType ?? 'operational',
      requestedProvider: 'aura-deterministic-browser',
      providerVersion: RUN_ENGINE_VERSION,
      requestedExecutionClass: 'browser-preview',
      requestedIntent: 'preview',
      inputSnapshot: snap.input,
      configuration: run.overrides,
      idempotencyKey,
    },
  });
  if (createResult.error) {
    return { status: 'unsaved', reason: `The server rejected the run before it was recorded. ${createResult.error.message}` };
  }

  const createPayload = lifecycleCreatePayload(createResult.data);
  const created = createPayload.run;
  if (!created?.id) return { status: 'unsaved', reason: 'The run service returned no durable run record.' };
  if (createPayload.idempotent && created.lifecycle_status === 'succeeded') {
    return { status: 'duplicate', id: created.id, runKey: run.id };
  }

  if (created.lifecycle_status === 'queued') {
    const running = await supabase.functions.invoke('run-lifecycle', {
      body: { op: 'transition', runId: created.id, to: 'running' },
    });
    if (running.error) {
      return { status: 'unsaved', reason: `The durable run could not enter execution. ${running.error.message}` };
    }
  }

  const completed = await supabase.functions.invoke('run-lifecycle', {
    body: {
      op: 'transition',
      runId: created.id,
      to: 'succeeded',
      outputSnapshot: snap.output,
      baselineKpis: run.baseline,
      finalKpis: run.result,
      events: run.events,
      metricProvenance: metricProvenanceFor(run.result),
      actualProvider: 'aura-deterministic-browser',
      outcomeExecutionClass: 'browser-preview',
      measuredDurationMs: durationMs,
    },
  });
  if (completed.error) {
    await supabase.functions.invoke('run-lifecycle', {
      body: {
        op: 'transition',
        runId: created.id,
        to: 'failed',
        failureCode: 'CLIENT_RESULT_PERSIST_FAILED',
        failureMessage: completed.error.message.slice(0, 500),
      },
    });
    return { status: 'unsaved', reason: `The run result was not recorded. ${completed.error.message}` };
  }
  return { status: 'saved', id: created.id, runKey: run.id };
}

interface RunRow {
  id: string;
  run_key: string | null;
  run_label: string | null;
  scenario_key: string;
  scenario_name: string | null;
  twin_id: string;
  started_at: string;
  finished_at: string | null;
  baseline_kpis: unknown;
  final_kpis: unknown;
  events: unknown;
  input_snapshot: unknown;
  output_snapshot: unknown;
  execution_origin: string;
  validation_status: string;
  verification_level: string | null;
}

interface DecisionRow {
  id: string;
  run_id: string | null;
  recommendation_id: string;
  outcome: string;
  rationale: string;
  approver: string;
  decided_at: string;
  snapshot_hash: string;
  decision_hash: string | null;
  evidence_schema_version: string;
}

function decisionState(outcome: string): DecisionState | null {
  if (outcome === 'approved') return 'accepted';
  if (outcome === 'rejected') return 'rejected';
  if (outcome === 'escalated') return 'deferred';
  return null;
}

export function rowToRun(row: RunRow): WorkspaceRun {
  const input = (row.input_snapshot ?? {}) as Record<string, unknown>;
  const output = (row.output_snapshot ?? {}) as Record<string, unknown>;
  return {
    id: (row.run_key || row.run_label || row.id) as string,
    serverId: row.id,
    persistence: 'server',
    executionOrigin: row.execution_origin as WorkspaceRun['executionOrigin'],
    validationStatus: (row.verification_level ?? row.validation_status) as WorkspaceRun['validationStatus'],
    scenarioId: row.scenario_key,
    scenarioLabel: row.scenario_name ?? row.scenario_key,
    facilityId: (input.facilityId as string) ?? row.twin_id,
    facilityName: (input.facilityName as string) ?? 'Facility',
    startedAt: row.started_at,
    completedAt: row.finished_at ?? row.started_at,
    overrides: (input.overrides ?? {}) as WorkspaceRun['overrides'],
    baseline: ((input.baseline ?? row.baseline_kpis) ?? {}) as WorkspaceRun['baseline'],
    result: ((output.result ?? row.final_kpis) ?? {}) as WorkspaceRun['result'],
    events: ((output.events ?? row.events) ?? []) as WorkspaceRun['events'],
    recommendations: (output.recommendations ?? []) as WorkspaceRun['recommendations'],
    decisions: {},
  };
}

export function applyDecisionRowsToRuns(runs: WorkspaceRun[], rows: DecisionRow[]): WorkspaceRun[] {
  const recordsByRun = new Map<string, NonNullable<WorkspaceRun['decisionRecords']>>();
  const byRun = new Map<string, Record<string, DecisionState>>();
  for (const row of rows) {
    if (!row.run_id) continue;
    const state = decisionState(row.outcome);
    if (!state) continue;
    const decisions = byRun.get(row.run_id) ?? {};
    decisions[row.recommendation_id] = state;
    byRun.set(row.run_id, decisions);
    const records = recordsByRun.get(row.run_id) ?? [];
    records.push({
      id: row.id,
      recommendationId: row.recommendation_id,
      state: state as Exclude<DecisionState, 'pending'>,
      outcome: row.outcome as 'approved' | 'rejected' | 'escalated',
      rationale: row.rationale,
      approver: row.approver,
      decidedAt: row.decided_at,
      snapshotHash: row.snapshot_hash,
      decisionHash: row.decision_hash,
      evidenceSchemaVersion: row.evidence_schema_version,
    });
    recordsByRun.set(row.run_id, records);
  }
  return runs.map((run) => ({
    ...run,
    decisions: run.serverId ? (byRun.get(run.serverId) ?? {}) : {},
    decisionRecords: run.serverId ? (recordsByRun.get(run.serverId) ?? []) : [],
  }));
}

export async function loadServerRuns(twinId?: string | null): Promise<WorkspaceRun[]> {
  const tenantId = await activeOrganizationId();
  if (!tenantId) return [];

  let query = supabase
    .from('simulation_runs')
    .select(
      'id, run_key, run_label, scenario_key, scenario_name, twin_id, started_at, finished_at, baseline_kpis, final_kpis, events, input_snapshot, output_snapshot, execution_origin, validation_status, verification_level',
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20);

  if (isUuid(twinId)) query = query.eq('twin_id', twinId);

  const { data, error } = await query;
  if (error || !data) return [];
  const runs = (data as unknown as RunRow[]).map(rowToRun);
  const runIds = runs.map((run) => run.serverId).filter((id): id is string => Boolean(id));
  if (runIds.length === 0) return runs;

  const { data: decisionData, error: decisionError } = await supabase
    .from('decision_records')
    .select('id, run_id, recommendation_id, outcome, rationale, approver, decided_at, snapshot_hash, decision_hash, evidence_schema_version')
    .eq('tenant_id', tenantId)
    .in('run_id', runIds)
    .order('decided_at', { ascending: true });
  if (decisionError || !decisionData) return runs;

  return applyDecisionRowsToRuns(runs, decisionData as unknown as DecisionRow[]);
}
