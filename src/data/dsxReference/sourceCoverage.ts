import { DSX_REFERENCE_RECORDS } from './records';
import type { ReferenceRecord, SourceConsistency } from './types';

export type SourceCoverageDisposition =
  | 'NORMALIZED'
  | 'DUPLICATE'
  | 'SCOPED_VARIANT'
  | 'SOURCE_CONFLICT'
  | 'INTENTIONALLY_EXCLUDED'
  | 'NGC_REQUIRED';

export interface SourceCoverageEntry {
  sourceFile: string;
  sourceObject: string;
  expectedItems: number;
  disposition: SourceCoverageDisposition;
  note: string;
}

/**
 * Coverage of every mock/reference data-bearing object in the three pinned
 * public NVIDIA demo-source files. Documentation-only source files are still
 * checksum-verified separately and are not counted as data records here.
 */
export const NVIDIA_DEMO_SOURCE_COVERAGE: readonly SourceCoverageEntry[] = [
  {
    sourceFile: 'web/src/data/options.ts',
    sourceObject: 'CONFIGURATOR_OPTIONS',
    expectedItems: 8,
    disposition: 'NORMALIZED',
    note: '2 GPU + 3 site + 3 power options.',
  },
  {
    sourceFile: 'web/src/data/options.ts',
    sourceObject: 'SITE_OPTIONS',
    expectedItems: 2,
    disposition: 'NORMALIZED',
    note: 'Country/region hierarchy retained as reference options.',
  },
  {
    sourceFile: 'web/src/data/options.ts',
    sourceObject: 'SIMULATION_OPTIONS categories',
    expectedItems: 2,
    disposition: 'NORMALIZED',
    note: 'Thermal and electrical scenario zone/operation definitions from the original baseline.',
  },
  {
    sourceFile: 'web/src/data/options.ts',
    sourceObject: 'SIMULATION_OPTIONS variables',
    expectedItems: 11,
    disposition: 'NORMALIZED',
    note: '3 thermal and 8 electrical variable/range definitions.',
  },
  {
    sourceFile: 'web/src/data/kpis.ts',
    sourceObject: 'KPI_CHARTS values + metadata',
    expectedItems: 4,
    disposition: 'SCOPED_VARIANT',
    note: '2 values plus their display score/icon metadata; chart scope preserved.',
  },
  {
    sourceFile: 'web/src/data/kpis.ts',
    sourceObject: 'SITE_DATA',
    expectedItems: 21,
    disposition: 'SOURCE_CONFLICT',
    note: 'Virginia duplicates configs.ts; New Mexico and Sweden conflict with configs.ts site-specific values.',
  },
  {
    sourceFile: 'web/src/data/kpis.ts',
    sourceObject: 'KPI_DATA KPI presets + metadata',
    expectedItems: 16,
    disposition: 'SCOPED_VARIANT',
    note: '8 preset values plus score metadata; GPU-preset scope is not site+GPU configuration scope.',
  },
  {
    sourceFile: 'web/src/data/kpis.ts',
    sourceObject: 'KPI_DATA GPU specifications',
    expectedItems: 26,
    disposition: 'SOURCE_CONFLICT',
    note: 'GB300 duplicates configs.ts; overlapping GB200 fields conflict materially with configs.ts GPU_GB200. GB200 Fast Memory has no kpis.ts counterpart and is therefore unique.',
  },
  {
    sourceFile: 'web/src/data/kpis.ts',
    sourceObject: 'KPI_DATA Building specifications',
    expectedItems: 20,
    disposition: 'SCOPED_VARIANT',
    note: 'Two GPU-scoped generic building blocks retained separately from site-scoped config buildings.',
  },
  {
    sourceFile: 'web/src/data/configs.ts',
    sourceObject: 'CONFIGS_DATA configuration identities',
    expectedItems: 6,
    disposition: 'NORMALIZED',
    note: 'Original baseline configuration records.',
  },
  {
    sourceFile: 'web/src/data/configs.ts',
    sourceObject: 'CONFIGS_DATA KPI values',
    expectedItems: 36,
    disposition: 'NORMALIZED',
    note: 'Original baseline configuration KPI records.',
  },
  {
    sourceFile: 'web/src/data/configs.ts',
    sourceObject: 'CONFIGS_DATA KPI score/day/hour metadata',
    expectedItems: 36,
    disposition: 'NORMALIZED',
    note: 'Display score plus day/hour where supplied; no timing value fabricated when absent.',
  },
  {
    sourceFile: 'web/src/data/configs.ts',
    sourceObject: 'SITE_* specification blocks',
    expectedItems: 21,
    disposition: 'SOURCE_CONFLICT',
    note: 'Virginia duplicates kpis.ts; New Mexico and Sweden are preserved as conflicts.',
  },
  {
    sourceFile: 'web/src/data/configs.ts',
    sourceObject: 'GPU_GB200 / GPU_GB300 specification blocks',
    expectedItems: 26,
    disposition: 'SOURCE_CONFLICT',
    note: 'GB300 duplicate; overlapping GB200 hardware definitions are preserved without precedence; GB200 Fast Memory is single-source and unique.',
  },
  {
    sourceFile: 'web/src/data/configs.ts',
    sourceObject: 'BUILDING_* specification blocks',
    expectedItems: 30,
    disposition: 'SCOPED_VARIANT',
    note: 'Site-scoped building blocks retained independently from generic GPU-scoped building data.',
  },
] as const;

export const NVIDIA_PUBLIC_DEMO_EXPECTED_RECORD_COUNT = 265;
export const NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_RECORDS = 53;
export const NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_GROUPS = 26;

export interface SourceCoverageSummary {
  records: number;
  byConsistency: Record<SourceConsistency, number>;
  conflictGroups: number;
  bySourceFile: Record<string, number>;
}

export function sourceCoverageSummary(
  records: readonly ReferenceRecord[] = DSX_REFERENCE_RECORDS,
): SourceCoverageSummary {
  const byConsistency: Record<SourceConsistency, number> = {
    UNIQUE: 0,
    DUPLICATE: 0,
    SCOPED_VARIANT: 0,
    SOURCE_CONFLICT: 0,
  };
  const bySourceFile: Record<string, number> = {};
  const conflictGroups = new Set<string>();

  for (const record of records) {
    byConsistency[record.source_consistency ?? 'UNIQUE'] += 1;
    bySourceFile[record.source_file] = (bySourceFile[record.source_file] ?? 0) + 1;
    if (record.source_consistency === 'SOURCE_CONFLICT' && record.source_conflict_group) {
      conflictGroups.add(record.source_conflict_group);
    }
  }

  return {
    records: records.length,
    byConsistency,
    conflictGroups: conflictGroups.size,
    bySourceFile,
  };
}

export function sourceConflictRecords(
  records: readonly ReferenceRecord[] = DSX_REFERENCE_RECORDS,
): ReferenceRecord[] {
  return records.filter((record) => record.source_consistency === 'SOURCE_CONFLICT');
}
