# Random-Data Register

Phase 1A.1, item 7. Inventory of `Math.random()` / synthetic-noise usage
across `src/` at the time this register was written. Non-`src` occurrences
(tests, scripts) are intentionally excluded except where they leak into
active runtime paths. Every user-visible operational surface identified as a
`retrofit` target in the KPI inventory has been checked.

Classifications used below:

- **operational** — value reaches an active operational KPI surface. MUST be
  removed or replaced with a deterministic `demo`/`live` source in this
  phase.
- **simulation** — scenario-estimator output. Presented via `simulated`
  provenance; caller has already been tagged in §4.
- **demo-fixture** — deterministic-looking demo value that helps populate
  fallback UI. Wrap in `demoMetric` when reaching a KPI card.
- **harmless-animation** — cosmetic noise (sparkline jitter, layout keys)
  with no operational reading. Documented but left in place.
- **test-only** — inside `__tests__/` or `tests/`; not shipped.
- **dead-code** — file is not reachable from the active route inventory.

Total sites surveyed: 44 files. Only entries that could reach an active
operational KPI are enumerated exhaustively; harmless-animation sites are
listed in aggregate.

| File / symbol | Classification | User-visible | Operational | Provenance today | Disposition |
| --- | --- | :-: | :-: | --- | --- |
| `src/twins/dataCenter/omniverseAdapter.ts` — `synthValue()` / demo scaffolding | demo-fixture | yes | via `OmniverseScene` | `demo` (Phase 1A.1 §3 wired) | Keep; already routed through `kitMetric()` factory. |
| `src/twins/dataCenter/mockData.ts` | demo-fixture | yes | via `DataCentreDashboard` | mixed (untagged) | **Retrofit deferred (§13 deferred list).** Callers must wrap in `demoMetric` in Phase 1A.2. |
| `src/twins/dataCenter/simulationEngine.ts` | simulation | yes | via `DCSimulationPanel` | untagged | Retrofit deferred. Must render `simulated` when consumed. |
| `src/twins/sovereignDataCenter/simulationEngine.ts` | simulation | yes | via `SovereignDCKPIPanel` | now `simulated` (§4 wired) | Done. |
| `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts` | simulation | yes | via `EnhancedSimulation*` | untagged | Retrofit deferred. Must render `simulated`. |
| `src/twins/sovereignDataCenter/mockData.ts` | demo-fixture | yes | via twin dashboard | untagged | Retrofit deferred. Wrap outputs in `demoMetric`. |
| `src/simulation/generateSimulationResult.ts` | simulation | yes | via simulation preview | untagged | Retrofit deferred. Must render `simulated`. |
| `src/simulation/customScenarioBuilder.ts` | simulation | yes | via `CustomScenarioBuilder` | untagged | Retrofit deferred. |
| `src/components/builder/step5/SimulationEngine.ts` | simulation | yes | via Builder step 5 | untagged | Retrofit deferred. |
| `src/components/builder/step5/MockSimulationEngine.ts` | simulation | yes | via Builder step 5 | untagged | Retrofit deferred. |
| `src/data/industryAccurateDefaults.ts` | demo-fixture | yes | seeds template defaults | untagged | Retrofit deferred; template-time only. |
| `src/hooks/useAgentRuns.ts` | demo-fixture | yes | agent runs list | untagged | Non-DC operational; out of Phase 1A.1 scope. |
| `src/pages/IntelligenceDashboard.tsx` | demo-fixture | yes | operational tiles + charts | untagged | **Retrofit deferred to Phase 1A.2 (tiles + `pueChartData` + `energyChartData` need `demo` tagging).** |
| `src/pages/Teams.tsx`, `src/pages/Search.tsx` | demo-fixture | yes | non-DC | non-operational | Out of scope. |
| `src/components/dc-twin/tabs/DCSimulationTab.tsx` | simulation | yes | Twin simulation tab | untagged | Retrofit deferred. |
| `src/components/marketplace/TemplateSimulation.tsx` | simulation | yes | marketplace preview | untagged | Retrofit deferred. |
| `src/components/aoc/AOCMetricsAdvanced.tsx` | demo-fixture | yes | AOC page (non-DC) | untagged | Out of scope. |
| `src/components/data-centre-twin/thermal/ThermalHeatmapUtils.ts` | demo-fixture | yes | thermal heatmap | untagged | Retrofit deferred (part of 9 domain views). |
| `src/components/data-centre-twin/overview/SparklineChart.tsx` | harmless-animation | yes | decorative sparklines | non-operational | Keep. Document as decorative. |
| `src/components/data-centre-twin/overview/EnhancedRackOverview.tsx`, `CompactRackOverview.tsx` | demo-fixture | yes | rack widgets | untagged | Retrofit deferred (domain view retrofit). |
| `src/components/data-centre-twin/domains/NetworkDomainView.tsx` | demo-fixture | yes | Network domain view | untagged | Retrofit deferred. |
| `src/components/workflow/WorkflowEditor.tsx` | harmless-animation | yes | node id generator | non-operational | Keep. |
| `src/components/UploadZone.tsx` | harmless-animation | yes | upload IDs | non-operational | Keep. |
| `src/components/auth/BackgroundGrid.tsx` | harmless-animation | yes | background grid animation | non-operational | Keep. |
| `src/components/ui/sidebar.tsx` | harmless-animation | yes | sidebar id | non-operational | Keep. |
| `src/components/search/RecommendationsPanel.tsx` | demo-fixture | yes | recommendation ranking noise | non-DC | Out of scope. |
| `src/components/builder/steps/Step5Deploy.tsx` | demo-fixture | yes | builder-only | non-operational | Keep. |
| `src/twins/dataCenter/__tests__/omniverseAdapter.test.ts` | test-only | no | no | test | Keep. |

## Actions taken this phase

- All operational values that were literal strings on `Dashboard.tsx` and
  `SystemRuntimePanel.tsx` were wrapped in `demoMetric()` and rendered via
  `<MetricValue>`; they now carry `data-provenance="demo"` and the "Demo
  data" badge, and the code path can no longer silently default to `live`.
- `SovereignDCKPIPanel` output is now labelled `simulated` when a run is
  active and `demo` otherwise; every KPI card exposes `data-provenance`.
- `KPIMetricCards.DEFAULT_DC_KPIS` current-values are labelled `demo` and
  targets are labelled `static`; each card exposes `data-provenance`.

## Phase 1A.3.b2 additions

Retrofits landed for the remaining simulation-chrome surfaces:

- `EnhancedKPIChartsPanel.tsx` — 18 `Math.random()` sites removed. Baseline
  generators now accept an injected seeded PRNG keyed to
  `enhanced-kpi/${industry}/${scenario}/${kpi.label}/${idx}`. Root exposes
  `data-testid="enhanced-kpi-charts-panel"` and `data-provenance`. Each
  tile wrapper exposes `data-testid="enhanced-kpi-tile-<n>"`,
  `data-provenance`, and renders a compact `ProvenanceBadge`. Header
  string changed from "Live Metrics" to "Simulation Metrics"; the
  animated white-dot "Live" pill is replaced by a `ProvenanceBadge`.
  Fixture series stay `demo` even inside a running scenario.
- `LiveInsightsKPIPanel.tsx` — no `Math.random()` in file; header renamed
  from "Live Insights" to "Simulation Insights"; animated "LIVE" pill
  replaced by `ProvenanceBadge` (`simulated` while running, `demo`
  otherwise). Root exposes `data-testid="live-insights-panel"` and
  `data-provenance`.
- `LiveSimulationDashboard.tsx` — `fanSpeed` and `upsValues` `Math.random`
  calls replaced with seeded PRNGs keyed to `currentTime` (and index for
  UPS). Section title renamed from "Live Simulation Dashboard" to
  "Simulation Dashboard"; badge changed from "Active" to "Simulation".
  Root exposes `data-testid="live-simulation-dashboard"` and
  `data-provenance="simulated"`. Bar-waveform animation retains its
  `Math.sin/Math.cos(Date.now())` — classified `harmless-animation` (no
  displayed value; the tile shows `throughput` / `saturation` which are
  deterministic).
- `AnimatedRackHeatmap.tsx` — `generateDefaultRacks` seeded on rack count.
  Animated "LIVE" pill replaced by `ProvenanceBadge`. Fixture fallback is
  always `demo`; caller-supplied racks resolve to `simulated` while
  running, `demo` otherwise.
- `KPICorrelationMatrix.tsx` — fallback `impacts` `Math.random` replaced
  with a seeded PRNG keyed to the kpi id set. Root exposes
  `data-testid="kpi-correlation-matrix"` and `data-provenance`; fixture is
  `demo`, caller-supplied impacts are `simulated`.

### Retained run-ID randomness (harmless-animation)

- `src/components/simulation/DCSimulationPanel.tsx:234` —
  `` `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` ``.
  Kept intentionally.
  - **Purpose:** unique identifier for a scenario run captured into
    `runIdRef` and passed to `captureSnapshot()`.
  - **Cannot affect displayed values:** the value is never rendered as a
    KPI, never derived into a metric, and never fed into a chart series.
    Grep for `runIdRef.current` shows it flows only into the simulation
    snapshot store (bookkeeping) and CoPilot context (correlation id).
  - **Cannot affect provenance:** provenance for every KPI in the panel
    is resolved from `simulatedMetric()`/`demoMetric()` factories and
    from the seeded rack generator introduced in 1A.3.b1 — none of them
    read `runIdRef`. Provenance badges rendered by this panel resolve
    strictly from `isRunning`/`scenarioId`, not from the run id.
  - **Classification:** `harmless-animation` (identity token, not a
    reading).

### `simulatedMetric()` canonicalization

`src/lib/provenance/index.ts:115-130` remains the single implementation
of `simulatedMetric<T>()`. `rg -n "export function simulatedMetric"
src/` returns exactly one match. Sub-slice 1A.3.b2 did not introduce a
parallel helper; retrofitted panels either use the existing factory
indirectly (via `ProvenancedMetric<T>` wrappers in earlier sub-slices)
or construct inline `ProvenanceMeta` objects that pass the
`provenance: 'simulated' | 'demo'` discriminator directly into
`<ProvenanceBadge>`. `deriveMetric()` and `deriveIfFresh()` remain the
only paths that could ever upgrade provenance, and both refuse to
upgrade a `simulated`/`demo`/`static`/`unavailable` source.

## Deferred (Phase 1A.2)

- `IntelligenceDashboard` KPI strip (six tiles) — RETROFITTED in Phase
  1A.2 (see `phase-1a2-report.md` §2). Fallback values now flow through
  `demoMetric()` so a missing simulation key can no longer surface as
  `live`. The `pueChartData` / `energyChartData` chart arrays remain
  deferred to Phase 1A.3.
- Nine domain views under `src/components/data-centre-twin/domains/*` and
  rack/thermal utility widgets.
- `DCSimulationPanel` family:
  - `DCKPIDeltas` — RETROFITTED in Phase 1A.2 (each card carries
    `data-provenance="simulated"` while a run is active, `demo`
    otherwise).
  - `EnterpriseKPICard`, `AnimatedKPIStrip`, `LiveInsightsKPIPanel`,
    `MultiKPIOverlay`, `EnhancedKPIChartsPanel` — still deferred.
- Builder step 5 simulation engines.
- `InfrastructurePage` marketing panels — excluded from the retrofit lane
  (see `phase-1a2-report.md` §4); either delete or replace with live DCIM
  data in a future pass.
- `Pilot` — excluded: form-only surface, no operational KPIs.
- `Playbook` KPI grid — excluded: planning template (baselines/targets),
  not readings.

No indiscriminate repository-wide `Math.random` replacement was performed.
Harmless-animation and non-operational sites were intentionally preserved.
