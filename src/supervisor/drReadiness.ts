/**
 * Disaster recovery and rollback readiness evidence (supervisor plane).
 *
 * Truth rules:
 *  - Documentation or configuration is NOT proof of a completed exercise.
 *    A runbook earns `documented`; only a recorded exercise report earns
 *    `exercised`, and it requires an evidence reference.
 *  - RTO/RPO targets are explicit fields. Until targets are defined and
 *    measured, they report `not-defined` — never an invented number.
 */

export const DR_FIELD_STATES = [
  /** A runbook, policy or configuration artifact exists. */
  'documented',
  /** A signed exercise report with measured results exists (ref required). */
  'exercised',
  /** No target or evidence exists for this field. */
  'not-defined',
  /** Not yet assessed. */
  'not-assessed',
] as const;

export type DrFieldState = (typeof DR_FIELD_STATES)[number];

export interface DrReadinessField {
  id: 'backup' | 'restore' | 'rollback' | 'rto' | 'rpo';
  label: string;
  state: DrFieldState;
  /** Required when state is `exercised`; otherwise null. */
  evidenceRef: string | null;
  note: string;
}

export const DR_TRUTH_NOTE =
  'Documentation or configuration is not proof of a completed exercise. Only a recorded, measured exercise upgrades a field to Exercised.';

/**
 * Current truthful posture: a rollback runbook exists and was followed once
 * for the first live binding, but no DR exercise with measured recovery time
 * is recorded, and no RTO/RPO targets are defined.
 */
export const DR_READINESS_FIELDS: readonly DrReadinessField[] = [
  {
    id: 'backup',
    label: 'Backup coverage',
    state: 'not-assessed',
    evidenceRef: null,
    note: 'Managed platform backups are assumed but not independently verified or recorded as evidence.',
  },
  {
    id: 'restore',
    label: 'Restore procedure',
    state: 'not-assessed',
    evidenceRef: null,
    note: 'No restore-from-backup exercise evidence exists. The rollback runbook governs application rollback only.',
  },
  {
    id: 'rollback',
    label: 'Application rollback',
    state: 'documented',
    evidenceRef: 'docs/release/rollback-runbook.md',
    note: 'Controlled rollback runbook with SHA-bound verification, abort criteria and post-incident requirements. Documented, not exercised under drill conditions.',
  },
  {
    id: 'rto',
    label: 'Recovery time objective (RTO)',
    state: 'not-defined',
    evidenceRef: null,
    note: 'No RTO target is defined. A target and a measured exercise are both required before any recovery-time claim.',
  },
  {
    id: 'rpo',
    label: 'Recovery point objective (RPO)',
    state: 'not-defined',
    evidenceRef: null,
    note: 'No RPO target is defined. Backup frequency evidence is a prerequisite.',
  },
];

export interface DrExerciseStatus {
  state: 'not-exercised' | 'exercise-recorded';
  /** Required when state is `exercise-recorded`. */
  evidenceRef: string | null;
  note: string;
}

export const DR_EXERCISE_STATUS: DrExerciseStatus = {
  state: 'not-exercised',
  evidenceRef: null,
  note: 'No DR/restore exercise with measured recovery time is recorded. Enterprise commitments require a signed exercise report.',
};
