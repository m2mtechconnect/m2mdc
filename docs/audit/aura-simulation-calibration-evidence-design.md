# AURA Simulation Calibration Evidence Design — SF-6A

## Status and lineage

This is a **post-remediation evidence-design phase**.

- The original NVIDIA DSX asset audit was already completed.
- PR #16 contains the asset/OpenUSD remediation produced by that audit.
- PR #18 qualified AURA's simulation truth boundary and passed exact-head CI on `900410cd8d551c9cf3e55cb73c268d61cbede27a`.
- SF-6A defines what external evidence must exist before any simulation is promoted from engineering estimate/deterministic calculation to benchmarked, calibrated, externally validated, or NVIDIA-DSX-reference calibrated.

This document does not assert that such evidence already exists.

## Principle

**Correct USD/DSX asset semantics and calibrated simulation fidelity are separate gates.**

A simulation may be benchmarked or calibrated against a real facility without being an NVIDIA DSX-reference model. Conversely, a structurally correct DSX/OpenUSD scene is not proof of calibrated thermal, airflow, hydraulic, electrical, network, or workload behavior.

## Evidence ladder

### 1. Not calibrated

Current default unless a validated calibration evidence package exists.

Examples:
- bundled demo fixtures;
- deterministic scenario deltas;
- calculations using defaults/assumptions;
- solver output without a traceable reference dataset and acceptance criteria.

### 2. Benchmarked

Minimum evidence:
- complete facility/twin baseline for the run;
- no material fallback/default inputs;
- traceable reference dataset with confirmed data-use rights;
- at least one declared observable;
- quantitative acceptance criterion for every declared observable;
- documented rationale for every threshold;
- immutable model/input/config/output hashes;
- reproducible command and toolchain/runtime versions;
- every declared acceptance criterion passes.

A benchmark does not imply the model was calibrated to the dataset.

### 3. Calibrated

All benchmark requirements plus:
- explicit calibration dataset;
- distinct holdout/validation dataset with a different immutable digest;
- calibration performed without using the holdout to tune the model;
- frozen model/configuration evaluated against the holdout;
- verification stronger than `unverified`;
- all declared criteria pass on the validation dataset.

### 4. Externally validated

All calibrated requirements plus:
- `verificationLevel=externally-validated`;
- independent-validation dataset;
- independent verifier identity;
- immutable independent review/report artifact;
- all declared acceptance criteria pass under the independent validation campaign.

## Claim scopes

### `generic-facility`

The evidence validates an AURA model against a real/traceable facility or accepted benchmark. It does **not** imply NVIDIA DSX-reference asset fidelity, SimReady status, or NVIDIA runtime execution.

### `nvidia-dsx-reference`

All generic calibration requirements apply, plus the evidence package must bind the result to an immutable DSX/OpenUSD state:

- declared DSX gate: `rack`, `facility`, or `full-reference`;
- complete exact-role coverage for that gate;
- USD stage SHA-256;
- asset manifest SHA-256;
- semantic binding SHA-256;
- source-map SHA-256.

The current DSX exact-role breadth is 4 rack / 18 facility / 23 full-reference. Missing licensed/source-backed geometry remains source-gated; generic assets may not be relabelled to satisfy exact NVIDIA/OEM roles.

## Domain qualification matrix

Tolerance values are **not hard-coded globally**. They must be declared before validation and justified for the specific model, observable, data quality, operating regime, and intended engineering decision.

| Domain | Typical observables supported by the contract | Preferred reference evidence | Notes |
|---|---|---|---|
| Thermal / airflow | rack inlet/outlet temperature, airflow rate | calibrated facility sensors, controlled test campaign, trusted solver cross-check | Must bind sensor locations/operating state to modeled geometry before interpreting spatial error. |
| Liquid cooling | coolant supply/return temperature, flow, pressure delta, heat removal | CDU/loop telemetry, flow/pressure instrumentation, controlled thermal load | Pump/CDU topology, fluid properties, setpoints, and load state are material inputs. |
| Electrical / power | IT power, facility power, UPS runtime, transfer time | metered power, UPS/generator logs, controlled transfer tests | Power topology and protection/transfer configuration must match the modeled case. |
| GPU / workload | GPU utilization, GPU power, workload throughput | workload telemetry from a controlled run with pinned software/hardware versions | Workload, model, batch/configuration, accelerator generation and power policy are material inputs. |
| Network fabric | latency, throughput, packet loss | fabric counters and controlled traffic tests | Topology, link speed, congestion state and traffic profile must be captured. |
| Facility energy | IT power, facility power, PUE | synchronized facility/IT meter data | PUE requires consistent boundary definitions and time alignment; a static target is not measured PUE. |

## Dataset requirements

Every dataset record includes:
- unique id;
- source name/type;
- calibration/validation/independent-validation split;
- immutable artifact URI/path and SHA-256;
- observable list;
- confirmed data-use rights;
- source timestamp where applicable.

For calibrated promotion, calibration and validation datasets must be independently hashed. Reusing the same dataset under two names is rejected.

## Acceptance criteria

Each claimed observable must have at least one quantitative criterion using one of:
- MAE;
- RMSE;
- MAPE;
- bias;
- maximum absolute error;
- R².

The package records:
- statistic;
- comparison operator;
- threshold;
- observed result;
- unit where applicable;
- rationale/source for the threshold.

A package is rejected if any declared criterion fails. CI never averages failed criteria into a green overall score.

## Reproducibility evidence

Required fields:
- exact model version;
- engine module;
- reproduction command;
- immutable input/configuration/output hashes;
- seed or explicit `null` for deterministic models;
- runtime environment;
- toolchain/runtime versions;
- hardware profile when material.

These records are evidence of reproducibility, not proof of physical correctness; physical correctness still depends on the reference campaign and acceptance results.

## NVIDIA runtime evidence

An NVIDIA-runtime claim remains separate from asset semantics and calibration. A package may carry runtime evidence only when an external runtime actually executed.

Required runtime evidence includes:
- execution class `nvidia-solver`;
- `nvidiaIntegrated=true`;
- provider id;
- runtime/service version;
- external job/session id;
- immutable runtime log/result artifact(s).

A stub provider, browser renderer, imported NVIDIA-derived geometry, or an OpenUSD file cannot satisfy this gate.

## CI behavior

Verifier: `scripts/verify-simulation-calibration-evidence.ts`

- No JSON packages under `calibration/evidence/`: PASS, with an explicit message that no calibration promotion is implied.
- Malformed JSON: FAIL.
- Duplicate package id: FAIL.
- Incomplete evidence: FAIL.
- Failed tolerance: FAIL.
- Calibrated target without distinct calibration and validation datasets: FAIL.
- Externally validated target without independent data/review: FAIL.
- DSX-reference scope without complete exact-role/OpenUSD context: FAIL.

## Evidence package location

- Active packages: `calibration/evidence/*.json`
- Non-evidence template: `calibration/templates/aura-calibration-evidence-v1.example.json`
- Contract implementation: `src/simulation/calibrationEvidence.ts`
- Claims boundary: `src/simulation/fidelity.ts`

The template is intentionally not a valid evidence package until placeholders are replaced with actual evidence.

## Current truthful state

At the time SF-6A is introduced:

- no calibration JSON package is committed;
- no calibrated physical simulation claim is promoted;
- no NVIDIA DSX-reference calibration claim is promoted;
- no NVIDIA solver/runtime execution is claimed;
- PR #16 asset/OpenUSD remediation remains the prerequisite DSX asset baseline;
- PR #18 simulation-fidelity controls remain the prerequisite claim-boundary baseline.

## Next evidence campaigns

Recommended acquisition order:

1. **Facility-energy benchmark** — synchronized IT/facility power and PUE boundary validation.
2. **Thermal/airflow benchmark** — mapped rack inlet/outlet temperatures and airflow under controlled load states.
3. **Liquid-cooling benchmark** — supply/return temperature, flow, pressure delta and heat-removal validation.
4. **Electrical resilience benchmark** — UPS/runtime/transfer behavior and power-path response.
5. **GPU workload benchmark** — pinned workload, accelerator, software and power-policy telemetry.
6. **Network fabric benchmark** — controlled latency/throughput/loss under known topology and traffic profiles.
7. **DSX-reference promotion** — only after the applicable exact-role/OpenUSD gate is complete and the calibration package is bound to its immutable hashes.
8. **External validation** — independent holdout campaign and review artifact.
9. **NVIDIA runtime qualification** — only when an actual NVIDIA solver/service integration exists and produces durable execution evidence.
