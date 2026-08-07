# DSX-04 — Calibrated simulation

## Inventory

| scenario | engine | model | input_data | physical_assumptions | boundary_conditions | calibration_dataset | calibration_method | ground_truth | validation_period | error_metric | baseline | measured_accuracy | uncertainty | failure_conditions | human_review | output_consumer | true_class |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `cooling_degradation` (`src/dsx/scenario/degradationEngine.ts`) | AURA TS engine | `aura-dsx-thermal/0.1.0-uncalibrated` | KPI bundle from fixture | linear headroom vs. design inlet limit | `DESIGN_INLET_LIMIT_C` constant | none | none | none | none | none | none | none reported | reported as `null`, never invented | headroom `null` -> no recommendation | mandatory `HumanDecision` record | Evidence Beta workspaces | threshold rule on a computed KPI |
| 12 KPIs (`src/dsx/metrics/definitions.ts`) | formula evaluator | none | accepted events | ratio definitions (PUE, WUE, CUE, headroom, coverage, quality) | required inputs declared per metric | none | none | none | none | none | none | n/a | missing input -> `UNAVAILABLE` | missing input | n/a | metric tiles | formula-based dashboard calculation |
| 17 scenario-registry entries (`src/simulation/scenarioRegistry.ts`: `gpu_spike_training_job`, `cooling_failure_hot_aisle`, `ups_failure_runtime_drop`, `grid_outage_ups_generator_failover`, `water_leak_corridor_sensor`, `fire_suppression_discharge`, `sovereignty_routing_violation`, `carbon_price_shock`, `network_congestion_core_switch`, `refrigerant_leak_crac`, `hydrogen_detection_battery_room`, `server_thermal_runaway`, `sovereignty_policy_tightening`, `sovereignty_region_migration`, `carbon_workload_migration_clean_region`, `cooling_efficiency_drop_pue_spike`, `gpu_spike_financial_impact`) | in-browser `SimulationEngine` | none | scripted parameters | authored curves | authored | none | none | none | none | none | none | n/a | not reported | n/a | none required | dashboard panels | scripted demo scenarios |
| Omniverse provider | none | none | none | none | none | none | none | none | none | none | none | n/a | n/a | returns `disabled` / `not-implemented` with `provenance: 'unavailable'` | n/a | facade | not implemented |
| Carbon / financial engines (`src/engines/*`) | formula | none | blueprint + fixture inputs | published emission-factor arithmetic | n/a | none | none | none | none | none | none | n/a | n/a | n/a | none | dashboards | formula-based calculation |

## Determination

No physics solver runs anywhere in the stack. There is no CFD, no surrogate
model, no PhysicsNeMo/Modulus runtime, and no GPU compute path. Every
"simulation" is either a deterministic scripted timeline, a ratio formula, or a
threshold rule. The codebase states this honestly: `UNCALIBRATED_NOTICE =
'SIMULATED · UNCALIBRATED · NOT FOR PHYSICAL CONTROL'` and confidence is
reported as `null` rather than estimated.

Gate arithmetic: 17 required checks; 2 met (uncertainty is honestly withheld;
failure conditions are defined). 15 unmet.

**DSX-04 status:** UNVALIDATED
**Simulation scenarios found:** 19 (1 evidence-linked scenario engine + 17 scripted registry scenarios + 1 disabled Omniverse provider path); 12 KPI formulas
**Calibrated scenarios:** 0
**Ground-truth datasets:** 0
**Accuracy measurements:** 0 — none may be estimated
**Unvalidated scenarios:** 19 of 19
**Verdict:** not_implemented as calibrated simulation; demo_ready as labelled deterministic scenario playback
