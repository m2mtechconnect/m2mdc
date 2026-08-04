# AURA ↔ DSX component and traceability map

Every operational number rendered at `/dsx/evidence-beta` traces from a source
record to a displayed value through the chain below. There is no path that
reaches the UI without passing the ingestion boundary.

```text
fixture record (src/dsx/fixtures/timelines.ts)
  -> parseDsxEvent            schema + version gate
  -> unit check               DSX unit enum
  -> duplicate check          event_id uniqueness
  -> freshness check          received_at - observed_at <= 10 min
  -> lookupMapping            approved, effective asset mapping
  -> AcceptedEvent            envelope + mapping + payload hash
  -> computeKpiBundle         named inputs only
  -> computeMetric            missing input => UNAVAILABLE
  -> DsxMetricTile            value + mode + freshness + formula + evidence
```

## Traceability fields

| Question | Field |
| --- | --- |
| Where did this number come from? | `source_event_ids`, `inputs[].event_ids` |
| Which physical asset? | `aura_asset_id`, `usd_prim_path` on the mapping |
| How was it computed? | `formula`, `formula_version` |
| Is it real? | `data_mode`, `calibration`, `limitations` |
| How old is it? | `last_observed_at`, `freshness`, `observation_window` |
| Which run produced it? | `simulation_run_id` / `replay_run_id` |
| Why is it missing? | `missing_inputs`, quarantine `reason` + `payload_hash` |

## Rejection taxonomy

`schema_invalid`, `unsupported_version`, `not_an_object`,
`missing_schema_version`, `unit_invalid`, `duplicate`, `stale`,
`unknown_mapping`, `mapping_not_approved`, `missing_value`.

Each rejection is displayed in the audit workspace with its reason, source
asset, observation time and payload hash. Rejected records never contribute to
a KPI.

## Decision path

`evaluateScenario` emits `Recommendation` records carrying evidence event ids,
metric names and the run id. A recommendation cannot be actioned inside AURA:
the UI records a `HumanDecision` with outcome, rationale and approver, and the
execution status stays manual.