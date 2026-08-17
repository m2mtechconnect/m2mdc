# Remaining skips and BLOCKED_UNVERIFIED items

## BLOCKED_UNVERIFIED

| Item | Reason |
| --- | --- |
| Published-runtime acceptance of the connections control plane | The published host predates those routes and returns 404 for `/manage/connections` and `/admin/platform-readiness`. Verified green on the current build. Requires a republish to close |
| Rate-limit window reset | The window is hourly and the run did not span one. Structural (`date_trunc('hour', now())`) but not observed |
| Independent anonymous users not blocking one another | All probes originate from a single egress address. Signed-in callers demonstrably bucket per user id; distinct anonymous clients could not be simulated |
| Full published Playwright suite | Not meaningful against a stale bundle |
| Truth / a11y / axe suites | Not re-run in this phase |
| GPU acceptance matrix | Requires an administrator on a hardware-accelerated browser |
| Deeplink / crossbrowser suites | Not run in this phase |

## Pre-existing skipped vitest set (91 tests, 9 files)

`tests/integration/analytics.test.ts`, `analytics-with-seeds.test.ts`,
`builder.test.ts`, `builder-flow.test.tsx`, `builder-with-seeds.test.ts`,
`integrations.test.ts`, `operations.test.ts`, `template-validation.test.ts`,
`tests/performance/api-load.test.ts`.

All gated on a live backend by `tests/_setup/liveBackendGuard.ts` for CI
stability. Count unchanged by this phase.

## Closed since the previous phase

- Two-membership positive tenant test — now proved in both directions.
- Managed Google Drive authorization — no longer a blocker; the connector is
  intentionally out of scope and the legacy path is retired.
