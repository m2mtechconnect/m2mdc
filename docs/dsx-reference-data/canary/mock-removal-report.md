# Mock removal report

## Before / after

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Checksummed files in `AURA_LEGACY_SYNTHETIC_BASELINE_V1` | 135 | 135 | preserved, not deleted |
| Production files with nondeterministic value generation | 44 | 43* | -1 |
| Files containing mock / demo / fixture symbols | 87 | 87 | 0 |

\* The 43 figure is the current measurement of the same ratchet query. It is
**not** a claimed removal: no legacy page was rewritten in this phase. Treat the
delta as measurement noise between glob sets, not as progress.

## Honest position

The centralized provider removes mock dependence only on the surfaces that
actually read it. In this phase that is the admin dataset registry page and the
dataset-backed value / unavailable components. **Every other page still renders
legacy synthetic values, including when `?dataset=nvidia-dsx-reference` is
active.** No claim of mock replacement is made for those pages.

## Classification of remaining sources

| Category | Files | Notes |
| --- | --- | --- |
| Tests and fixtures | ~44 | `src/**/__tests__`, `tests/**`, deterministic by design |
| Demo / preview fixtures | ~30 | Evidence Beta fixtures, overlay fixtures, tour content |
| Explicit legacy fallback | ~13 | `src/twins/sovereignDataCenter/mockData.ts` (56 `Math.random` sites) and friends, retained for rollback |
| Unresolved production debt | ~43 | Production files still generating values at render time |

The ratchet guard in `src/data/dsxReference/__tests__/mockDataGuard.test.ts`
remains active and still fails on any newly added production `Math.random`
source, so the number cannot grow.
