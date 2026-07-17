# Phase 1A.3.f — Truth-in-UI Screenshot Evidence Index

**Generated**: automated capture via `tests/truth-in-ui/screenshots.spec.ts`
**Harness**: `playwright.truth.config.ts` (isolated Vite on :8091, deterministic clock, zero-egress network guard, mocked Kit + Supabase)
**Viewport**: 1440 x 900 (desktop, animations disabled)
**Total images**: 27 (>= 25 required)

All screenshots were produced without external network egress. Only
synthetic identities and mocked payloads are visible; no tokens, IDs,
real endpoints, hostnames, or secrets are present in the rendered
pixels or the underlying HTML.

---

## A. Kit runtime states -- `/omniverse-scene`

| # | File | Route | State | Expected disclosure | Metric IDs | Test | Source component |
|---|------|-------|-------|---------------------|------------|------|------------------|
| 01 | `01-omniverse-connecting-unavailable.png` | `/omniverse-scene` | connecting (delayed `/demo/status`) | KPI cards render in `unavailable` provenance until validation resolves. No `live` badge. | `metric-pue`, `metric-gpu`, `metric-temp`, `metric-power`, `metric-cooling`, `metric-tokens` | `01 connecting` | `OmniverseScene.tsx`, `useOmniverseKit` |
| 02 | `02-omniverse-validated-live.png` | `/omniverse-scene` | validated-live | `Kit connected . validated` chip; KPI cards `data-provenance="live"`. | all KPI cards | `02 validated live` | `StreamStatusBanner`, `KpiCardProvenance` |
| 03 | `03-omniverse-disabled-unavailable.png` | `/omniverse-scene` | Kit disabled (route aborted) | `Local demonstration scene -- Omniverse stream unavailable`; cards `unavailable` / `demo`. | all KPI cards | `03 kit disabled` | `StreamStatusBanner` |
| 04 | `04-omniverse-unavailable.png` | `/omniverse-scene` | network unavailable (500 chain) | `Kit unavailable` banner; KPI cards `unavailable`. | all KPI cards | `04 network unavailable` | `StreamStatusBanner`, `kitMetrics.ts` |
| 05 | `05-omniverse-invalid-demo.png` | `/omniverse-scene` | schema invalid | `Kit response invalid` banner; cards fall back to `demo` (never `live`). | all KPI cards | `05 schema invalid` | `fetchStatusValidated`, `StreamStatusBanner` |
| 06 | `06-omniverse-stale-unavailable.png` | `/omniverse-scene` | stale (long-held response) | Provenance stays `unavailable`; no `live` claim during hang. | all KPI cards | `06 stale` | `useOmniverseKit` staleness policy |
| 07 | `07-omniverse-demo-fallback.png` | `/omniverse-scene` | demo fallback after invalid schema | `metric-sovereignty` reads `Not assessed`; cards labelled `demo`. | `metric-sovereignty`, `metric-pue`, `metric-gpu` | `07 demo fallback` | `kitMetrics.ts` demo-precedence rule |
| 08 | `08-omniverse-simulation-running.png` | `/omniverse-scene` | simulation running (anomaly phase) | Scenario chrome reads `SIMULATION . <clock>`, phase `Anomaly`. No `LIVE` text. | scenario chrome | `08 simulation running` | `KPICockpit`, `DataCentreDashboard` |
| 09 | `09-omniverse-simulation-baseline.png` | `/omniverse-scene` | simulation baseline (steady phase) | Scenario chrome reads `SIMULATION . <clock>`, phase `Steady`. | scenario chrome | `09 simulation baseline` | `KPICockpit` |
| 10 | `10-omniverse-static-target.png` | `/omniverse-scene` | validated-live, static target card | `metric-pue-target` carries `data-provenance="static"` (`< 1.30`). | `metric-pue-target` | `10 static target` | `KpiCardProvenance` |
| 11 | `11-omniverse-not-assessed.png` | `/omniverse-scene` | unavailable / not assessed | `metric-sovereignty` displays `Not assessed` with `unavailable` icon. | `metric-sovereignty` | `11 unavailable / not assessed` | `KpiCardProvenance` |

## B. Auth-gated surfaces (mocked session, mocked edge functions)

| # | File | Route | State | Expected disclosure | Metric IDs | Test | Source component |
|---|------|-------|-------|---------------------|------------|------|------------------|
| 12 | `12-dashboard-authed.png` | `/dashboard` | authenticated demo | KPI cards (`Global PUE`, `GPU Saturation`, `Thermal Stability`, `Sovereign Compute`) each display a `Demo data` badge. | `dashboard-pue`, `dashboard-gpu`, `dashboard-thermal`, `dashboard-sovereign` | `12 dashboard` | `Dashboard.tsx`, `KpiCardProvenance` |
| 13 | `13-intelligence-dashboard.png` | `/intelligence` | authenticated | Every KPI card shows a provenance dot; `Blueprint . 58 KPIs`; `Data provenance` manifest expandable; `Export Report` trigger visible. | see `metricCatalog.telemetry` (11) | `13 intelligence` | `IntelligenceDashboard`, `MetricProvenanceManifest` |
| 14 | `14-intelligence-export-menu-open.png` | `/intelligence` | export dropdown open | Menu header `Provenance-preserving export . Schema v1.0.0 . every row is classified per-metric.` Items: `Download CSV (chart series)`, `Download JSON (schema-versioned)`, `Print / Save as PDF`. | export surface | `14 intelligence export menu open` | `IntelligenceDashboard` export dropdown |
| 15 | `15-intelligence-chart-pue.png` | `/intelligence` | Overview chart (PUE) | Chart series carries per-metric provenance; no `live` claim in demo. | `metric-pue`, `metric-pue-target` | `15 intelligence PUE chart` | `EnhancedKPIChartsPanel` |
| 16 | `16-intelligence-chart-energy.png` | `/intelligence` | Energy chart (scrolled) | Charts render seeded PRNG data; provenance visible; simulation chrome (not live). | `metric-power`, `metric-cooling` | `16 intelligence energy chart` | `EnhancedKPIChartsPanel` |
| 17 | `17-compliance-blocked-export.png` | `/compliance` | authenticated | `Export Audit Report` button disabled; Sovereign Compliance and Audit Readiness read `Unavailable / Not assessed`; per-requirement `Below configured threshold` badges shown. | `compliance-sovereign`, `compliance-audit`, `compliance-flows`, `compliance-violations` | `17 compliance blocked export` | `Compliance.tsx` (`compliance-export-audit-blocked`) |
| 18 | `18-infrastructure-demo.png` | `/infrastructure` | authenticated | Operational metrics block (`infrastructure-operational-metrics`) with `Demo` provenance on every KPI. | see `metricCatalog.infrastructure` | `18 infrastructure demo` | `InfrastructurePage.tsx` |

## C. Nine domain views -- `/data-centre-twin?demo=true`

All nine tabs render under the shared `DataCentreDashboard` chrome.
The header badge reads `SIMULATION . <clock>` -- never `LIVE` -- because
the Kit route is aborted for this suite so no source is validated. Each
tab exposes a `Data provenance (N metrics)` accordion sourced from
`metricCatalog.ts`.

| # | File | Route (`?demo=true` + tab) | Domain | Expected disclosure | Metric IDs source | Test | Source component |
|---|------|----------------------------|--------|---------------------|-------------------|------|------------------|
| 19 | `19-domain-thermal.png` | `/data-centre-twin?demo=true` -> Thermal | Thermal | `SIMULATION` chrome, `Data provenance (N metrics)`, no live claim. | `metricCatalog.thermal` | `19-domain-thermal.png` | `ThermalDomainView` + `DomainProvenanceHeader` + `MetricProvenanceManifest` |
| 20 | `20-domain-power.png` | -> Power | Power | as above | `metricCatalog.power` | `20-domain-power.png` | `PowerDomainView` |
| 21 | `21-domain-cooling.png` | -> Cooling | Cooling | as above | `metricCatalog.cooling` | `21-domain-cooling.png` | `CoolingDomainView` |
| 22 | `22-domain-network.png` | -> Network | Network | as above | `metricCatalog.network` | `22-domain-network.png` | `NetworkDomainView` |
| 23 | `23-domain-facility.png` | -> Facility | Facility | as above | `metricCatalog.facility` | `23-domain-facility.png` | `FacilityDomainView` |
| 24 | `24-domain-workload.png` | -> Workload | Workload | as above | `metricCatalog.workload` | `24-domain-workload.png` | `WorkloadDomainView` |
| 25 | `25-domain-sovereignty.png` | -> Sovereignty | Sovereignty | Cards classified `unavailable` per catalog; header `SIMULATION`. | `metricCatalog.sovereignty` | `25-domain-sovereignty.png` | `SovereigntyDomainView` |
| 26 | `26-domain-carbon.png` | -> Carbon | Carbon | as above | `metricCatalog.carbon` | `26-domain-carbon.png` | `CarbonDomainView` |
| 27 | `27-domain-financial.png` | -> Financial | Financial | as above | `metricCatalog.financial` | `27-domain-financial.png` | `FinancialDomainView` |

---

## Visual-inspection defects found & fixed during 1A.3.f

| Defect | Location | Fix | Evidence |
|--------|----------|-----|----------|
| Chrome badge displayed literal `LIVE . <time>` in demo/simulated context (contradictory Live text) | `DataCentreDashboard.tsx:369`, `KPICockpit.tsx:150` | Replaced label with `SIMULATION . <time>` and tagged badge with `data-provenance="simulated"`. Removed pulsing green success dot. | Visible in all 9 domain shots (19-27); re-verified in `25-domain-sovereignty.png`. |
| `/dashboard` crashed with `Cannot read properties of undefined (reading 'reduce')` when the `ai-systems-unified` edge function was unmocked | Screenshot harness only (not production) | Added edge-function envelope mock returning `{ items: [], stats: {...}, pagination: {...} }` to the `/dashboard` spec so the KPI shell renders. | `12-dashboard-authed.png`. |

## Known cosmetic items (not blocking)

- Locale-flag glyphs in the header render as tofu boxes on the harness Chromium build (missing regional emoji font). Purely visual; no bearing on provenance disclosures.
- Compliance requirement subtitles display `undefined%` in strings like `PIPEDA Compliant: undefined%` (image 17). Top-level KPI cards correctly show `Not assessed` / `Unavailable`. Deferred to Phase 1A.3.g / 1B.

## Reproduction

```bash
npx playwright test --config playwright.truth.config.ts screenshots.spec.ts
```

All 27 tests pass; PNGs are written back to this directory.

## Attestation

- Zero external network egress (network guard clean on every test).
- Deterministic clock (`installDeterministicClock`) pinned at 12:00:00 PM.
- Screenshots supplement -- do not replace -- the runtime assertions in
  `runtime-states.spec.ts`, `auth-surfaces.spec.ts`, and
  `manifest-a11y.spec.ts`.
