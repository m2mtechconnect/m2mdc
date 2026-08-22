/**
 * End-to-end contracts for the admin-only reference canary: surface matrix,
 * zero synthetic fallback, workflow lineage, export truth, search authority,
 * assistant grounding and abstention, NGC terminal states and rollback.
 */
import { describe, expect, it } from 'vitest';
import {
  SURFACE_MATRIX,
  isReferenceConsumerPath,
  surfaceForPath,
  surfacesByClassification,
} from '../surfaceRegistry';
import {
  buildRunLineage,
  compareConfigurations,
  deriveDesignFromReference,
  REQUIRED_RUN_INPUTS,
} from '../referenceRun';
import {
  allReferenceValues,
  referenceConfigurationIds,
  referenceScenarios,
  referenceSpecificationsForSite,
  searchDataset,
} from '../referenceSelectors';
import { toCsv, toJsonExport } from '../exportProvenance';
import { answerFromDataset, authorizedRecords, GROUNDING_EVALS } from '../assistantGrounding';
import { resolveDataset, PRODUCTION_DEFAULT_DATASET, withDataset } from '../datasetRegistry';
import { NGC_UNAVAILABLE } from '../valueClassification';
import {
  CLASSIFIED_FACILITIES,
  DSX_REFERENCE_RECORDS,
  MONTREAL_DERIVED_SCENARIO,
  operationalFacilities,
} from '@/data/dsxReference';

const CTX = { dataset: 'nvidia-dsx-reference' as const, facilityId: null, isAdmin: true };

describe('surface migration matrix', () => {
  it('classifies every declared surface and migrates every consumer', () => {
    expect(SURFACE_MATRIX.length).toBeGreaterThan(30);
    const consumers = surfacesByClassification('REFERENCE_DATA_CONSUMER');
    expect(consumers.length).toBeGreaterThanOrEqual(16);
    expect(consumers.every((s) => s.migrated && s.sections.length > 0)).toBe(true);
  });

  it('resolves parameterised routes to their surface', () => {
    expect(surfaceForPath('/blueprint/abc-123')?.path).toBe('/blueprint/:id');
    expect(surfaceForPath('/blueprint/preview')?.path).toBe('/blueprint/preview');
    expect(isReferenceConsumerPath('/dashboard')).toBe(true);
    expect(isReferenceConsumerPath('/teams')).toBe(false);
    expect(isReferenceConsumerPath('/unknown-route')).toBe(false);
  });

  it('keeps dataset-neutral surfaces free of dataset bindings but context-preserving', () => {
    for (const s of surfacesByClassification('DATASET_NEUTRAL')) {
      expect(s.sections).toHaveLength(0);
      expect(withDataset(s.path, 'nvidia-dsx-reference')).toContain('dataset=nvidia-dsx-reference');
    }
  });
});

describe('no hidden synthetic fallback in reference mode', () => {
  it('every consumer surface declares a non-fabricating missing behaviour', () => {
    for (const s of surfacesByClassification('REFERENCE_DATA_CONSUMER')) {
      expect(s.missingBehaviour.length).toBeGreaterThan(0);
      expect(s.missingBehaviour.toLowerCase()).not.toContain('estimate');
    }
  });

  it('renders no value for records without a defensible source', () => {
    const values = allReferenceValues();
    expect(values).toHaveLength(265);
    for (const v of values) {
      if (v.classification === 'UNAVAILABLE') {
        expect(v.value).toBeNull();
        expect(v.unavailable).toEqual(NGC_UNAVAILABLE);
      } else {
        expect(v.recordId).toBeTruthy();
        expect(v.sourceChecksum).toBeTruthy();
      }
    }
  });
});

describe('record coverage and facility isolation', () => {
  it('exposes all 265 source-complete records through centralized selectors', () => {
    const ids = new Set(allReferenceValues().map((v) => v.recordId));
    expect(ids.size).toBe(DSX_REFERENCE_RECORDS.length);
    expect(referenceConfigurationIds()).toHaveLength(6);
    expect(referenceScenarios()).toHaveLength(2);
    expect(referenceSpecificationsForSite('Virginia')).toHaveLength(7);
  });

  it('keeps the four reference facilities separate and out of operational totals', () => {
    const reference = CLASSIFIED_FACILITIES.filter((f) => f.facilityClass === 'REFERENCE');
    expect(reference).toHaveLength(4);
    expect(new Set(reference.map((f) => f.id)).size).toBe(4);
    expect(reference.every((f) => !f.countsTowardOperationalTotals)).toBe(true);
    expect(operationalFacilities()).toHaveLength(0);
  });

  it('keeps Montreal AURA-authored with eight unsupplied inputs and no NVIDIA facts', () => {
    expect(MONTREAL_DERIVED_SCENARIO.authoredBy).toBe('AURA');
    expect(MONTREAL_DERIVED_SCENARIO.facilityClass).toBe('DERIVED_SCENARIO');
    expect(MONTREAL_DERIVED_SCENARIO.missingInputs).toHaveLength(8);
    expect(
      DSX_REFERENCE_RECORDS.some((r) => (r.site ?? '').toLowerCase().includes('montreal')),
    ).toBe(false);
  });
});

describe('workflow lineage: simulation, derivation, compare', () => {
  it('produces a deterministic lineage envelope labelled AURA-simulated', () => {
    const lineage = buildRunLineage({
      dataset: 'nvidia-dsx-reference',
      configurationId: 'virginia-gb300',
      scenarioRecordIds: ['scenario:thermal', 'scenario:electrical'],
    });
    expect(lineage.status).toBe('READY');
    if (lineage.status !== 'READY') return;
    expect(lineage.resultClassification).toBe('SIMULATED_RESULT');
    expect(lineage.ownership).toBe('AURA');
    expect(lineage.attribution).toContain('Not an NVIDIA result');
    expect(lineage.inputRecordIds.length).toBeGreaterThanOrEqual(REQUIRED_RUN_INPUTS.length);
    expect(buildRunLineage({
      dataset: 'nvidia-dsx-reference',
      configurationId: 'virginia-gb300',
      scenarioRecordIds: ['scenario:electrical', 'scenario:thermal'],
    })).toEqual(lineage);
  });

  it('blocks execution and names the missing inputs', () => {
    const blocked = buildRunLineage({
      dataset: 'nvidia-dsx-reference',
      configurationId: 'no-such-config',
      scenarioRecordIds: ['scenario:thermal'],
    });
    expect(blocked.status).toBe('BLOCKED');
    if (blocked.status !== 'BLOCKED') return;
    expect(blocked.missingInputs.map((m) => m.key)).toEqual([...REQUIRED_RUN_INPUTS]);
    expect(blocked.explanation).toContain('No value was substituted');
  });

  it('derives a design without mutating the reference record', () => {
    const before = JSON.stringify(DSX_REFERENCE_RECORDS[0]);
    const design = deriveDesignFromReference('virginia-gb300', ['kpi:virginia-gb300:pue'], '2026-01-01T00:00:00.000Z');
    expect(design.ownership).toBe('AURA');
    expect(design.commissioned).toBe(false);
    expect(design.parentReferenceIds).toEqual(['kpi:virginia-gb300:pue']);
    expect(JSON.stringify(DSX_REFERENCE_RECORDS[0])).toBe(before);
  });

  it('never compares across incompatible definitions or missing values', () => {
    const rows = compareConfigurations('virginia-gb300', 'sweden-gb300');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      if (!row.comparable) expect(row.reason).toBeTruthy();
      else expect(row.left?.unit).toBe(row.right?.unit);
    }
    const impossible = compareConfigurations('virginia-gb300', 'no-such-config');
    expect(impossible.every((r) => !r.comparable)).toBe(true);
  });
});

describe('export lineage', () => {
  const ctx = { dataset: 'nvidia-dsx-reference' as const, facilityId: 'dsx-reference-virginia', simulationRunId: 'aura-run:x' };

  it('emits full lineage columns in CSV and JSON', () => {
    const values = allReferenceValues();
    const csv = toCsv(values, ctx);
    const header = csv.split('\n')[0];
    for (const col of ['dataset_id', 'dataset_version', 'record_id', 'source_checksum', 'facility_id', 'simulation_run_id', 'availability_state']) {
      expect(header).toContain(col);
    }
    expect(csv.split('\n')).toHaveLength(values.length + 1);
    const json = toJsonExport(values, ctx);
    expect(json.rows).toHaveLength(values.length);
    expect(json.rows.every((r) => r.facility_id === ctx.facilityId)).toBe(true);
  });

  it('never exports an unavailable value as zero or empty', () => {
    const rows = toJsonExport(allReferenceValues(), ctx).rows.filter(
      (r) => r.availability_state !== 'AVAILABLE',
    );
    for (const r of rows) {
      expect(r.value).toBe(r.classification);
      expect(r.value).not.toBe('0');
      expect(r.value).not.toBe('');
    }
  });
});

describe('search authority', () => {
  it('covers records and facilities with provenance labels', () => {
    const hits = searchDataset('virginia');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.kind === 'facility')).toBe(true);
    expect(hits.every((h) => h.classification)).toBe(true);
  });

  it('returns nothing for an empty query', () => {
    expect(searchDataset('  ')).toHaveLength(0);
  });

  it('is unreachable for non-admins because the surface never resolves', () => {
    expect(resolveDataset('nvidia-dsx-reference', { isAdmin: false }).mode).toBe(
      PRODUCTION_DEFAULT_DATASET,
    );
  });
});

describe('assistant grounding', () => {
  it('satisfies every deterministic evaluation', () => {
    for (const evaluation of GROUNDING_EVALS) {
      const result = answerFromDataset(evaluation.question, { ...CTX, ...evaluation.context });
      expect(`${evaluation.id}:${result.outcome}`).toBe(`${evaluation.id}:${evaluation.expect}`);
    }
  });

  it('cites record ids, units and provenance for a grounded answer', () => {
    const result = answerFromDataset('What is the PUE for Virginia GB300?', CTX);
    expect(result.outcome).toBe('GROUNDED_REFERENCE');
    expect(result.citations.length).toBeGreaterThan(0);
    for (const c of result.citations) {
      expect(c.recordId).toBeTruthy();
      expect(c.checksum).toHaveLength(64);
      expect(c.sourceCommit).toBeTruthy();
    }
    expect(result.auraDerived).toBe(false);
  });

  it('abstains on NGC-blocked questions without substituting a figure', () => {
    const result = answerFromDataset('Give me the measured CFD telemetry history', CTX);
    expect(result.outcome).toBe('ABSTAIN_UNAVAILABLE');
    expect(result.answer).toContain('HTTP 401');
    expect(result.citations).toHaveLength(0);
  });

  it('does not leak records across facility context', () => {
    const virginia = authorizedRecords({ ...CTX, facilityId: 'dsx-reference-virginia' });
    expect(virginia.length).toBeGreaterThan(0);
    expect(virginia.every((r) => r.site === 'Virginia' || r.data_class === 'REFERENCE_SCENARIO')).toBe(true);
    expect(authorizedRecords({ ...CTX, facilityId: MONTREAL_DERIVED_SCENARIO.id })).toHaveLength(0);
    expect(authorizedRecords({ ...CTX, isAdmin: false })).toHaveLength(0);
    expect(authorizedRecords({ ...CTX, dataset: 'legacy-synthetic' })).toHaveLength(0);
  });

  it('never attributes an NVIDIA fact to Montreal', () => {
    const result = answerFromDataset('What is the Montreal facility PUE?', CTX);
    expect(result.outcome).toBe('AURA_DERIVED');
    expect(result.auraDerived).toBe(true);
    expect(result.citations).toHaveLength(0);
  });
});

describe('NGC terminal state and rollback', () => {
  it('exposes one stable terminal descriptor with retry disabled', () => {
    expect(NGC_UNAVAILABLE).toMatchObject({
      state: 'UNAVAILABLE',
      requiredDataset: 'dsx_dataset',
      requiredVersion: 'v2.1',
      lastAttemptedStatus: 'HTTP 401',
      autoRetry: false,
    });
  });

  it('rolls back to the production default in one action', () => {
    expect(withDataset('/dashboard?dataset=nvidia-dsx-reference', PRODUCTION_DEFAULT_DATASET)).toBe(
      '/dashboard',
    );
    expect(PRODUCTION_DEFAULT_DATASET).toBe('legacy-synthetic');
  });
});