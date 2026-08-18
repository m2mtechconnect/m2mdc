# Phase 7 - Simulation-run family consolidation

## Measured before
Three run tables existed:

| Table | Rows | Envelope | Readers |
|---|---|---|---|
| `simulation_runs` | 2 | full (engine version, execution origin, validation status, input/output snapshots, metric provenance, checksum, idempotency key) | `runPersistence`, comparison hook, search |
| `twin_simulation_runs` | 0 | none | `useTwinSimulations`, `useCreateSimulationRun`, TwinDebug label |
| `sovereign_dc_simulation_runs` | 0 | none | none |

Defect: two surfaces could show "simulation runs" from a table that cannot say
which engine produced a result or whether it was server-validated, and an
unused mutation hook could still write envelope-less rows.

## Change
- `src/workspace/runRecords.ts` is the canonical read model: `mapRunRecord`
  normalizes a `simulation_runs` row into `SimulationRunRecord` (KPIs, duration,
  event count, impact score) and carries the envelope through unchanged, with a
  `recordCitation` of `simulation_runs:<id>`. `serverValidated` is true only when
  the record literally says `server-validated`.
- `useTwinSimulations` now reads `simulation_runs` via `loadRunRecords`.
- `useCreateSimulationRun` (envelope-less writer into the legacy table, no
  callers) was deleted. Runs are written only by `runPersistence.persistRun`.
- `useHistoricalSimulationRuns` delegates its mapping to the canonical model and
  now exposes engine version, execution origin, validation status and citation.
- TwinDebug reports the real table it queries.
- Migration `deprecate_legacy_simulation_run_tables`: Data API grants revoked on
  both legacy tables and deprecation comments recorded. Both are empty and have
  no readers. The `DROP` is deliberately left to a separate migration after an
  observation window, per the rule in `05-table-migration-map.md`.

## Verification
- 8 new unit tests (`src/workspace/__tests__/runRecords.test.ts`)
- typecheck clean; workspace/hooks/search suites pass
