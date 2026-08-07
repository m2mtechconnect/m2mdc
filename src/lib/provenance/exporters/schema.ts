/**
 * Canonical provenance-preserving export schema (Phase 1A.3.d).
 *
 * A single record shape drives CSV, JSON, and PDF/print outputs so that
 * every export retains per-metric provenance. Callers convert their
 * `ProvenancedMetric<T>` + `MetricCatalogEntry` pairs into
 * `ExportRecord`s using `toExportRecord()`; the serializers accept only
 * that shape.
 *
 * Invariants (enforced by `toExportRecord` and covered by tests):
 *   • `unavailable` provenance always produces `value: null` — never
 *     zero, never a fabricated fallback.
 *   • `static` and `unavailable` records never carry `observedAt`.
 *   • `stale` or `invalid` sources cannot be exported as `live` — the
 *     record is downgraded to `unavailable` before serialization.
 *   • The record's `observedAt` timestamp is a metric observation time.
 *     It is deliberately separate from the payload's `generatedAt`
 *     (export-generation time) which lives on `ExportPayload`.
 */

import type { DataProvenance } from '../types';
import type { ProvenancedMetric } from '../types';
import type { MetricCatalogEntry } from '../metricCatalog';
import {
  ACTIVE_MODE,
  INPUT_CLASSIFICATION,
  SIMULATION_SOURCE,
  activeScenarioLabel,
} from '@/capabilities/operatingState';
import { getRunProvenance } from '@/capabilities/runProvenance';

/**
 * Stage 5 truth block. Every serialized artefact must carry it so a file
 * that leaves the product cannot be mistaken for live or NVIDIA-generated
 * output.
 */
export interface ExportOperatingState {
  operatingMode: string;
  inputClassification: string;
  simulationRunId: string | null;
  scenario: string;
  calculationTimestamp: string | null;
  sourceGenerator: string;
  humanReviewStatus: string;
  nvidiaRuntimeUsed: 'No' | 'Yes';
  liveFacilityDataUsed: 'No' | 'Yes';
  knownLimitations: string;
}

export const EXPORT_KNOWN_LIMITATIONS =
  'Values are produced by a deterministic AURA simulation with synthetic inputs. Not calibrated against a physical facility. No OpenUSD stage, SimReady-validated asset or DSX Exchange transport is involved.';

/** Build the truth block from live capability state (no fabrication). */
export function buildExportOperatingState(
  overrides?: Partial<ExportOperatingState>,
): ExportOperatingState {
  const run = getRunProvenance();
  return {
    operatingMode: ACTIVE_MODE,
    inputClassification: INPUT_CLASSIFICATION,
    simulationRunId: run.runId,
    scenario: activeScenarioLabel(),
    calculationTimestamp: run.calculatedAt,
    sourceGenerator: SIMULATION_SOURCE,
    humanReviewStatus: 'Not reviewed',
    nvidiaRuntimeUsed: 'No',
    liveFacilityDataUsed: 'No',
    knownLimitations: EXPORT_KNOWN_LIMITATIONS,
    ...overrides,
  };
}

/** Bump when the record shape changes in a breaking way. */
export const EXPORT_SCHEMA_VERSION = '1.0.0';

/** Canonical export record — the ONLY shape serializers accept. */
export interface ExportRecord {
  /** Stable metric id from the catalog. */
  metricId: string;
  /** Human label as shown in the UI. */
  metricName: string;
  /** Value or `null` when unavailable. Never a fabricated fallback. */
  value: number | string | null;
  /** Unit string, or `null` if not applicable. */
  unit: string | null;
  /** Post-downgrade provenance classification. */
  provenance: DataProvenance;
  /** Human/system source label (catalog `source`). */
  source: string;
  /**
   * ISO-8601 metric observation time. Only present for live / derived
   * / simulated / demo values that have a real observation timestamp.
   * Never invented for static or unavailable metrics.
   */
  observedAt: string | null;
  /** True when the source timestamp exceeds its freshness budget. */
  stale: boolean;
  /** Optional short human context (units, caveats). */
  description?: string;
  /**
   * Reason a record was downgraded from its declared provenance
   * (`stale`, `invalid`, `unavailable-input`). Absent for clean records.
   */
  downgradeReason?: 'stale' | 'invalid' | 'unavailable-input';
}

/** Envelope shared by every serialized artefact. */
export interface ExportPayload {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  /** Origin surface (e.g. `intelligence.pue-trend`). */
  surface: string;
  /** Human title used in PDF/print output. */
  title: string;
  /** Export-generation time (NOT a metric observation time). */
  generatedAt: string;
  records: ExportRecord[];
  /** Optional per-payload note (surface-level provenance summary). */
  note?: string;
  /** Stage 5 operating-state truth block. Defaulted by the serializers. */
  operatingState?: ExportOperatingState;
}

export interface BuildRecordInput<T = number | string> {
  catalog: MetricCatalogEntry;
  metric: ProvenancedMetric<T>;
  unit?: string | null;
}

/**
 * Convert a `(catalog, metric)` pair to a canonical `ExportRecord`.
 *
 * Enforces the invariants above: a metric that is stale, invalid, or
 * has a `null` value with non-`unavailable` provenance is downgraded to
 * `unavailable` and its `value` becomes `null`. Observation timestamps
 * are stripped for `static` / `unavailable`.
 */
export function toExportRecord(input: BuildRecordInput): ExportRecord {
  const { catalog, metric, unit } = input;

  let provenance: DataProvenance = catalog.provenance;
  let downgradeReason: ExportRecord['downgradeReason'];
  let value: number | string | null =
    typeof metric.value === 'number' || typeof metric.value === 'string'
      ? metric.value
      : null;

  // Fail-closed: a metric may not export live/derived/simulated/demo
  // if its own provenance is unavailable or its value is missing.
  if (metric.provenance === 'unavailable' || value === null) {
    if (provenance !== 'unavailable' && provenance !== 'static') {
      downgradeReason = value === null ? 'unavailable-input' : 'invalid';
      provenance = 'unavailable';
    }
    value = null;
  }

  // Fail-closed: stale live/derived values cannot export as live.
  if (metric.isStale && (provenance === 'live' || provenance === 'derived')) {
    provenance = 'unavailable';
    downgradeReason = 'stale';
    value = null;
  }

  // Static and unavailable metrics never carry observation times.
  const observedAt =
    provenance === 'static' || provenance === 'unavailable'
      ? null
      : metric.sourceTimestamp ?? null;

  return {
    metricId: catalog.id,
    metricName: catalog.label,
    value,
    unit: unit ?? null,
    provenance,
    source: catalog.source,
    observedAt,
    stale: Boolean(metric.isStale) && provenance !== 'unavailable' ? true : provenance === 'unavailable' && downgradeReason === 'stale',
    description: catalog.description ?? metric.description,
    ...(downgradeReason ? { downgradeReason } : {}),
  };
}

/**
 * Reason a surface is not exportable. Consumed by
 * `describeExportBlock()` to render a user-facing tooltip and to
 * disable the export control.
 */
export type ExportBlockReason =
  | 'no-audited-source'
  | 'sovereignty-not-assessed'
  | 'metric-catalog-missing'
  | 'value-map-missing';

export function describeExportBlock(reason: ExportBlockReason): string {
  switch (reason) {
    case 'no-audited-source':
      return 'Export disabled: this report requires an audited data source. AURA has no upstream telemetry integration yet, so any file would carry demonstration values only.';
    case 'sovereignty-not-assessed':
      return 'Export disabled: sovereignty score and audit readiness are not assessed. See docs/remediation/random-and-synthetic-data-register.md.';
    case 'metric-catalog-missing':
      return 'Export disabled: no metric catalog is registered for this surface, so per-metric provenance cannot be attached.';
    case 'value-map-missing':
      return 'Export disabled: the value map for this surface is not wired to the catalog.';
  }
}