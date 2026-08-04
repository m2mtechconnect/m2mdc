# AURA DC — DSX Evidence Beta: current-state baseline

Date: 2026-08-04. Scope: local implementation only. No production access, no
live DSX connectivity, no hosted migrations.

## What exists after this slice

| Layer | Location | State |
| --- | --- | --- |
| Data modes | `src/dsx/modes.ts` | Four modes; `LIVE` disabled; no silent fallback |
| Event contract | `supabase/functions/_shared/dsx-contract.ts` (re-exported by `src/dsx/contract.ts`) | Versioned, fail-closed |
| Asset mapping | `src/dsx/contracts/assetMapping.ts` | OpenUSD prim paths, approval-gated lookup |
| Metric contract | `src/dsx/contracts/provenancedMetric.ts` | Value only when every required input is present |
| Run contract | `src/dsx/contracts/simulationRun.ts` | Every simulated/replayed value references a run id |
| Recommendation contract | `src/dsx/contracts/recommendation.ts` | `PHYSICAL_CONTROL_ENABLED = false` |
| Deterministic dataset | `src/dsx/fixtures/` | Seeded 8-rack facility, two timelines, adversarial records |
| Ingestion boundary | `src/dsx/adapters/ingestPipeline.ts` | Schema, unit, duplicate, staleness and mapping quarantine |
| Adapters | `src/dsx/adapters/` | Simulated, replay, live-disabled behind one interface |
| KPI engine | `src/dsx/metrics/` | 12 calculated KPIs, no hardcoded values |
| Scenario engine | `src/dsx/scenario/degradationEngine.ts` | Cooling degradation, advisory-only output |
| Capability registry | `src/dsx/workspaces/availability.ts` | Operational / unavailable / planned, each with a reason |
| Facility graph | `src/dsx/workspaces/facilityGraph.ts` | Stable asset identity, hierarchy, electrical and cooling traces |
| Constraint stack | `src/dsx/workspaces/constraints.ts` | Nine domains; a domain with no source reports "cannot be assessed" |
| Workspace shell | `src/pages/dsx/EvidenceBetaShell.tsx` (`/dsx/evidence-beta`) | Eleven workspaces, persistent operational truth bar, shared provenance drawer |
| Workspaces | `src/pages/dsx/workspaces/index.tsx` | Overview, thermal, power, cooling, fabric, facility, workload, sovereignty, carbon, financial, evidence |
| Tests | `src/dsx/__tests__/` | 69 passing determinism/truthfulness/safety tests |

## Preserved, unchanged behaviour

No existing AURA route, table, edge function or user record was modified. The
Evidence Beta is additive and reachable only by authenticated internal users.

## Standing constraints

- Production project `psfvrskpnwcshvajzeix` is untouched.
- No live DSX gateway is contacted; the live adapter fails closed.
- No closed-loop control of cooling, power or workloads exists.
- All values are simulated or replayed, uncalibrated, and labelled as such.
- No NVIDIA certification, validation or production readiness is claimed.

## Known gaps

- WUE and CUE have no instrumentation in the fixture and correctly render
  Unavailable.
- Thermal and power models are uncalibrated; confidence is reported as `null`
  rather than an invented number.
- Replay has no shipped dataset; requesting `REPLAYED` without a dataset and
  run id resolves to `UNAVAILABLE`.
- Hosted DSX ingestion closure remains blocked on the disposable-environment
  gate (`scripts/dsx-resume-gate.mjs`).