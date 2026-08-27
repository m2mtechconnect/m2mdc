/**
 * Phase 1A.3.c — IntelligenceDashboard chart-array provenance regression.
 *
 * The former InfrastructurePage was retired (the /infrastructure path is an
 * alias to /evidence/assets), so its assertions and metric catalog were
 * removed with it.
 *
 * Scope note. IntelligenceDashboard is a Supabase-backed route with a
 * large data-fetch graph; wiring the full page under jsdom would drag
 * in i18n, react-query, and auth providers. What we care about here is
 * narrow and testable in isolation: the PUE and Energy chart cards
 * must expose `data-provenance="demo"` and carry the shared
 * DomainProvenanceHeader. We assert that on the retrofitted markup by
 * scanning the source file — this makes the test resilient to unrelated
 * page changes while still catching a truth-in-UI regression (e.g. a
 * future edit that swaps in a `live` badge).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INTELLIGENCE_CHART_METRICS } from '@/components/data-centre-twin/domains/metricCatalogs';

const intelligenceSrc = readFileSync(
  resolve(__dirname, '../IntelligenceDashboard.tsx'),
  'utf8',
);
describe('IntelligenceDashboard — chart-array provenance retrofit', () => {
  it('PUE Trend card is tagged demo and imports the header primitive', () => {
    expect(intelligenceSrc).toMatch(
      /data-testid="intelligence-pue-trend-card"[^>]*data-provenance="demo"|data-provenance="demo"[^>]*data-testid="intelligence-pue-trend-card"/,
    );
    expect(intelligenceSrc).toMatch(/DomainProvenanceHeader/);
    expect(intelligenceSrc).toMatch(/pueChartProvenance/);
  });

  it('Power vs IT Load card is tagged demo', () => {
    expect(intelligenceSrc).toMatch(
      /data-testid="intelligence-energy-vs-load-card"[^>]*data-provenance="demo"|data-provenance="demo"[^>]*data-testid="intelligence-energy-vs-load-card"/,
    );
    expect(intelligenceSrc).toMatch(/energyChartProvenance/);
  });

  it('no chart card in IntelligenceDashboard is marked live', () => {
    // Match `data-provenance="live"` anywhere in the source. This will
    // also flag drift from any future PR that opts a card into a
    // spurious `live` classification.
    expect(intelligenceSrc).not.toMatch(/data-provenance="live"/);
  });

  it('chart series attribution names AURA demonstration fixture as the source', () => {
    // Requirement 1A.3.c.1: if the arrays are local fixtures, label
    // their source as "AURA demonstration fixture". Uptime Institute
    // / ASHRAE may appear only as reference context.
    expect(intelligenceSrc).toMatch(/AURA demonstration fixture/);
    for (const m of INTELLIGENCE_CHART_METRICS) {
      expect(m.source).toBe('AURA demonstration fixture');
    }
    // Reference material is optional and non-authoritative — surfaced
    // via the `reference` field, never the `source` field.
    for (const m of INTELLIGENCE_CHART_METRICS) {
      expect(m.reference ?? '').not.toBe(m.source);
    }
  });
});
