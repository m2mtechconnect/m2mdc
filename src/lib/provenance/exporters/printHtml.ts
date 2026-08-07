/**
 * Provenance-preserving print/PDF model.
 *
 * The browser is the PDF engine — this module produces a self-contained
 * HTML document that shows provenance per metric (not only in the
 * footer) so that when the user prints to PDF, every row on the page
 * carries its classification badge. Tests parse the generated HTML
 * (via DOMParser) to prove the invariants hold.
 *
 * Structure:
 *   <main data-aura-export data-schema-version="1.0.0">
 *     <header>… title, generatedAt, note …</header>
 *     <table>
 *       <tr data-metric-id data-provenance>
 *         <td>label</td><td>value</td><td>unit</td>
 *         <td class="prov"><span data-provenance-badge>…</span>
 *                          <div class="src">source: …</div>
 *                          <div class="ts">observed: …</div></td>
 *       </tr>
 *     </table>
 *     <footer>schema version + generation notice</footer>
 *   </main>
 */

import type { ExportPayload, ExportRecord } from './schema';
import { EXPORT_SCHEMA_VERSION, buildExportOperatingState } from './schema';

function esc(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const valueCell = r.value === null ? '<span class="unavail">Unavailable</span>' : esc(r.value);
  const ts = r.observedAt ? `<div class="ts">observed: ${esc(r.observedAt)}</div>` : '';
  const stale = r.stale ? '<span class="stale">stale</span>' : '';
  const downgrade = r.downgradeReason ? `<div class="dg">downgraded: ${esc(r.downgradeReason)}</div>` : '';
  return [
    `<tr data-metric-id="${esc(r.metricId)}" data-provenance="${esc(r.provenance)}">`,
    `<td class="label">${esc(r.metricName)}</td>`,
    `<td class="value">${valueCell}</td>`,
    `<td class="unit">${esc(r.unit ?? '')}</td>`,
    `<td class="prov">`,
    `<span data-provenance-badge="${esc(r.provenance)}">${badgeLabel(r.provenance)}</span> ${stale}`,
    `<div class="src">source: ${esc(r.source)}</div>`,
    ts,
    downgrade,
    `</td>`,
    `</tr>`,
  ].join('');
}

/** Produce the self-contained print/PDF HTML document. */
export function toPrintHtml(payload: ExportPayload): string {
  const rows = payload.records.map(renderRow).join('');
  const note = payload.note ? `<p class="note">${esc(payload.note)}</p>` : '';
  const os = payload.operatingState ?? buildExportOperatingState();
  const truthBlock = `
  <dl class="truth" data-export-operating-state>
   <dt>Operating mode</dt><dd data-field="operating-mode">${esc(os.operatingMode)}</dd>
   <dt>Input classification</dt><dd data-field="input-classification">${esc(os.inputClassification)}</dd>
   <dt>Simulation run ID</dt><dd data-field="simulation-run-id">${esc(os.simulationRunId ?? 'Unavailable')}</dd>
   <dt>Scenario</dt><dd data-field="scenario">${esc(os.scenario)}</dd>
   <dt>Calculation timestamp</dt><dd data-field="calculation-timestamp">${esc(os.calculationTimestamp ?? 'Unavailable')}</dd>
   <dt>Source / generator</dt><dd data-field="source-generator">${esc(os.sourceGenerator)}</dd>
   <dt>Human review status</dt><dd data-field="human-review">${esc(os.humanReviewStatus)}</dd>
   <dt>NVIDIA runtime used</dt><dd data-field="nvidia-runtime-used">${esc(os.nvidiaRuntimeUsed)}</dd>
   <dt>Live facility data used</dt><dd data-field="live-facility-data-used">${esc(os.liveFacilityDataUsed)}</dd>
   <dt>Known limitations</dt><dd data-field="known-limitations">${esc(os.knownLimitations)}</dd>
  </dl>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${esc(payload.title)}</title>
<style>
 body{font-family:Inter,system-ui,sans-serif;color:#111;margin:24px;font-size:12px}
 h1{font-size:16px;margin:0 0 4px}
 .meta{color:#555;font-size:11px;margin-bottom:12px}
 table{width:100%;border-collapse:collapse}
 th,td{border:1px solid #ccc;padding:6px 8px;vertical-align:top;text-align:left}
 th{background:#f4f4f4;font-weight:600}
 .prov{min-width:220px}
 [data-provenance-badge]{display:inline-block;padding:2px 6px;border-radius:4px;
   background:#eee;font-weight:600;font-size:11px;text-transform:uppercase}
 [data-provenance-badge="live"]{background:#dcfce7;color:#166534}
 [data-provenance-badge="demo"]{background:#fef3c7;color:#92400e}
 [data-provenance-badge="simulated"]{background:#dbeafe;color:#1e40af}
 [data-provenance-badge="static"]{background:#f3f4f6;color:#374151}
 [data-provenance-badge="unavailable"]{background:#fee2e2;color:#991b1b}
 .src,.ts,.dg{color:#555;font-size:10px;margin-top:2px}
 .unavail{color:#991b1b;font-style:italic}
 .stale{margin-left:4px;color:#92400e;font-size:10px;text-transform:uppercase}
 .note{margin:8px 0 12px;padding:8px;border-left:3px solid #999;background:#fafafa}
 .truth{margin:8px 0 12px;padding:8px;border:1px solid #ccc;background:#fafafa;
   display:grid;grid-template-columns:180px 1fr;gap:2px 12px;font-size:11px}
 .truth dt{font-weight:600;color:#333;margin:0}
 .truth dd{margin:0;color:#333}
 footer{margin-top:16px;color:#666;font-size:10px}
</style></head>
<body>
<main data-aura-export data-schema-version="${EXPORT_SCHEMA_VERSION}" data-surface="${esc(payload.surface)}">
 <header>
  <h1>${esc(payload.title)}</h1>
  <div class="meta">Generated at ${esc(payload.generatedAt)} - schema ${EXPORT_SCHEMA_VERSION} - surface ${esc(payload.surface)}</div>
  ${truthBlock}
  ${note}
 </header>
 <table>
  <thead><tr><th>Metric</th><th>Value</th><th>Unit</th><th>Provenance</th></tr></thead>
  <tbody>${rows}</tbody>
 </table>
 <footer>Every row is classified per-metric. "Unavailable" rows have no fabricated value and no observation timestamp. Generation time is distinct from metric observation time.</footer>
</main>
</body></html>`;
}

/**
 * Trigger a browser print with the payload as the document contents.
 * Opens a new window (best-effort), writes the HTML, and calls print.
 * Callers that want deterministic output for tests use `toPrintHtml`
 * directly.
 */
export function openPrintWindow(payload: ExportPayload): Window | null {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return null;
  w.document.open();
  w.document.write(toPrintHtml(payload));
  w.document.close();
  w.focus();
  // Delay print so the doc paints once first.
  setTimeout(() => w.print(), 100);
  return w;
}