# Phase 1B — Execution Plan

Status: **PROPOSED**. Awaiting approval for Phase 1B.1.

Phase 1B is broken into small hard-stop slices. Each slice ends with the
authoritative gates from `phase-1b-baseline.md §3` and a signed report before
the next slice is authorized.

## Slice map

| Slice | Scope | Duration target | Rollback |
|---|---|---|---|
| **1B.0** | Baseline anchor + design (this doc) | complete | n/a — docs only |
| **1B.1** | Provider contract + fail-closed facade (no consumer migration) | complete | delete `src/simulation/{api.ts,providers/**}` |
| **1B.2a** | First consumer vertical slice — `DCSimulationPanel` behind `VITE_AURA_SIM_FACADE_DCPANEL` (default OFF); unknown-config → typed unavailable | complete | unset flag; revert `DCSimulationPanel`, `api.ts`, `registry.ts` deltas |
| **1B.2b** | Extend facade migration to remaining simulation consumers | **closed — docs-only (1B.2b-null)**; see `phase-1b2b-finding.md` | n/a |
| **1B.2** | Characterization tests for the 7 simulation engines | 1–2 turns | delete new test files |
| **1B.3** | Introduce `src/simulation/api.ts` facade + provider interface (no consumer migration) | 1 turn | delete new files |
| **1B.4** | Fold `twins/dataCenter/simulationEngine.ts` behind `src/simulation/compat/dataCenterEngine.ts`; shim historical path; identity tests | complete | restore file from git; delete `src/simulation/compat/**` |
| **1B.5** | Fold `PRESET_SCENARIOS` + `SIMULATION_SCENARIOS` + `ENHANCED_SCENARIOS` behind read-only `scenarioLibraryProvider` (namespaced ids `preset:*` / `dc:*` / `sovereign:*`); source constants untouched | complete | delete `src/simulation/providers/scenarioLibraryProvider.ts` and revert registry/contract-test to Phase 1B.4 wiring |
| **1B.6** | Delete duplicate engines (`twins/dataCenter/simulationEngine.ts`, `twins/sovereignDataCenter/simulationEngine.ts`); Sovereign engine moved to `src/simulation/compat/sovereignDataCenterEngine.ts`; barrels + characterization tests + `useSovereignDCTwin` re-pointed to compat; re-export identity spec added | complete | restore from git |
| **1B.7** | Rename builder `SimulationEngine` class to resolve name clash; migrate builder to `fixtures/builderMock` | 1 turn | rename back |
| **1B.8** | `omniverseProvider` stub wired behind `VITE_AURA_SIM_PROVIDER`; provider-selection unit tests | 1 turn | remove flag branch |
| **1B.9** | Consolidation report + updated capability-traceability + Playwright rerun + evidence bundle | 1 turn | docs-only |

## Slice acceptance (applies to every slice 1B.1+)

1. `tsc -p tsconfig.app.json --noEmit` — **0 errors** (ADR-0002).
2. `npm run build` — PASS, SEO gate green.
3. Vitest deterministic run — failure identity set is **subset of baseline**;
   any new failure blocks the slice.
4. ESLint — no *new* rule violations in files touched by the slice
   (net-neutral or better allowed elsewhere).
5. Playwright truth-in-UI — 47/47 PASS on the same Nix Chromium recipe as
   Phase 1A.3.g.1.
6. Truth-in-UI classifications unchanged (`random-and-synthetic-data-register.md`
   diff = 0 lines unless the slice explicitly amends it).
7. Slice report appended to `phase-1b-report.md` with exact commands, gate
   outputs, and reason for any approved variance.

## Rollback criteria (all slices)

A slice is rolled back if **any** of the following holds after implementation:

- typecheck fails,
- production build fails,
- Vitest failure identity set is not a subset of baseline,
- Playwright drops below 47/47,
- any evidence checksum in `phase-1a3/SHA256SUMS.txt` fails verification,
- a truth-in-UI classification changes without an explicit register amendment.

Rollback = revert the slice's commits; no partial acceptance.

## Guardrails (Phase 1B-wide)

- No source refactors in 1B.0. No migrations, dependency installs, or lockfile
  bumps in any slice unless the slice is explicitly authorized to do so.
- No external calls; no real NVIDIA / BMS / DCIM traffic; `omniverseProvider`
  throws `NotImplemented` and is off by default.
- No broad legacy-test cleanup. If a slice happens to fix a legacy failure,
  that improvement is recorded, not sought.
- No changes to truth-in-UI classifications (Phase 1A.3.c.1 catalogs, staleness
  policy, or export schema) inside 1B slices.
- Playwright fixture false-positive fixes remain narrow (per Phase 1A.3.g.1
  precedent) — no global rule disables.

## Legacy-failure handling policy

The 236 failing Vitest tests remain **owned by their originating epics**, not
by Phase 1B. Slice 1B.1 attaches an ownership label to each failing file; no
test is modified, skipped, or weakened during Phase 1B.

If a Phase 1B slice unavoidably touches a file with legacy failures, the slice
report must (a) attach the pre- and post-slice failure identity list for that
file, and (b) prove `post ⊆ pre`.

## Deliverables per slice

- New/edited files list.
- Gate outputs (verbatim exit codes + summary lines).
- Failure-identity diff vs `phase-1b-baseline.md`.
- Updated capability-traceability entry (only if capability status genuinely
  changed — truthful UI does not imply wired capability, per ADR-0006).

## Hard stop

Phase 1B.0 ends here. Phase 1B.1 requires explicit user authorization.