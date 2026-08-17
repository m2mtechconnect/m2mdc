/**
 * Export shaping for the reference canary.
 *
 * CSV and JSON exports carry full lineage. An unavailable value is exported as
 * the literal state string, never as 0 and never as an empty measured value.
 */
import type { DatasetMode } from '@/data/dsxReference';
import { DATASET_DESCRIPTORS } from './datasetRegistry';
import type { DatasetValue } from './referenceSelectors';
import { isRenderableValue } from './valueClassification';

export interface ExportContext {
  dataset: DatasetMode;
  facilityId: string | null;
  simulationRunId: string | null;
}

export interface ExportRow {
  dataset_id: string | null;
  dataset_version: string | null;
  source_commit: string | null;
  record_id: string | null;
  metric_key: string;
  metric_label: string;
  classification: string;
  value: string;
  unit: string;
  source_checksum: string | null;
  facility_id: string | null;
  simulation_run_id: string | null;
  availability_state: string;
  derivation: string;
}

export function toExportRow(value: DatasetValue, ctx: ExportContext): ExportRow {
  const descriptor = DATASET_DESCRIPTORS[ctx.dataset];
  const renderable = isRenderableValue(value.classification) && value.value !== null;
  return {
    dataset_id: value.datasetId ?? descriptor.datasetId,
    dataset_version: value.datasetVersion ?? descriptor.datasetVersion,
    source_commit: value.sourceCommit ?? descriptor.sourceCommit,
    record_id: value.recordId,
    metric_key: value.key,
    metric_label: value.label,
    classification: value.classification,
    value: renderable ? String(value.value) : value.classification,
    unit: renderable ? (value.unit ?? '') : '',
    source_checksum: value.sourceChecksum,
    facility_id: ctx.facilityId,
    simulation_run_id: ctx.simulationRunId,
    availability_state: renderable ? 'AVAILABLE' : value.classification,
    derivation: value.normalizationRule ?? 'verbatim',
  };
}

export const EXPORT_COLUMNS: readonly (keyof ExportRow)[] = [
  'dataset_id',
  'dataset_version',
  'source_commit',
  'record_id',
  'metric_key',
  'metric_label',
  'classification',
  'value',
  'unit',
  'source_checksum',
  'facility_id',
  'simulation_run_id',
  'availability_state',
  'derivation',
];

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(values: DatasetValue[], ctx: ExportContext): string {
  const rows = values.map((v) => toExportRow(v, ctx));
  const header = EXPORT_COLUMNS.join(',');
  const body = rows.map((r) => EXPORT_COLUMNS.map((c) => csvCell(r[c])).join(','));
  return [header, ...body].join('\n');
}

export function toJsonExport(values: DatasetValue[], ctx: ExportContext) {
  return {
    dataset: ctx.dataset,
    dataset_version: DATASET_DESCRIPTORS[ctx.dataset].datasetVersion,
    source_commit: DATASET_DESCRIPTORS[ctx.dataset].sourceCommit,
    exported_at_source_ingest: DATASET_DESCRIPTORS[ctx.dataset].ingestedAt,
    facility_id: ctx.facilityId,
    simulation_run_id: ctx.simulationRunId,
    rows: values.map((v) => toExportRow(v, ctx)),
  };
}
