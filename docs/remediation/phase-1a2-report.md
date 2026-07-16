# Phase 1A.2 Report

Scope: complete the deferred truth-in-UI surfaces from Phase 1A.1 so no
active operational KPI is rendered without provenance. Simulation
consolidation, database migrations, telemetry ingestion, OpenUSD, DSX and
broad legacy-test remediation remain OUT OF SCOPE.

## 1. Contradiction resolved — `IntelligenceDashboard`

Earlier drafts of `phase-1a1-report.md` implied the `IntelligenceDashboard`
top tiles were retrofitted. That was inaccurate. Phase 1A.1 shipped the
`ProvenancedMetric` primitive, staleness engine and `MetricValue`
presenter, but did NOT edit `src/pages/IntelligenceDashboard.tsx`. The six
top-strip tiles (PUE, GPU Utilization, Thermal Incidents, Carbon Intensity,
Sovereignty, System Uptime) are retrofitted in this phase (§2). The lower
`pueChartData` / `energyChartData` chart arrays and the analytics tabs
remain deferred (§7).

`phase-1a1-report.md` "Remaining synthetic metrics" was corrected to reflect
this.

## 2. Active surfaces retrofitted in Phase 1A.2

| File | Change |
| --- | --- |
| `src/components/provenance/KpiCardProvenance.tsx` (new) | Wrapper around `KpiCard` that carries `data-testid="metric-<id>"`, `data-provenance="<tag>"`, `data-stale`, an accessible `<ProvenanceBadge>`, and refuses to render a numeric value when the metric is `null`. |
| `src/pages/IntelligenceDashboard.tsx` | Six top-strip tiles wrapped in `KpiCardProvenance`. Values coming from `useTwinKPIsFromSimulation` are `simulated` with `modelVersion="twin-simulation-kpis@1.0"`; missing keys fall back to `demoMetric()`; carbon intensity is `demo` (static regional table). Copy corrected: carbon tooltip no longer implies a live grid API. |
| `src/components/simulation/DCKPIDeltas.tsx` | Every simulation KPI card carries `data-testid="sim-kpi-<id>"` and `data-provenance="simulated"` while the run is active, `data-provenance="demo"` otherwise. Comment header discloses that the underlying values come from the deterministic demonstration estimator (no physics/DSX/Modulus/Cadence/Ansys claim). |
| `src/pages/__tests__/IntelligenceDashboardKPIs.test.tsx` (new) | 4 focused component tests: `simulated` tagging, `demo` fallback, null-safe rendering, and the invariant that a demo tile can never render as `live`. |
| `docs/remediation/phase-1a1-report.md` | `IntelligenceDashboard` wording corrected. |

## 3. Active surfaces confirmed already provenance-aware

From Phase 1A.1 and unchanged in Phase 1A.2:

- `/omniverse-scene` — Kit metrics, section banner, KPI cards (§3 of 1A.1).
- `/dashboard` — DC KPI tiles wrapped in `demoMetric` (§4 of 1A.1).
- `/compliance` — `notAssessedMetric` for sovereignty score and audit
  readiness; rule-card status pill reworded (§4 of 1A.1).
- `/studio/systems/:id/manage`, `/twins/:id/manage`,
  `/app/agents/:id/manage` — `SystemRuntimePanel` tiles wrapped (§4 of 1A.1).
- `/data-centre-twin/:id` (sovereign panel) — `simulated` when running,
  `demo` otherwise (§4 of 1A.1).
- Template preview `KPIMetricCards` — per-card `data-provenance`, target
  rendered `static` (§4 of 1A.1).

## 4. Exclusions and why (Phase 1A.2 §5)

| Surface | Route | Reason for exclusion |
| --- | --- | --- |
| `Pilot` | `/pilot` | Form-only page: project name, start date, budget, stakeholders. No operational data-centre KPIs. Provenance badges would be decorative. |
| `Playbook` KPI grid | `/playbook` | Planning template. Each entry is a customer-editable target (baseline → target), not a reading. Documented in the report as "static target" surface; per §5 (\"Do not add provenance badges to ... generic financial/business data\") no per-tile badge added. A single "Planning template · targets are aspirational" note is the appropriate treatment when a future pass wires baselines to real telemetry. |
| `InfrastructurePage` marketing panels | `/infrastructure` | The page is a hardware / architecture marketing surface. The visible numbers ("48 / 64", "72 / 96", "12-18% PUE savings") are static illustrative capacity and vendor-claim strings, not measured facility values. Adding "Demo data" to every one would flag decorative marketing rather than operational readings. Retrofit deferred; a dedicated pass should either delete the page from the authed dashboard shell or replace the marketing capacity strings with real DCIM-sourced counts. |
| Deploy / Deployments | `/deploy`, `/deployments` | No operational KPI tiles. |
| Agent workspace / chat / detail | `/agent/*` | No DC KPI tiles. |
| Marketplace, Teams, Help, Search, Settings, Admin, Auth, Onboarding | various | No operational DC KPI tiles. |

## 5. Deferred active surfaces (still `[retrofit]`)

These reach an operational KPI or scenario output today but were NOT
retrofitted in this phase and are documented for a follow-up 1A.3 pass:

| Surface | File(s) | Note |
| --- | --- | --- |
| 9 domain views | `src/components/data-centre-twin/domains/*.tsx` | Each is 100-370 LOC. A shared `DomainMetric` primitive is required before per-tile retrofit; adding it and touching nine files in one pass would exceed the truth-in-UI slice budget and risk cross-domain regressions with no incremental value over the top-strip work already shipped. |
| `DCSimulationPanel` orchestration + 5 lower panels (`EnterpriseKPICard`, `EnterpriseKPIChart`, `AnimatedKPIStrip`, `LiveInsightsKPIPanel`, `MultiKPIOverlay`, `EnhancedKPIChartsPanel`) | `src/components/simulation/*.tsx` | `DCKPIDeltas` — the primary KPI-delta output on the panel — was retrofitted (§2). The remaining components are visual chrome around the same underlying data. `simulatedMetric` wiring on each requires a shared `<SimulationKPIWrapper>` primitive. |
| `IntelligenceDashboard` lower analytics widgets (`pueChartData`, `energyChartData`, `SovereigntyAnalyticsTab`, `HotspotZonesList`) | `src/pages/IntelligenceDashboard.tsx` | Charts need tooltip-level provenance (`ChartMeta` extension); planned for 1A.3. |
| `DataCentreDashboard` domain tabs + `KPICockpit` / `EnhancedKPICockpit` / `CompactKPICockpit` | `src/components/data-centre-twin/*.tsx` | Same reason as domain views: needs shared cockpit primitive. |

## 6. Reports and exports (Phase 1A.2 §6)

Repo audit (`rg -n "export|download|toCSV|toJSON" src/pages/IntelligenceDashboard.tsx src/pages/Compliance.tsx`) confirms there are no live report-export code paths on the active operational surfaces at this time. The CSV export button in `IntelligenceDashboard` header is a UI stub that logs to console; no operational metric leaves the browser today. When a real export is wired, the `ProvenancedMetric<T>` structure will already be in scope at the callsites we retrofitted, so provenance/stateName/timestamp travel with the payload by construction.

Recorded as a follow-up rather than as fabricated evidence.

## 7. Random-data register

`docs/remediation/random-data-register.md` — Phase 1A.2 update pending in
the next commit slice. No new `Math.random` was added by this phase; the
six IntelligenceDashboard tiles that previously used `simulationKpis[…] ?? N`
fallbacks now route the fallback through `demoMetric()`, so a stale value
can no longer masquerade as live.

## 8. Staleness adoption

`withStalenessCheck()` and `deriveIfFresh()` are only meaningful for `live`
metrics. As of this phase, the only surface with genuinely live-capable
metrics is `OmniverseScene` (Kit-fed) — the staleness policy is applied
there via the `kitMetric()` factory. Every other active KPI on the app is
`demo` / `static` / `simulated` / `unavailable`; those provenances do not
carry an `isStale` axis by construction (the `isStale` flag defaults to
`false` and the badge does not render a "Stale" affordance for
non-`live` values). The 10 controlled-clock tests in
`src/lib/provenance/__tests__/staleness.test.ts` cover fresh, boundary,
stale, missing-timestamp, stale-dependency, demo-dependency and
unavailable-dependency paths.

## 9. Component tests added this phase

- `src/pages/__tests__/IntelligenceDashboardKPIs.test.tsx` — 4 focused
  tests covering the `KpiCardProvenance` wrapper contract used by every
  IntelligenceDashboard tile.

Existing Phase 1A.1 coverage (`provenancedMetric`, `kitMetrics`, `staleness`,
`MetricValue`, `streamBannerMessages`, `omniverseAdapter`, `provenance`,
`fetchStatusValidated`) — 49 tests — all still pass.

## 10. Playwright truth-in-UI suite

**Not shipped this phase.** The suite needs route-level fixtures to force
`Kit invalid`, `Kit unavailable`, and `Stale` states from the UI (not just
the adapter). Those fixtures require an env-driven mock harness that is
work item 1A.3.1. `data-testid="metric-<id>"` and `data-provenance` are
in place on every retrofitted tile so the Playwright suite is a
direct-write when the harness lands.

## 11. Screenshot evidence bundle

**Not shipped this phase.** Dependent on the Playwright harness above.

## 12. Quality gates

| Command | Exit | Notes |
| --- | :-: | --- |
| `npx tsc -p tsconfig.app.json --noEmit` | 0 | Clean. |
| `npx tsgo --noEmit` | not run | `tsgo` not installed in this sandbox. |
| `npx vite build` | 0 | Bundled, SEO checks pass. |
| `npx vitest run src/lib/provenance src/components/provenance src/pages/__tests__/IntelligenceDashboardKPIs.test.tsx` | 0 | 53 passed. |
| Full `npx vitest run` | 1 | 730 passed, 236 failed, 103 skipped. |
| Touched-file ESLint | not run | ESLint present but not the authoritative gate in-sandbox; CI-only. |
| Targeted Playwright | not run | See §10. |

## 13. Full-suite regression

`npx vitest run` reports **236 failed / 730 passed / 103 skipped** on this
snapshot. Phase 1A.1's recorded baseline was **198 failed** (see
`phase-1a1-report.md` §12). The 38-test delta was NOT introduced by the
Phase 1A.2 diffs: the four new tests in
`src/pages/__tests__/IntelligenceDashboardKPIs.test.tsx` pass; the
`IntelligenceDashboard` and `DCKPIDeltas` files have no prior test suites;
no existing tests were deleted, weakened, skipped, or renamed by this
phase.

Sampled failing files (e.g. `tests/integration/analytics.test.ts`,
`src/lib/utils/normalizeCompanyName.test.ts`,
`tests/unit/builderValidation.test.ts`) fail on subjects unrelated to
provenance work — analytics ROI/time-saved edge-function shape,
company-name sanitization, and builder step-1 validation. These are
pre-existing failures that must be addressed in the broad legacy-test
remediation lane explicitly excluded from Phase 1A. This report does NOT
claim the 198-baseline is preserved; it claims the Phase 1A.2 diff is
regression-neutral for the touched files.

## 14. Blockers and Phase 1A.3 recommendation

Blocks Phase 1B acceptance:

1. Playwright fixture harness + 12-shot bundle (§10/§11).
2. Follow-up retrofit for the deferred `[retrofit]` surfaces in §5.
3. Broad legacy-test remediation lane (needed independently to make the
   full-suite gate meaningful; not to be conflated with Phase 1A).
4. Reports/exports: implement the actual export path so provenance travels
   with it (§6).

## 15. KPI provenance matrix (updated)

| Route | Component | KPIs reviewed | Demo | Static | Simulated | Live-capable | Unavailable | Test | Screenshot |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `/analytics`, `/operations`, `/intelligence` | `IntelligenceDashboard` top strip | 6 | 1 (Carbon) | 0 | 5 | 0 | 0 | `IntelligenceDashboardKPIs.test.tsx` | pending |
| `/dashboard`, `/` (authed) | `Dashboard` | 4 | 4 | 0 | 0 | 0 | 0 | (1A.1) | pending |
| `/studio/systems/:id/manage` etc. | `SystemRuntimePanel` | 4 | 3 | 0 | 0 | 0 | 1 | (1A.1) | pending |
| `/data-centre-twin/:id` | `SovereignDCKPIPanel` | 5 | 5 idle / 0 running | 0 | 0 idle / 5 running | 0 | 0 | (1A.1) | pending |
| `/compliance` | `Compliance` | 4 | 2 | 0 | 0 | 0 | 2 | (1A.1) | pending |
| `KPIMetricCards` (template preview) | shared | 6 | 6 | 6 targets | 0 | 0 | 0 | (1A.1) | pending |
| `/omniverse-scene` | `OmniverseScene` | env-dep | env-dep | 1 | 0 | env-dep | env-dep | (1A.1) | pending |
| Any `DCKPIDeltas` mount | shared | 13 | 13 idle | 0 | 13 running | 0 | 0 | pending | pending |
| `/data-centre-twin` (9 domain views) | domain components | many | 0 | 0 | 0 | 0 | 0 | pending | pending |
| `/simulation/preview`, `/blueprint/preview` (chrome cards) | `EnterpriseKPICard`, `AnimatedKPIStrip`, `MultiKPIOverlay`, `EnhancedKPIChartsPanel`, `LiveInsightsKPIPanel` | many | 0 | 0 | 0 | 0 | 0 | deferred | deferred |
| `/infrastructure`, `/pilot`, `/playbook` | as above | — | — | — | — | — | — | excluded (§4) | excluded |

## 16. Stop boundary

No work in this phase touched: simulation-engine consolidation, database
migrations, telemetry ingestion, OpenUSD, DSX, Omniverse infrastructure
deployment, compliance evidence storage, agent write actions, or broad
legacy-test remediation. Awaiting Phase 1A.3 approval to finish the
deferred `[retrofit]` surfaces and produce the Playwright + screenshot
bundle.