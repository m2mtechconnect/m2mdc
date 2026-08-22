# UI/UX Audit — Builder and Connections (findings only)

Audit date 2026-08-22. Scope: `/builder` (all steps + data-centre twin path) and `/manage/integrations`.
Method: source review of the routed components listed below. No browser session was driven and no
screenshots were captured in this pass, so nothing here asserts rendered pixel behaviour, measured
contrast, or runtime data states. Every finding is traceable to code.

## Surfaces reviewed

Builder
- Route: `src/AuthenticatedShell.tsx:91` -> `src/pages/Builder.tsx`
- Chrome: `src/components/builder/BuilderLayout.tsx`, `StepIndicator.tsx`, `BuilderModeToggle.tsx`
- Standard wizard steps: `src/components/builder/steps/Step1Summary.tsx` .. `Step5Deploy.tsx`
- DC twin path (`?from=scanner` / `?fromScanner=true` / router state `fromRecommendation`):
  `src/components/builder/dc-steps/DCStep1Summary.tsx` .. `DCStep5Deploy.tsx`
- Empty/starter state: inline in `Builder.tsx` + `BuilderStarterLists.tsx`
- Tools step integrations: `Step3Tools.tsx` -> `ConnectStep.tsx` -> `BuilderIntegrationsHub.tsx`

Connections
- Route: `src/AuthenticatedShell.tsx:115` -> `src/pages/Connections.tsx` (alias `/manage/connections`)
- Tabs: `OverviewTab`, `ConnectionsTab`, `DataFlowsTab`, `CatalogueTab`, `ActivityTab`
- Overlays: `ConnectionSetupWizard`, `ConnectionDetailDrawer`, `CredentialVaultDialog`, `MappingEditorDialog`
- Support: `DataTopology`, `ConnectionStatusBadge`, `src/connections/presentation.ts`, `catalogueTaxonomy.ts`
- Adjacent, not mounted by this route: `AgentToolsTab`, `DsxExchangeTab`, `ManagedConnectorInventory`,
  `RuntimeReadinessPanel`, `RuntimeDiagnosticsPanel`

## P0 — truthfulness and correctness

1. Builder step labels do not match the steps rendered.
   `BuilderLayout.tsx:32-38` hardcodes `Business Profile / Capabilities / AI & Integrations / Scenarios / Deploy`
   and the sidebar heading `Data Centre Twin`, but the standard wizard renders
   `Step1Summary / Step2Intelligence / Step3Tools / Step4Workflow / Step5Deploy`. In the non-scanner path the
   navigation names a different product flow than the panes beneath it. This is a wayfinding and trust defect,
   not a cosmetic one.

2. Fabricated connector inventory inside Builder.
   `BuilderIntegrationsHub.tsx:20-27` ships a hardcoded `FEATURED_APPS` list (Slack, Gmail, HubSpot,
   Salesforce, Jira, Zendesk) and derives connected/error/available status from a Zapier status call.
   `Step3Tools.tsx:15-27` hardcodes a second, different SaaS list. Neither list comes from
   `connector_definitions`, and both contradict the Connections catalogue contract in
   `CatalogueTab.tsx:1-8` ("a catalogue entry describes what AURA knows how to connect to; it is never
   counted as a configured connection"). Two competing sources of connector truth, one of them a fixture.

3. Builder integrations are not the same object model as Connections.
   Builder writes `tools` / `apiConnectors` into `wizardBuilderStore`; Connections reads
   `connection_instances` + `twin_mappings` + health/ingest evidence. Nothing links them, and there is no
   navigation from any Builder step to `/manage/integrations` (only `BuilderStarterLists.tsx:201` links to
   `/marketplace`). The Builder-to-Connections handoff the brief asks about does not exist as a path.

## P1 — information architecture and status semantics

4. Two parallel builders with divergent chrome.
   The scanner path swaps step components and step state store (`Builder.tsx:82-84`, `100-140`) while keeping
   the same sidebar, so the DC path and the standard path present identical navigation for different content.
   Step gating also differs silently (DC step 3 `validate: () => true`, standard step 2 requires a model).

5. Dead duplicate DC step implementations.
   `src/components/builder/steps/DCStep1Summary.tsx` .. `DCStep5Deploy.tsx` (~1,600 lines) are not imported
   anywhere; only `builder/dc-steps/*` is used (`Builder.tsx:10`). Two near-identical DC builders in the tree
   is a maintenance and drift hazard.

6. Connections status vocabulary is raw and inconsistently humanised.
   `ConnectionsTab.tsx` filter options render enum values via `s.replace(/_/g,' ').toLowerCase()`, while
   `DataTopology.tsx:17-21` uses a separate, better vocabulary ("Data flowing", "Configured, no flow",
   "Not configured") and `CatalogueTab.tsx:38-44` uses a third (`AVAILABLE / REQUIRES_GATEWAY /
   REQUIRES_DEPLOYMENT / PLANNED / UNSUPPORTED`). The configured vs connected vs flowing distinction is
   modelled correctly in `presentation.ts` but is expressed three different ways in the UI.

7. Tab bar underline uses the "simulated" token as the active-state colour.
   `Connections.tsx:183` sets `data-[state=active]:border-[hsl(var(--v2-simulated))]` (amber). Amber is
   reserved for watch/estimated in the project's colour semantics; using it for plain tab selection weakens
   the semantic system on the very page whose job is status truth.

8. Overview tab does double duty.
   `OverviewTab` renders topology + instruments + an attention queue, and `ActivityTab` renders health, ingest
   and audit. The attention queue on Overview and the failure list on Health & audit are two entry points to
   the same remediation task with no shared component.

## P2 — density, consistency, states, accessibility

9. Builder console logging in production paths (`Builder.tsx:222-247`, `BuilderLayout.tsx:74-83`) including
   emoji-prefixed logs. Noise, and it leaks builder internals to the browser console.

10. Builder deploy feedback is time-based theatre: a 350 ms morph plus an enforced 1,200 ms minimum spinner
    and a 15 s hard timeout (`BuilderLayout.tsx:86-127`). Failures collapse back to idle after 3 s with no
    persistent error surface, so a deploy failure can be missed entirely.

11. Layout primitives are mixed. Builder uses `Card`/`DCCard`/`DCSectionHeader`; Connections uses the V2
    `Panel`/`SubPanel`/`Instrument`/`CommandHeader` set. The two workspaces do not read as one product.
    `BuilderIntegrationsHub` additionally introduces a fixed `w-64` sidebar inside the step body
    (`BuilderIntegrationsHub.tsx:~118`), a third nesting level that will compress badly under the wizard rail.

12. Responsive risk in Builder chrome: `BuilderLayout.tsx` uses `min-h-screen` (project standard is `min-h-dvh`,
    which `Builder.tsx:351,408` already uses) and hides the 260px rail below `lg`, so tablet users lose the
    stepper. The nested fixed-width hub sidebar above is not responsive at all. Connections is better prepared
    (`ConnectionsTab` documents a card fallback below `lg`, tab strip is horizontally scrollable).

13. Empty and loading states are uneven. Connections has skeletons (`ConnectionsTab`, `OverviewTab`) and a
    genuine honest-empty starter in Builder (`Builder.tsx:407-448`), but the Builder step bodies have no
    per-step skeletons and `BuilderIntegrationsHub` shows connector cards with `logo_url: ''` for every entry.

14. Terminology drift across one journey: "Tools", "Integrations", "Connect Business Systems", "Connections",
    "Connected systems", "Available connectors", "Connectors", "Data flows". At least three names for the same
    concept between Builder step 3 and `/manage/integrations`.

15. White-label / branding: `BuilderIntegrationsHub` hardcodes third-party vendor names as first-class
    product surface, and `Builder.tsx:459-470` hardcodes `city: 'Montreal'`, `region_code: 'QC'`,
    `tier: 'Tier III'`, `capacity_kw: 5000` when creating a twin on deploy — deployment-time invented facility
    data presented as the customer's twin.

16. Accessibility items visible in source: sidebar step buttons rely on tooltips for their only description
    (`BuilderLayout.tsx:158-190`); the Home button uses `title` rather than `aria-label`; disabled steps use
    `opacity-50` alone. Connections is comparatively well covered (`aria-label` on search, status filter and
    row action menus, `aria-pressed` on catalogue filters). Not verified: focus order, keyboard traversal,
    contrast measurements, screen-reader narration.

## Recommended remediation order

1. Correct Builder step labels to the rendered steps, or split the two builders into distinct labelled flows.
2. Retire `BuilderIntegrationsHub` fixtures. Builder step 3 should read `connector_definitions` and existing
   `connection_instances`, show configured-vs-connected honestly, and deep-link to
   `/manage/integrations?tab=catalogue` for the actual connect action.
3. Delete the unused `builder/steps/DCStep*.tsx` duplicates.
4. Unify status vocabulary in one module (extend `presentation.ts`) and consume it in ConnectionsTab,
   DataTopology, CatalogueTab and the detail drawer; move the tab underline off the simulated token.
5. Migrate Builder chrome to the V2 primitives, `min-h-dvh`, and a tablet-visible stepper; remove the nested
   fixed-width sidebar.
6. Replace timed deploy theatre with a persistent result state; remove production console logging.
7. Remove hardcoded Montreal/Tier III/5000 kW twin defaults from the deploy path.
8. Normalise terminology to Connections / Connected systems / Connectors everywhere, including Builder.

## Not verified in this pass

Rendered layout at desktop/tablet/mobile, contrast ratios, overlay behaviour, keyboard traversal, live data
states (empty vs populated tenants), and the demo-integration surface if one exists outside the components
listed above. Those need an authenticated multi-viewport browser run to assert.
