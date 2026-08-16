# Navigation matrix

Evidence: `evidence/deep-workflow-twin-responsive.json` (`nav` section) - every
anchor and button harvested from the rendered DOM of six representative pages on
the published host as an authenticated internal user.

## Shell navigation (all authenticated pages)

Constant destinations found on every page: `/dashboard`, `/blueprint`,
`/simulation`, `/dsx/evidence-beta/overview`, `/compliance`, `/help`.
All are declared routes; `/blueprint` resolves via alias to `/blueprint/default`.

## Page-level navigation

| Page | Outbound links | Notes |
| --- | --- | --- |
| `/dashboard` | 26 | KPI cards deep-link with context (`/blueprint/<uuid>?tab=model&layer=pue`, `/dsx/evidence-beta/carbon?kpi=pue&claim=efficiency_ratio`, `/simulation?twin=<uuid>`). Facility id is carried, so context is preserved. |
| `/manage/facilities` | 32 | Each row links to `/builder?twinId=<uuid>` (25 twins). Row links carry facility identity. |
| `/blueprint/default` | 16 | Tab links are real URLs (`?tab=assets`, `?tab=controls&sub=agents`, `?tab=validation`). One link targets legacy `/integrations` instead of canonical `/manage/integrations`. |
| `/admin/asset-pipeline` | 11 | Links to `/admin/asset-preview`, `/admin/asset-validation/nvidia.rack.42u_a_01.ops`, `/admin/reference-facility-validation`, `/data-centre-twin?designScenario=SIM-LIQUID-COOLED-RACK-PILOT-001`. All declared. |
| `/simulation` | 7 | Shell links only; step navigation is in-page tabs, not links. |
| `/data-centre-twin` | 7 | Shell links only. |

## Findings

| ID | Finding | Class | Severity |
| --- | --- | --- | --- |
| NAV-1 | `/blueprint/default` links to legacy `/integrations` while the rest of the app uses `/manage/integrations`. Duplicate destination, two labels. | DUPLICATE_ROUTE | P3 |
| NAV-2 | `/simulation` steps (Inspect/Configure/Simulate/Compare/Review) are not links and do not write a URL; `?step=` is ignored. | WIRED_WITH_LIMITATIONS | P2 |
| NAV-3 | Declared routes with no navigation entry anywhere: `/twin-debug`, `/omniverse-scene`, `/digital-twins-demo/funding-intake`, `/marketplace`, `/playbook`, `/connect/monitor`, `/connect/health`, `/simulation/preview`, `/blueprint/preview`, `/deployments`, `/agent-chat`. | UNREACHABLE (by UI) | P3 |
| NAV-4 | "Run simulation" on `/simulation` and "Ask AURA Assistant" on `/data-centre-twin` render disabled with no adjacent reason text. | WIRED_WITH_LIMITATIONS | P2 |
| NAV-5 | `/deploy` is a dead destination: it toasts "No system selected" and lands on `/builder`. | DEAD_ROUTE | P3 |
