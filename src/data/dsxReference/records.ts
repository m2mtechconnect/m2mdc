import {
  DSX_REFERENCE_RECORDS as BASE_RECORDS,
  DSX_RETRIEVED_AT,
  DSX_SOURCE_COMMIT,
} from './records.generated';
import { DSX_COMPLETENESS_RECORDS, DSX_COMPLETE_DATASET_VERSION } from './records.completeness';
import type { ReferenceRecord, SourceConsistency } from './types';

function baseConsistency(record: ReferenceRecord): {
  source_variant: string;
  source_consistency: SourceConsistency;
  source_conflict_group: string | null;
  source_scope: string | null;
} {
  if (
    record.data_class === 'REFERENCE_SPECIFICATION' &&
    record.source_file === 'web/src/data/kpis.ts' &&
    record.site
  ) {
    const group = `site-spec:${record.site.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${record.metric_key}`;
    return {
      source_variant: 'kpis.ts:site-spec',
      source_consistency: record.site === 'Virginia' ? 'DUPLICATE' : 'SOURCE_CONFLICT',
      source_conflict_group: group,
      source_scope: `site:${record.site.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    };
  }

  return {
    source_variant:
      record.data_class === 'REFERENCE_KPI_VALUE'
        ? 'configs.ts:configuration-kpi'
        : record.data_class === 'REFERENCE_CONFIGURATION'
          ? 'configs.ts:configuration'
          : record.data_class === 'REFERENCE_SCENARIO'
            ? 'options.ts:scenario'
            : 'baseline-normalized-record',
    source_consistency: 'UNIQUE',
    source_conflict_group: null,
    source_scope: record.configuration_id
      ? `configuration:${record.configuration_id}`
      : record.site
        ? `site:${record.site.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : null,
  };
}

const normalizedBase: ReferenceRecord[] = BASE_RECORDS.map((record) => ({
  ...record,
  dataset_version: DSX_COMPLETE_DATASET_VERSION,
  ...baseConsistency(record),
}));

/**
 * Source-complete normalized corpus for the pinned public NVIDIA demo source.
 *
 * The original 65-record baseline remains committed unchanged for audit
 * reproducibility. This exported view layers the previously omitted source
 * objects on top and upgrades every record to one dataset-version identity.
 */
export const DSX_REFERENCE_RECORDS: readonly ReferenceRecord[] = [
  ...normalizedBase,
  ...DSX_COMPLETENESS_RECORDS,
].sort((a, b) => a.record_id.localeCompare(b.record_id));

export { DSX_SOURCE_COMMIT, DSX_RETRIEVED_AT };
export const DSX_DATASET_VERSION = DSX_COMPLETE_DATASET_VERSION;
