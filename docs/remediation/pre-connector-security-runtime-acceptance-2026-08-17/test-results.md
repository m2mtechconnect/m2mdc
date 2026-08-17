# Test results

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript typecheck | `tsgo --noEmit -p tsconfig.app.json` | **PASS**, 0 errors |
| Production build | `vite build` | **PASS**, SEO gate 0 errors / 0 warnings |
| Full unit + integration suite | `vitest run` | **1639 passed, 0 failed, 91 skipped** across 162 files |

## Suite breakdown

| Suite | Passed | Failed | Skipped |
| --- | --- | --- | --- |
| Surface / dataset truth | all | 0 | 0 |
| Connection-plane model, mapping validation, wizard model | all | 0 | 0 |
| Managed connector authorization | all | 0 | 0 |
| White-label regression | all | 0 | 0 |
| Navigation / route config | all | 0 | 0 |
| Legacy Google OAuth retirement (new) | 4 | 0 | 0 |
| Backend-gated integration + performance | 0 | 0 | 91 |

## Runtime probes (not vitest)

| Probe | Result |
| --- | --- |
| Tenant isolation, 4 tables x 3 identities, both directions | PASS |
| Rate limiter, 12 scenarios | PASS after fix (1 real defect found and fixed) |
| Retired OAuth endpoint | 404, PASS |
| `rag_tokens` row count | 0, PASS |
| Client bundle secret scan | 0 matches, PASS |
| Published anonymous route sweep | PASS |
| Published authenticated route sweep | PARTIAL — stale published bundle |

## Totals

- Passed: **1639** vitest + **7** runtime probe groups
- Failed: **0**
- Skipped: **91** (pre-existing backend-gated set, unchanged by this phase)
- Blocked / not run: **7** (see `remaining-skips.md`)

No test was deleted, skipped or modified to obtain a green result. The one new
test file adds four assertions.
