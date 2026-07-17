/**
 * Provenance-preserving Markdown serializer (Phase 1A.3.d.1).
 *
 * Emits a schema-version fenced header, a table with a per-row
 * provenance column, and an optional narrative appendix. Every
 * interpolated string is escaped for Markdown table safety (`|`, newlines)
 * AND for HTML (`<`, `>`, `&`, `"`) so downstream renderers that treat
 * Markdown as HTML cannot be tricked into executing injected content.
 *
 * Callers pass narrative text (RCA / recommendations / notes) via
 * `narrative` — it is fenced under an "Appendix" heading with the same
 * HTML escaping. The narrative is NEVER used to fabricate a provenance
 * value for a metric.
 */

import type { ExportPayload, ExportRecord } from './schema';
import { EXPORT_SCHEMA_VERSION } from './schema';

function escHtml(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escCell(s: unknown): string {
  // Markdown table cells: escape `|` and collapse newlines, then HTML-escape.
  const raw = s === null || s === undefined ? '' : String(s);
  const flat = raw.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
  return escHtml(flat);
}

function badgeLabel(p: ExportRecord['provenance']): string {
  switch (p) {
    case 'live': return 'Live';
    case 'derived': return 'Derived';
    case 'simulated': return 'Simulated';
    case 'demo': return 'Demo';
    case 'static': return 'Configured';
    case 'unavailable': return 'Unavailable';
  }
}

function renderRow(r: ExportRecord): string {
  const value = r.value === null ? '_Unavailable_' : escCell(r.value);
  const observed = r.observedAt ? escCell(r.observedAt) : '';
  const dg = r.downgradeReason ? ` (downgraded: ${escCell(r.downgradeReason)})` : '';
  return `| ${escCell(r.metricId)} | ${escCell(r.metricName)} | ${value} | ${escCell(r.unit ?? '')} | ${badgeLabel(r.provenance)}${dg} | ${escCell(r.source)} | ${observed} | ${r.stale ? 'true' : 'false'} |`;
}

export interface MarkdownOptions {
  /** Optional narrative sections rendered under an Appendix heading. */
  narrative?: Array<{ heading: string; body: string }>;
}

export function toMarkdown(payload: ExportPayload, options: MarkdownOptions = {}): string {
  const lines: string[] = [];
  lines.push(`# ${escHtml(payload.title)}`);
  lines.push('');
  lines.push('```yaml');
  lines.push(`schemaVersion: ${EXPORT_SCHEMA_VERSION}`);
  lines.push(`surface: ${payload.surface}`);
  lines.push(`generatedAt: ${payload.generatedAt}`);
  lines.push('```');
  lines.push('');
  if (payload.note) {
    lines.push(`> ${escHtml(payload.note)}`);
    lines.push('');
  }
  lines.push('## Metrics');
  lines.push('');
  lines.push('| Metric ID | Metric | Value | Unit | Provenance | Source | Observed | Stale |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of payload.records) lines.push(renderRow(r));
  lines.push('');
  if (options.narrative && options.narrative.length > 0) {
    lines.push('## Appendix');
    lines.push('');
    lines.push('> Narrative sections are qualitative outputs of the simulation estimator. They are NOT audited data and carry no per-metric provenance.');
    lines.push('');
    for (const n of options.narrative) {
      lines.push(`### ${escHtml(n.heading)}`);
      lines.push('');
      lines.push(escHtml(n.body));
      lines.push('');
    }
  }
  lines.push('---');
  lines.push(`_schema ${EXPORT_SCHEMA_VERSION} — every row is classified per-metric. Simulation results are estimator output, never live telemetry._`);
  return lines.join('\n') + '\n';
}