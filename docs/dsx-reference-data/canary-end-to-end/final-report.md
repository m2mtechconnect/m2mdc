# AURA DSX reference canary - end-to-end phase report

| Item | Before | After |
| --- | --- | --- |
| Published bundle | assets/index-BLh1dE2h.js | unchanged (not republished in this phase) |
| Source revision | ae7c8049 | current working tree |
| Manifest version | 1.1.0 | 1.1.0 |
| Default dataset | legacy-synthetic | legacy-synthetic (unchanged) |
| Migrated surfaces | 3 migrated, 2 partial, 16 legacy | 19 REFERENCE_DATA_CONSUMER surfaces migrated |

## Mechanism

`src/data/dataset/surfaceRegistry.ts` classifies every authenticated route
(REFERENCE_DATA_CONSUMER / DATASET_NEUTRAL). `ReferenceRouteGate` mounts
`ReferenceSurface` instead of the legacy page component for every consumer route
while `?dataset=nvidia-dsx-reference` is active, so a legacy synthetic module is
not merely unused - it is never mounted. Dataset-neutral routes render normally
and preserve the dataset parameter through `withDataset`.

## Records

All 65 normalized records are reachable through the centralized selectors:
36 REFERENCE_KPI_VALUE, 21 REFERENCE_SPECIFICATION, 6 REFERENCE_CONFIGURATION,
2 REFERENCE_SCENARIO. Site specifications are selected per site
(`referenceSpecificationsForSite`), 7 per reference site.

## Workflow lineage

`referenceRun.ts` provides deterministic run lineage (dataset version, source
commit, input record IDs, scenario record IDs, AURA ownership, SIMULATED_RESULT
classification), blocks execution and names missing inputs, derives designs
without mutating reference records, and reports incomparable metrics instead of
coercing them. Export (`exportProvenance.ts`) carries full lineage in CSV and
JSON; unavailable values export as their state, never 0 or empty.

## Assistant grounding

Implemented in `assistantGrounding.ts`: authorization gate, facility-scoped
retrieval (no cross-facility leakage), record-ID citations with checksum and
commit, Montreal answered as AURA-derived with zero NVIDIA citations,
abstention for NGC-blocked and unmatched questions. Nine deterministic
evaluations pass.

## Runtime verification (preview host, localhost:8080)

- Admin + nvidia-dsx-reference: 19/19 consumer routes rendered the reference
  surface; 3 neutral routes rendered normally and preserved the parameter.
- Admin + legacy-synthetic: 0 reference surfaces (clean rollback path).
- Anonymous + canary parameter: redirected to `/`, 0 reference surfaces.
- Console errors: 4 (1 pre-existing DOM-nesting warning in the legacy
  Facilities page, 3 pre-existing local edge-function fetch failures).
- Full results: `route-runtime-results.json`.

## Tests

- Typecheck: clean (tsgo, tsconfig.app.json).
- `src/data/dataset`: 47 tests pass (23 existing + 24 new end-to-end tests).
- Full `src` suite: 927 pass, 8 fail. The 8 failures are pre-existing and
  unrelated (simulationTemplates, twinNameMigration, normalizeCompanyName, and
  one dynamic-import timeout in the simulation provider contract suite, which
  passes in isolation). No existing test was deleted, skipped or weakened.

## Not done in this phase

1. Playwright sweep covered 22 representative routes, not all 87 declarations
   and 26 aliases, and ran against the preview host, not the published host.
2. No republication: the published bundle is unchanged, so no published-host
   evidence exists for this phase.
3. `/dsx/evidence-beta/*` workspaces remain DATASET_NEUTRAL; the reference
   workflow (compare / review / evidence / export) is delivered on the
   `/simulation` surface instead.
4. NGC `dsx_dataset` v2.1 remains HTTP 401 - no retry was attempted.
5. Raw NVIDIA source remains REQUIRES_LEGAL_REVIEW.

## Isolation and claims

Four reference facilities remain separate; `operationalFacilities()` is empty;
Montreal remains AURA-authored, derived, simulated, not commissioned, not
connected, with 8 inputs Not supplied and zero NVIDIA records attributed.
No capability was promoted; the mandatory hybrid-architecture statement is
rendered on every migrated surface.

## Files changed

- `src/data/dataset/surfaceRegistry.ts` (new)
- `src/data/dataset/referenceRun.ts` (new)
- `src/data/dataset/assistantGrounding.ts` (new)
- `src/data/dataset/referenceSelectors.ts` (selectors added)
- `src/data/dataset/index.ts` (exports)
- `src/components/dataset/ReferenceSurface.tsx` (new)
- `src/components/dataset/ReferenceRouteGate.tsx` (new)
- `src/AuthenticatedShell.tsx` (gate wired)
- `src/data/dataset/__tests__/canaryEndToEnd.test.ts` (new, 24 tests)
- `docs/dsx-reference-data/canary-end-to-end/*`

## Final verdict

AURA_DSX_REFERENCE_CANARY_END_TO_END_PARTIAL
