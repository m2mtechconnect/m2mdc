import type {
  DataProvenance,
  ProvenanceMeta,
  FacilityProvenanceMap,
  ProvenancedMetric,
} from './types';

export * from './types';

/**
 * Default meta used when a lookup finds no entry — enforces the
 * "missing provenance never defaults to live" rule.
 */
export const UNAVAILABLE_META: ProvenanceMeta = {
  provenance: 'unavailable',
  source: 'unknown',
  connection: 'unavailable',
  note: 'No provenance recorded — treated as unavailable.',
};

/** Safe lookup that never returns undefined. */
export function getProvenance(
  map: Partial<FacilityProvenanceMap> | undefined,
  key: keyof FacilityProvenanceMap,
): ProvenanceMeta {
  return map?.[key] ?? UNAVAILABLE_META;
}

/** Short human label for a provenance tag (used by the badge). */
export function provenanceLabel(p: DataProvenance): string {
  switch (p) {
    case 'live':        return 'Live';
    case 'derived':     return 'Derived';
    case 'simulated':   return 'Simulation';
    case 'demo':        return 'Demo data';
    case 'static':      return 'Static target';
    case 'unavailable': return 'Unavailable';
  }
}

/** True if a value is safe to present as an operational reading. */
export function isOperational(p: DataProvenance): boolean {
  return p === 'live' || p === 'derived';
}

/**
 * Build a meta for a value derived from a validated live payload.
 * Enforces that a `derived` meta must reference the same source.
 */
export function derivedFrom(source: ProvenanceMeta, note?: string): ProvenanceMeta {
  if (source.provenance !== 'live' && source.provenance !== 'derived') {
    // A value derived from a non-live source cannot itself be live/derived.
    return { ...source, provenance: source.provenance, note: note ?? source.note };
  }
  return {
    provenance: 'derived',
    source: source.source,
    at: source.at,
    stale: source.stale,
    connection: source.connection,
    note,
  };
}

// ---------------------------------------------------------------------------
// ProvenancedMetric<T> helpers (Phase 1A.1)
// ---------------------------------------------------------------------------

/** Explicit "no value" metric — the canonical way to render an empty KPI. */
export function unavailableMetric<T>(
  sourceName: string,
  description?: string,
): ProvenancedMetric<T> {
  return {
    value: null,
    provenance: 'unavailable',
    sourceName,
    description,
  };
}

/** Build a `live` metric from a validated source observation. */
export function liveMetric<T>(
  value: T,
  sourceName: string,
  sourceTimestamp: Date | string,
  extra?: Partial<Pick<ProvenancedMetric<T>, 'isStale' | 'description'>>,
): ProvenancedMetric<T> {
  return {
    value,
    provenance: 'live',
    sourceName,
    sourceTimestamp: typeof sourceTimestamp === 'string' ? sourceTimestamp : sourceTimestamp.toISOString(),
    isStale: extra?.isStale ?? false,
    description: extra?.description,
  };
}

/**
 * Build a `demo` metric — value comes from a `synth*` helper or fixture.
 * MUST be used by every synthesized reading so it cannot be rendered as
 * `live` downstream.
 */
export function demoMetric<T>(value: T, sourceName = 'demo-fixture', description?: string): ProvenancedMetric<T> {
  return { value, provenance: 'demo', sourceName, description };
}

/**
// `simulatedMetric<T>` lives in `./kitMetrics` and is re-exported here so
// there is exactly one canonical implementation in the codebase. Phase
// 1A.3.b2 collapsed a parallel copy that had drifted from the 5-arg
// (value, sourceName, modelVersion, derivation?, description?) shape used
// by every real caller.
export { simulatedMetric } from './kitMetrics';

/** Static configured target / benchmark. Values here are user/config supplied. */
export function staticMetric<T>(value: T, sourceName: string, description?: string): ProvenancedMetric<T> {
  return { value, provenance: 'static', sourceName, description };
}

/**
 * Derive a metric from a `live`/`derived` source metric. Refuses to upgrade a
 * non-live/derived source to `derived` — falls back to the source provenance.
 */
export function deriveMetric<TIn, TOut>(
  source: ProvenancedMetric<TIn>,
  compute: (v: TIn) => TOut,
  derivation: string,
): ProvenancedMetric<TOut> {
  if (source.value === null) {
    return {
      value: null,
      provenance: 'unavailable',
      sourceName: source.sourceName,
      sourceTimestamp: source.sourceTimestamp,
      derivation,
    };
  }
  const upgradable = source.provenance === 'live' || source.provenance === 'derived';
  return {
    value: compute(source.value),
    provenance: upgradable ? 'derived' : source.provenance,
    sourceName: source.sourceName,
    sourceTimestamp: source.sourceTimestamp,
    isStale: source.isStale,
    derivation,
  };
}

/** True when the metric is safe to present as an operational reading. */
export function isOperationalMetric<T>(m: ProvenancedMetric<T>): boolean {
  return m.value !== null && (m.provenance === 'live' || m.provenance === 'derived');
}