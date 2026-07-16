import type { DataProvenance, ProvenanceMeta, FacilityProvenanceMap } from './types';

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