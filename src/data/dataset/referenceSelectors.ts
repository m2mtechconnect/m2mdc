/**
 * Selectors over the source-complete normalized NVIDIA reference corpus.
 *
 * Every page in reference mode reads through these selectors. There is no
 * page-local copy of the data, and no component may import a mock array while
 * running in `nvidia-dsx-reference` mode.
 */
import {
  CLASSIFIED_FACILITIES,
  DSX_REFERENCE_RECORDS,
  MONTREAL_DERIVED_SCENARIO,
  sourceConflictRecords,
  sourceCoverageSummary,
  type ClassifiedFacility,
  type ReferenceRecord,
  type SourceConsistency,
} from '@/data/dsxReference';
import {
  NGC_UNAVAILABLE,
  isNgcDependent,
  type ValueClassification,
} from './valueClassification';

/** A dataset-backed value handed to the UI. Never a bare number. */
export interface DatasetValue {
  key: string;
  label: string;
  classification: ValueClassification;
  value: number | string | null;
  unit: string | null;
  recordId: string | null;
  datasetId: string | null;
  datasetVersion: string | null;
  sourceCommit: string | null;
  sourceUrl: string | null;
  sourceChecksum: string | null;
  ingestedAt: string | null;
  licenceStatus: string | null;
  normalizationRule: string | null;
  sourceVariant: string | null;
  sourceConsistency: SourceConsistency | null;
  sourceConflictGroup: string | null;
  sourceScope: string | null;
  unavailable: typeof NGC_UNAVAILABLE | null;
}

const CLASS_MAP: Record<string, ValueClassification> = {
  REFERENCE_KPI_VALUE: 'REFERENCE_VALUE',
  REFERENCE_KPI_METADATA: 'REFERENCE_SPECIFICATION',
  REFERENCE_SPECIFICATION: 'REFERENCE_SPECIFICATION',
  REFERENCE_GPU_SPECIFICATION: 'REFERENCE_SPECIFICATION',
  REFERENCE_BUILDING_SPECIFICATION: 'REFERENCE_SPECIFICATION',
  REFERENCE_SITE_SPECIFICATION_VARIANT: 'REFERENCE_SPECIFICATION',
  REFERENCE_SIMULATION_VARIABLE: 'REFERENCE_SPECIFICATION',
  REFERENCE_OPTION: 'REFERENCE_CONFIGURATION',
  REFERENCE_CONFIGURATION: 'REFERENCE_CONFIGURATION',
  REFERENCE_SCENARIO: 'REFERENCE_SCENARIO',
};

export function classifyRecord(record: ReferenceRecord): ValueClassification {
  if (isNgcDependent(record.data_class)) return 'UNAVAILABLE';
  return CLASS_MAP[record.data_class] ?? 'UNAVAILABLE';
}

export function toDatasetValue(record: ReferenceRecord): DatasetValue {
  const classification = classifyRecord(record);
  return {
    key: record.metric_key ?? record.record_id,
    label: record.metric_label,
    classification,
    value: classification === 'UNAVAILABLE' ? null : record.normalized_value,
    unit: record.unit,
    recordId: record.record_id,
    datasetId: record.dataset_id,
    datasetVersion: record.dataset_version,
    sourceCommit: record.source_commit,
    sourceUrl: record.source_url,
    sourceChecksum: record.source_checksum,
    ingestedAt: record.retrieved_at,
    licenceStatus: record.licence_status,
    normalizationRule: record.transformation_record,
    sourceVariant: record.source_variant ?? null,
    sourceConsistency: record.source_consistency ?? 'UNIQUE',
    sourceConflictGroup: record.source_conflict_group ?? null,
    sourceScope: record.source_scope ?? null,
    unavailable: classification === 'UNAVAILABLE' ? NGC_UNAVAILABLE : null,
  };
}

/** An explicitly unavailable slot. Renders a terminal state, never a zero. */
export function unavailableValue(key: string, label: string): DatasetValue {
  return {
    key,
    label,
    classification: 'UNAVAILABLE',
    value: null,
    unit: null,
    recordId: null,
    datasetId: null,
    datasetVersion: null,
    sourceCommit: null,
    sourceUrl: null,
    sourceChecksum: null,
    ingestedAt: null,
    licenceStatus: null,
    normalizationRule: null,
    sourceVariant: null,
    sourceConsistency: null,
    sourceConflictGroup: null,
    sourceScope: null,
    unavailable: NGC_UNAVAILABLE,
  };
}

/** A slot with no defensible source (e.g. a Montreal input). */
export function notSuppliedValue(key: string, label: string): DatasetValue {
  return { ...unavailableValue(key, label), classification: 'NOT_SUPPLIED', unavailable: null };
}

export function recordsByClass(dataClass: string): ReferenceRecord[] {
  return DSX_REFERENCE_RECORDS.filter((r) => r.data_class === dataClass);
}

export function referenceKpiValues(configurationId: string): DatasetValue[] {
  return DSX_REFERENCE_RECORDS.filter(
    (r) =>
      r.data_class === 'REFERENCE_KPI_VALUE' &&
      r.source_variant === 'configs.ts:configuration-kpi' &&
      r.configuration_id === configurationId,
  ).map(toDatasetValue);
}

export function referenceSpecifications(configurationId?: string): DatasetValue[] {
  return DSX_REFERENCE_RECORDS.filter(
    (r) =>
      [
        'REFERENCE_SPECIFICATION',
        'REFERENCE_SITE_SPECIFICATION_VARIANT',
        'REFERENCE_GPU_SPECIFICATION',
        'REFERENCE_BUILDING_SPECIFICATION',
        'REFERENCE_SIMULATION_VARIABLE',
        'REFERENCE_KPI_METADATA',
      ].includes(r.data_class) && (!configurationId || r.configuration_id === configurationId),
  ).map(toDatasetValue);
}

/**
 * Site specifications include both NVIDIA source variants when they exist.
 * Conflicting values are intentionally returned together with conflict metadata;
 * AURA does not pick a winner.
 */
export function referenceSpecificationsForSite(site?: string | null): DatasetValue[] {
  return DSX_REFERENCE_RECORDS.filter(
    (r) =>
      (r.data_class === 'REFERENCE_SPECIFICATION' ||
        r.data_class === 'REFERENCE_SITE_SPECIFICATION_VARIANT') &&
      (!site || r.site === site),
  ).map(toDatasetValue);
}

/** The site a configuration belongs to, read from the record itself. */
export function siteForConfiguration(configurationId: string): string | null {
  const record = DSX_REFERENCE_RECORDS.find(
    (r) =>
      r.data_class === 'REFERENCE_CONFIGURATION' &&
      r.source_variant === 'configs.ts:configuration' &&
      r.configuration_id === configurationId &&
      Boolean(r.site),
  );
  return record?.site ?? null;
}

/** Every normalized record as a dataset value, for evidence and export. */
export function allReferenceValues(): DatasetValue[] {
  return DSX_REFERENCE_RECORDS.map(toDatasetValue);
}

/** Reference configuration ids, in source order. */
export function referenceConfigurationIds(): string[] {
  return DSX_REFERENCE_RECORDS.filter(
    (r) => r.data_class === 'REFERENCE_CONFIGURATION' && r.source_variant === 'configs.ts:configuration',
  )
    .map((r) => r.configuration_id)
    .filter((id): id is string => Boolean(id));
}

export function referenceConfigurations(): DatasetValue[] {
  return DSX_REFERENCE_RECORDS.filter(
    (r) => r.data_class === 'REFERENCE_CONFIGURATION' && r.source_variant === 'configs.ts:configuration',
  ).map(toDatasetValue);
}

/** The only reference scenarios AURA may offer as simulation inputs. */
export function referenceScenarios(): DatasetValue[] {
  return recordsByClass('REFERENCE_SCENARIO').map(toDatasetValue);
}

export function referenceFacilities(): ClassifiedFacility[] {
  return CLASSIFIED_FACILITIES.filter((f) => f.facilityClass === 'REFERENCE');
}

export function derivedFacilities(): ClassifiedFacility[] {
  return CLASSIFIED_FACILITIES.filter((f) => f.facilityClass === 'DERIVED_SCENARIO');
}

/** Montreal's unresolved inputs, rendered as Not supplied. */
export function montrealNotSupplied(): DatasetValue[] {
  return MONTREAL_DERIVED_SCENARIO.missingInputs.map((input, i) =>
    notSuppliedValue(`montreal-missing-${i}`, input),
  );
}

/** Every preserved upstream source-conflict record. */
export function referenceSourceConflicts(): DatasetValue[] {
  return sourceConflictRecords().map(toDatasetValue);
}

/** Summary used by the admin banner/evidence surfaces. */
export function referenceSourceCoverage() {
  return sourceCoverageSummary();
}

/** Admin-only search over normalized records and classified facilities. */
export interface DatasetSearchHit {
  id: string;
  title: string;
  kind: 'record' | 'facility';
  classification: ValueClassification | 'FACILITY';
  datasetId: string | null;
  sourceCommit: string | null;
}

export function searchDataset(query: string): DatasetSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const recordHits: DatasetSearchHit[] = DSX_REFERENCE_RECORDS.filter(
    (r) =>
      r.metric_label.toLowerCase().includes(q) ||
      r.record_id.toLowerCase().includes(q) ||
      (r.site ?? '').toLowerCase().includes(q) ||
      (r.compute_platform ?? '').toLowerCase().includes(q) ||
      (r.source_variant ?? '').toLowerCase().includes(q),
  ).map((r) => ({
    id: r.record_id,
    title: r.metric_label,
    kind: 'record' as const,
    classification: classifyRecord(r),
    datasetId: r.dataset_id,
    sourceCommit: r.source_commit,
  }));
  const facilityHits: DatasetSearchHit[] = CLASSIFIED_FACILITIES.filter((f) =>
    f.name.toLowerCase().includes(q),
  ).map((f) => ({
    id: f.id,
    title: f.name,
    kind: 'facility' as const,
    classification: 'FACILITY' as const,
    datasetId: f.datasetId,
    sourceCommit: null,
  }));
  return [...recordHits, ...facilityHits];
}

/** Record totals by data class, for the admin registry page and evidence. */
export function recordCoverage(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of DSX_REFERENCE_RECORDS) out[r.data_class] = (out[r.data_class] ?? 0) + 1;
  return out;
}
