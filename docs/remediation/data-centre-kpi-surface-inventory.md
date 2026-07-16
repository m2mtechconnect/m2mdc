# Data Centre KPI Surface Inventory

Phase 1A.1 - item 1 (route and component inventory).

Source of truth: `src/App.tsx` router (single `<Routes>` block), navigation
composition under `src/components/header/*`, and page-level KPI imports
enumerated with ripgrep. No feature flags gate the surfaces below; the `*`
route falls back to `NotFound` (authed) or `Navigate to="/"` (unauthed).
All routes listed are reachable in the running build.

## 1. Route -> page -> KPI-bearing components

| Route(s) | Page | Auth | KPI children | Displays operational values? |
| --- | --- | --- | --- | --- |
| `/`, `/twin-datacentre` | `DataCentreTwinLanding` | Public | Marketing hero, `SimulationSnapshotHeader` chips | No, marketing only |
| `/dashboard`, `/` (authed) | `Dashboard` | Auth | Inline PUE / sovereign / carbon tiles (L313-500) | Yes - synthesized from `pue_target` |
| `/analytics`, `/operations`, `/intelligence` | `IntelligenceDashboard` | Auth | Inline KPI tiles, `pueChartData`, `energyChartData` | Yes - mixes `simulationKpis` with hard-coded arrays |
| `/data-centre-twin`, `/data-centre-twin/:id` | `DataCentreTwin` | Auth | `DataCentreDashboard`, `KPICockpit`, `EnhancedKPICockpit`, `CompactKPICockpit`, 9 domain views | Yes - `useSovereignDCTwin` + demo fallbacks |
| `/data-centre-twin/:id/blueprint`, `/blueprint/:id` | `Blueprint` | Auth | `BlueprintOverviewTab` (design-time targets) | Targets only, static |
| `/simulation/preview`, `/blueprint/preview` | `SimulationPreview`, `BlueprintPreview` | Auth | `DCSimulationPanel`, `DCKPIDeltas`, `SovereignDCKPIPanel` | Yes - simulation output, must render `simulated` |
| `/omniverse-scene` | `OmniverseScene` | Public + Auth | KPI cards + `OmniverseStreamViewer` banner | Yes - provenance-aware (Phase 1A.1 s3 done) |
| `/compliance` | `Compliance` | Auth | Sovereignty assessment, control coverage | Yes - static claim strings |
| `/infrastructure` | `InfrastructurePage` | Auth | Rack heatmap, per-rack tiles | Yes - synthesized |
| `/studio/systems/:systemId/manage` | `SystemManage` -> `TwinDetailsLayout` | Auth | `SystemRuntimePanel`, `SystemSimulation` | Yes - synthesized (`successRate`, `avgDuration`, `roi`) |
| `/app/agents/:agentId/manage`, `/twins/:instanceId/manage` | `TwinManage`, `TwinManageRedirect` | Auth | Same `TwinDetailsLayout` surfaces | Same as above |
| `/pilot`, `/playbook` | `Pilot`, `Playbook` | Auth | Report-style KPI recap | Yes - static/demo |
| `/deploy`, `/deployments` | `Deploy`, `DeploymentHistory` | Auth | Deployment counters | No operational KPIs |
| `/agent/:id`, `/agents/:id/chat`, `/agent-chat`, `/app/agents/:slug/detail` | `AgentWorkspace`, `AgentChat`, `AgentDetail` | Auth | Chat + tool traces | No |
| `/marketplace`, `/marketplace/integrations`, `/integrations` | `Marketplace` | Auth | Catalog cards | No |
| `/teams`, `/help`, `/search`, `/universal-search`, `/settings/ai`, `/account/*`, `/admin/*`, `/connect/*`, `/twin-debug`, `/digital-twins-demo/funding-intake`, `/onboarding`, `/auth`, `/login`, `/sign-in`, `/sign-up`, `/sign-out`, `/forgot-password`, `/mfa`, `/pending-approval` | Various | Mixed | No operational KPI tiles | Out of scope |

Redirects (`/agents`, `/subsystem-agents`, `/integrations`, `/digital-twins`,
`/digital-twins/:slug`, and the auth-route redirects) render no KPI content
and are not adoption sites.

## 2. Unreachable / dead routes

- No orphaned page files import `Route`.
- `/twin-debug` is authed-only and not linked from the header; retained for
  QA and out of scope for retrofit.
- `/digital-twins*` legacy routes redirect to `/`; underlying pages were
  removed in the earlier consolidation and no components reference them.
- `src/App.tsx` contains no dynamic route registration. The two `lazy(...)`
  calls (`DataCentreTwin`, `BlueprintOverviewTab`) split the visualization
  sub-tree only; their KPI descendants are reachable through the routes
  already enumerated.

## 3. KPI-bearing components (adoption targets)

Ordered by user visibility. `[done]` = already consumes `ProvenancedMetric<T>`.
`[retrofit]` = must be updated in items 3-4 of Phase 1A.1.

| Component | File | Notes |
| --- | --- | --- |
| `OmniverseScene` KPI cards | `src/pages/OmniverseScene.tsx` | [done] Kit-metric factory, badge per card |
| `OmniverseStreamViewer` banner | `src/components/twin-visualization/OmniverseStreamViewer.tsx` | [done] cause-specific `StreamBannerReason` |
| `ProvenanceBadge` | `src/components/provenance/ProvenanceBadge.tsx` | [done] primitive UI |
| `Dashboard` inline tiles | `src/pages/Dashboard.tsx` L313-500 | [retrofit] values derived from `pue_target`; wrap in `demoMetric` / `deriveMetric` and expose badge |
| `IntelligenceDashboard` tiles + charts | `src/pages/IntelligenceDashboard.tsx` L385-570, L800-870 | [retrofit] `simulationKpis` -> `simulated`; hard-coded chart arrays -> `demo` with badge |
| `KPICockpit` | `src/components/data-centre-twin/KPICockpit.tsx` | [retrofit] accept `ProvenancedMetric<number>`, render badge per tile |
| `EnhancedKPICockpit` | `src/components/data-centre-twin/overview/EnhancedKPICockpit.tsx` | [retrofit] same |
| `CompactKPICockpit` | `src/components/data-centre-twin/overview/CompactKPICockpit.tsx` | [retrofit] same |
| `DataCentreDashboard` + 9 domain views | `src/components/data-centre-twin/DataCentreDashboard.tsx`, `domains/*` | [retrofit] each domain tile carries provenance (thermal/power/cooling/network/facility/workload/sovereignty/carbon/financial) |
| `SovereignDCKPIPanel` | `src/twins/sovereignDataCenter/components/SovereignDCKPIPanel.tsx` | [retrofit] simulation output must render `simulated` |
| `DCKPIDeltas`, `EnterpriseKPICard`, `EnterpriseKPIChart`, `AnimatedKPIStrip`, `LiveInsightsKPIPanel`, `MultiKPIOverlay`, `EnhancedKPIChartsPanel` | `src/components/simulation/*` | [retrofit] always `simulated`; add `derivation` and `modelVersion` where applicable |
| `KPIMetricCards` (template preview) | `src/components/templates/overview/KPIMetricCards.tsx` | [retrofit] `DEFAULT_DC_KPIS` targets -> `static`; current values -> `demo`; never `live` |
| `SystemRuntimePanel` | `src/components/system-manage/SystemRuntimePanel.tsx` | [retrofit] synthesized `successRate`, `avgDuration`, `roi` -> `demo` until wired |
| `Compliance` claims | `src/pages/Compliance.tsx` | [retrofit] claims use `notAssessedMetric` or `static` per ADR 0005 |
| `InfrastructurePage` rack tiles | `src/pages/InfrastructurePage.tsx` | [retrofit] `demo` until real telemetry |
| `Pilot`, `Playbook` KPI recap | `src/pages/Pilot.tsx`, `src/pages/Playbook.tsx` | [retrofit] `static` / `demo` per source |

## 4. Ownership of the retrofit

All retrofits stay inside `src/pages/**`, `src/components/**`, `src/twins/**`,
and the `src/lib/provenance/**` primitives already in place. No changes to
router config, feature flags, navigation, or `src/App.tsx` are required.

## 5. Open questions for the user

1. `Compliance` and `SystemRuntimePanel` currently display values that were
   never sourced from a validated data path. In scope for item 3 retrofit, or
   deferred to Phase 1B (real data wiring)?
2. Confirm `simulated` labelling scope covers `DCKPIDeltas`,
   `AnimatedKPIStrip`, `EnterpriseKPICard`, `LiveInsightsKPIPanel`,
   `MultiKPIOverlay`, `EnhancedKPIChartsPanel` in addition to
   `SovereignDCKPIPanel`.
3. `KPIMetricCards.DEFAULT_DC_KPIS` ships hard-coded "current" values (PUE
   1.25, GPU util 76%, etc.). Remove the current-value fields entirely, or
   render them as `demo` with badges?

Awaiting the remainder of the user brief (items 2-14) before editing any of
the [retrofit] components above.
