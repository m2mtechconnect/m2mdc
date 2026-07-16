/**
 * Canonical data provenance model for AURA (Phase 1A, ADR-0004).
 *
 * Every operational KPI, section, or time-series value surfaced in the UI
 * MUST carry a `DataProvenance` tag. Missing provenance is treated as
 * `unavailable` — it is never allowed to default to `live`.
 */

export type DataProvenance =
  | 'live'          // Value received directly from a validated external source, non-stale.
  | 'derived'       // Value computed exclusively from validated `live` inputs.
  | 'simulated'     // Value produced by a scenario simulation run.
  | 'demo'          // Value produced by `synth*` helpers / demo fixtures.
  | 'static'        // Configured target, threshold, or benchmark.
  | 'unavailable';  // Missing, invalid, stale, or unreachable source.

/** Human-readable connection state for external sources. */
export type SourceConnectionState =
  | 'disabled'    // Source disabled by configuration (feature flag off).
  | 'connecting'  // Handshake / initial fetch in flight.
  | 'connected'   // Reachable and returning valid payloads.
  | 'degraded'    // Reachable but partial / stale / schema-mismatch payloads.
  | 'unavailable' // Unreachable or repeated validation failure.
  | 'demo';       // No source attempted; demo scaffolding in use.

/**
 * Metadata attached to any provenanced value.
 *
 * `source` identifies the ultimate origin. `at` is the freshest source
 * timestamp. `stale` is true when `at` is older than the configured freshness
 * budget for that source.
 */
export interface ProvenanceMeta {
  provenance: DataProvenance;
  source: string;              // e.g. 'omniverse-kit', 'demo-fixture', 'user-config'.
  at?: Date;                   // Freshest known observation timestamp, if known.
  stale?: boolean;             // True when `at` exceeds source freshness budget.
  connection?: SourceConnectionState;
  note?: string;               // Optional short human-readable context.
}

/** Wraps any value with its provenance metadata. */
export interface Provenanced<T> {
  value: T;
  meta: ProvenanceMeta;
}

/**
 * Metric-level provenance envelope (Phase 1A.1).
 *
 * Every KPI, gauge, or scalar surfaced in the UI SHOULD be represented as a
 * `ProvenancedMetric<T>` so that the value cannot be rendered without a
 * provenance tag. A `null` `value` is legal and REQUIRED when provenance is
 * `unavailable` — components must render an "unavailable" affordance rather
 * than a fabricated number.
 *
 * Fields:
 *  - `value`           — numeric/string reading, or `null` when unavailable.
 *  - `provenance`      — canonical provenance tag.
 *  - `sourceName`      — human/system identifier of the ultimate source.
 *  - `sourceTimestamp` — ISO-8601 timestamp of the source observation.
 *  - `isStale`         — true when timestamp exceeds freshness budget.
 *  - `derivation`      — short expression describing how `derived`/`simulated`
 *                        values are computed, referenced back to `live`
 *                        inputs.
 *  - `modelVersion`    — simulation / scoring model identifier for
 *                        `simulated` and `derived` values.
 *  - `description`     — optional human context (units, caveats).
 */
export interface ProvenancedMetric<T> {
  value: T | null;
  provenance: DataProvenance;
  sourceName?: string;
  sourceTimestamp?: string;
  isStale?: boolean;
  derivation?: string;
  modelVersion?: string;
  description?: string;
}

/**
 * Section-level provenance map for a `DataCentreFacility`.
 * Each key corresponds to a top-level facility section or KPI cluster.
 * Missing keys imply `unavailable` — see `getProvenance()`.
 */
export interface FacilityProvenanceMap {
  facility: ProvenanceMeta;
  pue: ProvenanceMeta;
  totalPower: ProvenanceMeta;
  gpuUtilization: ProvenanceMeta;
  thermal: ProvenanceMeta;
  cooling: ProvenanceMeta;
  network: ProvenanceMeta;
  facilitySafety: ProvenanceMeta;
  sovereignty: ProvenanceMeta;
  carbon: ProvenanceMeta;
  auditReadiness: ProvenanceMeta;
  alerts: ProvenanceMeta;
  timeSeries: ProvenanceMeta;
}