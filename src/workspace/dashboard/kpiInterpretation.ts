/**
 * Stage 7A - interpretation layer for modelled KPIs.
 *
 * The dashboard must never invent a favourable state, a trend or measured
 * telemetry. Every state below is derived from the same modelled values the
 * KPI itself is derived from, compared against a design target that exists in
 * the facility definition. When no defensible target exists the state is
 * `unknown` and the card says so.
 */
import { KPI_DESCRIPTORS, formatKpi, type FacilityDefinition, type KpiKey, type KpiValues } from '../facilityModel';

export type KpiState = 'within' | 'watch' | 'constraint' | 'unknown' | 'unavailable';

export interface KpiStateMeta {
  label: string;
  /** Semantic token classes only - colour is never the sole signal. */
  className: string;
  dotClassName: string;
}

export const KPI_STATE_META: Record<KpiState, KpiStateMeta> = {
  within: {
    label: 'Within design target',
    className: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
    dotClassName: 'bg-emerald-600',
  },
  watch: {
    label: 'Watch',
    className: 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    dotClassName: 'bg-amber-600',
  },
  constraint: {
    label: 'Design constraint',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    dotClassName: 'bg-destructive',
  },
  unknown: {
    label: 'Unknown',
    className: 'border-border bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
  unavailable: {
    label: 'Unavailable',
    className: 'border-border bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
};

export interface KpiInterpretation {
  key: KpiKey;
  label: string;
  value: string;
  state: KpiState;
  stateLabel: string;
  /** Baseline / target sentence. Empty when no target exists. */
  comparison: string;
  /** Fraction 0..1 used for the small bar indicator, or null when undefined. */
  fill: number | null;
}

function pct(value: number, of: number): string {
  if (!Number.isFinite(of) || of === 0) return '';
  const delta = ((value - of) / of) * 100;
  const direction = delta < 0 ? 'lower' : 'higher';
  return `${Math.abs(delta).toFixed(1)}% ${direction}`;
}

export function interpretKpi(
  key: KpiKey,
  values: KpiValues,
  facility: FacilityDefinition,
): KpiInterpretation {
  const descriptor = KPI_DESCRIPTORS[key];
  const raw = values[key];
  const base = {
    key,
    label: descriptor.label,
    value: Number.isFinite(raw) ? formatKpi(key, raw) : 'Unavailable',
  };

  if (!Number.isFinite(raw)) {
    return { ...base, state: 'unavailable', stateLabel: KPI_STATE_META.unavailable.label, comparison: 'No modelled value produced for this indicator.', fill: null };
  }

  switch (key) {
    case 'pue': {
      const target = facility.pueTarget;
      if (!Number.isFinite(target) || target <= 0) {
        return { ...base, state: 'unknown', stateLabel: 'Unknown', comparison: 'No design PUE target stored for this facility.', fill: null };
      }
      const state: KpiState = raw <= target ? 'within' : raw <= target * 1.05 ? 'watch' : 'constraint';
      return {
        ...base,
        state,
        stateLabel: KPI_STATE_META[state].label,
        comparison: `Design target ${target.toFixed(2)} · ${pct(raw, target)}`,
        fill: Math.min(1, target / raw),
      };
    }
    case 'capacityHeadroom': {
      const state: KpiState = raw >= 20 ? 'within' : raw >= 12 ? 'watch' : 'constraint';
      return {
        ...base,
        state,
        stateLabel: KPI_STATE_META[state].label,
        comparison: 'Design guidance: keep at least 20% modelled headroom',
        fill: raw / 100,
      };
    }
    case 'thermalStability': {
      const state: KpiState = raw >= 90 ? 'within' : raw >= 80 ? 'watch' : 'constraint';
      return {
        ...base,
        state,
        stateLabel: KPI_STATE_META[state].label,
        comparison: 'Design guidance: 90% or above at the modelled setpoint',
        fill: raw / 100,
      };
    }
    case 'itLoadKw': {
      const ratio = facility.capacityKw > 0 ? raw / facility.capacityKw : NaN;
      if (!Number.isFinite(ratio)) {
        return { ...base, state: 'unknown', stateLabel: 'Unknown', comparison: 'Design capacity is not available for comparison.', fill: null };
      }
      const state: KpiState = ratio <= 0.8 ? 'within' : ratio <= 0.88 ? 'watch' : 'constraint';
      return {
        ...base,
        state,
        stateLabel: KPI_STATE_META[state].label,
        comparison: `${(ratio * 100).toFixed(0)}% of modelled design capacity`,
        fill: ratio,
      };
    }
    case 'carbonIntensity': {
      const gridBaseline = facility.carbonIntensity;
      if (!Number.isFinite(gridBaseline) || gridBaseline <= 0) {
        return { ...base, state: 'unknown', stateLabel: 'Unknown', comparison: 'No stored grid carbon intensity to compare against.', fill: null };
      }
      const state: KpiState = raw <= gridBaseline * 0.75 ? 'within' : raw <= gridBaseline ? 'watch' : 'constraint';
      return {
        ...base,
        state,
        stateLabel: KPI_STATE_META[state].label,
        comparison: `Grid baseline ${gridBaseline.toFixed(0)} gCO2e/kWh · ${pct(raw, gridBaseline)}`,
        fill: Math.min(1, raw / gridBaseline),
      };
    }
    case 'sovereigntyScore': {
      const state: KpiState = raw >= 85 ? 'within' : raw >= 70 ? 'watch' : 'constraint';
      return {
        ...base,
        state,
        stateLabel: KPI_STATE_META[state].label,
        comparison: 'Derived from configured sovereignty level and residency region',
        fill: raw / 100,
      };
    }
    default: {
      return { ...base, state: 'unknown', stateLabel: 'Unknown', comparison: 'No design target is defined for this indicator.', fill: null };
    }
  }
}