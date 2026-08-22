# AURA Builder + Connections UI/UX Re-audit

Audit date: 2026-08-22

Scope: the original AURA application only, covering the Builder and `/manage/integrations` Connections control plane on the UI-remediation branch stacked above the integration implementation audit.

## Method and evidence boundary

This re-audit is a source-level implementation audit. It checks information architecture, truth semantics, interaction structure, responsive intent, accessibility attributes visible in source, white-label presentation boundaries and the relationship between Builder design-time selections and Connections runtime truth.

It does not claim pixel-perfect rendered verification, measured contrast, screen-reader behavior or authenticated multi-viewport browser acceptance. Those remain a separate non-production visual/interaction gate after CI.

## Phase U1 — Builder information architecture

Status: PASS at source level.

The Builder now declares the user-visible flow explicitly instead of reusing one misleading step list for two products.

Standard AURA Builder:
1. Overview
2. Intelligence
3. Connections
4. Workflow
5. Review & Deploy

Data Centre Twin Builder:
1. Overview
2. Blueprint
3. Connections
4. Scenarios
5. Review & Deploy

The shell shows the current mode (`AI & Automation` or `Data Centre Twin`) and the DC flow uses the DC store for navigation. Desktop and tablet/mobile step navigation expose accessible labels and `aria-current=step`.

The old Business Profile / Capabilities / AI & Integrations / Scenarios labels are no longer used for the standard flow.

## Phase U2 — Builder truth and deployment semantics

Status: PASS at source level.

Removed invented fallback/customer-looking data from the standard Builder overview, including Toronto facility metadata, fixed NVIDIA GPU counts, renewable percentage, sovereignty status, ROI/time/efficiency assumptions and fixed PUE/carbon/uptime values.

Missing values are shown as `Not configured` or `—`. Blueprint-provided outcome values are labelled as blueprint estimates rather than observed metrics.

The deploy path no longer manufactures Montreal/QC/Tier III/5000 kW attributes. It creates only fields actually available from the Builder and blocks deployment if the twin record cannot be created.

The previous timed morph/minimum-spinner deploy theatre was removed from the Builder shell. Step 5 now opens the actual Review & Deploy experience.

## Phase U3 — Progressive disclosure

Status: PASS at source level.

AURA Intelligence now presents the primary task sequence first:
1. Intelligence profile
2. Knowledge
3. Behavior & evidence

Orchestration, response variability, monitored subsystems, thresholds, sovereignty and carbon/financial controls are grouped under `Advanced operational controls`.

Existing policy defaults are retained but explicitly described as policy starting points, not observed telemetry.

Connections in Builder now lead with `Recommended for this build`. The full Physical & OT / Managed / Automation / Custom catalogue is behind `Browse all approved capabilities`. No recommendations are invented if the blueprint contains none.

## Phase U4 — Connections information architecture

Status: PASS at source level.

Primary navigation is reduced to five tabs:
- Overview
- Systems
- Data flows
- Connectors
- Activity

`Demo integrations` is not a primary tab. When demo mode is enabled, featured integration experiences are embedded inside Connectors.

The active navigation indicator now uses the primary navigation token rather than the simulated/amber semantic token.

The Systems status filter uses the shared `STATUS_DESCRIPTORS` vocabulary instead of formatting raw enum values. Desktop rows expose a visible `Open` primary action; secondary actions remain in the overflow menu.

The connector catalogue is now one inventory. Server-derived managed-capability evidence is attached to the relevant connector card/details rather than displayed as a second catalogue above the operational catalogue.

## Phase U5 — Demo/account/data truth

Status: PASS at source level.

Featured integration cards separate two independent dimensions:
- Account state, such as `Connected · read only`
- Data state, such as `Demo data` or `Live · verified`

This prevents a real OAuth authorization from visually implying that displayed content is live provider data.

The production-mode demo artifact verifier checks for these truth labels and continues to forbid implementation-platform hostnames in customer-facing compiled/static assets.

## Phase U6 — Overview/activity duplication

Status: PASS at source level.

Connections Overview remains a summary/dashboard rather than a second Activity page. Detailed recent audit history is no longer rendered as a parallel list on Overview.

Overview contains:
- operational summary
- topology
- limited needs-attention queue
- compact Activity & health summary with a direct `Open Activity` action
- deployment blockers

Detailed health, ingest and audit evidence remain on Activity.

## Phase U7 — stale implementation cleanup

Status: PASS at source level.

Removed unreachable duplicate/legacy Builder UI:
- duplicate `builder/steps/DCStep*.tsx` implementation tree
- legacy `BuilderIntegrationsHub.tsx`
- legacy `ConnectStep.tsx`
- legacy tool playground surface

The active Data Centre Twin flow continues to use `builder/dc-steps/*`.

## Re-audit conclusion

Source-level UX status: **PASS WITH VISUAL/INTERACTION ACCEPTANCE PENDING**.

The material first-pass IA, truth, density and terminology defects have been remediated without changing database migrations, OpenUSD/NVIDIA assets, production data, authentication/RLS/CORS policies or the frozen PR #4 release candidate.

## Remaining non-source acceptance gates

Before this UI phase can be called visually complete:

1. Build/typecheck/regression CI must pass on the exact final UI SHA.
2. Produce an approved non-production preview from that exact SHA.
3. Authenticated viewport review at 1920x1080, 1440x1000, 1280x900, 1024x900, 768x1024 and 390x844.
4. Verify no horizontal overflow, clipping or sticky-footer obstruction.
5. Keyboard traverse Builder stepper, Connectors filters/cards, System actions, drawers and dialogs.
6. Verify focus restoration after drawer/dialog close.
7. Screen-reader review of step/mode/status/account/data semantics.
8. Measure contrast for semantic badges and selected/disabled states.
9. Verify reduced-motion behavior and 400% reflow.
10. No visual baseline may be accepted automatically; human review is required.

Passing the source/build audit does not authorize merge or deployment.
