# AURA DC - Assurance Evidence Trace (Sovereignty, Carbon, Financials)

Scope: `/dsx/evidence-beta/sovereignty`, `/carbon`, `/financials`
Trace run: SIMULATED mode, timeline `cooling_degradation`, run id
`sim:cooling_degradation:20260804:2026-03-02T08:00:00.000Z`, tick 3,
72 accepted observations, 0 quarantined.
Event ids are deterministic (`stableUuid('evidence-beta:event:<key>')` in
`src/dsx/fixtures/timelines.ts:57`), so every id below is reproducible.

Screenshots: `/mnt/documents/dsx-evidence-trace/` (`sovereignty.png`,
`carbon.png`, `financials.png`, plus per-claim drilldowns).

## 1. Source chain

```text
fixtures/timelines.ts  ->  adapters/ingestPipeline.ts  ->  SourceSnapshot.accepted
      -> metrics/computeKpis.ts (KPI_DEFINITIONS)  -> DsxProvenancedMetric
      -> workspaces/evidenceBoundary.ts             -> EvidenceAssertion
      -> components/dsx/MetricTile + EvidenceBoundary (UI)
```

A claim is evidenced only via `evidenced()` or `fromMetric()` (a metric with a
non-null value). Everything else is `blocked()` and names a capability from
`src/dsx/workspaces/availability.ts`.

## 2. Displayed KPIs and their evidence

| Workspace | KPI (tile) | Value at trace tick | Formula | Supporting event ids |
|---|---|---|---|---|
| Carbon, Financials | Facility load | 974.11 kW | `it_power_total + cooling_power_total` | 10 ids: `4539947a...`, `b82e2e01...`, `d6caa102...`, `52a2ff3f...`, `0fc69ec8...`, `8b27c2e1...`, `89e13fdb...`, `fe6c3839...`, `ece5c2cf...`, `b336ac3b...` |
| Carbon, Financials | IT load | 735.71 kW | `sum(rack_it_power)` | first 8 of the ids above (rack `-PWR` sources) |
| Carbon | Cooling load | 238.40 kW | `sum(cooling_unit_power)` | `ece5c2cf-1e8a-492c-8d1c-17ed5da41f61`, `b336ac3b-26e2-428a-9a0c-389c904bed55` |
| Carbon | PUE | 1.324 | `(it+cooling)/it` | same 10 ids as facility load |
| Carbon | WUE | Unavailable | `water_consumption_l / it_energy_kwh` | none - missing `water_consumption_l`, `it_energy_kwh` |
| Carbon | CUE | Unavailable | `(facility_energy_kwh * grid_intensity)/1000/it_energy_kwh` | none - missing `facility_energy_kwh`, `grid_intensity_g_per_kwh`, `it_energy_kwh` |
| Financials | Power capacity utilisation | 40.59 % | `100*(it+cooling)/site_rated_kw` | same 10 metered ids; `site_rated_kw` is **not** event-backed (see D-02) |

Every tile carries `Simulated`, `Fresh`, `Validated`, `Uncalibrated`.

## 3. Claim-level trace

### Sovereignty (2 evidenced / 5 not evidenced -> Unverified)

| Claim id | Status | Basis or blocker | Event ids | Missing inputs |
|---|---|---|---|---|
| `telemetry_confinement` | Evidenced | Structural: fixture-only, in-session processing, zero-egress guard | 0 (structural) | - |
| `identity_chain` | Evidenced | 6 approved asset identities; unmapped observations quarantined | 18 (one representative event per mapped source) | - |
| `facility_jurisdiction` | Not evidenced | `residency_evidence` (unavailable) | 0 | dataset_location, egress_log, operator_of_record, site_jurisdiction, workload_location |
| `data_residency` | Not evidenced | `residency_evidence` | 0 | dataset_location, egress_log, workload_location |
| `workload_residency` | Not evidenced | `workload_scheduler` | 0 | gpu_inventory, job_queue, workload_location, workload_placement |
| `node_attestation` | Not evidenced | `node_attestation` | 0 | attestation_report, key_location, measured_boot_state |
| `key_custody` | Not evidenced | `node_attestation` | 0 | attestation_report, key_custody_record, key_location, measured_boot_state |

### Carbon (2 evidenced / 6 not evidenced -> Unverified)

| Claim id | Status | Basis or blocker | Event ids | Missing inputs |
|---|---|---|---|---|
| `facility_power_draw` | Evidenced | metered IT + cooling power | 10 | - |
| `efficiency_ratio` | Evidenced | PUE from same-window metered power | 10 | - |
| `energy_consumed` | Not evidenced | `grid_carbon_intensity` | 0 | emission_factor_source, facility_energy_kwh, grid_intensity_g_per_kwh, it_energy_kwh, meter_interval |
| `operational_emissions` | Not evidenced | `grid_carbon_intensity` | 0 | emission_factor_source, grid_intensity_g_per_kwh |
| `carbon_usage_effectiveness` | Not evidenced | `grid_carbon_intensity` | 0 | emission_factor_source, facility_energy_kwh, grid_intensity_g_per_kwh, it_energy_kwh |
| `water_usage_effectiveness` | Not evidenced | `water_metering` | 0 | it_energy_kwh, water_consumption_l |
| `renewable_share` | Not evidenced | `renewable_mix` | 0 | renewable_pct |
| `heat_reuse` | Not evidenced | `heat_reuse` | 0 | heat_recovered_kwh |

### Financials (2 evidenced / 5 not evidenced -> Unverified)

| Claim id | Status | Basis or blocker | Event ids | Missing inputs |
|---|---|---|---|---|
| `load_driver` | Evidenced | metered facility load as pricing quantity | 10 | - |
| `capacity_driver` | Evidenced | metered load against declared site rating | 10 | none missing; `site_rated_kw` disclosed as declared and unattested |
| `energy_cost` | Not evidenced | `energy_tariff` | 0 | demand_charge_per_kw, energy_price_per_kwh, facility_energy_kwh |
| `demand_charge` | Not evidenced | `energy_tariff` | 0 | billing_period_peak_kw, demand_charge_per_kw, energy_price_per_kwh |
| `operating_cost` | Not evidenced | `cost_ledger` | 0 | budget, capex_records, opex_records |
| `sla_exposure` | Not evidenced | `cost_ledger` | 0 | budget, capex_records, opex_records, penalty_schedule, sla_terms |
| `avoided_cost` | Not evidenced | `energy_tariff` | 0 | baseline_counterfactual, demand_charge_per_kw, energy_price_per_kwh |

## 4. Safety statuses

| Status shown | Source | Assessment |
|---|---|---|
| `SIMULATED` | `snapshot.data_mode` from the resolved adapter | Accurate |
| `Uncalibrated` | metric `calibration`, constant for all metrics in this build | Accurate |
| `Fresh` | `freshnessFor(age)`, age 2 s at trace tick | Accurate |
| `Exchange: unavailable`, `Source: disabled` | live DSX adapter disabled | Accurate |
| `Unverified` domain verdict | `domainVerdict()` requires all claims evidenced | Accurate and conservative |
| `Validated` on each metric tile | metric `validation` field | Misleading, see D-03 |

## 5. Defects found

- **D-01 (RESOLVED) - `identity_chain` was evidenced with zero event ids.** It
  cites `mapping_coverage.source_event_ids`, which is always empty because
  `mapping_coverage`, `data_quality` and `telemetry_freshness` are computed
  from counters rather than from named observations
  (`src/dsx/metrics/definitions.ts:82-105`). The claim reads as observation-backed
  while the drawer shows "structural claim". Fix: populate the counter metrics
  with the contributing event ids, or label the claim structural in the table row.
  Fixed: `mapped_sources`, `observed_sources`, `accepted_events`, `rejected_events`
  and `age_seconds` now carry their contributing event ids, and `computeMetric`
  de-duplicates the provenance set. Covered by two regression tests in
  `src/dsx/__tests__/evidenceBoundary.test.ts`.
- **D-02 (RESOLVED) - `site_rated_kw` had no provenance.** `power_capacity_utilisation`
  and the `capacity_driver` claim divide metered load by the fixture constant
  `rated_kw: 2400` (`src/dsx/fixtures/evidenceBetaFacility.ts:49`). The UI shows
  10 supporting events and "no input missing", implying the denominator is
  observed. Fix: declare the rating as a registry-declared input with its own
  provenance entry.
  Fixed: `MetricInputRef` now carries `provenance: 'observed' | 'declared'`,
  `declared_source` and `unattested`. `site_rated_kw` and `design_inlet_limit_c`
  are declared registry values, so metrics that use them expose
  `declared_inputs` / `unattested_inputs` and a limitation, the metric
  provenance drawer lists a "Declared, unattested inputs" section, and the
  `capacity_driver` claim states the declared dependency in its basis and
  carries a "Declared input" badge in the evidence boundary table.
- **D-03 (medium) - `Validated` badge next to `Uncalibrated`.** Tiles read
  "Simulated / Fresh / Validated / Uncalibrated". "Validated" only means the
  value passed range validation, not that it was validated against a physical
  instrument. Fix: rename to "Range-checked" (or similar) in
  `src/components/dsx/StateBadges.tsx:80-95`.
- **D-04 (low) - over-broad missing-input lists.** Blocked claims inherit the
  full capability input list, so `facility_jurisdiction` requests
  `workload_location` and `data_residency` requests `egress_log` even though
  neither is needed for that specific claim (`evidenceBoundary.ts:61-78`).
  Fix: intersect capability inputs with claim-specific inputs.
- **D-05 (low) - confinement claim is scoped to the workspace, not the page.**
  `telemetry_confinement` states telemetry "is not transmitted to any external
  system", while the surrounding app shell does perform authenticated backend
  requests. The basis text explains the scope, but the claim headline does not.
  Fix: phrase it as "Evidence Beta telemetry is not transmitted...".

No claim was found that displays a monetary, emissions, residency or attestation
figure without a source: the three blocking `UnavailableState` panels hold.
