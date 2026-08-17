# Test results

Typecheck: `tsgo --noEmit -p tsconfig.app.json` - **clean, 0 errors**.

| Suite | Tests | Result |
| --- | --- | --- |
| `src/data/dataset/__tests__/datasetCanary.test.ts` (new) | 23 | pass |
| `src/data/dsxReference/__tests__/referenceBaseline.test.ts` | 15 | pass |
| `src/data/dsxReference/__tests__/mockDataGuard.test.ts` | 3 | pass |
| `src/config/__tests__/appNavigation.test.ts` | 15 | pass |
| `src/config/__tests__/dsxCapabilityRegistry.test.ts` | included | pass |
| `src/config/__tests__/dsxClaimsPolicy.test.ts` | 9 | pass |
| `src/auth/__tests__/permissions.test.ts` | 8 | pass |
| `src/capabilities/__tests__/*` | 10 | pass |
| `src/routing/__tests__/authenticatedEntryRedirect.test.ts` | 3 | pass |
| **Scoped total for this run** | **101** | **101 pass, 0 fail** |

New coverage added by `datasetCanary.test.ts`:

dataset URL parsing and safe fallback (5), administrator-only access (4),
record provenance and coverage (4), facility isolation including Montreal
non-contamination and no merging of the four reference sites (4), stable NGC
unavailable states (2), search access and labelling (2), export continuity
including "never zero" (2).

Not run in this phase: Playwright page-wiring, truth-in-UI, deep-link and
durable-simulation browser suites. They were unchanged by this work but were
not re-executed, so they are reported as NOT RUN rather than passing.

No test was skipped, hidden or deleted.
