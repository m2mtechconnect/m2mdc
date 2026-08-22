# Audit — original AURA Builder and Connections (findings only, no changes)

Source-only audit, 2026-08-22. No files edited, no browser run, no runtime claims.

## 1. Does the Builder still use the legacy step labels? Yes.

`src/components/builder/BuilderLayout.tsx:32-38` hardcodes:

```
1 Business Profile · 2 Capabilities · 3 AI & Integrations · 4 Scenarios · 5 Deploy
```

with the sidebar heading "Data Centre Twin" and subtitle "Configure your data centre twin"
(`BuilderLayout.tsx:~136-146`). These labels are static and are used for **both** builder paths.

The standard (non-scanner) path actually renders `Step1Summary`, `Step2Intelligence`, `Step3Tools`,
`Step4Workflow`, `Step5Deploy` (`src/pages/Builder.tsx:5-9`, `143-183`). So Summary/Intelligence/Tools/
Workflow map onto labels reading Business Profile/Capabilities/AI & Integrations/Scenarios. The DC path
(`?from=scanner`, `?fromScanner=true`, or router state `fromRecommendation`) swaps in
`dc-steps/DCStep1..5` (`Builder.tsx:10, 32-34, 100-140, 186`) under the identical label set.

Conclusion: legacy labels are still present and are mismatched to the standard wizard's panes.

## 2. Does deployment use artificial timed states or auto-redirects? Yes, both, in two places.

`BuilderLayout.tsx:66-131` (`handleDeployClick`):
- `DeployState` machine `idle → morphing → deploying → success | error`
- 350 ms artificial "morph" delay before the request starts
- `MIN_DEPLOY_DURATION = 1200` ms enforced spinner floor padded after the real result returns
- 15 s client-side `Deployment timeout` race
- on success: `setTimeout(() => navigate(result.agentUrl || '/dashboard'), 1800)` — auto-redirect
- on failure: `setDeployState(error)` then `setTimeout(idle, 3000)` — the error self-clears with no
  persistent surface, and the caught error message is only sent to `console.error`

`src/components/builder/step5/AnimatedDeployButton.tsx:38-49`:
- success state inferred from `isDeploying` flipping false (not from a result payload)
- `setTimeout(() => navigate('/dashboard'), 2000)` — second auto-redirect
- This file is reachable only from `step5/SimulationDashboard.tsx:33,360`; see section 4.

## 3. Are the Connections tabs still Overview / Connections / Data flows / Catalogue / Activity & health? No — renamed.

`src/pages/Connections.tsx:42-48` defines:

| value | label |
|---|---|
| `overview` | Overview |
| `connections` | Connected systems |
| `data-flows` | Data flows |
| `catalogue` | Available connectors |
| `activity` | Health & audit |

So the tab **values** (and therefore deep links `?tab=…`) are still the legacy identifiers, but the
visible labels have been updated. Components mounted: `OverviewTab`, `ConnectionsTab`, `DataFlowsTab`,
`CatalogueTab`, `ActivityTab` (`Connections.tsx:192-244`).

Two related observations:
- The active-tab underline uses the amber simulated token, `data-[state=active]:border-[hsl(var(--v2-simulated))]`
  (`Connections.tsx:183`) — a status colour used for plain selection.
- `AgentToolsTab`, `DsxExchangeTab`, `ManagedConnectorInventory`, `RuntimeReadinessPanel` and
  `RuntimeDiagnosticsPanel` exist under `src/components/connections/` but are not mounted by this route.

## 4. Does the source separate account status from data status for featured connectors? No.

`src/components/builder/BuilderIntegrationsHub.tsx:20-27` hardcodes `FEATURED_APPS`
(Slack, Gmail, HubSpot, Salesforce, Jira, Zendesk, all with `logo_url: ''`) and at lines 45-62 collapses
everything into one field:

```
status: 'connected' | 'available' | 'error'
```

derived solely from the `zapier-integration-status` account record (`connection?.status === 'connected'`,
`'error' | 'expired'` → error). There is no field for whether any data has flowed, no last-event time,
no throughput, no mapping coverage. An authorised-but-idle account renders identically to a working one.
`ZapierIntegrationCard.tsx:14-21` carries the same single-valued `status` union.

This is the opposite of the Connections workspace, which does separate the three states:
`src/connections/presentation.ts` + `DataTopology.tsx:17-21` distinguish **Data flowing** /
**Configured, no flow** / **Not configured**, and `CatalogueTab.tsx:1-8, 33-44` documents that a catalogue
entry (`AVAILABLE`, `REQUIRES_GATEWAY`, `REQUIRES_DEPLOYMENT`, `PLANNED`, `UNSUPPORTED`) is never counted
as a configured connection. Builder step 3 also draws from a third hardcoded list
(`steps/Step3Tools.tsx:15-27`) that is different again from `FEATURED_APPS`.

## 5. Duplicate / unreachable Builder integration UI files

Unreachable from the `/builder` route (no import path leads to them):

- `src/components/builder/steps/DCStep1Summary.tsx`, `DCStep2Blueprint.tsx`, `DCStep3Integrations.tsx`,
  `DCStep4Scenarios.tsx`, `DCStep5Deploy.tsx` — ~1,619 lines total. Duplicates of the live
  `src/components/builder/dc-steps/*` set; only `dc-steps` is imported (`Builder.tsx:10`).
- `src/components/builder/step5/SimulationDashboard.tsx` — referenced only as a string in
  `src/simulation/engineRegistry.ts:94`; `Step5Deploy.tsx:29` imports from `step5/deploy` instead.
- `src/components/builder/step5/AnimatedDeployButton.tsx` — imported only by the above, so unreachable
  transitively (this is the second auto-redirect noted in section 2).
- `src/components/builder/MCPToolsPlayground.tsx` — no importer.
- `src/components/shared/IntegrationAppCard.tsx` — no importer; a third connector-card style.

Layered but live (duplication of purpose, not dead code):
`Step3Tools.tsx → ConnectStep.tsx → BuilderIntegrationsHub.tsx` is a one-line pass-through wrapper
(`ConnectStep.tsx:7-13`), and `BuilderIntegrationsHub` renders its own fixed `w-64` filter sidebar inside
the wizard body — a second connector browser competing with `/manage/integrations`.

## Not verified

Rendered layout, contrast, responsive behaviour, overlay/focus behaviour, and live tenant data states.
Those require an authenticated multi-viewport browser run, which this pass did not perform.
