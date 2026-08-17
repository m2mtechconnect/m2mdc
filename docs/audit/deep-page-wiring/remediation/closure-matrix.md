# Deep page-wiring remediation - closure matrix

Source backlog: `docs/audit/deep-page-wiring/remediation-priority.md`.

| # | Finding | Severity | Status | Change |
| --- | --- | --- | --- | --- |
| 1 | Simulation runs lived only in browser localStorage | P1 | Closed | `public.simulation_runs` extended with `run_key`, `input_snapshot`, `output_snapshot`, `metric_provenance`, `execution_origin`, `validation_status`; owner-scoped RLS plus an immutability guard trigger. `src/workspace/runPersistence.ts` writes every run; `workspaceStore.runScenario` returns `null` and surfaces `lastRunError` when the durable write fails, so an unsaved run is never presented as a result. `hydrateRuns` reloads server records per user and twin. |
| 2 | `/app/agents/:slug/detail` and `/studio/systems/:id/manage` spun forever after retried 400/406 responses | P2 | Closed | `src/lib/queryRetry.ts` classifies client errors about the requested resource as terminal; the global query client uses `retryUnlessTerminal` with bounded backoff. Both pages now render a named not-found state with a safe message. |
| 3 | `/data-centre-twin/<unknown uuid>` rendered the default twin | P2 | Closed | `DataCentreTwin` computes `requestedUnknownTwin` and fails closed with a not-found panel instead of substituting another facility. |
| 4 | `/search?q=` was not consumed on mount | P3 | Closed | `?q=` is the authoritative query; the field hydrates from it, replaces it on change without stacking history, and follows back/forward. |
| 5 | `/blueprint/%%%bad-id` returns an edge 400 before the SPA mounts | P3 | Not closed | The malformed path is rejected by the static host before any application code runs. Not fixable in the client bundle. |
| 6 | `/settings/ai` icon-only button with no accessible name | P3 | Closed | Grounding switch, both selects and all four sliders carry explicit `aria-label`s. |
| 7 | `/admin/signups-dashboard` rendered 324 rows unpaginated | P3 | Closed | 25 rows per page with a labelled pager and a live row-range announcement; the page resets when the tab changes. |
| 8 | Aborted prefetch of the reference-facility harness twin | P3 | Closed | The validation harness iframe mounts only when a run starts, so leaving the page cannot abort an in-flight twin load. |
| 9 | Escape may not close the navigation drawer | P3 | Closed | The compact status disclosure closes on Escape and returns focus to its toggle. |

## Provenance of run records

Runs are labelled honestly in the UI by `src/workspace/RunProvenanceBadge.tsx`:

- **Saved record - client-computed**: written to `public.simulation_runs`; numbers were produced in the browser and are `client-produced-unverified`.
- **Demonstration fixture**: seeded sample, not an operational record.
- **Legacy browser-only simulation**: recorded before durable persistence existed; single-browser only and never an operational record.

## Verification

- `tsgo --noEmit -p tsconfig.app.json`: clean.
- `vitest run src/workspace/__tests__ src/lib/__tests__/queryRetry.test.ts`: 35 tests pass, including a case proving a failed durable write yields no run and a case proving a saved run carries its server id and provenance.
