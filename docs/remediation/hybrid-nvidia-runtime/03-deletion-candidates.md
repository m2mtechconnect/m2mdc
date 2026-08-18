# Phase 3 - deletion candidates (nothing deleted)

Destructive cleanup belongs to a later approved phase. Everything listed here
remains in the repository and in the database.

| Candidate | Remaining callers | External callers | Last known read/write | Migration dependency | Observation requirement | Deletion risk | Rollback |
|---|---|---|---|---|---|---|---|
| `src/stores/simulationSnapshotStore.ts` | `runProvenance.ts`, 3 simulation panels | none known | active (localStorage) | canonical run cache must cover panels | one release of canonical-only provenance with no fallback hits | medium - panels lose snapshot UI | restore file + eslint allowlist entry |
| `twin_simulation_runs` (table) | none in `src/` | unknown | legacy rows only | none | confirm zero reads for one release | low | table retained; no drop performed |
| `sovereign_dc_simulation_runs` (table) | none in `src/` | unknown | legacy rows only | none | confirm zero reads for one release | low | table retained; no drop performed |
| `src/dsx/fixtures/*` | Evidence Beta demonstration + unit tests | none | active | none | fixtures must stay for tests | high - breaks tests | keep |
| `src/dsx/runtime/decisionPersistence.ts` | `record-decision` client path, tests | none | active read path | server boundary must cover reads | one release with server-only writes | medium | keep |
| `src/workspace/runPersistence.ts` direct insert path | workspace store | none | active | edge-function boundary rollout | verify all writes carry server provenance | medium | keep |
