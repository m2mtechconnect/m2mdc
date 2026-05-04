
## Plan: Telemetry & Analytics page upgrade — Lucas's feedback, fully applied

### Source feedback (`Lucas_Telemetry_Analytics_Page_-_Feedback.pdf`)
1. Mixed data grains shown side-by-side (facility / zone / event / workload / policy / region) without labels.
2. KPIs lack time-window, aggregation logic, target/threshold, data source.
3. Audience drift — page tries to serve execs, ops, and engineering at once. Should be **executive + operations overview**; engineering detail belongs in Thermal/Power/Cooling/Sovereignty/Carbon tabs.
4. Carbon Intensity wrongly displayed as a percentage; Thermal Incidents card hardcoded to 24h while filter says 7d.
5. No data-trust signals (last refresh, sensor coverage, source health, quality flags).
6. Missing decision-flow story: efficient → demand → risk → action → trust → compliance.

### Industry references backing every metric definition
- **PUE / DCIE**: Uptime Institute Global DC Survey 2024 (industry avg 1.58, hyperscale 1.10–1.20). The Green Grid PUE v3 spec defines PUE as a **selected-period weighted average** of total facility power ÷ IT power.
- **Tier uptime**: Uptime Institute Tier Standard — Tier III 99.982%, Tier IV 99.995%.
- **Thermal envelope**: ASHRAE TC 9.9 Class A1 inlet 18–27 °C, recommended 18–24 °C.
- **GPU utilization**: NVIDIA DGX SuperPOD reference 70–90% target band; H100 SXM TDP 700 W.
- **Carbon intensity**: IEA / electricityMap convention — `gCO₂eq/kWh` at the grid-region grain, not a percentage. Quebec grid baseline ~1.5 gCO₂/kWh (HQ hydro), Ontario ~30, Alberta ~510.
- **Sovereignty score**: derived from policy-coverage formula `compliant_workloads ÷ in-scope_workloads`, with exception count surfaced separately (CCCS / Bill 25 / GDPR style).
- **Data trust**: ISA-95 / ISO 8000-8 data-quality dimensions — *completeness, currency, consistency, accuracy* — operationalised here as `sensor coverage`, `last refresh`, `source health`, `quality flags`.

These references are cited inline in code comments next to each constant so future engineers can trace numbers, matching the existing pattern already in `IntelligenceDashboard.tsx`.

---

### Target file
`src/pages/IntelligenceDashboard.tsx` (already labeled "Telemetry & Analytics"). Supporting: `src/components/shared/KpiCard.tsx`, `src/domain/greenDc/kpiCatalog.ts`, plus four new small components.

---

### Changes

**1. Reposition the page (header)**
- Subtitle: *"Executive and operations overview. Drill into Thermal, Power, GPU, Sovereignty, Carbon tabs for engineering detail."*
- Right side: "Last refreshed 2 min ago" timestamp + "Auto-refresh 60s" indicator.

**2. Extend `KpiCard` with metric-basis metadata** (additive, backward-compatible)

New optional props:
- `grain`: `Facility | Zone | Event | Workload | Policy | Service | Grid Region`.
- `window`: e.g. `Selected period (7d)`, `Last 24h`, `Current`.
- `aggregation`: `Weighted avg | Simple avg | Count | Sum | Max | Latest | P95`.
- `unit`: explicit suffix (e.g. `gCO₂/kWh`, `%`, `events`).
- `target` + thresholds → drives a green/amber/red status pill from `KPI_CATALOG`.
- `source`: short data-source string (e.g. `BMS · DCIM`).
- `quality`: `good | suspect | stale | unknown` → small dot indicator.
- `formula`: shown in tooltip alongside description.

KpiCard layout: icon + change → value with unit → label → **basis line** (`grain · window · aggregation`) → status pill vs target → quality dot. Tooltip = business meaning, formula, source, threshold band.

**3. Refactor the 6-KPI strip with correct semantics**

| KPI | Value | Unit | Grain | Window | Aggregation | Target |
|---|---|---|---|---|---|---|
| PUE | 1.28 | (ratio) | Facility | Selected period | Weighted avg | ≤ 1.30 |
| GPU Utilization | 78 | % | Workload/Cluster | Selected period | Avg across selected | 70–90% |
| Thermal Incidents | dynamic | events | Event | **Follows global filter** | Count | 0 critical |
| Carbon Intensity | 32 | gCO₂/kWh | Grid Region (QC) | Current | Latest | ≤ 50 |
| Sovereignty | 98 | % coverage | Policy/Workload | Selected period | Compliant ÷ in-scope | 100% |
| System Uptime | 99.97 | % | Service | Selected period | Uptime ÷ window | ≥ 99.982% (Tier III) |

Specific bug fixes:
- **Carbon Intensity**: stop computing `100 - x/0.7` as a percentage. Render `gCO₂/kWh` directly with grid-region badge (`QC Grid`). Mapping `region → typical gCO₂/kWh` lives in `src/domain/greenDc/gridCarbon.ts` (new, small).
- **Thermal Incidents**: bind to selected `dateRange` filter; basis line reads `"Active + new in last 7 days"` when filter is 7d.
- **GPU Utilization**: clarify simple average across the *filtered* clusters; show count of clusters in scope (`avg of n=4 clusters`).
- **Sovereignty**: tooltip shows formula `compliant_workloads ÷ in-scope_workloads`, plus exception count.

**4. Add a "Data Trust" strip above the tabs** (new component `DataTrustStrip`)

Four compact pills:
- **Last refreshed** — relative time, absolute on hover.
- **Sensor coverage** — `% reporting (n/total)`; amber < 90%, red < 75%.
- **Source health** — `OK/total upstream sources` (DCIM, BMS, IPMI, Grid API).
- **Quality flags** — rollup of `good / suspect / stale / missing` reading counts.

Skeleton state while loading; the strip is also reused in step 5 of the story rail.

**5. Reorganize the Overview tab into the 6-step decision story**

Replace the current 2×2 grid with a stacked story rail. Each section is a numbered band with the question as title:

1. *Are we running efficiently?* → PUE Trend chart (with target line at 1.30 and warning line at 1.40) + Power vs IT Load chart (renamed from "Energy vs IT Load" since unit is kW, not kWh).
2. *What is driving demand?* → GPU Utilization by Zone + small workload-mix donut (top 3 workload types).
3. *Is demand creating risk?* → Hotspot zones list with inlet temp; reuses thermal incident data.
4. *Where should we act first?* → Active events table sorted by severity then age (zone, severity, age, owner, action button → opens incident in AOC at `/aoc?incident=…`).
5. *Can we trust the data?* → Mini-recap of the Data Trust strip + sensor-coverage heatmap by zone.
6. *Are we compliant and sustainable?* → Sovereignty Score + Carbon Intensity side-by-side with breakdowns.

Each section has a "Drill into <tab>" link in the corner pointing to the matching engineering tab.

**6. Add explicit grain/window labels on every chart**

Each `CardHeader` gets a small subtitle line: `Grain: Facility · Window: Last 7 days · Source: DCIM`. Implemented as a reusable `<ChartMeta>` row, reading from active filter state so it updates live.

**7. Threshold visualization on charts**
- PUE Trend chart: `ReferenceLine` at 1.30 (target) and 1.40 (warning), values pulled from `KPI_CATALOG[KPIKey.PUE]`.
- GPU Util bar chart: `ReferenceArea` 70–90% as recommended band.

**8. Mixed-units guard**
- Current GPU chart plots utilization (%) and temp (°C) on the same Y axis. Split into a dual-axis chart (`yAxisId="left"` for %, `yAxisId="right"` for °C) with axis labels.

**9. Filter ↔ KPI consistency**
- KPI cards now read `dateRange`, `facility`, `subsystem`, `region` from state and pass them into the basis line so users see the active scope on every card.

**10. Quebec French labels (OQLF)**
- All new strings (basis lines, "Last refreshed", grain words, story-step questions) added to `src/i18n/locales/{en,fr-CA}.json` under a new `telemetry.basis.*` namespace. Quebec terms: *"Jumeau numérique"*, *"Couverture des capteurs"*, *"Fraîcheur des données"*, *"Souveraineté"*. No em dashes anywhere (Core memory rule).

**11. Pre-existing build error (must fix to ship)**
- `src/components/landing/LoomDemoModal.tsx` imports `@radix-ui/react-visually-hidden`, which isn't installed. Replace with `VisuallyHidden` from `@radix-ui/react-dialog` (already a dep) so the build passes.

---

### Out of scope (deferred, with TODOs)
- Real backend wiring of `Sensor coverage` and `Source health` — derive from existing `useTwinTelemetry` for now, with `// TODO: ops-health edge function` markers. Schema for the future endpoint sketched in code comments.
- Detailed redesign of per-domain tabs (Thermal/Power/Workload) — they remain placeholder cards routing to the DC Twin.

### Files touched
- `src/pages/IntelligenceDashboard.tsx` — major refactor.
- `src/components/shared/KpiCard.tsx` — additive props.
- `src/components/telemetry/DataTrustStrip.tsx` — new.
- `src/components/telemetry/ChartMeta.tsx` — new.
- `src/components/telemetry/StoryStepHeader.tsx` — new.
- `src/components/telemetry/HotspotZonesList.tsx` — new (small).
- `src/domain/greenDc/gridCarbon.ts` — new (region → gCO₂/kWh map).
- `src/i18n/locales/en.json`, `src/i18n/locales/fr-CA.json` — new `telemetry.basis.*` keys.
- `src/components/landing/LoomDemoModal.tsx` — fix import.

### Acceptance check
- Every KPI card shows label + value + unit + basis line + status pill + quality dot.
- Carbon Intensity reads `32 gCO₂/kWh` with `QC Grid` badge (not a percentage).
- Thermal Incidents card label changes when the date-range filter changes.
- Overview tab renders 6 numbered story sections in order.
- Data Trust strip shows last-refreshed, sensor coverage, source health, quality flags.
- GPU chart uses dual axes for % vs °C.
- PUE chart shows target/warning reference lines.
- All new strings localized in EN and fr-CA, OQLF compliant, no em dashes.
- Build passes (LoomDemoModal import fixed).
