# DSX-05 — Operational scenarios and human review

| scenario | trigger | required_data | nvidia_component_used | twin_dependency | operator_workflow | recommendation | evidence_presented | human_approval | audit_trail | override_path | failure_handling | measurable_outcome | named_reviewer | completed_review_evidence | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thermal anomaly | fixture inlet temperature crosses design limit | `rack_inlet_temp_c`, `design_inlet_c` | none | prim-path mapping only | Evidence Beta thermal workspace -> provenance drawer -> decision form | yes, severity-graded | source event ids, formula, run id | yes, `HumanDecision` required | in-app decision log | reject/override recorded | headroom `null` -> no output | none measured | role only, no named reviewer | none | executable_demo |
| Cooling optimization | same scenario engine | cooling power, inlet temps | none | none | advisory card | advisory only, `PHYSICAL_CONTROL_ENABLED = false` | yes | yes | yes | yes | advisory suppressed when inputs missing | none | none | none | executable_demo |
| Power utilization | KPI threshold | `it_power_total`, `cooling_power_total`, `site_rated_kw` | none | none | power workspace | none | yes | n/a | n/a | n/a | `UNAVAILABLE` on missing input | none | n/a | none | metric_only |
| Capacity planning | operator navigation | rated capacity fixtures | none | none | facility workspace | none | partial | n/a | n/a | n/a | n/a | none | n/a | none | metric_only |
| Equipment failure | scripted registry scenario (`ups_failure_runtime_drop`, `refrigerant_leak_crac`, `fire_suppression_discharge`, `hydrogen_detection_battery_room`, `water_leak_corridor_sensor`) | scripted parameters | none | none | dashboard playback | scripted narrative | no source events | no | no | no | n/a | none | none | none | scripted_demo |
| Predictive maintenance | none | none | none | none | none | none | none | none | none | none | none | none | none | none | claimed_not_implemented |
| Rack placement | none | none | none | none | none | none | none | none | none | none | none | none | none | none | claimed_not_implemented |
| Airflow management | none — `airflow_field` capability is declared `unavailable` in `src/dsx/workspaces/availability.ts` ("No CFD, surrogate airflow model or differential-pressure instrumentation is connected") | `airflow_m3_s`, `differential_pressure_pa` | none | none | honest Unavailable state | none | n/a | n/a | n/a | n/a | fails closed | none | n/a | none | correctly_unavailable |
| Incident investigation | operator navigation across 11 workspaces with persisted URL context | accepted + quarantined events | none | none | continuous investigation surface, shared provenance drawer | n/a | yes, incl. rejection taxonomy and payload hashes | n/a | quarantine records | n/a | quarantined records never reach a KPI | none | n/a | none | executable_demo |
| Energy-efficiency recommendation | PUE/CUE thresholds | power + grid intensity | none | none | carbon/financial workspaces | formula-derived | yes | n/a | n/a | n/a | `UNAVAILABLE` on missing grid intensity | none | n/a | none | metric_only |

## Determination

Human review is genuinely modelled: `src/dsx/contracts/recommendation.ts` sets
`PHYSICAL_CONTROL_ENABLED = false`, and no recommendation can be actioned
without a recorded `HumanDecision` carrying outcome, rationale and approver.
That is an implemented control, not a claim. What does not exist is any review
that has actually been completed against real facility data by a named
reviewer, and any measured operational outcome.

Gate arithmetic: 14 required checks; 6 met. 8 unmet.

**DSX-05 status:** PARTIALLY_IMPLEMENTED
**Scenarios inventoried:** 10 categories (3 executable with evidence, 5 scripted demo, 1 correctly unavailable, 2 not implemented)
**Executable scenarios:** 3 (thermal anomaly, cooling optimization advisory, incident investigation)
**Human-reviewed scenarios:** 0 completed reviews on record; the review workflow itself is implemented and tested
**Operationally validated scenarios:** 0
**Auditability:** strong in-app decision and quarantine logging; no external, tamper-evident audit store
**Verdict:** demo_ready
