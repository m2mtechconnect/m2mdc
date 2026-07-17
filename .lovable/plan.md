
# Phase 1A.3 — Execution Plan

Phase 1A.3 as written is a multi-week program (9 domain views + 5 simulation-chrome components + reports/exports + Playwright harness + 12-screenshot bundle + a11y + full quality gates + final report). Rather than half-execute all of it in one turn and then claim completion, I will execute the plan below in explicit sub-slices, with a hard stop after each for your review. This mirrors how 1A.1 and 1A.2 were successfully landed.

## Ground rules I will follow

- Read-only for router, migrations, deps, infra, external integrations.
- No `as unknown as`, no test weakening, no snapshot-only assertions.
- Every retrofitted metric goes through `MetricValue` / `KpiCardProvenance` with `data-provenance` and accessible name including label + value + unit + provenance + stale state.
- Deterministic clocks in tests (`vi.useFakeTimers` / injected `now`).
- Screenshots are evidence, not proof — Vitest/Playwright assertions remain the gate.

## Sub-slice sequence (hard-stop after each)

### 1A.3.a — Scope reconciliation + register (docs only, no source edits)
Deliverables:
- `docs/remediation/phase-1a3-scope.md` — final surface matrix (route, reachability, source, required provenance, disposition, exclusion evidence).
- `docs/remediation/random-and-synthetic-data-register.md` — supersedes `random-data-register.md`, adds file:line, consumer route, user-visible effect, classification, owner/phase.
Exit: you confirm the surface list and exclusions before any code change.

### 1A.3.b — Simulation chrome retrofit (item 3)
Components: `EnterpriseKPICard`, `AnimatedKPIStrip`, `LiveInsightsKPIPanel`, `MultiKPIOverlay`, `EnhancedKPIChartsPanel`, `DCSimulationPanel` header labels.
Rules: results → `simulated`; baselines → `demo`; inputs labelled "user-configured" vs "demo input"; strip any copy that calls deterministic math "CFD / physics / Modulus / Omniverse".
Tests: per-component unit tests asserting `data-provenance` and label copy.

### 1A.3.c — Nine domain views retrofit (item 2)
`ThermalDomainView`, `PowerDomainView`, `CoolingDomainView`, `NetworkDomainView`, `FacilityDomainView`, `WorkloadDomainView`, `SovereigntyDomainView`, `CarbonDomainView`, `FinancialDomainView` + `EnhancedRackOverview` / `CompactRackOverview` / `ThermalHeatmapUtils` consumers.
Per-metric wrapping via `MetricValue`; section badges retained but never replace per-metric provenance.
One targeted Vitest per view asserting at least one KPI carries `data-provenance="demo"` (or `simulated` where applicable) and no `data-provenance="live"` on unvalidated paths.

### 1A.3.d — Staleness + Kit-state matrix (items 5 + partial 7)
Vitest-level integration tests driving `useOmniverseKit` through: validated / disabled / unavailable / schema-invalid / stale, asserting rendered `OmniverseScene` KPI provenance transitions correctly. Deterministic `now` injected via existing `withStalenessCheck(..., now)`.

### 1A.3.e — Reports & exports (item 4)
Audit active export paths (CSV/print). Where provenance can be attached, attach it. Where not, disable with in-UI explanation and document in scope file. No new export formats.

### 1A.3.f — Playwright harness + screenshot bundle (items 7 + 8)
`tests/e2e/provenance-truth.spec.ts` covering the 9 required runtime states on `/omniverse-scene`, `/data-centre-twin`, `/compliance`, `/simulation/preview`. Kit calls stubbed via `page.route`. 12 screenshots to `docs/remediation/evidence/phase-1a3/` with `index.md`.

### 1A.3.g — Accessibility pass (item 9) + final report (item 11)
`axe-core` assertions on retrofitted surfaces where practical; verify accessible names include unit + provenance + stale; ensure provenance is not colour-only (icon + text already in `ProvenanceBadge`).
Final `docs/remediation/phase-1a3-report.md` with quality-gate outputs, legacy-vs-new regression split, and explicit Phase 1B go/no-go.

## What I will NOT do this phase

- Consolidate simulation engines, migrate DB, add DSX / OpenUSD / BMS / DCIM / telemetry ingestion, agent writes, compliance evidence store.
- Fix legacy failing tests unrelated to the 1A.3 diff.
- Rewrite `IntelligenceDashboard` charts (`pueChartData` / `energyChartData`) as part of 1A.3.c unless you approve; they are chart arrays, not KPI tiles, and were explicitly deferred in 1A.2.

## Ask before I start

1. Approve the sub-slice sequence and hard-stop cadence, OR ask me to fold 1A.3.a–1A.3.g into fewer stops.
2. Confirm whether `IntelligenceDashboard` `pueChartData` / `energyChartData` chart arrays are in 1A.3 scope or deferred.
3. Confirm the screenshot bundle target is 12 (the spec minimum) rather than one-per-surface (~25+).

I will not touch source code until you approve this plan.
