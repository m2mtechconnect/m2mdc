/**
 * Canary contract tests: URL parsing, safe fallback, admin-only access,
 * provenance, isolation, unavailable states and export truthfulness.
 */
import { describe, expect, it } from 'vitest';
import {
  DATASET_DESCRIPTORS,
  PRODUCTION_DEFAULT_DATASET,
  isDatasetMode,
  readDatasetParam,
  resolveDataset,
  withDataset,
} from '../datasetRegistry';
import {
  classifyRecord,
  montrealNotSupplied,
  recordCoverage,
  referenceConfigurations,
  referenceFacilities,
  referenceScenarios,
  referenceSpecifications,
  searchDataset,
  toDatasetValue,
  unavailableValue,
} from '../referenceSelectors';
import { toCsv, toJsonExport } from '../exportProvenance';
import { NGC_UNAVAILABLE, isRenderableValue } from '../valueClassification';
import {
  CLASSIFIED_FACILITIES,
  DSX_REFERENCE_RECORDS,
  MONTREAL_DERIVED_SCENARIO,
  operationalFacilities,
} from '@/data/dsxReference';

const ADMIN = { isAdmin: true };
const USER = { isAdmin: false };

describe('dataset URL parsing and safe fallback', () => {
  it('defaults to the production dataset with no parameter', () => {
    const r = resolveDataset(null, ADMIN);
    expect(r.mode).toBe(PRODUCTION_DEFAULT_DATASET);
    expect(r.canaryActive).toBe(false);
    expect(r.reason).toBe('default');
  });

  it('falls back safely on an invalid value', () => {
    const r = resolveDataset('nvidia-dsx-referenc3', ADMIN);
    expect(r.mode).toBe(PRODUCTION_DEFAULT_DATASET);
    expect(r.reason).toBe('invalid-value-fallback');
    expect(r.requested).toBe('nvidia-dsx-referenc3');
  });

  it('reads the parameter from a query string', () => {
    expect(readDatasetParam('?a=1&dataset=nvidia-dsx-reference')).toBe('nvidia-dsx-reference');
    expect(readDatasetParam('')).toBeNull();
  });

  it('preserves and clears the parameter on links', () => {
    expect(withDataset('/dashboard?tab=x', 'nvidia-dsx-reference')).toBe(
      '/dashboard?tab=x&dataset=nvidia-dsx-reference',
    );
    expect(withDataset('/dashboard?dataset=nvidia-dsx-reference', null)).toBe('/dashboard');
    expect(withDataset('/dashboard', PRODUCTION_DEFAULT_DATASET)).toBe('/dashboard');
  });

  it('recognises exactly the declared modes', () => {
    expect(isDatasetMode('legacy-synthetic')).toBe(true);
    expect(isDatasetMode('montreal-derived')).toBe(true);
    expect(isDatasetMode('nvidia')).toBe(false);
  });
});

describe('administrator-only canary access', () => {
  it('activates the reference dataset for an administrator', () => {
    const r = resolveDataset('nvidia-dsx-reference', ADMIN);
    expect(r.mode).toBe('nvidia-dsx-reference');
    expect(r.canaryActive).toBe(true);
  });

  it('denies the reference dataset to a non-admin and falls back', () => {
    const r = resolveDataset('nvidia-dsx-reference', USER);
    expect(r.mode).toBe(PRODUCTION_DEFAULT_DATASET);
    expect(r.reason).toBe('unauthorized-fallback');
    expect(r.canaryActive).toBe(false);
  });

  it('does not gate non-admin datasets', () => {
    expect(resolveDataset('montreal-derived', USER).mode).toBe('montreal-derived');
  });

  it('keeps the production default unchanged in this phase', () => {
    expect(PRODUCTION_DEFAULT_DATASET).toBe('legacy-synthetic');
    expect(DATASET_DESCRIPTORS['nvidia-dsx-reference'].adminOnly).toBe(true);
  });
});

describe('record provenance and coverage', () => {
  it('exposes all 65 normalized records with complete provenance', () => {
    expect(DSX_REFERENCE_RECORDS).toHaveLength(65);
    for (const r of DSX_REFERENCE_RECORDS) {
      expect(r.record_id).toBeTruthy();
      expect(r.source_commit).toBe('d940314d0593bbba1bae51e40ae7f9fd48358e18');
      expect(r.source_checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(r.is_measured).toBe(false);
      expect(r.is_operational).toBe(false);
    }
  });

  it('reports the expected coverage by data class', () => {
    expect(recordCoverage()).toEqual({
      REFERENCE_KPI_VALUE: 36,
      REFERENCE_SPECIFICATION: 21,
      REFERENCE_CONFIGURATION: 6,
      REFERENCE_SCENARIO: 2,
    });
  });

  it('maps each record to a renderable classification with lineage', () => {
    const v = toDatasetValue(DSX_REFERENCE_RECORDS[0]);
    expect(isRenderableValue(v.classification)).toBe(true);
    expect(v.sourceChecksum).toBeTruthy();
    expect(v.datasetId).toBe('nvidia-dsx-blueprint');
  });

  it('offers exactly the two validated reference scenarios', () => {
    expect(referenceScenarios()).toHaveLength(2);
    expect(referenceConfigurations()).toHaveLength(6);
    expect(referenceSpecifications().length).toBe(21);
  });
});

describe('facility isolation', () => {
  it('keeps the four reference facilities separate', () => {
    const refs = referenceFacilities();
    expect(refs).toHaveLength(4);
    expect(new Set(refs.map((f) => f.id)).size).toBe(4);
  });

  it('never counts reference or derived facilities as operational', () => {
    expect(operationalFacilities()).toHaveLength(0);
    for (const f of CLASSIFIED_FACILITIES) {
      expect(f.countsTowardOperationalTotals).toBe(false);
    }
  });

  it('keeps Montreal AURA-authored with unresolved inputs', () => {
    expect(MONTREAL_DERIVED_SCENARIO.authoredBy).toBe('AURA');
    expect(MONTREAL_DERIVED_SCENARIO.facilityClass).toBe('DERIVED_SCENARIO');
    expect(MONTREAL_DERIVED_SCENARIO.missingInputs).toHaveLength(8);
    const notSupplied = montrealNotSupplied();
    expect(notSupplied).toHaveLength(8);
    for (const v of notSupplied) {
      expect(v.classification).toBe('NOT_SUPPLIED');
      expect(v.value).toBeNull();
    }
  });

  it('never attributes an NVIDIA record to Montreal', () => {
    const montrealRecords = DSX_REFERENCE_RECORDS.filter(
      (r) => (r.site ?? '').toLowerCase().includes('montreal'),
    );
    expect(montrealRecords).toHaveLength(0);
  });
});

describe('NGC unavailable states', () => {
  it('describes a stable terminal blocker with no retry', () => {
    expect(NGC_UNAVAILABLE.requiredDataset).toBe('dsx_dataset');
    expect(NGC_UNAVAILABLE.requiredVersion).toBe('v2.1');
    expect(NGC_UNAVAILABLE.lastAttemptedStatus).toBe('HTTP 401');
    expect(NGC_UNAVAILABLE.autoRetry).toBe(false);
  });

  it('classifies NGC-dependent classes as unavailable, never zero', () => {
    const v = unavailableValue('cfd', 'CFD output');
    expect(v.value).toBeNull();
    expect(v.classification).toBe('UNAVAILABLE');
    expect(
      DSX_REFERENCE_RECORDS.every((r) => classifyRecord(r) !== 'UNAVAILABLE'),
    ).toBe(true);
  });
});

describe('search access and labelling', () => {
  it('returns provenance-labelled hits', () => {
    const hits = searchDataset('Virginia');
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.classification).toBeTruthy();
  });

  it('returns nothing for an empty query', () => {
    expect(searchDataset('   ')).toHaveLength(0);
  });
});

describe('export continuity', () => {
  const ctx = { dataset: 'nvidia-dsx-reference' as const, facilityId: 'dsx-reference-baseline', simulationRunId: 'run-1' };

  it('carries dataset, commit, checksum and run identity into CSV', () => {
    const csv = toCsv([toDatasetValue(DSX_REFERENCE_RECORDS[0])], ctx);
    const [header, row] = csv.split('\n');
    expect(header).toContain('source_commit');
    expect(row).toContain('d940314d0593bbba1bae51e40ae7f9fd48358e18');
    expect(row).toContain('run-1');
  });

  it('never exports an unavailable value as zero', () => {
    const json = toJsonExport([unavailableValue('cfd', 'CFD output')], ctx);
    expect(json.rows[0].value).toBe('UNAVAILABLE');
    expect(json.rows[0].availability_state).toBe('UNAVAILABLE');
    expect(json.rows[0].unit).toBe('');
  });
});
