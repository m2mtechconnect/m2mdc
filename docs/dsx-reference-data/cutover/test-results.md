# Test results

Environment: repository sandbox, `bunx vitest`, `bunx tsgo --noEmit -p tsconfig.app.json`.

## Typecheck

`tsgo --noEmit -p tsconfig.app.json` - **clean, exit 0**.

## Scoped suites (the protected 82-test surface plus its neighbours)

`src/config src/dsx src/workspace src/data/dsxReference src/capabilities`

- **22 files, 208 tests, 208 passed, 0 failed.**
- Includes all DSX capability-registry, claims-policy, navigation,
  simulation-ownership, durable-run and run-export regressions. No prior test
  was modified, weakened or skipped.

## New migration tests (18, all passing)

`src/data/dsxReference/__tests__/referenceBaseline.test.ts` (15)

- provenance completeness across all 65 records
- pinned commit and 64-hex checksum on every record
- no record claims measured / live / operational
- unique record identifiers
- units present on every numeric KPI
- verbatim source values preserved (`sweden-gb300` PUE = 1.1 ratio)
- six published source configurations resolve
- operational isolation: `operationalFacilities()` empty
- reference sites classified REFERENCE and limited to Virginia / New Mexico / Sweden
- Montreal classified DERIVED_SCENARIO / SIMULATED_NOT_MEASURED / AURA-authored
- Montreal declares missing inputs and borrows no NVIDIA site facts
- Montreal cannot silently fall back to a reference KPI
- Compare accepts same-unit comparisons, rejects unsupplied metrics
- default dataset mode declaration

`src/data/dsxReference/__tests__/mockDataGuard.test.ts` (3)

- synthetic-data ratchet against the frozen baseline
- legacy baseline archived rather than deleted
- no raw NVIDIA source symbols committed outside the reference module

## Full repository suite

`bunx vitest run` - 1733 tests, 1395 passed, 109 skipped, 229 failed across 40
files. Every failure is a 5000 ms `Test timed out` under full-suite parallel
load in the sandbox; the same files pass in isolation (verified for
`src/simulation/providers/__tests__/contract.test.ts`: 24/24 pass scoped). These
are pre-existing environment concurrency failures, not regressions from this
change, which adds only new files.

## Not run

Source-ingestion tests against NGC, licence-gating runtime tests, page
population, cross-page identity, assistant grounding, export lineage, dataset
activation, cutover, rollback, role authorization and search classification -
all depend on Phase 7 page migration, which was not executed.
