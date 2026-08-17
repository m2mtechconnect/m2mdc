# AURA DSX reference-data canary - final report

## Build identity

| Item | Value |
| --- | --- |
| Previous published bundle | `assets/index-BLh1dE2h.js` |
| New published bundle | none - **not published in this phase** |
| Source revision (baseline) | `ae7c8049` |
| Manifest version | 1.1.0 (unchanged) |
| Production default dataset | `legacy-synthetic` (unchanged) |

## Routes

Authoritative count: **87** unique route declarations plus **26** aliases. The
83 / 86 / 87 discrepancy is reconciled in `route-reconciliation.md`. One route
was added: `/admin/dataset-registry`.

Routes exercised by role and dataset at runtime: **0** - the runtime sweep was
not performed (see `runtime-route-results.json`).

## Migration

Migrated: 3 surfaces (admin dataset registry, global canary banner, dataset
value/unavailable rendering). Partial: 2 (export shaping, dataset search).
Not migrated: 16. Detail in `page-migration-matrix.md`.

## Records

All 65 normalized records are reachable through the centralized selectors and
are fully consumed by the admin registry page: 36 REFERENCE_KPI_VALUE, 21
REFERENCE_SPECIFICATION, 6 REFERENCE_CONFIGURATION, 2 REFERENCE_SCENARIO. No
other page consumes them yet.

## Mock sources

135 checksummed legacy files preserved, none deleted. Production
nondeterministic sources measured at 43 (previously 44); this is measurement
noise, not a removal. The ratchet did not meaningfully decrease.

## Isolation

Reference facility isolation: PASS - four separate facilities, never merged,
`operationalFacilities()` empty, `countsTowardOperationalTotals` false for all.
Montreal isolation: PASS - AURA-authored, DERIVED_SCENARIO, 8 inputs Not
supplied, zero NVIDIA records attributed.

## Workflow

Simulation / Compare / Review / Evidence / Export: module-level only. Export
lineage and the "never zero" rule are implemented and tested; the UI panels are
not rewired.

## Assistant grounding

NOT IMPLEMENTED. No grounding, citation or abstention behaviour was changed.

## NGC

Single terminal unavailable state, no retry, no spinner, no substitution, no
credential requested or stored. Four dependent data classes hold zero records.

## Access and rollback

Admin-only access: PASS (tested, 4 cases). Rollback: PASS (one action, tested).

## Tests

Typecheck clean. 101 scoped tests pass, 0 fail, 0 skipped. Playwright suites
NOT RUN.

## Remaining blockers

1. NGC `dsx_dataset` v2.1 - HTTP 401, no credential.
2. Raw NVIDIA source - REQUIRES_LEGAL_REVIEW.
3. 16 pages still render legacy synthetic data in reference mode.
4. Assistant grounding not implemented.
5. Runtime route sweep and publication not performed.

## Files changed

- `src/data/dataset/datasetRegistry.ts` (new)
- `src/data/dataset/valueClassification.ts` (new)
- `src/data/dataset/referenceSelectors.ts` (new)
- `src/data/dataset/exportProvenance.ts` (new)
- `src/data/dataset/canaryEvents.ts` (new)
- `src/data/dataset/DatasetProvider.tsx` (new)
- `src/data/dataset/index.ts` (new)
- `src/data/dataset/__tests__/datasetCanary.test.ts` (new)
- `src/components/dataset/UnavailableState.tsx` (new)
- `src/components/dataset/DatasetCanaryBanner.tsx` (new)
- `src/components/dataset/DatasetValueRow.tsx` (new)
- `src/pages/admin/DatasetRegistryPage.tsx` (new)
- `src/AuthenticatedShell.tsx` (provider, banner, route)
- `docs/dsx-reference-data/canary/*` (15 evidence files)

## Final verdict

**AURA_DSX_REFERENCE_CANARY_PARTIAL**
