/**
 * Phase 1A.3.d — provenance-preserving export tests.
 *
 * Tests PARSE the resulting CSV / JSON / print HTML rather than
 * inspect internal helpers, per the acceptance criteria.
 */

import { describe, it, expect } from 'vitest';
import {
  toExportRecord,
  toCsv,
  toJson,
  toPrintHtml,
  EXPORT_SCHEMA_VERSION,
  CSV_COLUMNS,
  describeExportBlock,
  type ExportPayload,
} from '../index';
import type { MetricCatalogEntry } from '../../metricCatalog';
import type { ProvenancedMetric } from '../../types';

// ---------- fixtures ----------

const catDemo: MetricCatalogEntry = {
  id: 'pue.current',
  label: 'PUE',
  provenance: 'demo',
  source: 'AURA demonstration fixture',
};
const catStatic: MetricCatalogEntry = {
  id: 'facility.jurisdiction',
  label: 'Primary jurisdiction',
  provenance: 'static',
  source: 'facility configuration (configured)',
};
const catUnavail: MetricCatalogEntry = {
  id: 'sovereignty.score',
  label: 'Sovereignty score',
  provenance: 'unavailable',
  source: 'sovereignty engine (rules)',
};
const catLive: MetricCatalogEntry = {
  id: 'gpu.util',
  label: 'GPU utilization',
  provenance: 'live',
  source: 'omniverse-kit',
};

const demoM: ProvenancedMetric<number> = {
  value: 1.32, provenance: 'demo',
  sourceTimestamp: '2026-07-17T14:00:00.000Z',
};
const staticM: ProvenancedMetric<string> = {
  value: 'Quebec, Canada', provenance: 'static',
};
const unavailM: ProvenancedMetric<number> = {
  value: null, provenance: 'unavailable',
};
const staleLiveM: ProvenancedMetric<number> = {
  value: 72.4, provenance: 'live', isStale: true,
  sourceTimestamp: '2026-07-10T00:00:00.000Z',
};
const okLiveM: ProvenancedMetric<number> = {
  value: 72.4, provenance: 'live', isStale: false,
  sourceTimestamp: '2026-07-17T13:59:00.000Z',
};

function buildPayload(): ExportPayload {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    surface: 'test.surface',
    title: 'Test surface export',
    generatedAt: '2026-07-17T14:30:00.000Z',
    note: 'Contains demonstration values.',
    records: [
      toExportRecord({ catalog: catDemo, metric: demoM, unit: 'ratio' }),
      toExportRecord({ catalog: catStatic, metric: staticM, unit: null }),
      toExportRecord({ catalog: catUnavail, metric: unavailM, unit: 'score' }),
      toExportRecord({ catalog: catLive, metric: staleLiveM, unit: '%' }),
      toExportRecord({ catalog: catLive, metric: okLiveM, unit: '%' }),
    ],
  };
}

// ---------- record invariants ----------

describe('toExportRecord — fail-closed invariants', () => {
  it('unavailable → null value, no observedAt', () => {
    const r = toExportRecord({ catalog: catUnavail, metric: unavailM });
    expect(r.value).toBeNull();
    expect(r.observedAt).toBeNull();
    expect(r.provenance).toBe('unavailable');
  });

  it('static → no observedAt even when metric carries one', () => {
    const r = toExportRecord({
      catalog: catStatic,
      metric: { ...staticM, sourceTimestamp: '2026-07-17T00:00:00Z' },
    });
    expect(r.observedAt).toBeNull();
  });

  it('stale live is downgraded to unavailable with reason=stale', () => {
    const r = toExportRecord({ catalog: catLive, metric: staleLiveM });
    expect(r.provenance).toBe('unavailable');
    expect(r.value).toBeNull();
    expect(r.downgradeReason).toBe('stale');
  });

  it('demo metric with null value is downgraded to unavailable', () => {
    const r = toExportRecord({
      catalog: catDemo,
      metric: { value: null, provenance: 'demo' },
    });
    expect(r.provenance).toBe('unavailable');
    expect(r.value).toBeNull();
    expect(r.downgradeReason).toBe('unavailable-input');
  });

  it('fresh live keeps value + observedAt', () => {
    const r = toExportRecord({ catalog: catLive, metric: okLiveM });
    expect(r.provenance).toBe('live');
    expect(r.value).toBe(72.4);
    expect(r.observedAt).toBe('2026-07-17T13:59:00.000Z');
  });
});

// ---------- CSV — parse it ----------

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r\n/).filter((l) => l.length && !l.startsWith('#'));
  return lines.map((line) => {
    // Minimal RFC-4180 parser sufficient for our escape rules.
    const out: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else cur += c;
      } else {
        if (c === ',') { out.push(cur); cur = ''; }
        else if (c === '"') { inQ = true; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  });
}

describe('toCsv — parseable, injection-safe, provenance-explicit', () => {
  const csv = toCsv(buildPayload());
  const rows = parseCsv(csv);

  it('emits header row matching CSV_COLUMNS', () => {
    expect(rows[0]).toEqual([...CSV_COLUMNS]);
  });

  it('emits schema version + generatedAt as CSV comments', () => {
    expect(csv.startsWith(`# aura-export schema=${EXPORT_SCHEMA_VERSION}`)).toBe(true);
    expect(csv).toContain('generatedAt=2026-07-17T14:30:00.000Z');
  });

  it('unavailable rows export empty value and no observation timestamp', () => {
    const idIdx = CSV_COLUMNS.indexOf('metric_id');
    const valIdx = CSV_COLUMNS.indexOf('value');
    const provIdx = CSV_COLUMNS.indexOf('provenance');
    const obsIdx = CSV_COLUMNS.indexOf('observed_at');
    const sov = rows.find((r) => r[idIdx] === 'sovereignty.score')!;
    expect(sov[valIdx]).toBe('');
    expect(sov[obsIdx]).toBe('');
    expect(sov[provIdx]).toBe('unavailable');
  });

  it('stale live is downgraded — CSV shows unavailable + downgrade_reason=stale', () => {
    const idIdx = CSV_COLUMNS.indexOf('metric_id');
    const provIdx = CSV_COLUMNS.indexOf('provenance');
    const dgIdx = CSV_COLUMNS.indexOf('downgrade_reason');
    // First matching gpu.util row is the stale one (staleLiveM comes first).
    const staleRow = rows.filter((r) => r[idIdx] === 'gpu.util')[0];
    expect(staleRow[provIdx]).toBe('unavailable');
    expect(staleRow[dgIdx]).toBe('stale');
  });

  it('escapes formula triggers with a leading single quote (CSV injection defense)', () => {
    const evil: MetricCatalogEntry = {
      id: '=cmd|calc', label: '=1+1', provenance: 'demo',
      source: '@evil,source',
    };
    const one = toCsv({
      ...buildPayload(),
      records: [toExportRecord({ catalog: evil, metric: demoM })],
    });
    const parsed = parseCsv(one);
    const body = parsed[1];
    expect(body[0]).toBe("'=cmd|calc");
    expect(body[1]).toBe("'=1+1");
    expect(body[CSV_COLUMNS.indexOf('source')]).toBe("'@evil,source");
  });

  it('never contains the raw string "live" in a downgraded-stale row cell', () => {
    const staleRow = rows
      .filter((r) => r[CSV_COLUMNS.indexOf('metric_id')] === 'gpu.util')[0];
    expect(staleRow[CSV_COLUMNS.indexOf('provenance')]).not.toBe('live');
  });
});

// ---------- JSON — parse it ----------

describe('toJson — schema-versioned + fail-closed', () => {
  const json = toJson(buildPayload());
  const parsed = JSON.parse(json);

  it('has $schema and schemaVersion', () => {
    expect(parsed.$schema).toBe('aura.export/v1');
    expect(parsed.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
  });

  it('generatedAt is separate from any observedAt', () => {
    expect(parsed.generatedAt).toBe('2026-07-17T14:30:00.000Z');
    const demoRec = parsed.records.find((r: { metricId: string }) => r.metricId === 'pue.current');
    expect(demoRec.observedAt).toBe('2026-07-17T14:00:00.000Z');
    expect(demoRec.observedAt).not.toBe(parsed.generatedAt);
  });

  it('unavailable records have value=null and observedAt=null', () => {
    const rec = parsed.records.find((r: { metricId: string }) => r.metricId === 'sovereignty.score');
    expect(rec.value).toBeNull();
    expect(rec.observedAt).toBeNull();
  });

  it('static records have no observedAt', () => {
    const rec = parsed.records.find((r: { metricId: string }) => r.metricId === 'facility.jurisdiction');
    expect(rec.observedAt).toBeNull();
    expect(rec.provenance).toBe('static');
  });

  it('no record with a stale live source is serialized as provenance="live"', () => {
    for (const r of parsed.records) {
      if (r.metricId === 'gpu.util' && r.downgradeReason === 'stale') {
        expect(r.provenance).toBe('unavailable');
      }
    }
  });
});

// ---------- PDF/print HTML — parse the DOM ----------

describe('toPrintHtml — per-row provenance disclosure', () => {
  const html = toPrintHtml(buildPayload());
  const doc = new DOMParser().parseFromString(html, 'text/html');

  it('root carries data-schema-version and surface', () => {
    const root = doc.querySelector('[data-aura-export]')!;
    expect(root.getAttribute('data-schema-version')).toBe(EXPORT_SCHEMA_VERSION);
    expect(root.getAttribute('data-surface')).toBe('test.surface');
  });

  it('every metric row shows a provenance badge (not only in footer)', () => {
    const rows = doc.querySelectorAll('tr[data-metric-id]');
    expect(rows.length).toBe(5);
    for (const tr of Array.from(rows)) {
      const badge = tr.querySelector('[data-provenance-badge]');
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toMatch(/Live|Demo|Simulated|Configured|Unavailable|Derived/);
    }
  });

  it('unavailable row renders the literal word "Unavailable" and no numeric value', () => {
    const row = doc.querySelector('tr[data-metric-id="sovereignty.score"]')!;
    expect(row.getAttribute('data-provenance')).toBe('unavailable');
    const val = row.querySelector('td.value')!;
    expect(val.textContent).toContain('Unavailable');
    expect(val.textContent).not.toMatch(/\d/);
  });

  it('stale live row is rendered as unavailable and shows downgrade reason', () => {
    const rows = Array.from(doc.querySelectorAll('tr[data-metric-id="gpu.util"]'));
    const staleRow = rows.find((r) => r.getAttribute('data-provenance') === 'unavailable')!;
    expect(staleRow.querySelector('.dg')!.textContent).toContain('stale');
  });

  it('static row omits the observation-timestamp line', () => {
    const row = doc.querySelector('tr[data-metric-id="facility.jurisdiction"]')!;
    expect(row.querySelector('.ts')).toBeNull();
  });
});

describe('describeExportBlock — explains why export is disabled', () => {
  it('sovereignty reason mentions not assessed', () => {
    expect(describeExportBlock('sovereignty-not-assessed')).toMatch(/not assessed/i);
  });
  it('no-audited-source reason mentions demonstration values', () => {
    expect(describeExportBlock('no-audited-source')).toMatch(/demonstration/i);
  });
});