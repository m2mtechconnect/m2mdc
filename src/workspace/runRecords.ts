/**
 * Phase 7 - canonical simulation-run record model.
 *
 * `simulation_runs` is the one authoritative run table. It carries the full
 * run envelope (engine version, execution origin, validation status, input and
 * output snapshots, per-metric provenance, checksum, idempotency key), so all
 * run history surfaces read it through this module.
 *
 * The legacy generations `twin_simulation_runs` and
 * `sovereign_dc_simulation_runs` held no envelope and are deprecated: they
 * could report a run without saying which engine produced it or whether it was
 * server-validated.
 */

import { supabase } from '@/integrations/supabase/client';

/** Normalized summary of one durable run, safe for list and comparison UIs. */
export interface SimulationRunRecord {
  id: string;
  runId: string;
  twinId: string;
  scenarioId: string;
  scenarioName: string;
  scenarioType: string;
  status: string;
  startTime: Date;
  createdAt: Date;
  durationSeconds: number;
  baselineKpis: Record<string, number>;
  finalKpis: Record<string, number>;
  eventsCount: number;
  overallImpactScore: number;
  /** Run envelope - never inferred, always read from the record. */
  engineVersion: string | null;
  executionOrigin: string | null;
  validationStatus: string | null;
  checksum: string | null;
  /** True only when the record says a server validated the result. */
  serverValidated: boolean;
  /** Citation for provenance UI. */
  recordCitation: string;
}

/** Row shape read from `simulation_runs`. */
export interface SimulationRunRow {
  id: string;
  twin_id: string;
  run_key?: string | null;
  run_label?: string | null;
  scenario_key: string;
  scenario_name?: string | null;
  scenario_type?: string | null;
  status: string;
  started_at: string;
  finished_at?: string | null;
  duration_ms?: number | null;
  baseline_kpis?: unknown;
  final_kpis?: unknown;
  events?: unknown;
  engine_version?: string | null;
  execution_origin?: string | null;
  validation_status?: string | null;
  checksum?: string | null;
  created_at: string;
}

function numericMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw;
  }
  return out;
}

/** Mean relative KPI change against the recorded baseline, in percent. */
export function impactScore(
  baseline: Record<string, number>,
  final: Record<string, number>,
): number {
  const keys = Object.keys(final);
  if (keys.length === 0) return 0;
  let total = 0;
  for (const key of keys) {
    const base = baseline[key] ?? 0;
    if (base === 0) continue;
    total += ((final[key] - base) / Math.abs(base)) * 100;
  }
  return Math.round((total / keys.length) * 10) / 10;
}

export function mapRunRecord(row: SimulationRunRow): SimulationRunRecord {
  const baselineKpis = numericMap(row.baseline_kpis);
  const finalKpis = numericMap(row.final_kpis);
  const events = Array.isArray(row.events) ? row.events : [];
  return {
    id: row.id,
    runId: row.run_key ?? row.run_label ?? row.id,
    twinId: row.twin_id,
    scenarioId: row.scenario_key,
    scenarioName: row.scenario_name ?? row.scenario_key,
    scenarioType: row.scenario_type ?? 'operational',
    status: row.status,
    startTime: new Date(row.started_at),
    createdAt: new Date(row.created_at),
    durationSeconds: Math.round((row.duration_ms ?? 0) / 1000),
    baselineKpis,
    finalKpis,
    eventsCount: events.length,
    overallImpactScore: impactScore(baselineKpis, finalKpis),
    engineVersion: row.engine_version ?? null,
    executionOrigin: row.execution_origin ?? null,
    validationStatus: row.validation_status ?? null,
    checksum: row.checksum ?? null,
    serverValidated: row.validation_status === 'server-validated',
    recordCitation: `simulation_runs:${row.id}`,
  };
}

const SUMMARY_COLUMNS =
  'id, twin_id, run_key, run_label, scenario_key, scenario_name, scenario_type, status, started_at, finished_at, duration_ms, baseline_kpis, final_kpis, events, engine_version, execution_origin, validation_status, checksum, created_at';

/**
 * Load durable run records for a facility. RLS decides visibility; this never
 * widens it and never falls back to a legacy table.
 */
export async function loadRunRecords(
  twinId: string | null | undefined,
  options: { limit?: number; status?: string } = {},
): Promise<SimulationRunRecord[]> {
  if (!twinId) return [];
  let query = supabase
    .from('simulation_runs')
    .select(SUMMARY_COLUMNS)
    .eq('twin_id', twinId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 20);
  if (options.status) query = query.eq('status', options.status);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as SimulationRunRow[]).map(mapRunRecord);
}