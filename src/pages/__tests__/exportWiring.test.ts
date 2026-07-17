/**
 * Phase 1A.3.d wiring tests — source-level assertions that the active
 * export triggers are wired to the provenance-preserving exporter (or
 * disabled with an explanation when they cannot retain provenance).
 *
 * We inspect source instead of rendering the full pages because both
 * pages pull in Supabase, react-query, and dozens of hooks that make
 * DOM tests brittle. The `data-export-blocked` and `data-testid`
 * attributes are the contract Playwright will enforce in 1A.3.e.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  describeExportBlock,
  toCsv,
  toJson,
  toPrintHtml,
  toExportRecord,
  EXPORT_SCHEMA_VERSION,
} from '@/lib/provenance/exporters';

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

describe('Compliance page — exports that cannot retain provenance are disabled', () => {
  const src = read('src/pages/Compliance.tsx');

  it('main "Export Audit Report" button is disabled with sovereignty-not-assessed reason', () => {
    expect(src).toMatch(/data-export-blocked="sovereignty-not-assessed"/);
    expect(src).toMatch(/data-testid="compliance-export-audit-blocked"/);
  });

  it('all four stub report buttons are disabled with a documented reason', () => {
    const stubs = [
      'Sovereignty Audit Report',
      'Thermal Safety Summary',
      'Carbon Emissions Report',
      'Power Stability Log',
    ];
    for (const label of stubs) {
      expect(src).toContain(label);
    }
    // The map produces one disabled button per stub. Assert at least 5
    // disabled/aria-disabled entries (main + 4 stubs).
    const disabledCount = (src.match(/aria-disabled="true"/g) ?? []).length;
    expect(disabledCount).toBeGreaterThanOrEqual(5);
    expect(src).toMatch(/describeExportBlock\(/);
  });

  it('tooltip explains why (uses describeExportBlock)', () => {
    expect(describeExportBlock('sovereignty-not-assessed')).toMatch(/not assessed/i);
    expect(describeExportBlock('no-audited-source')).toMatch(/demonstration/i);
  });
});

describe('IntelligenceDashboard — Export Report is wired to provenance exporter', () => {
  const src = read('src/pages/IntelligenceDashboard.tsx');

  it('imports the exporter barrel', () => {
    expect(src).toMatch(/from '@\/lib\/provenance\/exporters'/);
    expect(src).toMatch(/downloadPayload/);
    expect(src).toMatch(/openPrintWindow/);
  });

  it('replaces stub button with dropdown offering CSV, JSON, Print', () => {
    expect(src).toMatch(/Download CSV/);
    expect(src).toMatch(/Download JSON/);
    expect(src).toMatch(/Print \/ Save as PDF/);
    expect(src).toMatch(/data-testid="intelligence-export-trigger"/);
  });

  it('payload builder classifies every chart series as demo', () => {
    // The builder never assigns provenance: 'live' to a chart series.
    const buildBlock = src.slice(src.indexOf('buildIntelligenceChartsPayload'), src.indexOf('handleExportChartsReport'));
    expect(buildBlock).not.toMatch(/provenance:\s*'live'/);
    expect(buildBlock).toMatch(/provenance:\s*'demo'/);
    expect(buildBlock).toMatch(/AURA demonstration fixture/);
  });
});

describe('End-to-end payload → CSV/JSON/HTML round-trip (fixture-source discipline)', () => {
  // Simulate the chart payload the IntelligenceDashboard builds, then
  // prove that even if a caller *forced* a live provenance, the record
  // would remain demo because `toExportRecord` classifies from the
  // catalog, and the catalog is a fixture.
  const rec = toExportRecord({
    catalog: {
      id: 'intelligence.pue-trend.mon',
      label: 'PUE — Mon',
      provenance: 'demo',
      source: 'AURA demonstration fixture',
    },
    // Attacker-style: metric claims to be live. Must be ignored.
    metric: { value: 1.28, provenance: 'live', sourceTimestamp: '2026-07-13T00:00:00.000Z' },
    unit: 'ratio',
  });

  it('demo catalog defeats a caller-supplied "live" claim', () => {
    expect(rec.provenance).toBe('demo');
    expect(rec.observedAt).toBe('2026-07-13T00:00:00.000Z');
  });

  const payload = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    surface: 'intelligence.charts',
    title: 'Intelligence charts',
    generatedAt: '2026-07-17T14:30:00.000Z',
    records: [rec],
  };

  it('CSV output preserves demo classification', () => {
    const csv = toCsv(payload);
    // Parse the header + first data row.
    const lines = csv.split(/\r\n/).filter((l) => l.length && !l.startsWith('#'));
    expect(lines[1]).toContain('demo');
    expect(lines[1]).not.toContain(',live,');
  });

  it('JSON output preserves demo classification', () => {
    const parsed = JSON.parse(toJson(payload));
    expect(parsed.records[0].provenance).toBe('demo');
    expect(parsed.$schema).toBe('aura.export/v1');
  });

  it('Print HTML preserves demo classification per row', () => {
    const doc = new DOMParser().parseFromString(toPrintHtml(payload), 'text/html');
    const row = doc.querySelector('tr[data-metric-id="intelligence.pue-trend.mon"]')!;
    expect(row.getAttribute('data-provenance')).toBe('demo');
  });
});