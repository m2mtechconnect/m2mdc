# AURA DC — DSX Exchange, OpenUSD Viewer and SimReady Boundaries

Status: **implemented and unit-verified locally. Live DSX connectivity remains disabled.**

## 1. Scope executed this phase

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Evidence Beta baseline freeze | PASS — 39 pre-existing tests green, manifest verification green |
| 2 | Safety-gate correction | PASS — gate contract is 7 names; `DSX_DISPOSABLE_JWT_SECRET` removed (see `docs/remediation/dsx-jwt-secret-audit.md`) |
| 3–6 | Hosted disposable verification, tenant isolation, ingestion proof, cleanup | **BLOCKED** — `node scripts/dsx-resume-gate.mjs` exits 1; no disposable credentials configured. No hosted mutation attempted. |
| 7 | DSX Exchange adapter boundary | Implemented, unit-verified, and **runtime-verified against a real local mosquitto broker** (17/17 assertions) |
| 8 | OpenUSD viewer synchronization boundary | Implemented + unit-verified |
| 9 | SimReady asset-onboarding boundary | Implemented + unit-verified |
| 10 | Evidence package | This document + test run below |

## 2. Phase 7 — DSX Exchange adapter

`src/dsx/exchange/transport.ts`, `src/dsx/exchange/dsxExchangeAdapter.ts`.

Design decisions:

- **Broker-agnostic transport interface.** MQTT and NATS both reduce to
  subject + payload. No broker client is imported by the adapter, so it
  cannot open an unintended socket and is fully testable offline.
- **No private validation path.** Every decoded message is pushed through
  the shared `ingestRecords` pipeline, so schema, unit, duplicate,
  staleness, mapping-approval and quarantine semantics are identical to
  the simulated and replay adapters.
- **Endpoint safety gate.** `assessEndpoint` refuses anything that is not
  localhost unless an explicit disposable host is declared, and hard-blocks
  the production project reference and `*.supabase.co` / `*.nvidia.com`
  hosts. A refused endpoint never calls `connect()`.
- **Connection health is separate from data freshness.** `health()` reports
  transport state, connect count, message counts and duplicate suppression.
  Freshness is derived only from observation age. A connected broker with
  no data reports `UNAVAILABLE` + `freshness: unknown` — never "fresh".
- **Reconnect idempotency.** Seen `event_id`s persist across reconnects, so
  broker redelivery increments `duplicate_suppressed` and does not create a
  second accepted observation or a spurious quarantine row.
- **Fail closed.** Refused endpoint, non-connected transport, or zero
  validated observations all resolve to `UNAVAILABLE`. Simulated data is
  never substituted.

### Runtime verification (real broker)

Docker is not available in this sandbox, so the broker is provisioned
directly instead of via a container:

```
mosquitto 2.0.22, config /tmp/dsx-broker/mosquitto.conf
  listener 1883 127.0.0.1
  allow_anonymous true
  persistence false
```

Where Docker **is** available, an equivalent loopback-only broker is defined in
`infra/dsx-exchange/docker-compose.yml` (eclipse-mosquitto 2.0.22, published on
`127.0.0.1:1883` only):

```
docker compose -f infra/dsx-exchange/docker-compose.yml up -d
DSX_EXCHANGE_URL=mqtt://127.0.0.1:1883 npx tsx scripts/dsx-exchange-runtime-verify.ts
docker compose -f infra/dsx-exchange/docker-compose.yml down -v
```

Both provisioning paths are transport-identical; see
`infra/dsx-exchange/README.md`.

One-shot verification (provisions the broker, runs the runtime harness, runs
the 56 DSX unit tests, tears down, prints a single verdict):

```
npm run verify:dsx-phase7      # → PHASE 7 VERIFIED
```

`src/dsx/exchange/mqttTransport.ts` is the only module in the DSX tree that
imports a broker client. It is deliberately NOT re-exported from
`src/dsx/exchange/index.ts`, so the browser bundle never pulls in `mqtt`;
the verification harness imports it by explicit path. The endpoint is
assessed before the client is constructed, so a refused host cannot open a
socket.

```
bun scripts/dsx-exchange-runtime-verify.ts        # 17/17 PASS
  remote endpoint refused before any connection attempt
  production project endpoint refused
  transport reports connected
  connected-but-empty resolves to UNAVAILABLE
  connected-but-empty freshness is unknown
  valid observation accepted through shared pipeline
  mode becomes REPLAYED with run identity
  freshness is fresh for a just-observed value
  malformed broker payload quarantined
  malformed payload did not add an accepted reading
  disconnect reported by health
  disconnected transport fails closed to UNAVAILABLE
  redelivered event_id suppressed after reconnect
  duplicate suppression counted
  reconnect counted in health
  freshness degrades to stale on age alone
  transport still reported connected while data ages

RUNTIME VERIFICATION PASSED
```

`scripts/dsx-exchange-local-harness.mjs` remains the pre-flight probe: it
exits 2 with an UNAVAILABLE message when no local broker is listening,
rather than simulating a connection.

## 3. Phase 8 — OpenUSD viewer synchronization

`src/dsx/viewer/viewerBoundary.ts`.

- Selection is keyed on the stable `aura_asset_id` and resolved to a prim
  **only** through an approved `AssetMapping`. No name matching and no path
  construction.
- Three honest degraded states are modelled and surfaced with a notice:
  `unavailable` (no renderer attached), `unmapped` (no approved mapping),
  `absent_in_stage` (mapping exists but the loaded stage lacks the prim).
- Reverse selection (`assetIdForPrim`) returns `null` rather than guessing.
- No renderer is embedded; the default provider is
  `createUnavailableViewerProvider`, which reports `unavailable` and never
  presents itself as a live 3D view.

## 4. Phase 9 — SimReady onboarding

`src/dsx/simready/onboarding.ts`.

- Per-asset-class required metadata is declared explicitly and tied to what
  the KPI/thermal calculators actually read.
- A missing rating is a **blocker gap**, never a defaulted zero.
- Racks, cooling units and CDUs additionally require SimReady geometry
  before `simulation_eligible` can be true.
- `assessFleet` returns an explicit blocked list, so the gap is reportable
  rather than hidden behind an aggregate percentage.

## 5. Verification evidence

```
bunx vitest run src/dsx
  src/dsx/__tests__/contract-reexport.test.ts        2 tests  PASS
  src/dsx/__tests__/contract.test.ts                23 tests  PASS
  src/dsx/__tests__/evidenceBeta.test.ts            14 tests  PASS
  src/dsx/__tests__/exchangeViewerSimready.test.ts  17 tests  PASS
  Test Files 4 passed (4) | Tests 56 passed (56)
```

New coverage (17 tests): endpoint refusal matrix, no-connect-on-refusal,
shared-pipeline routing, health-vs-freshness separation, reconnect
duplicate suppression, malformed-payload quarantine, viewer unavailable /
resolved / absent-in-stage / unmapped paths, prim→asset reverse lookup, and
SimReady blocker/no-default/fleet-summary behaviour.

## 6. Safety attestations

- Production project `psfvrskpnwcshvajzeix` was **not** contacted or
  mutated in this phase.
- No disposable project was provisioned; the resume gate remains the only
  authorised entry point and it is currently BLOCKED.
- No live DSX or NVIDIA endpoint was contacted. `LIVE_MODE_ENABLED` remains
  `false`.
- The Evidence Beta 7-tab information architecture is unchanged.

## 7. Remaining blockers

1. **Hosted proof (Phases 3–6).** Requires the seven `DSX_DISPOSABLE_*`
   values under the exact gate names. Until then tenant-isolation, grant,
   hosted-ingestion and cleanup proofs cannot be executed.

Phase 7's broker-runtime blocker is CLEARED. The broker is ephemeral
(`/tmp/dsx-broker`, no persistence) and must be restarted before re-running
the verification on a fresh host.