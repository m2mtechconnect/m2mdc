/**
 * Freshness policy (Phase 1A.1, item 8).
 *
 * Central table of maximum observation ages per source class. When a live
 * metric's `sourceTimestamp` is older than the class budget, the metric is
 * flagged `isStale: true`. Any consumer of `deriveMetric` MUST refuse to
 * treat stale inputs as current — a derived value computed from a stale
 * input is degraded to `unavailable` (see `deriveIfFresh`).
 *
 * Values are chosen to be conservative defaults for a demonstration build.
 * Real telemetry integrations will override via environment configuration in
 * Phase 1B.
 */

import type { ProvenancedMetric } from './types';

export type SourceClass =
  | 'gpu'          // GPU utilization, GPU power draw
  | 'facility'     // Facility / rack power, PDU readings
  | 'thermal'      // Rack / aisle temperature
  | 'cooling'      // Chiller, CRAC, water loop
  | 'network'      // Fabric telemetry
  | 'carbon';      // Grid carbon intensity feed

/** Maximum observation age (ms) before a live reading is considered stale. */
export const FRESHNESS_BUDGET_MS: Record<SourceClass, number> = {
  gpu:       15_000,   // 15s
  facility:  60_000,   // 1m
  thermal:   30_000,   // 30s
  cooling:   60_000,   // 1m
  network:   30_000,   // 30s
  carbon:    15 * 60_000, // 15m (grid feeds refresh slowly)
};

/** Returns true when `at` is older than the budget for `sourceClass`. */
export function isStale(
  at: Date | string | undefined,
  sourceClass: SourceClass,
  now: Date = new Date(),
): boolean {
  if (!at) return true;
  const t = typeof at === 'string' ? new Date(at) : at;
  if (Number.isNaN(t.getTime())) return true;
  return now.getTime() - t.getTime() > FRESHNESS_BUDGET_MS[sourceClass];
}

/**
 * Re-evaluate a metric's staleness. If the metric is `live` and its timestamp
 * exceeds the freshness budget, return a copy with `isStale: true`. Non-live
 * metrics are returned unchanged (they were never presented as current).
 */
export function withStalenessCheck<T>(
  m: ProvenancedMetric<T>,
  sourceClass: SourceClass,
  now: Date = new Date(),
): ProvenancedMetric<T> {
  if (m.provenance !== 'live' && m.provenance !== 'derived') return m;
  const stale = isStale(m.sourceTimestamp, sourceClass, now);
  if (stale === (m.isStale ?? false)) return m;
  return { ...m, isStale: stale };
}

/**
 * Compute a derived metric only if the source is fresh AND live/derived. A
 * stale, demo, static or unavailable source degrades the output to
 * `unavailable` — it MUST NOT remain current.
 */
export function deriveIfFresh<TIn, TOut>(
  source: ProvenancedMetric<TIn>,
  sourceClass: SourceClass,
  compute: (v: TIn) => TOut,
  derivation: string,
  now: Date = new Date(),
): ProvenancedMetric<TOut> {
  const upgradable = source.provenance === 'live' || source.provenance === 'derived';
  const fresh = upgradable && source.value !== null && !isStale(source.sourceTimestamp, sourceClass, now);
  if (!fresh || source.value === null) {
    return {
      value: null,
      provenance: 'unavailable',
      sourceName: source.sourceName,
      sourceTimestamp: source.sourceTimestamp,
      derivation,
      description: source.provenance === 'live' || source.provenance === 'derived'
        ? 'Required input is stale; derived value withheld.'
        : `Required input has provenance "${source.provenance}"; derived value withheld.`,
    };
  }
  return {
    value: compute(source.value),
    provenance: 'derived',
    sourceName: source.sourceName,
    sourceTimestamp: source.sourceTimestamp,
    isStale: false,
    derivation,
  };
}