# Stage 5A - Front-End Closeout Validation and Evidence Freeze

Status: PARTIAL (12 of 15 gates PASS, 1 REMEDIATED, 2 BLOCKED_BY_AUTH)
Operating mode: SIMULATED. Production verdict: NO-GO (unchanged).

## Gate results

| Gate | Description | Result |
|---|---|---|
| S5A-01 | Production build (`vite build`) | PASS |
| S5A-02 | Type-check (`tsc -p tsconfig.app.json --noEmit`) | PASS (0 errors) |
| S5A-03 | Lint of Stage 5 surface files | PASS (0 problems on changed files) |
| S5A-04 | Repo-wide lint / unit suite | BASELINE (1466 lint problems, 228 test failures - pre-existing, unchanged by Stage 5) |
| S5A-05 | Capability + provenance unit tests | PASS (10/10) |
| S5A-06 | Prohibited-claims scan across `src/**` | PASS (0 matches) |
| S5A-07 | Run provenance determinism | REMEDIATED - see Defect D-5A-01 |
| S5A-08 | OperatingStateBar mounted globally | PASS (Layout.tsx) |
| S5A-09 | Percentage-confidence removal | PASS (4 remaining components corrected) |
| S5A-10 | Export truth metadata (CSV/JSON/HTML) | PASS |
| S5A-11 | Assistant evidence-boundary disclaimer | PASS |
| S5A-12 | NVIDIA DSX readiness route exists | PASS (static) |
| S5A-13 | Route runtime inventory (17 routes) | BLOCKED_BY_AUTH |
| S5A-14 | Responsive/visual QA of authenticated surfaces | BLOCKED_BY_AUTH |
| S5A-15 | Zero unauthorised egress from app shell | PASS with note (fonts.googleapis/gstatic, clarity.ms telemetry only) |

## Defect D-5A-01 (fixed)

`OperatingStateBar.tsx` and `ProvenanceBadge.tsx` fabricated run IDs and calculation
timestamps with `new Date()` on every render, so displayed provenance rotated on refresh.
Resolved by `src/capabilities/runProvenance.ts`, which resolves the run ID and calculation
timestamp from `simulationSnapshotStore` and renders "Unavailable" when no run exists.
Regression covered by `src/capabilities/__tests__/runProvenance.test.ts`.

## Percentage-confidence corrections (S5A-09)

| File | Before | After |
|---|---|---|
| `src/components/rag/GeminiResponsePanel.tsx` | `{citation.confidence}%` column "Confidence" | `signalStrength(...)`, column "Rule-based signal" |
| `src/components/blueprint/AgentHealthPanel.tsx` | `NN% confidence` | `<Strong/Moderate/Weak> signal` + visible `SIGNAL_BASIS` |
| `src/components/blueprint/WorkflowEnhancementsPanel.tsx` | `NN% conf` | `<Strong/Moderate/Weak> signal` + rule-based disclaimer |
| `src/components/blueprint/KPIEnhancementsPanel.tsx` | "confidence bands" | "rule-based projection bands" |
| `src/components/simulation/AIRecommendationsPanel.tsx` | (already qualitative) | added visible `SIGNAL_BASIS` + `SIGNAL_RULES` note |

## Route inventory (static, from `src/App.tsx` and `src/AuthenticatedShell.tsx`)

Public: `/`, `/auth`, `/login`, `/sign-in`, `/sign-up`, `/sign-out`, `/forgot-password`,
`/mfa`, `/twin-datacentre`, `/data-centre-twin`, `/omniverse-scene`, `/onboarding`.

Authenticated (selected): `/dashboard`, `/builder`, `/deploy`, `/analytics`,
`/infrastructure`, `/account/settings`, `/settings/integrations/nvidia-dsx`, `/pilot/*`,
and the 12 DSX Evidence Beta workspaces under `/dsx/evidence-beta/*`
(overview, thermal, power, cooling, network, facility, workload, simulations,
sovereignty, carbon, financials, evidence).

## S5A-13 / S5A-14 blocker

Runtime verification executed headless against `http://localhost:8080` with `?demo=true`.
`LOVABLE_BROWSER_AUTH_STATUS=signed_out`, so all 16 authenticated routes redirected to `/`
(landing) and the OperatingStateBar could not be observed on any authenticated surface.
Evidence: `/tmp/browser/s5a/routes.json` (17 routes probed, 0 nav errors, 0 console errors,
0 blank pages). These gates remain BLOCKED_BY_AUTH until an authenticated preview session
is available; no production project was contacted.

## Re-run: S5A-05 and S5A-13 (2026-08-07)

Preview auth status remained `signed_out` (`LOVABLE_BROWSER_AUTH_STATUS=signed_out`,
no injected session), so an authenticated in-page verification could not be performed.
The matrix below is the unauthenticated deep-link + hard-refresh proof for all 44 routes.

- S5A-05: PASS re-run (`vitest run src/capabilities`, 10/10 passed).
- S5A-13: PASS for public routes and for redirect behaviour of all authenticated routes.
  Authenticated in-page rendering remains BLOCKED_BY_AUTH.

Evidence: `docs/evidence/full-stack-audit/79-s5a-route-matrix.json` - 44 routes, 0 blank pages, 0 console errors,
0 failed requests, deep-link and refresh URLs identical on every route.

### Public routes (deep link -> after refresh)

| Route | Deep link | After refresh |
|---|---|---|
| `/` | `/` | `/` |
| `/login` | `/login` | `/login` |
| `/sign-in` | `/onboarding` (onboarding gate) | `/onboarding` |
| `/sign-up` | `/onboarding` (onboarding gate) | `/onboarding` |
| `/forgot-password` | `/onboarding` (onboarding gate) | `/onboarding` |
| `/onboarding` | `/onboarding` | `/onboarding` |
| `/twin-datacentre` | `/twin-datacentre` | `/twin-datacentre` |
| `/data-centre-twin` | `/data-centre-twin` | `/data-centre-twin` |
| `/omniverse-scene` | `/omniverse-scene` | `/omniverse-scene` |

### Authenticated routes (unauthenticated behaviour)

All 34 probed authenticated routes plus `/nope-404` redirect to `/` on both deep link and
refresh, with no blank render and no console error:
`/dashboard`, `/builder`, `/deploy`, `/deployments`, `/analytics`, `/operations`,
`/intelligence`, `/infrastructure`, `/account/profile`, `/account/settings`,
`/account/access-control`, `/teams`, `/compliance`, `/marketplace`, `/app/agents`,
`/help`, `/search`, `/settings/ai`, `/settings/integrations/nvidia-dsx`, `/playbook`,
`/pilot`, `/pilot/overview`, and the 12 `/dsx/evidence-beta/*` workspaces.

### Defects found and fixed during the re-run

- **D-5A-02 (HIGH, fixed).** Public route `/data-centre-twin` crashed into the
  ErrorBoundary: `DataCentreDashboard` calls `useCoPilotCommands`/`useCoPilotContext`, but
  the unauthenticated router in `src/App.tsx` did not provide `CoPilotProvider` /
  `CoPilotCommandProvider`. Fixed by wrapping only that route element (a global wrap was
  tried first and rejected because it triggered the anonymous request in D-5A-03 on every
  public route).
- **D-5A-03 (MEDIUM, fixed).** `CoPilotContext` issued an anonymous
  `GET /rest/v1/copilot_memory` on mount, returning 401 after the B-03 anonymous-read
  closure. Fixed by skipping the memory load when no session exists.

Operating mode remains SIMULATED. Production verdict unchanged: NO-GO.

## Gate S5A-12: Desktop / Tablet / Mobile Visual QA (2026-08-07)

Status: **PARTIAL - BLOCKED_BY_AUTH for authenticated surfaces.**

Preview auth remained `signed_out` (`LOVABLE_BROWSER_AUTH_STATUS=signed_out`,
`LOVABLE_BROWSER_SUPABASE_SESSION_JSON` absent), so no session could be restored. All 8
probed authenticated routes (`/dashboard`, `/builder`, `/analytics`, `/operations`,
`/infrastructure`, `/settings/integrations/nvidia-dsx`, `/dsx/evidence-beta`,
`/pilot/overview`) redirected to `/` at every viewport. Authenticated in-page visual QA,
including `OperatingStateBar` responsive rendering, is therefore **not proven**.

Method: Playwright Chromium, three viewports - desktop 1280x1800, tablet 834x1112,
mobile 390x844. Per route: navigate, wait for network idle, capture console errors,
measure rendered text length, measure horizontal overflow
(`documentElement.scrollWidth - clientWidth`), probe `[data-testid="operating-state-bar"]`,
and screenshot.

Raw matrix: `docs/evidence/full-stack-audit/80-s5a-visual-qa-matrix.json` (42 observations).
Screenshots: `/tmp/browser/s5a12/screenshots/` (42 PNGs, ephemeral).

### Result summary

| Viewport | Routes probed | Blank pages | Console errors | Routes with h-overflow |
|---|---|---|---|---|
| Desktop 1280 | 14 | 0 | 0 | 9 |
| Tablet 834 | 14 | 0 | 0 | 9 |
| Mobile 390 | 14 | 0 | 0 | 10 |

`operating-state-bar` count is 0 on every observation. This is **expected, not a defect**:
the bar is mounted in `src/components/Layout.tsx`, which only wraps authenticated routes,
and no authenticated route rendered. The bar's responsive behaviour stays unverified.

### Regressions recorded

- **V-5A-01 (LOW, open).** Landing page (`/` and its alias `/twin-datacentre`) has 40px of
  horizontal overflow at all three viewports. Source is the hero block in the marketing
  landing page: a decorative `absolute -z-10 ... w-4/5 h-4/5 rounded-full` glow layer and
  an `absolute -top-6 -right-6` floating stat card inside `div.lg:col-span-7.relative`
  extend past the viewport. The parent `section` carries `overflow-hidden` but the
  protruding nodes are measured against the document, so the page remains horizontally
  scrollable by 40px. No content is clipped or unreachable; visual rendering is correct at
  all three sizes.
- **V-5A-02 (LOW, open).** `/data-centre-twin` has 128px of horizontal overflow at mobile
  390px only (0px at tablet and desktop). Contributing nodes are the `space-y-8` KPI/card
  stack whose cards render 378px wide inside a 390px viewport with padding, plus a wider
  element below the fold. Screenshot review confirms the KPI grid, header, search bar, and
  filter chips all render correctly and legibly at 390px.

Neither regression blocks the gate's intent (no blank pages, no console errors, no broken
layouts). Both are cosmetic overflow on public marketing/preview surfaces and are logged
for Stage 5B.

### Gate verdict

S5A-12 is **PARTIAL**. Public-surface responsive QA passes with two LOW cosmetic
regressions logged. Authenticated-surface QA carries forward as BLOCKED_BY_AUTH alongside
S5A-13/S5A-14. Operating mode remains SIMULATED. Production verdict unchanged: **NO-GO**.

## Gate S5A-09 Re-audit: Prohibited Claims (2026-08-07)

Status: **FAIL - the earlier "0 prohibited claims" result does not hold.**

This re-run is audit-only; no source file was modified. The original S5A-09 scan matched a
narrow literal set ("Omniverse Live", "Real-time telemetry", "Production-ready") and so
missed live-data framing expressed in other wording. The re-audit uses four broadened
pattern families over `src/` and `index.html`, excluding test files.

Commands:

```
rg -ni "real[- ]?time (telemetry|data|ingest|feed|metrics)|live (telemetry|data|feed|scene|sensor)|production[- ]ready|Omniverse Live|actual (sensor|telemetry)" src/ index.html -g '!*.test.*'
rg -ni "openusd|open usd|simready|sim-ready|dsx exchange|usd stage|nucleus server" src/ index.html -g '!*.test.*'
rg -n "% *conf|[0-9]+% confiden" src/ -i -g '!*.test.*'
rg -ni "Kit 10[0-9]|RTX PRO 6000" src/ -g '!*.test.*'
```

### Category B - OpenUSD / SimReady / DSX Exchange: **PASS**

31 matches, all reviewed, all negative-form or capability-registry declarations. Every
occurrence states absence: `registry.ts` ("OpenUSD stages: 0", "SimReady-validated assets:
0", "DSX Exchange: not deployed"), `NvidiaDsxReadiness.tsx` ("Not configured", "None
validated", "Not deployed", plus the explicit "Generic messaging transports are not DSX
Exchange"), `workspaces/index.tsx` (`OPENUSD_UNAVAILABLE`, `ConnectionState
state="unavailable"`), and `exporters/schema.ts` (export truth block). No file asserts an
OpenUSD stage, a SimReady-validated asset, or a DSX Exchange deployment exists. No
remediation required.

### Category A/C/D - simulated values represented as live: **FAIL, 5 regressions**

- **P-5A-01 (HIGH, open).** `src/lib/copilot/dcSystemPrompt.ts:17` heads the injected
  system prompt with `## Current Facility Status (LIVE DATA - Use these exact values)` and
  line 24 labels the block `### Real-Time KPIs`. The values interpolated into it are
  `DCDomainContext` simulation output. The assistant is therefore instructed to present
  simulated values to the user as live telemetry. This is the single most direct violation
  of the Stage 5 truth objective and it defeats the evidence-boundary disclaimer added to
  `CoPilotDrawer.tsx`, because the prompt body contradicts the disclaimer.
- **P-5A-02 (MEDIUM, open).** `src/components/blueprint/tabs/BlueprintAgentsTab.tsx:171`
  renders a `Live Data` badge whenever `useRealData && dbAgents.length > 0`. The condition
  is true for stored agent configuration rows, not for any telemetry feed, so the badge
  asserts liveness that does not exist.
- **P-5A-03 (MEDIUM, open).** Six percentage-confidence displays survive, contradicting the
  S5A-09 entry that recorded all of them as replaced with qualitative signals:
  `GroundedRecommendationsCard.tsx:332`, `TemplateSimulation.tsx:269` (hard-coded "92%
  confidence"), `SimulationModeWrapper.tsx:270`, `EnterpriseKPIChart.tsx:303`,
  `InsightActionPanel.tsx:195`. The earlier pass covered only the four panels named in that
  entry.
- **P-5A-04 (MEDIUM, open).** NVIDIA runtime claims survive outside `InfrastructurePage.tsx`:
  `src/integrations/omniverseKit/client.ts:3` ("Connects to the DDN Data Center Digital Twin
  running on NVIDIA Kit 109") and
  `src/components/twin-visualization/OmniverseStreamViewer.tsx:2` ("WebRTC stream from
  NVIDIA Omniverse Kit 109"). Per Stage 3 and Stage 4 no Kit runtime exists.
- **P-5A-05 (LOW, open).** Marketing/config strings: `data/templates/data-centre-master.json:10`
  ships a user-visible `"Real-time Telemetry"` badge and line 92/112 tell the CoPilot it
  works from "real-time telemetry"; `i18n/locales/en.ts:447` advertises "Production-ready
  templates"; `tours/tourRegistry.ts:187` says "Real-time data centre metrics" (and also
  carries a prohibited em dash).

Correctly-guarded matches, reviewed and cleared: `DomainProvenanceHeader.tsx:34` (the
"Live data from X" string is reachable only when `provenance === 'live'`),
`SimulationModeWrapper.tsx` "Live Telemetry" (a simulation-only feature label, already
scoped), and all comment-form denials in `OmniverseScene.tsx`, `DsxModeBanner.tsx`,
`OperatingStateBar.tsx`, `exportSimulationResult.ts` and `markdown.ts`.

### Verdict

Gate S5A-09 is reopened as **FAIL**. The S5A closeout entry claiming zero prohibited claims
is superseded by this section. Category B (OpenUSD / SimReady / DSX Exchange) is clean and
requires no work. Five open regressions, one HIGH, carry into Stage 5B remediation.
Operating mode remains SIMULATED. Production verdict unchanged: **NO-GO**.
