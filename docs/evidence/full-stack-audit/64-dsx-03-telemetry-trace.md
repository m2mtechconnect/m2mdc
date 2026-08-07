# DSX-03 — DSX Exchange and telemetry integration

## Source register

| source_system | physical_or_synthetic | protocol | connector | authentication | ingestion_endpoint | schema | timestamp_source | asset_identifier | unit | sampling | validation | normalization | storage | twin_mapping | latency | replay | error_handling | observability | live_evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Evidence Beta fixture (`EVIDENCE_BETA_SOURCE_SYSTEM`) | synthetic | in-process | `createSimulatedSource` | none | none | `parseDsxEvent` strict | fixture `observed_at` | `source_asset_id` -> `aura_asset_id` | DSX unit enum | 1 record/tick, 24 ticks | schema, unit, duplicate, freshness, mapping | unit enum enforced | in-memory | approved `AssetMapping` -> `usd_prim_path` string | n/a (no transport) | n/a | quarantine with reason + payload hash | UI provenance drawer | none |
| Replay adapter (`src/dsx/adapters/replayAdapter.ts`) | synthetic | in-process | `createReplaySource` | none | none | same | recorded | same | same | dataset-defined | same | same | in-memory | same | n/a | yes, requires `replay_run_id` | resolves `UNAVAILABLE` without a dataset | same | no dataset shipped |
| Live adapter (`src/dsx/adapters/liveDisabledAdapter.ts`) | n/a | n/a | disabled | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | fails closed to `UNAVAILABLE` | n/a | none |
| DSX Exchange adapter (`src/dsx/exchange/dsxExchangeAdapter.ts`) | synthetic payloads over a real broker | MQTT 5 | `mqtt@5.15.2` via `mqttTransport.ts` | anonymous (loopback broker) | `mqtt://127.0.0.1:1883` | `parseDsxEvent` strict | message payload | mapping lookup | DSX unit enum | operator-published | full pipeline | yes | in-memory | same | not measured | yes | `EndpointRefusedError` before any socket opens for non-local hosts | none | broker reachability only |
| `dsx-ingest` Edge Function | none observed | HTTPS POST | Deno handler | RS256 gateway JWT, alg pinned, JWKS by `kid`, 5 min max lifetime, 30 s skew, connection status + `dsx_key_ref` check | `/functions/v1/dsx-ingest` | `parseDsxEvent` via `_shared/dsx-contract.ts` | envelope `observed_at` | envelope asset id | DSX unit enum | caller-driven | full, before persistence | yes | `dsx_ingest_event` RPC | DB mapping table | not measured | n/a | sanitized `unauthorized` / `invalid_request` responses, body read only after auth | request_id only | **none — zero production requests were made; runtime remains BLOCKED_BY_ENVIRONMENT** |

## End-to-end trace

`fixture record -> parseDsxEvent -> unit check -> duplicate check -> freshness check -> lookupMapping -> AcceptedEvent -> computeKpiBundle -> computeMetric -> DsxMetricTile`.

The chain is complete and enforced in code, and 173 unit tests pass across
`src/dsx`, `src/integrations/omniverseKit` and `src/simulation/providers`. The
chain's **origin is a seeded fixture, not an instrument**, and its terminus is a
prim-path string, not a loaded OpenUSD stage.

## Determination

- Telemetry classification: **generated** (seeded deterministic fixture); `recorded_replay` is supported but no dataset ships; `live_unverified` and `live_verified` are both absent. `LIVE_MODE_ENABLED = false` in `src/dsx/modes.ts` and `resolveMode` returns `UNAVAILABLE` for any LIVE request.
- Webhook signature verification in `dsx-ingest` is strong, but per the stage brief it is **not** treated as evidence of an operational pipeline: no DSX gateway has ever authenticated against it.
- Mapping to OpenUSD assets is **unproven**: `usd_prim_path` is a validated string with no stage to resolve against (DSX-02).

**DSX-03 status:** PARTIALLY_IMPLEMENTED
**Telemetry sources found:** 5 (1 simulated, 1 replay, 1 live-disabled, 1 MQTT exchange, 1 HTTPS ingest endpoint)
**Live verified sources:** 0
**Synthetic sources:** 5
**End-to-end mappings proven:** 0 to an OpenUSD stage; 8 fixture assets proven to approved mapping records
**Maximum observed latency:** not measured (no live transport exercised)
**Failure and replay behavior:** fail-closed and evidenced — quarantine taxonomy with payload hashes, `UNAVAILABLE` on missing replay run id, endpoint refusal before socket creation
**Verdict:** demo_ready ingestion boundary; **not_implemented** as a DSX Exchange integration
