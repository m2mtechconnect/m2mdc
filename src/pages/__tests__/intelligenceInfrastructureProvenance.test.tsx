/**
 * Phase 1A.3.c — chart-array + InfrastructurePage provenance regression.
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

const intelligenceSrc = readFileSync(
  resolve(__dirname, '../IntelligenceDashboard.tsx'),
  'utf8',
);
const infraSrc = readFileSync(
  resolve(__dirname, '../InfrastructurePage.tsx'),
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
});

describe('InfrastructurePage — Operational Metrics retrofit', () => {
  it('section root is tagged demo and header primitive is present', () => {
    expect(infraSrc).toMatch(
      /data-testid="infrastructure-operational-metrics"[^>]*data-provenance="demo"|data-provenance="demo"[^>]*data-testid="infrastructure-operational-metrics"/,
    );
    expect(infraSrc).toMatch(/DomainProvenanceHeader/);
  });

  it('Twin Freshness tile is classified unavailable (no synthetic reading)', () => {
    expect(infraSrc).toMatch(/Twin Freshness[\s\S]{0,200}unavailable/);
  });

  it('no tile in the operational-metrics grid is marked live', () => {
    // Restrict search to a window around the grid to avoid false
    // positives from unrelated future edits elsewhere in the file.
    const start = infraSrc.indexOf('infrastructure-operational-metrics');
    expect(start).toBeGreaterThan(-1);
    const window = infraSrc.slice(start, start + 4000);
    expect(window).not.toMatch(/data-provenance="live"/);
  });
});