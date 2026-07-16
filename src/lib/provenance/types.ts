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