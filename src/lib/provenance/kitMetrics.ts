/**
 * Kit → ProvenancedMetric factory (Phase 1A.1, item 3).
 *
 * Bridges the discriminated `KitFetchOutcome` returned by
 * `fetchStatusValidated()` (and re-exposed by `useOmniverseKit`) to the
 * `ProvenancedMetric<T>` primitive that UI surfaces render alongside a
 * `ProvenanceBadge`.
 *
 * Contract:
 *   - Kit `connected` + reading present → `live`
 *   - Kit `connected` but reading missing/NaN → `unavailable`
 *   - Kit `disabled` (env off / feature flag off) → `demo` with `value` still
 *     accepted from the demo scaffolding, so the KPI card can render a
 *     placeholder without pretending it is live.
 *   - Kit `unavailable` or `invalid` payload → `unavailable`, `value: null`
 *     (the caller MUST render an "unavailable" affordance).
 *   - `derivedKitMetric()` computes exclusively from a `live` source metric
 *     and produces `derived`; a non-live source falls back to `demo`/
 *     `unavailable` — it is NEVER upgraded.
 */

import type {
  ProvenancedMetric,
  DataProvenance,
  SourceConnectionState,
} from '@/lib/provenance/types';

export const KIT_SOURCE_NAME = 'omniverse-kit';

export interface KitMetricContext {
  connectionState: SourceConnectionState;
  provenance: DataProvenance;   // Section-level provenance from useOmniverseKit.
  observedAt?: Date;
  demoSourceName?: string;      // Overrides KIT_SOURCE_NAME when in demo.
}

/**
 * Build a metric from a numeric Kit reading. Pass `undefined`/`null`/`NaN`
 * for `value` when the field is missing — the metric will render as
 * `unavailable` (never `live`).
 */
export function kitMetric(
  value: number | null | undefined,
  ctx: KitMetricContext,
  opts?: { description?: string; sourceName?: string },
): ProvenancedMetric<number> {
  const source = opts?.sourceName ?? (ctx.provenance === 'demo' ? (ctx.demoSourceName ?? 'demo-fixture') : KIT_SOURCE_NAME);
  const description = opts?.description;
  const missing = value === null || value === undefined || Number.isNaN(value);

  // Connection took precedence: schema-invalid / network-down → unavailable.
  if (ctx.connectionState === 'unavailable') {
    return { value: null, provenance: 'unavailable', sourceName: source, description };
  }
  if (missing) {
    return { value: null, provenance: 'unavailable', sourceName: source, description };
  }

  // Connected & valid → live. Everything else (disabled/demo/degraded) → demo.
  if (ctx.connectionState === 'connected' && ctx.provenance === 'live') {
    return {
      value,
      provenance: 'live',
      sourceName: source,
      sourceTimestamp: ctx.observedAt?.toISOString(),
      isStale: false,
      description,
    };
  }
  return {
    value,
    provenance: 'demo',
    sourceName: source,
    description,
  };
}

/**
 * Configured target / threshold. Always `static`; NEVER conflated with a
 * reading. Rendered as e.g. "Target PUE: <1.30 [Static target]".
 */
export function targetMetric(
  value: number,
  sourceName: string,
  description?: string,
): ProvenancedMetric<number> {
  return { value, provenance: 'static', sourceName, description };
}

/**
 * Placeholder for a KPI whose datasource has not yet been wired
 * (e.g. sovereignty assessment on the current build). Renders as
 * "Not assessed" via the `unavailable` badge.
 */
export function notAssessedMetric<T>(sourceName: string, description?: string): ProvenancedMetric<T> {
  return {
    value: null,
    provenance: 'unavailable',
    sourceName,
    description: description ?? 'Not assessed by any wired data source.',
  };
}

/**
 * Simulation output. `modelVersion` is required so operators can trace which
 * scenario engine produced the delta.
 */
export function simulatedMetric<T>(
  value: T,
  sourceName: string,
  modelVersion: string,
  derivation?: string,
  description?: string,
): ProvenancedMetric<T> {
  return {
    value,
    provenance: 'simulated',
    sourceName,
    modelVersion,
    derivation,
    description,
  };
}

/**
 * Derive one metric from another, refusing to upgrade non-live sources.
 * Mirrors `deriveMetric()` but keeps the Kit-specific semantics local so
 * consumer files import from a single place.
 */
export function derivedKitMetric<TIn, TOut>(
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