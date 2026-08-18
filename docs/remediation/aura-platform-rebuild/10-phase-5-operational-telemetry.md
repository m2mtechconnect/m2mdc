# Phase 5 - Operational telemetry vertical slice

## Problem

The MQTT runtime already persisted ingested readings into `twin_property_values`
with full provenance, but no twin surface read that table. An operator looking at
a rack in the Blueprint model saw only modelled design inputs, with no way to
tell a measured value from a generated one. The "Operational telemetry" row of
the NVIDIA stack matrix was therefore unmet on the read side.

## What changed

- `src/telemetry/twinTelemetryApi.ts` - typed read path for
  `twin_property_values`, scoped to one facility, ordered by observation time.
  It maps each row, resolves it against the AURA data-mode contract, and keeps
  the provenance citation (record id, source connection, source message,
  correlation id) attached to the reading.
- `src/telemetry/useFacilityTelemetry.ts` - query hook. Disabled unless the
  facility id is a persisted uuid, so synthetic reference facilities never issue
  a query that could only fail.
- `src/telemetry/AssetTelemetrySection.tsx` - "Observed telemetry" section
  rendered per selected asset.
- `src/workspace/panels/InspectorPanel.tsx` - mounts the section beneath the
  asset's modelled attributes.

## Mode resolution rules (fail-closed)

Resolution lives in the API module, not in the UI, so no surface can invent a
stronger claim than the record supports.

| Row provenance  | Resolved mode | Condition |
| --------------- | ------------- | --------- |
| `MEASURED`      | `LIVE`        | `LIVE_MODE_ENABLED` **and** a verified gateway **and** the observation is fresh |
| `MEASURED`      | `UNAVAILABLE` | any of the above missing, including a stale observation |
| `REPLAYED`      | `REPLAYED`    | always |
| `SIMULATED`     | `SIMULATED`   | always |
| `TEST_EVIDENCE` | `UNAVAILABLE` | acceptance-harness output is not an operational reading |
| `UNVERIFIED`    | `UNAVAILABLE` | always |

`LIVE_MODE_ENABLED` is still `false`, so measured rows present as
`UNAVAILABLE` today. A measured reading that cannot be presented as live is
never downgraded into `SIMULATED`; the aggregate mode for a set of readings
takes the weakest claim present.

Asset attribution is exact on entity key or USD prim path, case-insensitive. A
reading is never attributed to a merely similar asset.

## Empty and failure states

- Reference (non-persisted) facility: says only saved facilities can receive
  ingested telemetry.
- Persisted facility, no rows: says nothing has been ingested and that the
  values above are modelled design inputs.
- Read failure: the error is surfaced, not swallowed into an empty success.

## Verification

- Unit tests: `src/telemetry/__tests__/twinTelemetryApi.test.ts` (14 tests)
  covering id gating, row mapping, every provenance class, aggregate weakening,
  attribution, formatting, query scoping and read failure.
- Full suite: 1788 passed, 91 skipped, 0 failed.
- In-browser, signed in, on `/blueprint/:id`: a temporary `REPLAYED` row was
  inserted for one rack, and the inspector rendered
  `inletTemperatureC / 23.4 C / Replayed / Replayed from a recorded capture.`
  with the citation `twin_property_values · <record id>`. The temporary row was
  deleted after the check; the table is back to 0 rows.

## Still open

- No live gateway is verified, so the `LIVE` branch is exercised by tests only.
- Telemetry is read in the inspector only; the 3D viewport and simulation
  surfaces still render modelled values exclusively.
