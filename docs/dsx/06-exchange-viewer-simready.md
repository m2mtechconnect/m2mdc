# AURA DC — DSX Exchange, OpenUSD Viewer and SimReady Boundaries

Status: **implemented and unit-verified locally. Live DSX connectivity remains disabled.**

## 1. Scope executed this phase

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Evidence Beta baseline freeze | PASS — 39 pre-existing tests green, manifest verification green |
| 2 | Safety-gate correction | PASS — gate contract is 7 names; `DSX_DISPOSABLE_JWT_SECRET` removed (see `docs/remediation/dsx-jwt-secret-audit.md`) |
| 3–6 | Hosted disposable verification, tenant isolation, ingestion proof, cleanup | **BLOCKED** — `node scripts/dsx-resume-gate.mjs` exits 1; no disposable credentials configured. No hosted mutation attempted. |
| 7 | DSX Exchange adapter boundary | Implemented + unit-verified. Broker runtime run **BLOCKED** (no container runtime, mosquitto or nats-server in the build sandbox). |
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

### Runtime blocker

`scripts/dsx-exchange-local-harness.mjs` probes a local broker and exits
non-zero when none is listening. In this sandbox no container runtime,
mosquitto or nats-server is available, so an end-to-end broker run has not
been executed. The adapter is verified against an in-memory transport that
reproduces connect/disconnect/redelivery behaviour.

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
2. **Broker runtime (Phase 7 end-to-end).** Requires mosquitto or
   nats-server, or a container runtime, on the verification host.