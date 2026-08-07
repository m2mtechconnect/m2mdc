/**
 * Provenance-preserving CSV serializer.
 *
 * Column order is stable and includes explicit provenance columns so
 * spreadsheets cannot lose the classification. Cells starting with
 * `=`, `+`, `-`, `@`, TAB, or CR are prefixed with a single quote so
 * Excel / Numbers / Sheets cannot interpret them as formulas
 * (CVE-2014-3524 class — CSV injection).
 */

import type { ExportPayload, ExportRecord } from './schema';
import { EXPORT_SCHEMA_VERSION, buildExportOperatingState } from './schema';

export const CSV_COLUMNS = [
  'metric_id',
  'metric_name',
  'value',
  'unit',
  'provenance',
  'source',
  'observed_at',
  'stale',
  'downgrade_reason',
  'description',
] as const;

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function escapeCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  let s = String(raw);
  // CSV injection defense — prefix with a leading single quote.
  if (FORMULA_TRIGGERS.test(s)) s = `'${s}`;
  // RFC-4180 quoting when the cell contains "," `"` or newlines.
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowValues(r: ExportRecord): string[] {
  return [
    r.metricId,
    r.metricName,
    r.value === null ? '' : r.value,
    r.unit ?? '',
    r.provenance,
    r.source,
    r.observedAt ?? '',
    r.stale ? 'true' : 'false',
    r.downgradeReason ?? '',
    r.description ?? '',
  ].map(escapeCell);
}

/**
 * Serialize an `ExportPayload` to a UTF-8 CSV string.
 * Emits schema-version and provenance-preserving header comments so a
 * consumer that strips comments still gets a valid table on line 3+.
 */
export function toCsv(payload: ExportPayload): string {
  const lines: string[] = [];
  lines.push(`# aura-export schema=${EXPORT_SCHEMA_VERSION} surface=${payload.surface} generatedAt=${payload.generatedAt}`);
  const os = payload.operatingState ?? buildExportOperatingState();
  lines.push(`# operating_mode=${os.operatingMode} input_classification=${os.inputClassification} scenario=${os.scenario}`);
  lines.push(`# simulation_run_id=${os.simulationRunId ?? 'unavailable'} calculation_timestamp=${os.calculationTimestamp ?? 'unavailable'}`);
  lines.push(`# source_generator=${os.sourceGenerator} human_review=${os.humanReviewStatus}`);
  lines.push(`# nvidia_runtime_used=${os.nvidiaRuntimeUsed} live_facility_data_used=${os.liveFacilityDataUsed}`);
  lines.push(`# known_limitations=${os.knownLimitations.replace(/[\r\n]+/g, ' ')}`);
  lines.push(`# unavailable rows carry empty value; stale=true means source exceeded freshness budget`);
  lines.push(CSV_COLUMNS.join(','));
  for (const r of payload.records) {
    lines.push(rowValues(r).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}