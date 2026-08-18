/**
 * Phase 3 - the canonical persisted run model.
 *
 * `public.simulation_runs.id` is the one authoritative run identity on the
 * platform. An in-memory object, a browser snapshot, a fixture, a local
 * calculation or Zustand state is NOT a persisted authoritative run and must
 * never be presented as one.
 *
 * Writes go through the trusted server boundary (`run-lifecycle` edge
 * function). The browser cannot create an authoritative run, promote a
 * preview, or reopen a terminal run - those are rejected by the boundary and
 * again by a database trigger.
 */
import { supabase } from '@/integrations/supabase/client';

export const CANONICAL_LIFECYCLE = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'unavailable',
  'cancelled',
] as const;
export type RunLifecycle = (typeof CANONICAL_LIFECYCLE)[number];

export const TERMINAL_LIFECYCLE: RunLifecycle[] = ['succeeded', 'failed', 'cancelled'];

export type RunIntent = 'preview' | 'authoritative';

export type VerificationLevel =
  | 'server-validated'
  | 'client-generated-unverified'
  | 'legacy-unverified'
  | 'invalid';

/** Displayed when no canonical persisted run exists. */
export const RUN_UNAVAILABLE = 'Unavailable';
/** Displayed for a browser calculation that has no persisted record. */
export const RUN_UNPERSISTED_PREVIEW = 'Unpersisted preview';

export interface CanonicalRun {
  /** `simulation_runs.id` - the canonical run identity. */
  id: string;
  tenantId: string | null;
  twinId: string;
  scenarioKey: string;
  scenarioName: string;
  scenarioType: string;
  lifecycleStatus: RunLifecycle;
  runIntent: RunIntent;
  verificationLevel: VerificationLevel;
  requestedProvider: string | null;
  actualProvider: string | null;
  providerVersion: string | null;
  requestedExecutionClass: string | null;
  outcomeExecutionClass: string | null;
  seed: string | null;
  prngVersion: string | null;
  seedDerivationVersion: string | null;
  canonicalSchemaVersion: string | null;
  inputHash: string | null;
  configurationHash: string | null;
  outputHash: string | null;
  telemetrySnapshotId: string | null;
  telemetrySnapshotHash: string | null;
  externalJobId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  serverCreatedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  measuredDurationMs: number | null;
  createdByUserId: string | null;
  retryOfRunId: string | null;
  attempt: number;
  baselineKpis: Record<string, number>;
  finalKpis: Record<string, number>;
  metricProvenance: Record<string, unknown>;
  /** Citation for provenance UI. Always cites the canonical table. */
  recordCitation: string;
}

export const CANONICAL_RUN_COLUMNS =
  'id, tenant_id, twin_id, user_id, scenario_key, scenario_name, scenario_type, ' +
  'lifecycle_status, run_intent, verification_level, requested_provider, actual_provider, ' +
  'provider_version, requested_execution_class, outcome_execution_class, seed, prng_version, ' +
  'seed_derivation_version, canonical_schema_version, input_hash, configuration_hash, ' +
  'output_hash, telemetry_snapshot_id, telemetry_snapshot_hash, external_job_id, failure_code, ' +
  'failure_message, server_created_at, started_at, finished_at, measured_duration_ms, ' +
  'retry_of_run_id, attempt, baseline_kpis, final_kpis, metric_provenance, created_at';

function s(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function numericMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) out[k] = raw;
  }
  return out;
}

function lifecycleOf(value: unknown): RunLifecycle {
  return (CANONICAL_LIFECYCLE as readonly string[]).includes(String(value))
    ? (value as RunLifecycle)
    : 'unavailable';
}

/** Maps a persisted row. Missing evidence stays missing - never invented. */
export function mapCanonicalRun(row: Record<string, unknown>): CanonicalRun {
  const intent = s(row.run_intent);
  const verification = s(row.verification_level);
  return {
    id: String(row.id),
    tenantId: s(row.tenant_id),
    twinId: String(row.twin_id ?? ''),
    scenarioKey: String(row.scenario_key ?? ''),
    scenarioName: s(row.scenario_name) ?? String(row.scenario_key ?? ''),
    scenarioType: s(row.scenario_type) ?? 'operational',
    lifecycleStatus: lifecycleOf(row.lifecycle_status),
    runIntent: intent === 'authoritative' ? 'authoritative' : 'preview',
    verificationLevel: (verification as VerificationLevel) ?? 'legacy-unverified',
    requestedProvider: s(row.requested_provider),
    actualProvider: s(row.actual_provider),
    providerVersion: s(row.provider_version),
    requestedExecutionClass: s(row.requested_execution_class),
    outcomeExecutionClass: s(row.outcome_execution_class),
    seed: s(row.seed),
    prngVersion: s(row.prng_version),
    seedDerivationVersion: s(row.seed_derivation_version),
    canonicalSchemaVersion: s(row.canonical_schema_version),
    inputHash: s(row.input_hash),
    configurationHash: s(row.configuration_hash),
    outputHash: s(row.output_hash),
    telemetrySnapshotId: s(row.telemetry_snapshot_id),
    telemetrySnapshotHash: s(row.telemetry_snapshot_hash),
    externalJobId: s(row.external_job_id),
    failureCode: s(row.failure_code),
    failureMessage: s(row.failure_message),
    serverCreatedAt: s(row.server_created_at) ?? s(row.created_at),
    startedAt: s(row.started_at),
    finishedAt: s(row.finished_at),
    measuredDurationMs:
      typeof row.measured_duration_ms === 'number' ? row.measured_duration_ms : null,
    createdByUserId: s(row.user_id),
    retryOfRunId: s(row.retry_of_run_id),
    attempt: typeof row.attempt === 'number' ? row.attempt : 1,
    baselineKpis: numericMap(row.baseline_kpis),
    finalKpis: numericMap(row.final_kpis),
    metricProvenance:
      row.metric_provenance && typeof row.metric_provenance === 'object'
        ? (row.metric_provenance as Record<string, unknown>)
        : {},
    recordCitation: `simulation_runs:${String(row.id)}`,
  };
}

/** Operator-readable verification wording. Never says live or NVIDIA-backed. */
export function verificationLabel(run: CanonicalRun | null): string {
  if (!run) return RUN_UNAVAILABLE;
  switch (run.verificationLevel) {
    case 'server-validated':
      return 'Server-validated';
    case 'client-generated-unverified':
      return 'Client-generated, unverified';
    case 'invalid':
      return 'Invalid';
    default:
      return 'Legacy record, unverified';
  }
}

/** The run identity to display. Only a persisted record yields an id. */
export function runIdentityLabel(run: CanonicalRun | null, hasLocalResult = false): string {
  if (run) return run.id;
  return hasLocalResult ? RUN_UNPERSISTED_PREVIEW : RUN_UNAVAILABLE;
}

/** Reads the canonical persisted runs visible to the session. RLS decides. */
export async function loadCanonicalRuns(
  twinId: string | null | undefined,
  options: { limit?: number; lifecycle?: RunLifecycle } = {},
): Promise<CanonicalRun[]> {
  let query = supabase
    .from('simulation_runs')
    .select(CANONICAL_RUN_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 25);
  if (twinId) query = query.eq('twin_id', twinId);
  if (options.lifecycle) query = query.eq('lifecycle_status', options.lifecycle);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as Record<string, unknown>[]).map(mapCanonicalRun);
}

export async function loadCanonicalRun(runId: string): Promise<CanonicalRun | null> {
  const { data, error } = await supabase
    .from('simulation_runs')
    .select(CANONICAL_RUN_COLUMNS)
    .eq('id', runId)
    .maybeSingle();
  if (error || !data) return null;
  return mapCanonicalRun(data as unknown as Record<string, unknown>);
}

export interface CreateRunRequest {
  twinId: string;
  scenarioKey: string;
  scenarioName?: string;
  scenarioType?: 'operational' | 'design';
  requestedProvider: string;
  providerVersion?: string | null;
  requestedExecutionClass: string;
  requestedIntent?: RunIntent;
  inputSnapshot: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  seed?: string | null;
  prngVersion?: string | null;
  seedDerivationVersion?: string | null;
  telemetrySnapshotId?: string | null;
  telemetrySnapshotHash?: string | null;
  retryOfRunId?: string | null;
  idempotencyKey: string;
}

export type BoundaryOutcome<T> =
  | { ok: true; value: T; idempotent: boolean }
  | { ok: false; reason: string };

interface BoundaryRunSummary {
  id: string;
  lifecycle_status: RunLifecycle;
  run_intent: RunIntent;
  verification_level: VerificationLevel;
  output_hash?: string | null;
}

async function callBoundary(body: Record<string, unknown>): Promise<BoundaryOutcome<BoundaryRunSummary>> {
  const { data, error } = await supabase.functions.invoke('run-lifecycle', { body });
  if (error) return { ok: false, reason: error.message ?? 'The run boundary rejected the request.' };
  const envelope = data as { success?: boolean; data?: { run?: BoundaryRunSummary; idempotent?: boolean }; error?: { message?: string } };
  if (envelope?.success === false) {
    return { ok: false, reason: envelope.error?.message ?? 'The run boundary rejected the request.' };
  }
  const run = envelope?.data?.run ?? (data as { run?: BoundaryRunSummary })?.run;
  if (!run?.id) return { ok: false, reason: 'The run boundary returned no canonical run record.' };
  return { ok: true, value: run, idempotent: Boolean(envelope?.data?.idempotent) };
}

/** Creates a canonical run. Classification is decided by the server. */
export function createCanonicalRun(request: CreateRunRequest) {
  return callBoundary({ op: 'create', ...request });
}

export interface TransitionRunRequest {
  runId: string;
  to: RunLifecycle;
  outputSnapshot?: Record<string, unknown>;
  baselineKpis?: Record<string, number>;
  finalKpis?: Record<string, number>;
  events?: Record<string, unknown>[];
  metricProvenance?: Record<string, unknown>;
  actualProvider?: string;
  outcomeExecutionClass?: string;
  measuredDurationMs?: number | null;
  externalJobId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}

/** Advances lifecycle. Illegal transitions fail at the boundary. */
export function transitionCanonicalRun(request: TransitionRunRequest) {
  return callBoundary({ op: 'transition', ...request });
}

/** Pure helper mirroring the server rule, used by UI affordances and tests. */
export function isLegalTransition(from: RunLifecycle, to: RunLifecycle): boolean {
  const legal: Record<RunLifecycle, RunLifecycle[]> = {
    queued: ['running', 'failed', 'cancelled', 'unavailable'],
    running: ['succeeded', 'failed', 'cancelled', 'unavailable'],
    unavailable: ['queued', 'running', 'failed', 'cancelled'],
    succeeded: [],
    failed: [],
    cancelled: [],
  };
  return legal[from].includes(to);
}