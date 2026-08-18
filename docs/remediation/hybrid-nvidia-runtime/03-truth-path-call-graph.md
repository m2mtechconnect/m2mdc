# Phase 3.0 - Truth path call graph

Chain under construction:

```text
source/telemetry -> normalized reading -> simulation input snapshot
  -> simulation_runs.id -> KPI/provenance -> evidence -> export -> human decision
```

`simulation_runs.id` is the only canonical persisted run identity. An in-memory
object, browser snapshot, fixture, local calculation or Zustand state is not a
persisted authoritative run.

| Surface | Data source | Persisted | Run ID used | Tenant boundary | Execution class | Verification | Freshness source | Fixture dependency | Migration target |
|---|---|---|---|---|---|---|---|---|---|
| `src/workspace/workspaceStore.ts` | `simulation_runs` via `runPersistence` | yes | `simulation_runs.id` | RLS by owner/tenant | client | client-generated-unverified | row timestamps | no | canonical cache (`src/truth/canonicalRunStore.ts`) |
| `src/workspace/runRecords.ts` | `simulation_runs` | yes | `simulation_runs.id` | RLS | from row | from row | `created_at` | no | keep, read through canonical mapper |
| `src/workspace/runPersistence.ts` | direct client insert | yes | `simulation_runs.id` | RLS + write-boundary trigger | client | preview / client-generated | server timestamp | no | writes routed through `run-lifecycle` edge function |
| `src/stores/simulationSnapshotStore.ts` | Zustand + localStorage | no | local snapshot id | none | client | unverified | `capturedAt` | no | compatibility selector only |
| `src/capabilities/runProvenance.ts` | canonical store, snapshot fallback | mixed | canonical id preferred | RLS | client | canonical or "Unpersisted preview" | run timestamps | no | resolves from canonical persisted run |
| `src/dsx/runtime/useEvidenceBeta.ts` | `src/dsx/fixtures/*` | no | fixture timeline id | none | fixture | demonstration | simulated clock | yes | labelled demonstration, excluded from production evidence |
| `src/pages/dsx/workspaces/index.tsx` | Evidence Beta fixture + canonical panel | mixed | canonical panel uses `simulation_runs.id` | RLS for canonical panel | mixed | explicit per section | per section | yes (labelled) | production evidence via `CanonicalEvidencePanel` |
| `src/dsx/runtime/decisionPersistence.ts` | `decision_records` | yes | canonical run | RLS, append-only | n/a | server-derived | `decided_at` | no | server append via `record-decision` |
| `src/telemetry/twinTelemetryApi.ts` | `twin_telemetry` / `twin_property_values` | yes | n/a | RLS by twin | n/a | measured or unavailable | `observed_at` | no | normalized reading contract |
| `src/telemetry/useFacilityTelemetry.ts` | above, gated by record id | yes | n/a | RLS | n/a | measured | query freshness | no | unchanged |
| `src/telemetry/AssetTelemetrySection.tsx` | normalized reading | yes | n/a | RLS | n/a | measured / Unavailable | reading timestamp | no | unchanged |
| `src/workspace/panels/InspectorPanel.tsx` | workspace store | mixed | canonical when persisted | RLS | client | labelled | run timestamps | no | canonical cache |
| `src/workspace/panels/RunExportControls.tsx` | in-memory workspace run | no | workspace run | n/a | client | preview | run object | no | canonical evidence export |
| `services/mqtt-ingest-worker/` | MQTT broker | yes (ingest rows) | n/a | service role, tenant scoped | ingest | TEST_EVIDENCE | broker timestamp | no | unchanged, LIVE_MODE_ENABLED stays false |

## Divergence risks identified

1. Evidence Beta fixture values and canonical run evidence could both be read as
   "the evidence" on the same page. Resolved by rendering the canonical panel
   first and labelling the fixture sections as a demonstration.
2. `simulationSnapshotStore` could supply a run id that no persisted record
   backs. Resolved by labelling it `Unpersisted preview` and preferring the
   canonical store in `runProvenance`.
3. Decisions authored in the browser against fixture recommendations could be
   appended to `decision_records`. Resolved: the fixture decision log is now
   in-memory only; durable decisions require a canonical run and the
   `record-decision` server boundary.
