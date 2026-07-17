/**
 * Metric-level provenance catalog (Phase 1A.3.c.1).
 *
 * Every visible KPI, status pill, score, alert, or chart series on an
 * operational surface must be enumerable and independently classified.
 * A domain-view root cannot cover mixed content — a facility may show
 * *configured facts* (static), *example measurements* (demo), and
 * *unsupported readings* (unavailable) side-by-side.
 *
 * A catalog is an ordered array of `MetricCatalogEntry` values. The
 * `MetricProvenanceManifest` component renders one accessible entry
 * per catalog item and emits per-metric `data-metric-id` +
 * `data-provenance` attributes so tests and Playwright can enumerate.
 *
 * Rules:
 *   • `id` is stable and unique within its domain — tests reference it.
 *   • `source` is the *actual* origin. Reference material (Uptime
 *     Institute, ASHRAE, ISO 27001 text) is described in `reference`,
 *     not `source`, unless the value is directly traceable to it.
 *   • Never promote a fixture to `live` at classification time.
 */

import type { DataProvenance } from './types';

export interface MetricCatalogEntry {
  /** Stable id, unique within domain. Kebab-case. */
  id: string;
  /** Human-readable label as shown in the UI. */
  label: string;
  /** Provenance classification for this specific metric. */
  provenance: DataProvenance;
  /**
   * Actual data source (e.g. `AURA demonstration fixture`,
   * `sovereignty engine (rules)`, `facility configuration`).
   * Do not put third-party frameworks here unless the value is
   * literally sourced from them.
   */
  source: string;
  /**
   * Optional reference material context. Displayed as
   * "Reference: <text>". Free-form.
   */
  reference?: string;
  /** Short accessible description sentence. */
  description?: string;
}

export interface DomainMetricCatalog {
  domain: string;
  metrics: MetricCatalogEntry[];
}

/**
 * Assert at module import time that every id in a catalog is unique.
 * Guards against silent duplicates when catalogs grow.
 */
export function defineCatalog(
  domain: string,
  metrics: MetricCatalogEntry[],
): DomainMetricCatalog {
  const seen = new Set<string>();
  for (const m of metrics) {
    if (seen.has(m.id)) {
      throw new Error(
        `[metricCatalog] duplicate metric id "${m.id}" in domain "${domain}"`,
      );
    }
    seen.add(m.id);
  }
  return { domain, metrics };
}

/** Sentence used for both tooltip and sr-only description. */
export function describeMetric(m: MetricCatalogEntry): string {
  switch (m.provenance) {
    case 'live':
      return `${m.label}: live measurement from ${m.source}.`;
    case 'derived':
      return `${m.label}: derived from ${m.source}. Not a direct measurement.`;
    case 'simulated':
      return `${m.label}: simulated by ${m.source}. Not a real measurement.`;
    case 'demo':
      return `${m.label}: demonstration value from ${m.source}. Not a real measurement.`;
    case 'static':
      return `${m.label}: configured reference from ${m.source}. Not a live reading.`;
    case 'unavailable':
      return `${m.label}: not assessed. No supporting data from ${m.source}.`;
  }
}