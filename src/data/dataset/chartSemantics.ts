/**
 * Series semantics for every chart rendered from dataset-backed records.
 *
 * The full UX audit found point-in-time reference values rendered as line
 * charts, sparklines and trend arrows, which implies a measured history that
 * does not exist. This module is the one typed gate: a series must classify
 * itself, and only classifications that genuinely contain multiple timestamped
 * observations are allowed into a trend renderer.
 */
import type { ValueClassification } from './valueClassification';

export type SeriesClassification =
  | 'POINT_IN_TIME'
  | 'TRUE_TIME_SERIES'
  | 'SIMULATED_SERIES'
  | 'DERIVED_SERIES'
  | 'UNAVAILABLE';

export const SERIES_LABEL: Record<SeriesClassification, string> = {
  POINT_IN_TIME: 'Reference value (point in time)',
  TRUE_TIME_SERIES: 'Observed time series',
  SIMULATED_SERIES: 'AURA-simulated series (not measured)',
  DERIVED_SERIES: 'AURA-derived series (not measured)',
  UNAVAILABLE: 'Historical trend unavailable',
};

/** Renderers that imply history. Nothing point-in-time may reach these. */
export const TREND_RENDERERS = [
  'line',
  'area',
  'sparkline',
  'trend-arrow',
  'animated-history',
] as const;
export type TrendRenderer = (typeof TREND_RENDERERS)[number];

export interface SeriesObservation {
  timestamp: string;
  value: number;
}

export interface SeriesDescriptor {
  classification: SeriesClassification;
  unit: string | null;
  source: string | null;
  observations: readonly SeriesObservation[];
  /** Scenario or run identity for simulated / derived series. */
  runId?: string | null;
  timeRange?: { from: string; to: string } | null;
}

/** A series is a genuine trend only with >= 2 timestamped observations, a unit, source and range. */
export function isTrendRenderable(series: SeriesDescriptor): boolean {
  if (series.classification === 'POINT_IN_TIME' || series.classification === 'UNAVAILABLE') {
    return false;
  }
  if (series.observations.length < 2) return false;
  if (!series.unit || !series.source) return false;
  if (!series.timeRange || !series.timeRange.from || !series.timeRange.to) return false;
  if (series.classification !== 'TRUE_TIME_SERIES' && !series.runId) return false;
  return true;
}

/** How a series must be presented when it is not a legitimate trend. */
export type SnapshotPresentation =
  | 'snapshot-kpi'
  | 'reference-value-card'
  | 'specification-row'
  | 'comparison-table'
  | 'unavailable-state';

export function presentationFor(series: SeriesDescriptor): SnapshotPresentation | TrendRenderer {
  if (series.classification === 'UNAVAILABLE') return 'unavailable-state';
  if (isTrendRenderable(series)) return 'line';
  if (series.observations.length === 1) return 'snapshot-kpi';
  if (series.observations.length === 0) return 'unavailable-state';
  return 'reference-value-card';
}

/**
 * Throwing gate for trend components. Called by chart primitives so a single
 * reference value cannot silently become a history.
 */
export function assertTrendAllowed(series: SeriesDescriptor, renderer: TrendRenderer): void {
  if (!isTrendRenderable(series)) {
    throw new Error(
      `Refusing to render ${series.classification} as "${renderer}": ${SERIES_LABEL[series.classification]}.`,
    );
  }
}

/** Map a value classification onto the strictest series classification it can support. */
export function seriesClassificationFor(value: ValueClassification): SeriesClassification {
  switch (value) {
    case 'SIMULATED_RESULT':
      return 'SIMULATED_SERIES';
    case 'DERIVED_VALUE':
      return 'DERIVED_SERIES';
    case 'UNAVAILABLE':
    case 'NOT_SUPPLIED':
    case 'NOT_CONNECTED':
      return 'UNAVAILABLE';
    default:
      return 'POINT_IN_TIME';
  }
}
