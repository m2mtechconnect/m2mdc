import { describe, expect, it } from 'vitest';
import {
  DSX_DATASET_VERSION,
  DSX_REFERENCE_RECORDS,
  NVIDIA_DEMO_SOURCE_COVERAGE,
  NVIDIA_PUBLIC_DEMO_EXPECTED_RECORD_COUNT,
  NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_GROUPS,
  NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_RECORDS,
  sourceConflictRecords,
  sourceCoverageSummary,
} from '..';

function valuesForConflict(group: string): Array<number | string | null> {
  return DSX_REFERENCE_RECORDS.filter((record) => record.source_conflict_group === group).map(
    (record) => record.normalized_value,
  );
}

describe('NVIDIA public demo source completeness', () => {
  it('normalizes every catalogued public demo-source object', () => {
    const expectedFromManifest = NVIDIA_DEMO_SOURCE_COVERAGE.reduce(
      (sum, entry) => sum + entry.expectedItems,
      0,
    );
    expect(expectedFromManifest).toBe(NVIDIA_PUBLIC_DEMO_EXPECTED_RECORD_COUNT);
    expect(DSX_REFERENCE_RECORDS).toHaveLength(NVIDIA_PUBLIC_DEMO_EXPECTED_RECORD_COUNT);
    expect(new Set(DSX_REFERENCE_RECORDS.map((record) => record.record_id)).size).toBe(
      NVIDIA_PUBLIC_DEMO_EXPECTED_RECORD_COUNT,
    );
  });

  it('uses one version identity for the composed source-complete corpus', () => {
    expect(DSX_DATASET_VERSION).toBe('2.0.0-source-complete@d940314');
    expect(new Set(DSX_REFERENCE_RECORDS.map((record) => record.dataset_version))).toEqual(
      new Set([DSX_DATASET_VERSION]),
    );
  });

  it('has the expected source-file coverage', () => {
    const summary = sourceCoverageSummary();
    expect(summary.bySourceFile['web/src/data/options.ts']).toBe(23);
    expect(summary.bySourceFile['web/src/data/kpis.ts']).toBe(87);
    expect(summary.bySourceFile['web/src/data/configs.ts']).toBe(155);
  });

  it('preserves every known upstream conflict instead of selecting precedence', () => {
    const summary = sourceCoverageSummary();
    expect(summary.byConsistency.SOURCE_CONFLICT).toBe(
      NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_RECORDS,
    );
    expect(summary.conflictGroups).toBe(NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_GROUPS);
    expect(sourceConflictRecords()).toHaveLength(NVIDIA_PUBLIC_DEMO_EXPECTED_SOURCE_CONFLICT_RECORDS);

    const groups = new Map<string, Set<string>>();
    for (const record of sourceConflictRecords()) {
      const group = record.source_conflict_group!;
      const sources = groups.get(group) ?? new Set<string>();
      sources.add(`${record.source_file}:${record.source_variant}`);
      groups.set(group, sources);
    }
    for (const sources of groups.values()) expect(sources.size).toBeGreaterThanOrEqual(2);
  });

  it('preserves the New Mexico site-spec conflict', () => {
    expect(valuesForConflict('site-spec:new-mexico:power-capacity')).toEqual(
      expect.arrayContaining([
        '1-gigawatt (GW) capacity. Dedicated, on-site electrical substation with direct, high-voltage connection to the grid.',
        '800 MW capacity with on-site solar farm and grid tie-in via dedicated substation.',
      ]),
    );
  });

  it('preserves the Sweden site-spec conflict', () => {
    expect(valuesForConflict('site-spec:sweden:land-area')).toEqual(
      expect.arrayContaining(['1,200 acres.', '700 acres.']),
    );
  });

  it('preserves the GB200 hardware-definition conflict', () => {
    expect(valuesForConflict('gpu-spec:nvidia-gb200:configuration')).toEqual(
      expect.arrayContaining([
        '36 Grace CPU : 72 Blackwell GPUs',
        '48 NVIDIA Blackwell GPUs, 24 Grace CPUs',
      ]),
    );
  });

  it('classifies the matching GB300 hardware definition as duplicate, not conflict', () => {
    const records = DSX_REFERENCE_RECORDS.filter(
      (record) => record.source_conflict_group === 'gpu-spec:nvidia-gb300:configuration',
    );
    expect(records).toHaveLength(2);
    expect(records.every((record) => record.source_consistency === 'DUPLICATE')).toBe(true);
    expect(new Set(records.map((record) => record.normalized_value))).toEqual(
      new Set(['72 NVIDIA Blackwell Ultra GPUs, 36 NVIDIA Grace CPUs']),
    );
  });

  it('keeps all values reference-only and non-operational', () => {
    for (const record of DSX_REFERENCE_RECORDS) {
      expect(record.is_reference).toBe(true);
      expect(record.is_measured).toBe(false);
      expect(record.is_operational).toBe(false);
      expect(record.operational_status).toBe('REFERENCE_ONLY');
      expect(record.source_checksum).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
