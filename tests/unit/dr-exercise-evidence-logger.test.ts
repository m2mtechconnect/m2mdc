import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DR_EXERCISE_REGISTRY,
  DR_READINESS_FIELDS,
  deriveDrExerciseStatus,
  deriveDrReadinessFields,
  loadDrExerciseRecords,
  rejectedDrExerciseRecords,
  validateDrExerciseRecord,
  type DrExerciseRecord,
} from '@/supervisor';

const validRecord: DrExerciseRecord = {
  id: 'dr-restore-20260826T140000',
  performedAt: '2026-08-26T14:00:00Z',
  scopes: ['restore'],
  outcome: 'completed',
  artifactRef: 'docs/evidence/dr-exercises/artifacts/restore.log',
  operator: 'Release Owner',
  rto: { value: 42, unit: 'minutes', method: 'restore log timestamps' },
  note: 'Full restore into staging.',
};

describe('DR exercise record validation (fail-closed)', () => {
  it('accepts a complete artifact-backed record', () => {
    expect(validateDrExerciseRecord(validRecord)).toEqual({ valid: true, reasons: [] });
  });

  it('rejects a record with no supplied artifact', () => {
    const result = validateDrExerciseRecord({ ...validRecord, artifactRef: '' });
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/artifactRef is required/);
  });

  it('rejects unknown scopes, outcomes, timestamps and missing operators', () => {
    expect(validateDrExerciseRecord({ ...validRecord, scopes: ['everything'] }).valid).toBe(false);
    expect(validateDrExerciseRecord({ ...validRecord, outcome: 'green' }).valid).toBe(false);
    expect(validateDrExerciseRecord({ ...validRecord, performedAt: 'last tuesday' }).valid).toBe(false);
    expect(validateDrExerciseRecord({ ...validRecord, operator: '  ' }).valid).toBe(false);
    expect(validateDrExerciseRecord(null).valid).toBe(false);
  });

  it('rejects measurements without a value, unit or method', () => {
    expect(validateDrExerciseRecord({ ...validRecord, rto: { value: -1, unit: 'minutes', method: 'x' } }).valid).toBe(false);
    expect(validateDrExerciseRecord({ ...validRecord, rto: { value: 1, unit: 'fortnights', method: 'x' } }).valid).toBe(false);
    expect(validateDrExerciseRecord({ ...validRecord, rpo: { value: 1, unit: 'minutes', method: '' } }).valid).toBe(false);
  });

  it('surfaces rejected records instead of silently dropping them', () => {
    const bad = { ...validRecord, artifactRef: '' };
    expect(loadDrExerciseRecords([bad])).toHaveLength(0);
    expect(rejectedDrExerciseRecords([bad])[0].reasons.length).toBeGreaterThan(0);
  });
});

describe('DR readiness derivation from supplied artifacts only', () => {
  it('leaves the baseline untouched when no artifacts are supplied', () => {
    expect(deriveDrReadinessFields([])).toEqual(DR_READINESS_FIELDS.map((f) => ({ ...f })));
    expect(deriveDrExerciseStatus([]).state).toBe('not-exercised');
  });

  it('ships with an empty registry so nothing is claimed by default', () => {
    expect(loadDrExerciseRecords(DR_EXERCISE_REGISTRY)).toEqual([]);
    expect(deriveDrExerciseStatus().state).toBe('not-exercised');
    expect(deriveDrReadinessFields().find((f) => f.id === 'rto')?.state).toBe('not-defined');
  });

  it('upgrades only the exercised scope, with the artifact as evidence', () => {
    const fields = deriveDrReadinessFields([validRecord]);
    const restore = fields.find((f) => f.id === 'restore');
    expect(restore?.state).toBe('exercised');
    expect(restore?.evidenceRef).toBe(validRecord.artifactRef);
    expect(fields.find((f) => f.id === 'backup')?.state).not.toBe('exercised');
  });

  it('records measured RTO and leaves unmeasured RPO not-defined', () => {
    const fields = deriveDrReadinessFields([validRecord]);
    expect(fields.find((f) => f.id === 'rto')?.state).toBe('exercised');
    expect(fields.find((f) => f.id === 'rto')?.note).toContain('42 minutes');
    expect(fields.find((f) => f.id === 'rpo')?.state).toBe('not-defined');
  });

  it('never upgrades state for a non-completed exercise', () => {
    for (const outcome of ['partial', 'failed', 'aborted'] as const) {
      const attempt = { ...validRecord, outcome };
      expect(deriveDrReadinessFields([attempt]).find((f) => f.id === 'restore')?.state).not.toBe('exercised');
      const status = deriveDrExerciseStatus([attempt]);
      expect(status.state).toBe('not-exercised');
      expect(status.note).toMatch(/attempt/i);
    }
  });

  it('reports exercise-recorded with an evidence reference once completed', () => {
    const status = deriveDrExerciseStatus([validRecord]);
    expect(status.state).toBe('exercise-recorded');
    expect(status.evidenceRef).toBe(validRecord.artifactRef);
  });

  it('uses the most recent completed exercise per scope', () => {
    const older = { ...validRecord, id: 'older', performedAt: '2026-01-01T00:00:00Z', artifactRef: 'docs/a.log' };
    const status = deriveDrExerciseStatus([older, validRecord]);
    expect(status.evidenceRef).toBe(validRecord.artifactRef);
  });
});

describe('DR exercise logger CLI contract', () => {
  const script = fs.readFileSync(path.resolve('scripts/log-dr-exercise.mjs'), 'utf8');

  it('requires a supplied artifact that exists on disk', () => {
    expect(script).toMatch(/--artifact is required/);
    expect(script).toMatch(/fs\.existsSync\(artifactAbs\)/);
  });

  it('refuses to overwrite an existing immutable record', () => {
    expect(script).toMatch(/records are immutable/);
  });

  it('regenerates the supervisor registry', () => {
    expect(script).toContain('DR_EXERCISE_REGISTRY');
    expect(script).toContain('src/supervisor/drExerciseRegistry.ts');
  });
});
