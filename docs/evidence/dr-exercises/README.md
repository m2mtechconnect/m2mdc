# DR exercise evidence

This directory holds one immutable JSON record per performed disaster-recovery
exercise (backup, restore or rollback). Records are written only by:

```
node scripts/log-dr-exercise.mjs \
  --scope restore \
  --outcome completed \
  --artifact docs/evidence/dr-exercises/artifacts/<your-test-artifact> \
  --operator "<accountable person>" \
  --performed-at 2026-08-26T14:00:00Z \
  --rto 42:minutes:"restore log timestamps" \
  --rpo 5:minutes:"last checkpoint delta" \
  --note "Full restore from managed backup into staging."
```

## Rules

- A supplied test artifact that exists on disk is mandatory. Without it the
  logger refuses to write anything.
- Only `--outcome completed` upgrades a readiness field to **Exercised**.
  `partial`, `failed` and `aborted` are recorded as attempts and change nothing.
- RTO and RPO are recorded only as measured values with a unit and a
  measurement method. Targets, estimates and defaults are never invented.
- Records are immutable: the logger refuses to overwrite an existing record.
- Never place credentials, tenant data or personal data in artifacts recorded
  here. Artifact references are paths only; artifact contents are not ingested.

The logger regenerates `src/supervisor/drExerciseRegistry.ts`, which the
Enterprise Readiness Supervisor reads. Every entry is re-validated at runtime;
an invalid entry is rejected, surfaced with its reason, and has no effect on
readiness state.
