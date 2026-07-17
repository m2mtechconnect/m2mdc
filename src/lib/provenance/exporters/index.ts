/**
 * Public API for provenance-preserving exports (Phase 1A.3.d).
 * Callers only import from this barrel.
 */

export {
  EXPORT_SCHEMA_VERSION,
  toExportRecord,
  describeExportBlock,
} from './schema';
export type {
  ExportRecord,
  ExportPayload,
  ExportBlockReason,
  BuildRecordInput,
} from './schema';
export { CSV_COLUMNS, toCsv } from './csv';
export { toJson } from './json';
export type { SerializedJsonPayload } from './json';
export { toPrintHtml, openPrintWindow } from './printHtml';

import { toCsv } from './csv';
import { toJson } from './json';
import type { ExportPayload } from './schema';

/**
 * Trigger a browser download of a payload as CSV or JSON.
 * Returns the object-URL that was created so callers/tests can revoke.
 */
export function downloadPayload(
  payload: ExportPayload,
  format: 'csv' | 'json',
  filename: string,
): void {
  const content = format === 'csv' ? toCsv(payload) : toJson(payload);
  const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}