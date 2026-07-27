# AURA DSX Read-Only Foundation — Phase 0 Audit + Phase 1 Contract

**Slice:** DSX Read-Only Foundation, sub-slice 1 of N (Phase 0 + Phase 1 only).
**Scope guard:** No migrations, no Edge Functions, no gateway runtime, no UI
changes were introduced in this sub-slice. Only:

- `docs/remediation/evidence/dsx-read-only-foundation/00-audit.md` (this file)
- `src/dsx/contract.ts` (canonical envelope, enums, Zod validators, types)
- `src/dsx/index.ts` (public re-exports)
- `src/dsx/__tests__/contract.test.ts` (Vitest unit tests)

No DSX credentials were requested, committed, or fabricated. The external
connectivity gate is treated as **unavailable** for this repository, per the
authorizing instruction.

---

## 1. Repository capability audit

Read-only inspection of the current AURA repo against the DSX integration
contract. Findings below are grounded in files and DB objects that actually
exist today; nothing is aspirational.

### 1.1 Existing telemetry model

`public.twin_telemetry` (verified via `\d`):

| column         | type        | notes                                     |
|----------------|-------------|-------------------------------------------|
| `id`           | uuid PK     | `gen_random_uuid()`                       |
| `twin_id`      | uuid FK     | → `data_centre_twins(id)`, `ON DELETE CASCADE` |
| `domain`       | text        | free-form (e.g. `power`, `cooling`)       |
| `metric_key`   | text        | free-form metric name                     |
| `metric_value` | numeric     | nullable                                  |
| `metadata`     | jsonb       | default `{}`                              |
| `recorded_at`  | timestamptz | required, `now()` default                 |
| `created_at`   | timestamptz | required, `now()` default                 |

RLS policies:

- `INSERT`: allowed only to `auth.uid()` that owns the parent
  `data_centre_twins` row (`created_by_user`).
- `SELECT`: same ownership predicate.

**Observations:**

- No `tenant_id`, `site_id`, `asset_id`, `source_system`, `source_subject`,
  `schema_version`, `event_id`, `observed_at` vs `received_at` split, `unit`,
  `quality`, `validation_state`, `mapping_state`, `correlation_id`,
  `traceparent`, `raw_evidence_ref`, or `ingestion_version` column exists.
- Ownership is scoped **per user**, not per tenant / org. There is an `org_id`
  on `agents` and `profiles`, but `twin_telemetry` never joins to it.
- Service-role insertion is not distinguished from user insertion.
- No idempotency key, no dedup index, no ordering constraint beyond
  `recorded_at`.
- No quarantine table for rejected payloads.
- No partitioning; retention/rollups are undefined.

**Decision:** `twin_telemetry` is not safe or sufficient to receive DSX
events. Phase 2 (a future, separately authorized sub-slice) will introduce a
dedicated `dsx_events` table plus `dsx_events_quarantine`,
`dsx_asset_mappings`, `dsx_connections`, `dsx_gateway_heartbeats`, and
`dsx_ingestion_audit`, rather than destructively repurposing the existing
twin telemetry table.

### 1.2 Tenant / site / asset identity

- `public.organizations(id, name, domain, industry, default_role, mfa_enabled, sso_enabled)`
  exists and is the closest thing to a tenant.
- `public.profiles(user_id, org_id, …)` links users to an org.
- `public.data_centre_twins(id, name, city, region_code, tier, capacity_kw, blueprint_id, created_by_user, industry, pue_target, …, location_id)`
  is the closest thing to a site.
- `public.agents(id, org_id, twin_id, …)` is the closest thing to a
  logical asset / service.
- There is **no** first-class `asset_id` model with a stable external
  correspondence (e.g. rack, PDU, CDU, GPU node). Assets today are conflated
  with either twins or agents.

**Decision:** the DSX asset mapping table introduced in Phase 2 will carry
`(tenant_id → organizations.id, site_id → data_centre_twins.id, asset_id →
internally minted uuid, dsx_resource_id, openusd_path?)`. No existing table
is rewritten.

### 1.3 Ingestion pathways today

- `supabase/functions/ops-ingest-health/index.ts` accepts a JSON body,
  authenticates by the ambient service-role key, validates `system_id` exists
  in `agents`, and inserts into `system_health` (+ optional `system_events`).
  It does not authenticate the caller as a specific gateway, does not
  version its payload, and has no idempotency key.
- `supabase/functions/_shared/auth.ts` exposes `getAuthContext(req, level)`
  with `"public" | "user" | "admin"` levels. `"admin"` returns a
  service-role client; there is no gateway-identity concept.
- 156 Edge Functions total in `supabase/functions/`. None are DSX-specific
  (`rg -i "dsx|nvidia dsx"` in `supabase/functions/` returns no hits).

**Decision:** the Phase 2 ingestion endpoint will be a new Edge Function
(`dsx-ingest`) with a dedicated gateway-JWT check, envelope validation,
idempotent write, and quarantine on rejection. `ops-ingest-health` is left
untouched.

### 1.4 Gateway package

- `services/` does not exist.
- The repo has no long-lived subscriber process; nothing polls NATS/MQTT.
- No `Dockerfile` outside of build tooling; no runnable service.

**Decision:** a new `services/dsx-gateway/` package will be introduced in
Phase 3. This sub-slice does not add it; only the canonical contract that it
will import.

### 1.5 Provenance and UI truth-in-UI

- `src/components/provenance/{MetricValue,ProvenanceBadge}.tsx` already
  express the six-state provenance model (`live | derived | simulated | demo
  | static | unavailable`) from ADR-0004 and ADR-0006.
- `src/lib/provenance/types.ts` defines `ProvenancedMetric<T>` with
  `sourceName`, `sourceTimestamp`, `isStale`.
- The DSX display states (`LIVE / STALE / INVALID / UNAVAILABLE`) map cleanly
  onto this existing model. No new UI primitive is required; Phase 5 will
  wire one existing metric surface to `dsx_events`.

### 1.6 Secrets and browser boundary

- Prior slice PR-0.1 removed `VITE_LOVABLE_API_KEY` from the bundle and
  neutered browser LLM calls (`docs/remediation/adr/0008-default-deny-production-boundary.md`).
- No DSX-related secret currently exists in the Cloud secret list.
- The Phase 3 gateway will carry its DSX credentials in a container-side env
  file (never committed) and authenticate to AURA using a dedicated
  gateway JWT / service secret held server-side.

### 1.7 DSX interface verification

- No authorized DSX endpoint or credentials are available to this
  repository.
- The canonical envelope defined in Phase 1 therefore does **not** encode
  any assumed DSX subject, schema version, or payload shape. It defines the
  *AURA-side* canonical form. The DSX-side schema will be pinned in Phase 3
  against whichever real endpoint is later authorized (power, cooling, or
  GPU/compute health), inside the gateway's normalization layer.

---

## 2. Gap matrix

Legend: **E** existing / reusable · **P** partial · **M** missing.

| Capability                                | Status | Where today                                                  | Required change (later sub-slice)                                                          |
|-------------------------------------------|--------|--------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| Tenant / site / asset identity            | P      | `organizations`, `data_centre_twins`, `agents`               | Add `dsx_asset_mappings(tenant_id, site_id, asset_id, dsx_resource_id, openusd_path?)`      |
| Canonical envelope + schema versioning    | M      | none                                                         | **Delivered this sub-slice** — `src/dsx/contract.ts`                                        |
| Telemetry ingestion table                 | M      | `twin_telemetry` exists but unsuitable                       | New `dsx_events` + `dsx_events_quarantine` (Phase 2)                                        |
| DSX connectivity (subscriber)             | M      | none                                                         | `services/dsx-gateway/` (Phase 3)                                                           |
| Schema validation at ingestion            | M      | `ops-ingest-health` is unvalidated                           | Zod-validated `dsx-ingest` Edge Function (Phase 2) reusing this sub-slice's `contract.ts`   |
| Gateway auth to AURA                      | M      | `_shared/auth.ts` has no gateway level                       | Add `"gateway"` auth level w/ dedicated shared secret / JWT (Phase 2)                       |
| RLS: service-role insert, tenant read     | P      | `heartbeats` shows the pattern; `twin_telemetry` is per-user | Apply the `heartbeats` pattern to `dsx_events`, scoped by `tenant_id = profiles.org_id`     |
| Provenance (`quality`, `validation_state`)| M      | UI-side model exists, storage does not                       | Enums defined this sub-slice; storage columns Phase 2                                       |
| Deduplication / idempotency               | M      | none                                                         | `event_id` unique + unique `(tenant_id, source_subject, observed_at)` (Phase 2)             |
| Ordering (no older-replaces-newer)        | M      | none                                                         | Current-state view keyed on `MAX(observed_at)` (Phase 2)                                    |
| Retention / rollups                       | M      | none                                                         | Retention policy documented + partition or scheduled prune (Phase 2)                        |
| Asset mapping audit                       | M      | none                                                         | `dsx_asset_mappings_audit` (Phase 4)                                                        |
| Gateway health / heartbeat                | P      | `heartbeats` for agents; nothing for gateways                | `dsx_gateway_heartbeats` (Phase 2)                                                          |
| Provenance / freshness UI                 | E      | `MetricValue` + `ProvenanceBadge`                            | Wire one metric to `dsx_events` (Phase 5), no new component                                 |
| Secret management (browser boundary)      | E      | ADR-0008 already keeps LLM keys server-side                  | Add DSX gateway secret only server-side; never expose to bundle                             |
| Simulation-provider boundary preserved    | E      | `src/simulation/api.ts` facade                               | No change                                                                                   |

---

## 3. Phase 1 canonical contract

Delivered: `src/dsx/contract.ts` + `src/dsx/index.ts`.

### 3.1 Envelope

Every ingested DSX observation is transported and stored as one of:

```
DsxEventEnvelopeV1 = {
  schema_version: 1;         // supported versions: [1]
  event_id: string (uuid);   // gateway-minted, primary dedup key
  tenant_id: string (uuid);  // AURA organizations.id
  site_id:   string (uuid);  // AURA data_centre_twins.id
  asset_id:  string (uuid) | null;
  connection_id: string (uuid);   // AURA dsx_connections.id
  source_system: DsxSourceSystem; // enum
  source_subject: string;         // e.g. "dsx.power.rack.pdu.watts"
  event_type: DsxEventType;       // enum
  observed_at: ISO-8601 UTC;      // source-side timestamp
  received_at: ISO-8601 UTC;      // gateway ingress timestamp
  value: number | string | null;
  unit:  DsxUnit | null;
  quality: DsxQuality;
  correlation_id?: string;
  traceparent?: string;           // W3C traceparent
  raw_evidence_ref?: string;      // DDN object key / URI, never inline blob
  validation_state: DsxValidationState;
  mapping_state: DsxMappingState;
  ingestion_version: string;      // gateway build ID
};
```

### 3.2 Enums

- `DsxQuality`: `validated | degraded | invalid | unavailable`
- `DsxValidationState`: `accepted | schema_invalid | signature_invalid | unit_invalid | timestamp_invalid`
- `DsxMappingState`: `mapped | unmapped | ambiguous`
- `DsxDisplayState`: `LIVE | STALE | INVALID | UNAVAILABLE`
- `DsxSourceSystem`: `dsx_power | dsx_cooling | dsx_compute | dsx_unknown`
- `DsxEventType`: `telemetry | health | alert | state_change`
- `DsxUnit`: `W | kW | A | V | degC | pct | rpm | ppm | gCO2_per_kWh | none`

`DsxDisplayState.LIVE` is legal **only** when all of the following hold, per
the deriveDisplayState() helper:

1. `validation_state === accepted`
2. `mapping_state === mapped`
3. `quality === validated`
4. `value !== null`
5. `observed_at` is within the freshness budget for the source (default:
   `FRESHNESS_BUDGET_MS` in `contract.ts`).
6. A caller-supplied `connectionState` is `connected`.
7. The event is not superseded by a newer `observed_at` (caller's job at
   query time; the helper is state-machine only, not history-aware).

Any deviation → `INVALID` (validation failed / quality invalid) or `STALE`
(freshness expired) or `UNAVAILABLE` (mapping missing, no connection, null
value). Missing data is **never** silently coerced to `0`.

### 3.3 Fail-closed guarantees enforced in code

- Unsupported `schema_version` → `parseDsxEvent` returns
  `{ ok: false, reason: 'unsupported_version' }`. No implicit upgrade.
- Non-ISO or future-drift timestamp → `timestamp_invalid`.
- Unknown `unit` → `unit_invalid`.
- `mapping_state === 'unmapped' | 'ambiguous'` cannot yield `LIVE`.
- `validation_state !== 'accepted'` cannot yield `LIVE`.
- Zod's `.strict()` is used on the envelope so unexpected fields are
  rejected instead of silently retained.

---

## 4. Commands, exit codes, durations

Recorded in
`docs/remediation/evidence/dsx-read-only-foundation/01-verification.md`
(appended during the verification run of this sub-slice).

---

## 5. Pending phases (not started)

| Phase | Scope                                                                       | Status  |
|-------|-----------------------------------------------------------------------------|---------|
| 2     | Migrations + RLS + `dsx-ingest` Edge Function                               | pending |
| 3     | `services/dsx-gateway/` runnable package + Dockerfile + tests               | pending |
| 4     | Asset mapping model + audit + duplicate-active rejection                    | pending |
| 5     | One AURA metric surface wired to `dsx_events` with LIVE/STALE/INVALID/UNAVAILABLE | pending |
| 6     | Security & resilience tests (RLS, dedup, ordering, gateway lifecycle)       | pending |
| —     | Real DSX connectivity                                                       | **external blocker** — no credentials available |

---

## 6. Verdict for this sub-slice

**AURA DSX READ-ONLY FOUNDATION PARTIAL — PHASE 0 AUDIT AND PHASE 1 CANONICAL
CONTRACT COMPLETE; APPLICATION INGESTION, GATEWAY, MAPPING, UI AND LIVE DSX
CONNECTIVITY REMAIN.**

Concrete work completed in this sub-slice:

1. Repository + capability audit (§1).
2. Gap matrix (§2).
3. Canonical envelope, enums, Zod validators, and `deriveDisplayState` helper
   at `src/dsx/contract.ts` with re-exports at `src/dsx/index.ts`.
4. Focused Vitest suite at `src/dsx/__tests__/contract.test.ts` covering
   valid payloads, invalid schema, unsupported version, invalid timestamp,
   invalid unit, unmapped / ambiguous mapping, unvalidated quality,
   stale-vs-fresh derivation, and fail-closed on strict-unknown-fields.
5. Existing Builder success, Builder failure/Retry and AI Settings regression
   specs re-run to prove the verified baseline is intact.

Concrete work still pending:

- Phase 2 migrations (`dsx_connections`, `dsx_events`,
  `dsx_events_quarantine`, `dsx_asset_mappings`,
  `dsx_gateway_heartbeats`, `dsx_ingestion_audit`), RLS policies, GRANTs,
  freshness views.
- Phase 2 `dsx-ingest` Edge Function with gateway auth level.
- Phase 3 `services/dsx-gateway/` package, Dockerfile, `.env.example`,
  health endpoints, subscriber logic, tests.
- Phase 4 asset-mapping CRUD + audit.
- Phase 5 one AURA metric bound to `dsx_events`.
- Phase 6 security / resilience test suites.
- External: real DSX endpoint + credentials.