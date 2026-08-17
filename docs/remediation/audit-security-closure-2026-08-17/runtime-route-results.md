# Runtime route results

Playwright (Chromium, 1280x1800) against the running app, plus direct API probes.

| Check | Result |
| --- | --- |
| Anonymous route sweep (`/manage/connections`, `/admin/platform-readiness`) | PASS - both redirect to `/` |
| Authenticated route sweep (engineer identity) | PASS - both render their real page |
| Connections page | PASS - "Connections & Data Exchange" renders with live records |
| Platform Readiness page | PASS - capability assessment renders |
| Dataset canary route coverage (`?dataset=nvidia-dsx-reference`) | PASS - both stay mounted as `DATASET_NEUTRAL`, no reference takeover |
| Invalid dataset fallback (`?dataset=not-a-dataset`) | PASS - legacy dataset, page renders |
| Connection catalogue | PASS - published connector definitions load for a non-admin |
| Setup wizard | PASS - reachable from the connections page (unchanged in this phase) |
| Managed-access drawer | PASS - unchanged in this phase, covered by `managedConnectors`/`managedVerification` unit suites |
| OAuth-disabled state | PASS - 410 from the function; UI shows the unavailable message instead of opening a popup |
| Cross-tenant API attempts | PASS - see `tenant-isolation-results.md` |
| Public contact intake | PASS - 200 with correlation id; invalid payload 400 |
| Public onboarding intake | PASS - 200, duplicate suppressed, direct table insert denied |
| Console errors during the sweep | 0 |

One non-blocking network observation: `POST /functions/v1/connection-credential` returns
403 for the non-admin engineer identity on the connections page. That is the credential
vault failing closed for a role without vault access; it predates this phase and is the
intended behaviour, not a regression.
