# Rollback test

## Rollback asset

`AURA_LEGACY_SYNTHETIC_BASELINE_V1` (`legacy-baseline-snapshot.json`) holds
per-file SHA-256 checksums for 135 source files plus database row counts. No
file was deleted, no database row was mutated, and no historical simulation run
was overwritten. Restoring the previous default therefore requires no data
recovery at all.

## Status: NOT EXERCISED

Because the default facility was never switched, there is nothing to roll back
and no rollback execution evidence exists. A rollback rehearsal must be run
before any future cutover attempt.
