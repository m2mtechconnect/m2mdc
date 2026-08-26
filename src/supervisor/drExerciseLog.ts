/**
 * DR exercise evidence logger (supervisor plane).
 *
 * Truth rules (fail-closed):
 *  - A DR readiness field is only upgraded to `exercised` by a recorded
 *    exercise that carries a real artifact reference. Intent, schedule or
 *    documentation never upgrade a field.
 *  - RTO/RPO values are reported only when a record supplies measured
 *    numbers with a unit. Targets without measurement stay `not-defined`.
 *  - An incomplete, failed or aborted exercise never upgrades anything; it
 *    is recorded as evidence of an attempt only.
 *  - Records are validated before use. An invalid record is rejected with a
 *    reason and has no effect on readiness state.
 */
import {
  DR_EXERCISE_STATUS,
  DR_READINESS_FIELDS,
  type DrExerciseStatus,
  type DrReadinessField,
} from './drReadiness';
import { DR_EXERCISE_REGISTRY } from './drExerciseRegistry';

/** Scopes an exercise can prove. Mirrors the readiness field ids it can upgrade. */
export const DR_EXERCISE_SCOPES = ['backup', 'restore', 'rollback'] as const;
export type DrExerciseScope = (typeof DR_EXERCISE_SCOPES)[number];

/** Completion status of a recorded exercise. Only `completed` can upgrade state. */
export const DR_EXERCISE_OUTCOMES = ['completed', 'partial', 'failed', 'aborted'] as const;
export type DrExerciseOutcome = (typeof DR_EXERCISE_OUTCOMES)[number];

export const DR_MEASUREMENT_UNITS = ['seconds', 'minutes', 'hours'] as const;
export type DrMeasurementUnit = (typeof DR_MEASUREMENT_UNITS)[number];

export interface DrMeasurement {
  /** Measured value observed during the exercise. Never a target or estimate. */
  value: number;
  unit: DrMeasurementUnit;
  /** How the value was measured (log timestamps, probe, operator stopwatch). */
  method: string;
}

export interface DrExerciseRecord {
  id: string;
  /** ISO-8601 timestamp of when the exercise was performed. */
  performedAt: string;
  scopes: DrExerciseScope[];
  outcome: DrExerciseOutcome;
  /** Repository path of the supplied test artifact. Mandatory. */
  artifactRef: string;
  /** Person or system accountable for the exercise record. */
  operator: string;
  /** Measured recovery time. Omit when not measured. */
  rto?: DrMeasurement;
  /** Measured recovery point. Omit when not measured. */
  rpo?: DrMeasurement;
  note: string;
}

export interface DrRecordValidation {
  valid: boolean;
  /** Reasons the record cannot be used as evidence. Empty when valid. */
  reasons: string[];
}

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function validMeasurement(m: DrMeasurement | undefined, label: string, reasons: string[]): void {
  if (m === undefined) return;
  if (typeof m.value !== 'number' || !Number.isFinite(m.value) || m.value < 0) {
    reasons.push(`${label} must be a finite non-negative measured value`);
  }
  if (!DR_MEASUREMENT_UNITS.includes(m.unit)) reasons.push(`${label} unit is not recognised`);
  if (!m.method || !m.method.trim()) reasons.push(`${label} requires a measurement method`);
}

/**
 * Validates a single supplied record. Nothing is inferred or defaulted:
 * a missing artifact, unknown scope or malformed timestamp rejects the record.
 */
export function validateDrExerciseRecord(record: unknown): DrRecordValidation {
  const reasons: string[] = [];
  const r = record as Partial<DrExerciseRecord> | null;

  if (!r || typeof r !== 'object') return { valid: false, reasons: ['record is not an object'] };
  if (!r.id || !String(r.id).trim()) reasons.push('id is required');
  if (!r.performedAt || !ISO_8601.test(String(r.performedAt))) {
    reasons.push('performedAt must be an ISO-8601 timestamp');
  }
  if (!Array.isArray(r.scopes) || r.scopes.length === 0) {
    reasons.push('at least one scope is required');
  } else if (r.scopes.some((s) => !DR_EXERCISE_SCOPES.includes(s))) {
    reasons.push('scopes contain an unrecognised value');
  }
  if (!r.outcome || !DR_EXERCISE_OUTCOMES.includes(r.outcome)) {
    reasons.push('outcome must be completed, partial, failed or aborted');
  }
  if (!r.artifactRef || !String(r.artifactRef).trim()) {
    reasons.push('artifactRef is required - an exercise without a supplied test artifact is not evidence');
  }
  if (!r.operator || !String(r.operator).trim()) reasons.push('operator is required');
  validMeasurement(r.rto, 'rto', reasons);
  validMeasurement(r.rpo, 'rpo', reasons);

  return { valid: reasons.length === 0, reasons };
}

/** Records supplied through the evidence registry, filtered to valid entries. */
export function loadDrExerciseRecords(source: unknown = DR_EXERCISE_REGISTRY): DrExerciseRecord[] {
  const raw = Array.isArray(source) ? source : [];
  return raw.filter((entry) => validateDrExerciseRecord(entry).valid) as DrExerciseRecord[];
}

/** Records supplied but rejected, with reasons. Surfaced rather than hidden. */
export function rejectedDrExerciseRecords(
  source: unknown = DR_EXERCISE_REGISTRY,
): Array<{ record: unknown; reasons: string[] }> {
  const raw = Array.isArray(source) ? source : [];
  return raw
    .map((record) => ({ record, reasons: validateDrExerciseRecord(record).reasons }))
    .filter((entry) => entry.reasons.length > 0);
}

function latestCompleted(records: DrExerciseRecord[], scope: DrExerciseScope): DrExerciseRecord | null {
  const matches = records
    .filter((r) => r.outcome === 'completed' && r.scopes.includes(scope))
    .sort((a, b) => Date.parse(b.performedAt) - Date.parse(a.performedAt));
  return matches[0] ?? null;
}

function measurementNote(kind: 'RTO' | 'RPO', m: DrMeasurement, record: DrExerciseRecord): string {
  return `Measured ${kind} of ${m.value} ${m.unit} recorded during exercise ${record.id} (${m.method}).`;
}

/**
 * Merges supplied exercise evidence into the baseline readiness fields.
 * With no valid records the baseline is returned unchanged - the logger
 * cannot manufacture readiness.
 */
export function deriveDrReadinessFields(
  records: DrExerciseRecord[] = loadDrExerciseRecords(),
  baseline: readonly DrReadinessField[] = DR_READINESS_FIELDS,
): DrReadinessField[] {
  return baseline.map((field) => {
    if (field.id === 'backup' || field.id === 'restore' || field.id === 'rollback') {
      const record = latestCompleted(records, field.id);
      if (!record) return { ...field };
      return {
        ...field,
        state: 'exercised',
        evidenceRef: record.artifactRef,
        note: `Exercise ${record.id} completed ${record.performedAt} by ${record.operator}. ${record.note}`.trim(),
      };
    }

    const kind = field.id === 'rto' ? 'rto' : 'rpo';
    const measured = records
      .filter((r) => r.outcome === 'completed' && r[kind])
      .sort((a, b) => Date.parse(b.performedAt) - Date.parse(a.performedAt))[0];
    if (!measured) return { ...field };
    return {
      ...field,
      state: 'exercised',
      evidenceRef: measured.artifactRef,
      note: measurementNote(kind === 'rto' ? 'RTO' : 'RPO', measured[kind]!, measured),
    };
  });
}

/** Overall exercise status derived from supplied records. */
export function deriveDrExerciseStatus(
  records: DrExerciseRecord[] = loadDrExerciseRecords(),
  baseline: DrExerciseStatus = DR_EXERCISE_STATUS,
): DrExerciseStatus {
  const completed = records
    .filter((r) => r.outcome === 'completed')
    .sort((a, b) => Date.parse(b.performedAt) - Date.parse(a.performedAt));
  if (completed.length === 0) {
    const attempts = records.length;
    return attempts === 0
      ? { ...baseline }
      : {
          ...baseline,
          note: `${attempts} exercise attempt(s) recorded, none completed. An attempt is not proof of recovery.`,
        };
  }
  const latest = completed[0];
  return {
    state: 'exercise-recorded',
    evidenceRef: latest.artifactRef,
    note: `Latest completed exercise ${latest.id} on ${latest.performedAt} covering ${latest.scopes.join(', ')}, recorded by ${latest.operator}.`,
  };
}
