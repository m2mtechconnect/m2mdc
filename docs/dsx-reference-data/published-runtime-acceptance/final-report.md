# Published-runtime acceptance - interim report

## Answer to the primary objective

The canary was **not** a page-by-page migration. It was a single shared
reference surface rendered in place of 19 distinct application pages. That is
recorded in `page-identity-parity-matrix.md` with the structural evidence.

## Repair

Route-specific reference adapters now supply page identity, tab structure,
controls, export identity, assistant scope and an explicit statement of every
interaction that is unavailable in reference mode with its reason. Centralized
selectors remain the only data path; no synthetic data was reintroduced; the
legacy page component is still not mounted in reference mode, so the
zero-synthetic-dependency property is preserved.

## State

- Production default: `legacy-synthetic` (unchanged).
- Canary: `?dataset=nvidia-dsx-reference`, administrator only (unchanged).
- Capability classifications and claims policy: unchanged.
- NGC `dsx_dataset` v2.1: still HTTP 401, surfaced as a terminal unavailable state, no retry, no substitution.

## Files changed

- `src/data/dataset/referenceAdapters.ts` (new)
- `src/data/dataset/__tests__/pageIdentity.test.ts` (new)
- `src/components/dataset/ReferenceSurface.tsx` (adapter-driven page chrome and tabs)
- `src/data/dataset/surfaceRegistry.ts` (two section declarations corrected)
- `docs/dsx-reference-data/published-runtime-acceptance/*` (evidence)

## Remaining limitations

Phases 3 (export download inspection), 4 (published Search/Assistant run),
5 (per-workspace evidence-beta classification), 6 (runtime dependency graph),
7 (eight-failure reconciliation), 8 (responsive screenshots), 10 (87-route,
26-alias, four-role published sweep) and 11 (rollback drill) were not executed.

## Verdict

AURA_DSX_REFERENCE_CANARY_PUBLISHED_RUNTIME_ACCEPTANCE_PARTIAL
