# Phase 1A.3 — Final Scope Matrix

Compiled from `data-centre-kpi-surface-inventory.md`, `phase-1a1-report.md`,
`phase-1a2-report.md`, `capability-traceability.md`, plus a fresh ripgrep
sweep on `src/`. Every currently reachable operational surface is listed;
non-operational and unreachable routes are omitted explicitly at the bottom
with evidence.

Provenance vocabulary matches ADR 0004: `live`, `derived`, `simulated`,
`demo`, `static`, `unavailable`.

## 1. In-scope surfaces (Phase 1A.3 must retrofit or explicitly disable)

### 1.1 Simulation chrome (item 3)

| # | Component | LOC | Route(s) that mount it | Data source today | Required per-metric provenance | Disposition |
|---|---|---:|---|---|---|---|
| S1 | `src/components/simulation/EnterpriseKPICard.tsx` | 519 | `/simulation/preview`, `/data-centre-twin/:id` sim tab | `sovereignDataCenter/simulationEngine` output + `mockData` baseline | `simulated` (run active) / `demo` (baseline) | Retrofit 1A.3.b |
| S2 | `src/components/simulation/AnimatedKPIStrip.tsx` | 175 | `/simulation/preview` | Same as S1 | Same | Retrofit 1A.3.b |
| S3 | `src/components/simulation/LiveInsightsKPIPanel.tsx` | 312 | `/simulation/preview` | Same as S1 | Same; strip "Live" copy where value is `simulated`/`demo` | Retrofit 1A.3.b |
| S4 | `src/components/simulation/MultiKPIOverlay.tsx` | 180 | `/simulation/preview` | Same as S1 | Same | Retrofit 1A.3.b |
| S5 | `src/components/simulation/EnhancedKPIChartsPanel.tsx` | 322 | `/simulation/preview` | Same as S1 (time-series arrays) | Chart series carries series-level provenance (`simulated`/`demo`); one badge per series | Retrofit 1A.3.b |
| S6 | `src/components/simulation/DCSimulationPanel.tsx` | 475 | `/simulation/preview`, twin sim tab | Header copy + scenario input labels | Add "user-configured input" vs "demonstration input" labels; strip "CFD / physics / Modulus / Omniverse" copy | Retrofit 1A.3.b |

### 1.2 Nine domain views (item 2)

All mount from `DataCentreDashboard` on `/data-centre-twin` and
`/data-centre-twin/:id`. Source is `useSovereignDCTwin` (which itself falls
back to `sovereignDataCenter/mockData`) — never validated Kit data on these
surfaces. Every KPI on these views MUST be `demo` today; a `live` label on
any of them would be a regression.

| # | Component | LOC | User-visible metrics/scores/alerts | Required per-metric provenance | Disposition |
|---|---|---:|---|---|---|
| D1 | `domains/ThermalDomainView.tsx` | 123 | ThermalKPIs strip, per-rack heat tiles, cooling correlation, forecast, insights | `demo` (all); forecast/insights → `simulated` where estimator-driven | Retrofit 1A.3.c |
| D2 | `domains/PowerDomainView.tsx` | 192 | Facility power tiles, PDU readings, capacity headroom | `demo` | Retrofit 1A.3.c |
| D3 | `domains/CoolingDomainView.tsx` | 207 | Chiller load, water/air loop, ΔT, redundancy state | `demo`; redundancy state text → `static` where configured | Retrofit 1A.3.c |
| D4 | `domains/NetworkDomainView.tsx` | 367 | Fabric utilisation, packet loss, CRC, link flaps, sovereignty compliance | `demo` | Retrofit 1A.3.c |
| D5 | `domains/FacilityDomainView.tsx` | 298 | Space/power/cooling headroom, tenant mix, occupancy | `demo`; design targets → `static` | Retrofit 1A.3.c |
| D6 | `domains/WorkloadDomainView.tsx` | 233 | GPU util, CPU load, memory, ECC errors, throttling | `demo` | Retrofit 1A.3.c |
| D7 | `domains/SovereigntyDomainView.tsx` | 327 | Data-residency scores, jurisdiction map, control coverage | `static` for configured controls; `unavailable`/"Not assessed" for un-audited | Retrofit 1A.3.c |
| D8 | `domains/CarbonDomainView.tsx` | 325 | gCO₂/kWh, PUE 24h, DCiE, energy mix, Scope 2 | `demo`; grid intensity target → `static` | Retrofit 1A.3.c |
| D9 | `domains/FinancialDomainView.tsx` | 237 | OpEx, energy cost, carbon credit balance, ROI | `demo`; contract prices → `static` | Retrofit 1A.3.c |

Rack/thermal helpers that feed the above:

| # | File | Consumer | Disposition |
|---|---|---|---|
| D-a | `data-centre-twin/overview/EnhancedRackOverview.tsx` | D2/D6 | Retrofit as part of consumer view (per-rack tile carries `demo`) |
| D-b | `data-centre-twin/overview/CompactRackOverview.tsx` | Twin overview | Same |
| D-c | `data-centre-twin/thermal/*` (KPIs, tiles, correlation, forecast, insights, rack table) | D1 | Retrofit as part of D1 |

### 1.3 Reports / exports (item 4)

A repository-wide search for active export paths returns only
`src/components/aoc/AOCExportPanel.tsx` (AOC is out of DC scope) and i18n
bundles. There is currently **no active DC report/export path** — no CSV
download button, no `window.print()` wired into a DC view, no PDF
generator, no "copy KPI summary" affordance in the retrofitted surfaces.

Disposition: nothing to retrofit; documented as "no active DC export
surface exists" in the final 1A.3 report. If any is discovered during 1A.3.c
it will be added here.

### 1.4 Staleness + Kit-state (item 5)

Only one surface is live-capable today: `/omniverse-scene` via
`useOmniverseKit` → `fetchStatusValidated`. Phase 1A.3.d extends the
existing tests to cover the six Kit runtime states (validated / disabled /
unavailable / schema-invalid / stale / demo-fallback) with a deterministic
`now` and asserts DOM `data-provenance` transitions.

## 2. Explicitly excluded surfaces (with evidence)

| Surface | Route | Evidence | Rationale |
|---|---|---|---|
| `IntelligenceDashboard` `pueChartData` / `energyChartData` | `/analytics`, `/operations`, `/intelligence` | `src/pages/IntelligenceDashboard.tsx` L~800-870 | Chart *arrays*, not KPI tiles; tiles were retrofitted in 1A.2. Awaiting user answer to plan Q2 before including. |
| `InfrastructurePage.tsx` rack tiles | `/infrastructure` | `phase-1a2-report.md` §4 | Marketing/mockup surface, flagged for deletion or replacement in Phase 1B; retrofitting perpetuates a page that is planned to be removed. |
| `Pilot.tsx` | `/pilot` | Route inventory §1 | Form-only surface; no operational KPI tiles. |
| `Playbook.tsx` | `/playbook` | Route inventory §1 | Planning template — baselines/targets, not readings. Values are `static` by nature and already presented as targets. |
| Builder step 5 simulation engines (`SimulationEngine.ts`, `MockSimulationEngine.ts`) | Builder wizard | `random-data-register.md` | Design-time preview inside the Builder, not an operational dashboard. |
| Marketing template previews (`TemplateSimulation.tsx`, `KPIMetricCards` demo defaults) | Marketplace | `random-data-register.md` | Already retrofitted in 1A.1 (`KPIMetricCards.DEFAULT_DC_KPIS`) with `demo`+`static`. Marketplace preview is not a DC operational surface. |
| Non-DC operational (`AOC*`, `Teams`, `Search`, `AgentWorkspace`, `AgentChat`, `AgentDetail`) | Various | Route inventory §1 | Out of DC-truth-in-UI scope. |
| `/twin-debug` | `/twin-debug` | Route inventory §2 | Not linked in header; QA-only. |
| `/digital-twins*` legacy | Redirects | Route inventory §2 | Redirect targets, no KPI content. |
| Harmless-animation sites (sparkline jitter, ID generators, background grid) | Various | `random-data-register.md` | Non-operational cosmetic noise; explicitly retained per 1A.2. |

## 3. Random / synthetic sources feeding in-scope surfaces

Live sweep on `src/twins/**` + `src/pages/**` + `src/components/**`
(excluding `__tests__/`). Files that materially feed in-scope surfaces:

| File | Random-source count | Consumers (in-scope) | Classification |
|---|---:|---|---|
| `src/twins/sovereignDataCenter/mockData.ts` | ~60 | D1–D9, S1–S6 baseline | **demo-fixture** — wrap outputs at consumer boundary in `demoMetric()`. Do NOT edit the generator this phase. |
| `src/twins/sovereignDataCenter/simulationEngine.ts` | 2 (run id + demo latency) | S1–S6 while a run is active | Run outputs already routed through `SovereignDCKPIPanel` with `simulated` provenance in 1A.2; extend to S1–S6 in 1A.3.b. |
| `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts` | 2 (event id + interval tick) | S1–S6 when enhanced engine selected | Outputs → `simulated`. |
| `src/twins/dataCenter/mockData.ts` | ~8 | `DataCentreDashboard` → D1–D9 fallback | **demo-fixture** — same rule: wrap at consumer boundary. |
| `src/pages/IntelligenceDashboard.tsx` L203-205 (`roi`, `accuracy`, `total_runs`) | 3 | Was retrofitted in 1A.2 for KPI tiles; these three specific fallback branches feed the `simulation_stats` synth fallback | Verify in 1A.3.c that these three values also carry `demoMetric()` (audit-only; already routed via `demoMetric` per 1A.2 report). |
| `src/twins/sovereignDataCenter/hooks/useSovereignDCTwin.ts` L102 (`setTimeout 1500`) | 1 | All D1–D9 via loading state | Loading simulation only; not a metric source. Keep. |

No in-scope source uses `Math.random()` inside a component render path; all
randomness is confined to the fixture modules above and one Vitest setup.
`omniverseAdapter.ts` is explicitly `Math.random()`-free (asserted at L26
and by tests) — the Kit path remains deterministic.

## 4. Provenance-classification decision table

Applied uniformly across 1A.3.b and 1A.3.c retrofits:

| Source | Classification |
|---|---|
| `fetchStatusValidated` returns `validated`, timestamp fresh per staleness policy | `live` |
| `fetchStatusValidated` returns `validated`, timestamp exceeds budget | `live` + `isStale: true` (badge shows "Stale") |
| `fetchStatusValidated` returns `invalid` / `unavailable` / `disabled` | `unavailable` (per metric); banner shows cause-specific copy |
| Value derived from ≥1 provenanced input | `derived`; provenance = weakest input; `derivation` string required |
| Value returned by `sovereignDataCenter/simulationEngine` or `enhancedSimulationEngine` while a run is active | `simulated` with `modelVersion` |
| Value from `mockData.ts` (either twin) with no run active | `demo` |
| Configured target / constant (PUE target, capacity design point, SLA) | `static` |
| No defensible value (Kit invalid, no sim run, no fixture) | `unavailable` — render "Unavailable" or "Not assessed" |

## 5. Effort estimate (engineer-days)

Rough sizing for the remaining sub-slices, based on LOC + wrap density:

| Sub-slice | Files touched | Effort (ed) |
|---|---:|---:|
| 1A.3.b Simulation chrome | 6 | 3 |
| 1A.3.c Nine domain views + rack helpers | ~14 | 6 |
| 1A.3.d Staleness + Kit-state tests | 1 new + 1 edit | 1 |
| 1A.3.e Reports/exports | 0 (nothing active) | 0.25 |
| 1A.3.f Playwright + screenshots | 1 spec + 12 shots | 2 |
| 1A.3.g A11y + final report | ~docs + assertions | 1 |
| **Total** | **~22** | **13.25 ed** |

This is > one working day of implementation; delivery will remain in the
approved hard-stop cadence.

## 6. Open questions carried from the plan

1. Include `IntelligenceDashboard` chart arrays (`pueChartData`,
   `energyChartData`) in 1A.3.c? Currently **excluded** — awaiting decision.
2. Screenshot bundle: 12 (spec minimum, current plan) vs one-per-surface
   (~25)? Currently **12**.
3. Do you want the exclusion of `InfrastructurePage`, `Pilot`, `Playbook`
   from 1A.3 confirmed, or should any of them be retrofitted in place?

No source files were modified to produce this document.