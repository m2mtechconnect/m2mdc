# AURA Simulation Fidelity Qualification — Post-Remediation Ledger

## Scope and status

This is **not a repeat of the NVIDIA DSX asset audit**. The original DSX asset audit was already completed and PR #16 contains the remediation produced from it. The DSX remediation establishes semantic asset truth, exact-role fail-closed gates, provenance and source-gating. It does **not** by itself prove physical-model fidelity.

This ledger qualifies the separate simulation axis: what executes, where inputs originate, how outputs are produced, and which claims those outputs are allowed to support.

Working branch: `dsx/aura-simulation-fidelity-qualification`
Stacked base: `dsx/aura-blueprint-asset-remediation` @ `0b21122795d81c062df025d1cb489c9e543589f7`

## Phase SF-0 — remediation evidence synchronization

Status: **implemented**

- PR #16 explicitly records that the original audit is complete and the PR is the remediation baseline.
- PR #16 requirement breadth is corrected to **4 rack / 18 facility / 23 full-reference**.
- Issue #15 now records DSX-A0 through DSX-A6 as implemented controls and separates remaining external evidence gates.

## Phase SF-1 — execution and evidence taxonomy

Status: **implemented**

Existing AURA controls retained:

- canonical execution classes distinguish AURA deterministic/stochastic paths, fixtures, external solvers, NVIDIA solver boundaries, measured-live values and unavailable execution;
- provider outcomes carry explicit provenance and do not silently promote demo/simulated values to live values;
- the NVIDIA/Omniverse provider boundary is intentionally disabled/not implemented in the browser and declares `nvidiaIntegrated: false`;
- canonical orchestrator provenance records provider, execution class, verification level, input/configuration hashes, reproducibility hash and failure state.

New qualification contract: `src/simulation/fidelity.ts`.

Evidence classes:

- `demonstration`
- `deterministic-calculation`
- `engineering-estimate`
- `measured`
- `external-solver`

Calibration states:

- `not-calibrated`
- `benchmarked`
- `calibrated`
- `externally-validated`

Claims fail closed. Authoritative intent never upgrades fidelity by itself.

## Phase SF-2 — baseline and execution preflight

Status: **implemented at engine, hook and guard boundaries**

Stable refusal code: `AURA_SIM_BASELINE_REQUIRED`.

- Explicit `?demo=true` may use bundled baseline values and remains non-authoritative.
- Outside demo mode, absence of a loaded twin/facility baseline resolves to an empty baseline rather than silently creating a complete facility from defaults.
- `useSimulation.startScenario()` refuses to start when the active engine baseline is empty.
- `SimulationEngine.startScenario()` now independently fails closed and returns `false` when no baseline KPIs are configured, so direct callers cannot bypass the hook-level guard.
- Partial twin baselines may retain compatibility fallbacks, but the fidelity contract classifies default-backed output as an `engineering-estimate`, not calibrated evidence.
- Recommendation preview state does not authorize recommendation-store values to leak into the simulation baseline.

## Phase SF-3 — truth in operator UI

Status: **implemented for Simulation Preview**

`src/pages/SimulationPreview.tsx` now states that bundled preview scenarios are demonstration models. It explicitly does not claim:

- measured live telemetry;
- calibrated thermal/electrical/airflow physics;
- an NVIDIA DSX/Omniverse solver execution;
- run-of-record status.

Illustrative KPI values are labelled as preview targets/benchmarks rather than measured predictions.

## Phase SF-4 — automated qualification gate

Status: **implemented**

Workflow: `.github/workflows/aura-simulation-fidelity.yml`

The gate performs:

1. dependency installation from the lockfile;
2. TypeScript typecheck;
3. fidelity contract tests;
4. direct `SimulationEngine` fail-closed baseline-preflight tests;
5. engine-consolidation tests;
6. provider contract/selection/scenario-library/panel-facade tests;
7. production-mode application build.

The tests lock these invariants:

- demo fixtures never become runs of record;
- authoritative intent cannot promote default-backed output;
- calibration claims require explicit calibration evidence, a facility baseline and verification;
- NVIDIA-runtime claims require an actually integrated `nvidia-solver` execution path;
- measured claims require `measured-live` execution with `live` provenance;
- direct engine callers cannot start a valid scenario with an empty baseline.

## Phase SF-5 — exact-head CI qualification

Status: **must be satisfied on the final branch SHA**

A prior exact-head cycle passed typecheck, focused tests, production build and Production Perimeter before the engine-level preflight residual was closed. That evidence became historical when the branch moved. The final SHA must receive its own fresh successful qualification cycle; no prior green run is promoted across a head change.

## Phase SF-6 — external calibration / solver qualification

Status: **external-evidence gated; not claimed complete**

The current branch does not manufacture evidence for:

- NVIDIA DSX/Omniverse runtime execution;
- SimReady qualification;
- calibrated CFD/thermal behavior;
- calibrated hydraulic/cooling-loop behavior;
- calibrated electrical/UPS/generator behavior;
- calibrated network/workload behavior;
- vendor/OEM geometry fidelity beyond the separate DSX asset evidence gates.

Promotion requires a traceable external solver/runtime or measured validation campaign, versioned input data, reproducible result artifacts, acceptance tolerances, and independent verification appropriate to the claim.

## Current truthful classification

| Dimension | Current status |
|---|---|
| DSX asset semantic remediation | Implemented in PR #16 |
| Exact-role DSX asset coverage | Source-gated where evidence is absent |
| AURA deterministic scenario execution | Implemented |
| Bundled preview scenarios | Demonstration only |
| Default-backed facility calculations | Engineering estimate |
| Measured-live simulation output | Not evidenced by current AURA simulation providers |
| NVIDIA solver execution | Not implemented/evidenced in current browser build |
| Calibrated physical simulation | Not evidenced |
| SimReady validation | External gate |

## Release rule

No UI, export, API envelope, sales copy or readiness panel may upgrade a run beyond the maximum claims returned by the fidelity contract. In particular, a correct DSX/OpenUSD scene is **necessary asset evidence**, not proof of calibrated simulation physics.
