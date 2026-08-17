# Remediation backlog (implementation deferred)

| # | Finding | Class | Severity |
| --- | --- | --- | --- |
| 1 | Simulation runs live only in browser localStorage; nothing is written to `public.simulation_runs`, so a run is not durable, not shareable and not visible on another device | DATA_INTEGRITY_DEFECT | P1 |
| 2 | `/app/agents/:slug/detail` and `/studio/systems/:id/manage` spin forever on an unknown id after 3 retried 400/406 responses | PERMANENT_LOADING | P2 |
| 3 | `/data-centre-twin/<unknown uuid>` renders the default twin instead of a not-found state | MISLEADING_STATE | P2 |
| 4 | `/search?q=...` does not run the query on mount, so search results are not deep-linkable | NOT_WIRED | P3 |
| 5 | `/blueprint/%%%bad-id` returns an edge 400 page and the SPA never mounts | BROKEN | P3 |
| 6 | `/settings/ai` has one icon-only button with no accessible name | ACCESSIBILITY_BLOCKER | P3 |
| 7 | `/admin/signups-dashboard` renders 324 rows and 338 buttons unpaginated | WIRED_WITH_LIMITATIONS | P3 |
| 8 | `/teams` fires an aborted prefetch of `/data-centre-twin?geometry=nvidia-reference&harness=1` | WIRED_WITH_LIMITATIONS | P3 |
| 9 | Escape may not close the navigation drawer (needs manual confirmation) | BLOCKED_UNVERIFIED | P3 |
