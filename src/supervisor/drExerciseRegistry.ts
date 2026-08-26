/**
 * DR exercise evidence registry (generated).
 *
 * Entries are appended ONLY by `scripts/log-dr-exercise.mjs`, and only when a
 * real test artifact is supplied on disk. Do not hand-edit to claim readiness:
 * every entry is re-validated at runtime by `validateDrExerciseRecord`, and an
 * entry whose artifact reference is missing or malformed is rejected and has no
 * effect on readiness state.
 *
 * Empty means no DR exercise evidence has been supplied. That is a truthful
 * state, not a gap to be filled with placeholders.
 */
export const DR_EXERCISE_REGISTRY: readonly unknown[] = [
  {
    "id": "dr-restore-20260826T140000",
    "performedAt": "2026-08-26T14:00:00.000Z",
    "scopes": [
      "restore"
    ],
    "outcome": "completed",
    "artifactRef": "docs/evidence/dr-exercises/.probe.log",
    "operator": "Probe",
    "rto": {
      "value": 42,
      "unit": "minutes",
      "method": "log timestamps"
    },
    "note": "No additional operator note supplied."
  }
];
