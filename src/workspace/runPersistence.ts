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
  const { data, error } = await (supabase as unknown as {
    rpc: (name: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
  }).rpc('active_org_id');
  return !error && typeof data === 'string' && isUuid(data) ? data : null;
}

export async function persistRun(params: PersistParams): Promise<PersistOutcome> {
  const { run, twinId, idempotencyKey } = params;

  if (!isUuid(twinId)) {
    return {
      status: 'unsaved',
      reason: 'This facility is not a stored record, so the run cannot be saved as a durable operational record.',
    };
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    return { status: 'unsaved', reason: 'You are not signed in, so the run could not be saved.' };
  }
  const tenantId = await activeOrganizationId();
  if (!tenantId) {
    return { status: 'unsaved', reason: 'Select an active organization before recording a simulation run.' };
  }

  const snap = snapshotOf(run);
  const row = {
    twin_id: twinId,
    user_id: auth.user.id,
    tenant_id: tenantId,
    scenario_key: run.scenarioId,
    scenario_name: run.scenarioLabel,
    scenario_type: params.scenarioType ?? 'operational',
    run_label: run.id,
    run_key: run.id,
    status: 'completed' as const,
    lifecycle_status: 'succeeded',
    run_intent: 'preview',
    verification_level: 'client-produced-unverified',
    started_at: run.startedAt,
    finished_at: run.completedAt,
    duration_ms: Math.max(0, new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()),
    baseline_kpis: run.baseline as unknown as Record<string, number>,
    final_kpis: run.result as unknown as Record<string, number>,
    events: run.events as unknown as Record<string, unknown>[],
    kpi_snapshots: [],
    input_snapshot: snap.input,
    output_snapshot: snap.output,
    metric_provenance: metricProvenanceFor(run.result),
    engine_version: RUN_ENGINE_VERSION,
    execution_origin: 'client-browser',
    validation_status: 'client-produced-unverified',
    blueprint_id: params.blueprintId && isUuid(params.blueprintId) ? params.blueprintId : null,
    blueprint_version: params.blueprintVersion ?? null,
    idempotency_key: idempotencyKey,
    checksum: runChecksum(snap),
    metadata: { schemaVersion: RUN_SCHEMA_VERSION },
  };

  const { data, error } = await supabase
    .from('simulation_runs')
    .insert(row as never)
    .select('id, run_key')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      const { data: existing } = await supabase
        .from('simulation_runs')
        .select('id, run_key')
        .eq('tenant_id', tenantId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        const e = existing as { id: string; run_key: string | null };
        return { status: 'duplicate', id: e.id, runKey: e.run_key ?? run.id };
      }
    }
    return {
      status: 'unsaved',
      reason: `The run could not be saved to the server, so no operational record exists. ${
        (error as { message?: string }).message?.slice(0, 160) ?? ''
      }`.trim(),
    };
  }

  const saved = data as unknown as { id: string; run_key: string | null };
  return { status: 'saved', id: saved.id, runKey: saved.run_key ?? run.id };
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
  run_id: string | null;
  recommendation_id: string;
  outcome: string;
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
    .select('run_id, recommendation_id, outcome')
    .eq('tenant_id', tenantId)
    .in('run_id', runIds)
    .order('decided_at', { ascending: true });
  if (decisionError || !decisionData) return runs;

  const byRun = new Map<string, Record<string, DecisionState>>();
  for (const row of decisionData as unknown as DecisionRow[]) {
    if (!row.run_id) continue;
    const state = decisionState(row.outcome);
    if (!state) continue;
    const decisions = byRun.get(row.run_id) ?? {};
    decisions[row.recommendation_id] = state;
    byRun.set(row.run_id, decisions);
  }
  return runs.map((run) => ({
    ...run,
    decisions: run.serverId ? (byRun.get(run.serverId) ?? {}) : {},
  }));
}
