# Data wiring matrix

Labels: live | simulated | static | fixture | unavailable | unknown.

| Page | Data source observed | Label | Class |
| --- | --- | --- | --- |
| `/dashboard` | Facility identity and twin UUID from backend (`b8f9f3ad-...`); KPI values render under a global "SIMULATED / Design baseline / No run recorded / Synthetic inputs" provenance strip | live identity + simulated metrics | WIRED_WITH_LIMITATIONS |
| `/manage/facilities` | 25 real twin records from backend, each row deep-linking by UUID | live | WIRED_VERIFIED |
| `/blueprint/default` | Blueprint model, tabs (model/assets/controls/validation) render with facility name | live model, simulated outputs | WIRED_WITH_LIMITATIONS |
| `/simulation` | Facility name resolved from backend; run state "No run recorded" | live identity, no run data | WIRED_WITH_LIMITATIONS |
| `/data-centre-twin` | 40 racks / 5 rows / 5000 kW, labelled "Facility Model (Simulated)" | simulated, honestly labelled | WIRED_WITH_LIMITATIONS |
| `/dsx/evidence-beta/*` (11 workspaces) | Deterministic run id `sim:cooling_degradation:...`, mode SIMULATED, "Exchange: unavailable" | simulated, honestly labelled | WIRED_WITH_LIMITATIONS |
| `/analytics`, `/compliance`, `/infrastructure`, `/teams`, `/marketplace`, `/help`, `/playbook` | Render intended components | mixed live/static | WIRED_WITH_LIMITATIONS |
| `/admin/signups-dashboard`, `/admin/user-approvals`, `/admin/onboarding-submissions` | Backend reads render without error | live | WIRED_WITH_LIMITATIONS (writes unverified) |
| `/admin/asset-pipeline`, `/admin/asset-preview`, `/admin/asset-validation/:id`, `/admin/reference-facility-validation` | Published manifest and GLB derivatives | live manifest | WIRED_WITH_LIMITATIONS |
| `/connect/monitor` | Counters (RUNNING 1 / SUCCEEDED 3 / FAILED 1 / 12.4k docs) with a spinner that never settles | static presented as live | PLACEHOLDER_OR_DEMO (P2) |
| `/connect/health` | Renders "Data Health" | unknown | WIRED_WITH_LIMITATIONS |
| `/simulation/preview`, `/blueprint/preview` | "No Recommendation to Preview" empty state | honest empty state | WIRED_WITH_LIMITATIONS |
| `/digital-twins-demo/funding-intake` | Self-declared demo intake form | fixture | PLACEHOLDER_OR_DEMO (P3) |

## Data defects

| ID | Finding | Severity |
| --- | --- | --- |
| DATA-1 | `/admin/reference-facility-validation` issues `GET /rest/v1/profiles?...&user_id=` with an empty `user_id` (6 aborted requests per load). Query fires before the identity resolves. | P2 |
| DATA-2 | `/simulation/preview` throws 6 uncaught `TypeError: Failed to fetch` from the auth client (`/auth/v1/user` aborted repeatedly) while showing its empty state. | P2 |
| DATA-3 | `/connect/monitor` shows a permanently unsettled loading spinner alongside hard-coded counters. | P2 |
| DATA-4 | Landing page requests `rack_42u_a.glb` and it aborts; the page still renders (fallback holds). | P3 |
