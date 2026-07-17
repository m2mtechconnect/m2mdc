/**
 * Phase 1A.3.d.1 — HTML/Markdown injection safety.
 *
 * Every string interpolated into `toPrintHtml` and `toMarkdown`
 * (metric name, value, unit, source, description, note, title,
 * generatedAt, surface, downgradeReason) must be escaped so that a
 * hostile record cannot inject `<script>` or event-handler HTML.
 */

import { describe, it, expect } from 'vitest';
import { toPrintHtml, toMarkdown, EXPORT_SCHEMA_VERSION, type ExportPayload } from '../index';

const XSS = '<script>alert(1)</script>';
const IMG = '"><img src=x onerror=alert(1)>';

const payload: ExportPayload = {
  schemaVersion: EXPORT_SCHEMA_VERSION,
  surface: `surface-${XSS}`,
  title: `Title ${IMG}`,
  generatedAt: '2026-07-17T12:00:00.000Z',
  note: `Note ${XSS}`,
  records: [
    {
      metricId: 'inj.name',
      metricName: `Name ${XSS}`,
      value: `Value ${IMG}`,
      unit: `Unit ${XSS}`,
      provenance: 'demo',
      source: `Source ${XSS}`,
      observedAt: '2026-07-17T12:00:00.000Z',
      stale: false,
      description: `Desc ${XSS}`,
    },
    {
      metricId: 'inj.downgrade',
      metricName: `X ${IMG}`,
      value: null,
      unit: null,
      provenance: 'unavailable',
      source: `S ${IMG}`,
      observedAt: null,
      stale: true,
      downgradeReason: 'stale',
    },
  ],
};

describe('printHtml — no raw script or event handlers survive', () => {
  const html = toPrintHtml(payload);

  it('does not emit an executable <script> tag', () => {
    expect(html).not.toMatch(/<script\b/i);
    // Escaped form must be present so we know the string round-tripped.
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('does not emit an onerror= attribute', () => {
    expect(html).not.toMatch(/\sonerror\s*=/i);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes double quotes inside attribute-interpolated fields (surface)', () => {
    // surface is interpolated into data-surface="…"; the raw " must be
    // encoded so the attribute is not broken.
    expect(html).not.toMatch(/data-surface="surface-<script>/);
    expect(html).toContain('data-surface="surface-&lt;script&gt;alert(1)&lt;/script&gt;"');
  });

  it('escapes note, title, unit, source, description, downgradeReason', () => {
    // Each of these strings appears exactly once in escaped form and
    // never in raw form.
    for (const s of [
      'Note &lt;script&gt;',
      'Title &quot;&gt;&lt;img',
      'Unit &lt;script&gt;',
      'source: Source &lt;script&gt;',
      'downgraded: stale',
    ]) {
      expect(html).toContain(s);
    }
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

describe('markdown — HTML-encoded so downstream MD→HTML renderers cannot execute injected content', () => {
  const md = toMarkdown(payload, { narrative: [{ heading: `H ${XSS}`, body: `B ${IMG}` }] });

  it('never emits a raw <script> or onerror handler', () => {
    expect(md).not.toMatch(/<script\b/i);
    expect(md).not.toMatch(/\sonerror\s*=/i);
  });

  it('encodes all interpolated fields (title, note, name, value, unit, source, appendix)', () => {
    for (const s of [
      '&lt;script&gt;alert(1)&lt;/script&gt;',
      '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;',
    ]) {
      expect(md).toContain(s);
    }
  });

  it('escapes pipe characters so they cannot break the metric table', () => {
    const evil: ExportPayload = {
      ...payload,
      records: [{ ...payload.records[0], metricName: 'A | injected | col' }],
    };
    const out = toMarkdown(evil);
    // Row for the metric contains escaped pipes, never raw ones inside the label cell.
    const row = out.split('\n').find(l => l.includes('inj.name'))!;
    expect(row).toContain('A \\| injected \\| col');
  });
});