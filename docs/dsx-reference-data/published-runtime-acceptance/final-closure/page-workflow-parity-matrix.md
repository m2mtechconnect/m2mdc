# Page workflow parity - published host, administrator session

Method: authenticated administrator session injected into a fresh Chromium
context on https://auradc.m2mtechconnect.com, each route loaded twice - once
with `?dataset=nvidia-dsx-reference`, once with no parameter (legacy-synthetic).
Recorded: HTTP status, final URL, canary banner presence, rendered H1, spinner
count, console errors, failed requests. Raw data: `declared-route-role-matrix.json`.

| Route | Reference H1 | Legacy H1 | Distinct identity | Verdict |
| --- | --- | --- | --- | --- |
| /dashboard | AI Factory Overview | Montreal Data centre | yes | READ_ONLY_BY_DESIGN |
| /manage/facilities | Facilities | Facilities | yes (content) | READ_ONLY_BY_DESIGN |
| /blueprint/:id | Blueprint | Blueprint | yes | READ_ONLY_BY_DESIGN |
| /blueprint/preview | Blueprint Preview | No Recommendation to Preview | yes | READ_ONLY_BY_DESIGN |
| /data-centre-twin/:id/blueprint | Twin blueprint | Twin blueprint | yes | BLOCKED_UNVERIFIED (no seeded twin id in session) |
| /builder | Build Twin | Start a new build | yes | READ_ONLY_BY_DESIGN |
| /simulation | Simulation Studio | Montreal Data centre - Simulation | yes | READ_ONLY_BY_DESIGN |
| /simulation/preview | Simulation Preview | No Recommendation to Preview | yes | READ_ONLY_BY_DESIGN |
| /analytics | Telemetry & Analytics | Operations & Telemetry | yes | UNAVAILABLE_WITH_EVIDENCE (no time series in source) |
| /search | Search | Search | yes (scope) | READ_ONLY_BY_DESIGN |
| /compliance | Validation & Evidence | Sovereignty & Safety Audit | yes | READ_ONLY_BY_DESIGN |
| /app/agents | Subsystem Agents | Subsystem Agents | yes (content) | READ_ONLY_BY_DESIGN |
| /connect/monitor | Ingestion Monitor | Sync Monitor | yes | READ_ONLY_BY_DESIGN |
| /connect/health | Source Health | Data Health | yes | READ_ONLY_BY_DESIGN |
| /manage/integrations | Integrations | Integrations | yes (content) | READ_ONLY_BY_DESIGN |
| /deploy | Deployment Lanes | (no H1) | yes | READ_ONLY_BY_DESIGN |
| /deployments | Deployment History | Runtime Environments | yes | READ_ONLY_BY_DESIGN |
| /admin/asset-pipeline | Asset Pipeline | Asset pipeline | yes (content) | READ_ONLY_BY_DESIGN |
| /help | Support & Documentation | Learning Hub | yes | READ_ONLY_BY_DESIGN |

Zero GENERIC_FACADE verdicts were recorded on identity, tab shape and export
identity, which are unit-asserted by `pageIdentity.test.ts` (7 tests: unique
page ids, unique titles, no duplicate tab/section shape, per-page export stems,
declared sections only, explained workflow limitations).

Honest limitation: no route reached **FUNCTIONALLY_MIGRATED**. The pinned
reference source publishes no mutation inputs, so every migrated surface is
read-only by design, states the original user job, marks unsupported actions
unavailable with a reason, and offers the one-action rollback. Full per-control
interaction testing (filters, forms, selection, keyboard) on all 19 routes was
not executed: BLOCKED_UNVERIFIED.
