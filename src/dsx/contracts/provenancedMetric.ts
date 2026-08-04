/**
 * DSX provenanced metric contract (Evidence Beta).
 *
 * A metric may only carry a value when every required input is present.
 * Otherwise the metric is UNAVAILABLE and lists the missing inputs.
 */
import type { DataMode, FreshnessState } from '../modes';

export type CalibrationStatus = 'uncalibrated' | 'field_calibrated' | 'not_applicable';
export type MetricValidation = 'validated' | 'requires_review' | 'invalid' | 'unavailable';

export interface MetricInputRef {
  name: string;
  value: number | null;
  unit: string;
  event_ids: string[];
  asset_id?: string;
  /**
   * How the input entered the calculation.
   * - `observed`: carried by ingested observations (event_ids are the proof).
   * - `declared`: a registry/nameplate value asserted by a human or fixture.
   *   It has no observation behind it, so it must never be presented as if
   *   it were metered.
   */
  provenance?: 'observed' | 'declared';
  /** Where a declared input comes from, e.g. 'facility registry (nameplate)'. */
  declared_source?: string;
  /** True when a declared input has no attestation/verification on file. */
  unattested?: boolean;
}

export interface DsxProvenancedMetric {
  metric_name: string;
  value: number | null;
  unit: string;
  observation_window: { from: string; to: string } | null;
  formula: string;
  formula_version: string;
  inputs: MetricInputRef[];
  missing_inputs: string[];
  /** Declared (non-observed) inputs that contributed to the value. */
  declared_inputs: MetricInputRef[];
  /** Named evidence that would be required to attest the declared inputs. */
  unattested_inputs: string[];
  source_event_ids: string[];
  aura_asset_id: string | null;
  usd_prim_path: string | null;
  data_mode: DataMode;
  freshness: FreshnessState;
  last_observed_at: string | null;
  validation: MetricValidation;
  simulation_run_id: string | null;
  replay_run_id: string | null;
  calibration: CalibrationStatus;
  confidence: number | null;
  limitations: string[];
}

export interface MetricDefinition {
  metric_name: string;
  unit: string;
  formula: string;
  formula_version: string;
  /** Named inputs required before a value may be produced. */
  required_inputs: string[];
  compute: (inputs: Record<string, number>) => number;
}

export interface MetricComputeContext {
  inputs: Record<string, MetricInputRef | undefined>;
  data_mode: DataMode;
  freshness: FreshnessState;
  last_observed_at: string | null;
  observation_window: { from: string; to: string } | null;
  aura_asset_id?: string | null;
  usd_prim_path?: string | null;
  simulation_run_id?: string | null;
  replay_run_id?: string | null;
  calibration?: CalibrationStatus;
  confidence?: number | null;
  limitations?: string[];
}

/**
 * Compute a metric fail-closed: any missing/null required input yields an
 * UNAVAILABLE metric that names exactly which inputs were missing.
 */
export function computeMetric(
  def: MetricDefinition,
  ctx: MetricComputeContext,
): DsxProvenancedMetric {
  const present: MetricInputRef[] = [];
  const missing: string[] = [];
  const numeric: Record<string, number> = {};

  for (const name of def.required_inputs) {
    const ref = ctx.inputs[name];
    if (!ref || ref.value === null || !Number.isFinite(ref.value)) {
      missing.push(name);
    } else {
      present.push(ref);
      numeric[name] = ref.value;
    }
  }

  // Inputs can share observations (e.g. mapped vs observed sources); the
  // provenance list must stay a stable, de-duplicated set of event ids.
  const eventIds = Array.from(new Set(present.flatMap((p) => p.event_ids)));
  const limitations = [...(ctx.limitations ?? [])];
  const declared = present.filter((p) => p.provenance === 'declared');
  const unattested = declared.filter((p) => p.unattested !== false).map((p) => p.name);
  for (const d of declared) {
    limitations.push(
      `${d.name} is a declared value from ${d.declared_source ?? 'an unnamed source'}, not an observation` +
        `${d.unattested === false ? '.' : '; no attestation for it is on file.'}`,
    );
  }
  if (ctx.data_mode === 'SIMULATED') {
    limitations.unshift('Value derived from simulated inputs; not a measurement of a physical facility.');
  }
  if (ctx.data_mode === 'REPLAYED') {
    limitations.unshift('Value derived from a replayed historical dataset; not a current measurement.');
  }

  const base = {
    metric_name: def.metric_name,
    unit: def.unit,
    formula: def.formula,
    formula_version: def.formula_version,
    inputs: present,
    missing_inputs: missing,
    declared_inputs: declared,
    unattested_inputs: unattested,
    source_event_ids: eventIds,
    aura_asset_id: ctx.aura_asset_id ?? null,
    usd_prim_path: ctx.usd_prim_path ?? null,
    freshness: ctx.freshness,
    last_observed_at: ctx.last_observed_at,
    simulation_run_id: ctx.simulation_run_id ?? null,
    replay_run_id: ctx.replay_run_id ?? null,
    calibration: ctx.calibration ?? 'uncalibrated',
    confidence: ctx.confidence ?? null,
    limitations,
  };

  if (missing.length > 0) {
    return {
      ...base,
      value: null,
      observation_window: ctx.observation_window,
      data_mode: 'UNAVAILABLE',
      validation: 'unavailable',
    };
  }

  let value: number | null = null;
  try {
    const v = def.compute(numeric);
    value = Number.isFinite(v) ? v : null;
  } catch {
    value = null;
  }

  if (value === null) {
    return {
      ...base,
      value: null,
      observation_window: ctx.observation_window,
      data_mode: 'UNAVAILABLE',
      validation: 'invalid',
      missing_inputs: [...missing, 'formula_result'],
    };
  }

  return {
    ...base,
    value,
    observation_window: ctx.observation_window,
    data_mode: ctx.data_mode,
    validation: ctx.freshness === 'stale' ? 'requires_review' : 'validated',
  };
}