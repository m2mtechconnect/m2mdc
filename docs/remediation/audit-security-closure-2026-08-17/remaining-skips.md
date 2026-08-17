# Remaining skips and BLOCKED_UNVERIFIED items

## BLOCKED_UNVERIFIED

| Item | Reason |
| --- | --- |
| Two-membership positive tenant test for `connection_data_contracts` | Only one live non-admin identity exists and no tenant currently owns contract rows. Isolation was proved by denial (unfiltered read returns no cross-tenant row); the positive "tenant A sees its own row" case is unproved at runtime. |
| Managed Google Drive authorization end-to-end | No Google Drive App User Connector client is linked, carried from the previous phase. This is the blocker that keeps the OAuth quarantine in `PENDING_MANAGED_CONNECTOR` state. |
| Full Playwright truth / a11y / GPU / deeplink / crossbrowser suites | Not executed in this phase; only the targeted route acceptance sweep was run. Last recorded green runs predate the connections control plane work. |

## Pre-existing skipped vitest set (91 tests, 9 files)

`tests/integration/analytics.test.ts`, `analytics-with-seeds.test.ts`, `builder.test.ts`,
`builder-flow.test.tsx`, `builder-with-seeds.test.ts`, `integrations.test.ts`,
`operations.test.ts`, `template-validation.test.ts`, `tests/performance/api-load.test.ts`.

All are gated on a live backend by `tests/_setup/liveBackendGuard.ts` for CI stability.
Count unchanged by this phase.
