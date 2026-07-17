/**
 * Catalog integrity tests (Phase 1A.3.c.1). Verifies that
 *   • every catalog id is unique within its domain,
 *   • no metric is classified `live` (no live sources wired yet),
 *   • fixture-backed metrics name "AURA demonstration fixture" as the
 *     source (not a third-party framework),
 *   • static metrics point at "configured" / "configuration" text,
 *   • sovereignty catalog demonstrates the mixed-classification
 *     requirement (contains static, unavailable, AND demo entries).
 */
import { describe, it, expect } from 'vitest';
import {
  POWER_METRICS,
  COOLING_METRICS,
  THERMAL_METRICS,
  NETWORK_METRICS,
  FACILITY_METRICS,
  WORKLOAD_METRICS,
  SOVEREIGNTY_METRICS,
  CARBON_METRICS,
  FINANCIAL_METRICS,
  INTELLIGENCE_CHART_METRICS,
  INFRASTRUCTURE_OPERATIONAL_METRICS,
} from '@/components/data-centre-twin/domains/metricCatalogs';
import type { MetricCatalogEntry } from '../metricCatalog';

const allCatalogs: Array<[string, MetricCatalogEntry[]]> = [
  ['power',       POWER_METRICS],
  ['cooling',     COOLING_METRICS],
  ['thermal',     THERMAL_METRICS],
  ['network',     NETWORK_METRICS],
  ['facility',    FACILITY_METRICS],
  ['workload',    WORKLOAD_METRICS],
  ['sovereignty', SOVEREIGNTY_METRICS],
  ['carbon',      CARBON_METRICS],
  ['financial',   FINANCIAL_METRICS],
  ['intelligence-charts',      INTELLIGENCE_CHART_METRICS],
  ['infrastructure-operational', INFRASTRUCTURE_OPERATIONAL_METRICS],
];

describe('metric catalog integrity', () => {
  it.each(allCatalogs)('%s catalog has unique ids', (_name, metrics) => {
    const ids = metrics.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(allCatalogs)('%s catalog contains no `live` classifications', (_name, metrics) => {
    for (const m of metrics) expect(m.provenance).not.toBe('live');
  });

  it('fixture-backed metrics use "AURA demonstration fixture" as source', () => {
    for (const [, metrics] of allCatalogs) {
      for (const m of metrics) {
        if (m.provenance === 'demo' && m.source !== 'AURA demonstration fixture') {
          // The only allowed exception is when the source is a specific
          // configured value or engine — flag anything else.
          throw new Error(
            `demo metric "${m.id}" has non-fixture source "${m.source}"`,
          );
        }
      }
    }
  });

  it('static metrics reference a configured value, not a third-party framework', () => {
    for (const [, metrics] of allCatalogs) {
      for (const m of metrics) {
        if (m.provenance === 'static') {
          expect(m.source.toLowerCase()).toMatch(/config|control|state/);
        }
      }
    }
  });

  it('sovereignty catalog demonstrates mixed classification (static + unavailable + demo)', () => {
    const kinds = new Set(SOVEREIGNTY_METRICS.map((m) => m.provenance));
    expect(kinds.has('static')).toBe(true);
    expect(kinds.has('unavailable')).toBe(true);
    expect(kinds.has('demo')).toBe(true);
  });

  it('intelligence chart metrics cite reference material separately from source', () => {
    for (const m of INTELLIGENCE_CHART_METRICS) {
      expect(m.source).toBe('AURA demonstration fixture');
      expect(m.reference).toBeTruthy();
    }
  });
});