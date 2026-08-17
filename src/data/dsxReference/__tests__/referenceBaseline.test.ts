import { describe, it, expect } from 'vitest';
import {
  CLASSIFIED_FACILITIES,
  DEFAULT_REFERENCE_CONFIGURATION_ID,
  DSX_REFERENCE_BASELINE,
  DSX_REFERENCE_RECORDS,
  DSX_REFERENCE_SITES,
  DSX_SOURCE_COMMIT,
  MONTREAL_DERIVED_SCENARIO,
  MONTREAL_MISSING_INPUTS,
  comparableMetric,
  operationalFacilities,
  recordsForConfiguration,
  referenceKpi,
} from '..';

const PROVENANCE_FIELDS = [
  'dataset_id',
  'dataset_version',
  'publisher',
  'source_url',
  'source_repository',
  'source_commit',
  'source_file',
  'source_record_path',
  'source_checksum',
  'retrieved_at',
  'licence_status',
  'data_class',
  'operational_status',
  'transformation_record',
  'validation_status',
] as const;

describe('provenance completeness', () => {
  it('every record carries the full provenance envelope', () => {
    for (const r of DSX_REFERENCE_RECORDS) {
      for (const f of PROVENANCE_FIELDS) {
        expect(r[f], `${r.record_id}.${f}`).toBeTruthy();
      }
    }
  });

  it('pins one immutable NVIDIA commit and a 64-hex checksum per record', () => {
    for (const r of DSX_REFERENCE_RECORDS) {
      expect(r.source_commit).toBe(DSX_SOURCE_COMMIT);
      expect(r.source_checksum).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('never claims measured, live or operational status', () => {
    for (const r of DSX_REFERENCE_RECORDS) {
      expect(r.is_reference).toBe(true);
      expect(r.is_measured).toBe(false);
      expect(r.is_operational).toBe(false);
      expect(r.operational_status).toBe('REFERENCE_ONLY');
    }
  });

  it('has unique record identifiers', () => {
    const ids = DSX_REFERENCE_RECORDS.map((r) => r.record_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('normalization', () => {
  it('carries units on every numeric KPI', () => {
    const kpis = DSX_REFERENCE_RECORDS.filter((r) => r.data_class === 'REFERENCE_KPI_VALUE');
    expect(kpis.length).toBeGreaterThan(0);
    for (const k of kpis) {
      expect(typeof k.normalized_value).toBe('number');
      expect(k.unit, k.record_id).toBeTruthy();
    }
  });

  it('preserves the source value verbatim', () => {
    const pue = referenceKpi('sweden-gb300', 'pue');
    expect(pue?.normalized_value).toBe(1.1);
    expect(pue?.original_value).toBe(1.1);
    expect(pue?.unit).toBe('ratio');
  });

  it('resolves the six published source configurations', () => {
    const configs = DSX_REFERENCE_RECORDS.filter((r) => r.data_class === 'REFERENCE_CONFIGURATION');
    expect(configs).toHaveLength(6);
    expect(recordsForConfiguration(DEFAULT_REFERENCE_CONFIGURATION_ID).length).toBeGreaterThan(1);
  });
});

describe('operational isolation', () => {
  it('excludes reference and derived facilities from operational totals', () => {
    for (const f of CLASSIFIED_FACILITIES) {
      expect(f.countsTowardOperationalTotals).toBe(false);
    }
    expect(operationalFacilities()).toHaveLength(0);
  });

  it('classifies the reference baseline and every reference site as REFERENCE', () => {
    expect(DSX_REFERENCE_BASELINE.facilityClass).toBe('REFERENCE');
    for (const s of DSX_REFERENCE_SITES) expect(s.facilityClass).toBe('REFERENCE');
    expect(new Set(DSX_REFERENCE_SITES.map((s) => s.site))).toEqual(
      new Set(['Virginia', 'New Mexico', 'Sweden']),
    );
  });
});

describe('Montreal derived scenario honesty', () => {
  it('is a derived, simulated, AURA-authored scenario', () => {
    expect(MONTREAL_DERIVED_SCENARIO.facilityClass).toBe('DERIVED_SCENARIO');
    expect(MONTREAL_DERIVED_SCENARIO.truthState).toBe('SIMULATED_NOT_MEASURED');
    expect(MONTREAL_DERIVED_SCENARIO.authoredBy).toBe('AURA');
    expect(MONTREAL_DERIVED_SCENARIO.name).toBe('Montreal DSX-Aligned AI Factory Scenario');
  });

  it('declares missing inputs instead of borrowing NVIDIA site facts', () => {
    expect(MONTREAL_DERIVED_SCENARIO.missingInputs).toEqual([...MONTREAL_MISSING_INPUTS]);
    expect(MONTREAL_DERIVED_SCENARIO.sourceUrl).toBeNull();
    // No NVIDIA reference record may be attributed to Montreal.
    const leaked = DSX_REFERENCE_RECORDS.filter((r) => r.site === 'Montreal');
    expect(leaked).toHaveLength(0);
  });

  it('cannot silently fall back to reference values', () => {
    expect(referenceKpi('montreal-dsx-aligned-scenario', 'pue')).toBeNull();
  });
});

describe('compare guard', () => {
  it('allows same-unit comparisons within the dataset', () => {
    expect(comparableMetric('virginia-gb300', 'sweden-gb300', 'pue').comparable).toBe(true);
  });

  it('rejects a metric the source does not supply for both sides', () => {
    const r = comparableMetric('virginia-gb300', 'sweden-gb300', 'not_a_metric');
    expect(r.comparable).toBe(false);
    expect(r.reason).toMatch(/not supplied/i);
  });
});

describe('cutover configuration', () => {
  it('defaults the demonstration baseline to the NVIDIA reference dataset', () => {
    expect(DEFAULT_DATASET_MODE).toBe('nvidia-dsx-reference');
  });
});
