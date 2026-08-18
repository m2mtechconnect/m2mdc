# Phase 3 - canonical truth chain

## Canonical run model

`public.simulation_runs` is the single authoritative run table.
`simulation_runs.id` is the canonical run identity used by KPI cards,
provenance badges, evidence, exports and human decisions.

Lifecycle: `queued -> running -> succeeded | failed | unavailable | cancelled`.
Terminal states (`succeeded`, `failed`, `cancelled`) cannot be reopened; a retry
creates a new row linked by `retry_of_run_id` with an incremented `attempt`.

Structured columns (not hidden inside JSONB) carry: tenant, twin, scenario
identity, requested/actual provider and version, requested/outcome execution
class, run intent (preview | authoritative), verification level, lifecycle
status, seed and PRNG versions, canonical schema version, input/configuration/
output hashes, telemetry snapshot identity, server timestamps, measured
duration, external job id, structured failure code and message, and the
authenticated creator. A JSONB provenance envelope preserves the immutable
payload in addition to - never instead of - those columns.

Historical rows without sufficient evidence are labelled `legacy-unverified`.
No provenance is invented for them.

## Trusted server write boundary

- `supabase/functions/run-lifecycle` creates runs and applies lifecycle
  transitions. It derives the authenticated user, tenant membership, twin
  access, server timestamps, provider readiness, preview/authoritative
  classification, canonical serialization version, hashes and idempotency.
- A database trigger rejects browser authorship of privileged fields and
  illegal lifecycle transitions, so the boundary holds even on a direct REST
  call.
- Browser calculations may persist only as `preview` /
  `client-generated-unverified`. The Phase 2 engine was not duplicated in an
  edge function to manufacture a "server-executed" label.

## Frontend run state

`src/truth/canonicalRunStore.ts` is the canonical frontend cache.
`src/capabilities/runProvenance.ts` resolves from it first and falls back to the
legacy snapshot store only with the explicit `Unpersisted preview` label.
`src/stores/simulationSnapshotStore.ts` is a compatibility selector: it does not
create run ids, invent provenance, change execution classes or promote preview
results. An ESLint `no-restricted-imports` rule blocks new imports of it outside
the enumerated adapters (`runProvenance.ts` and the three simulation panels).

When no canonical persisted run exists the UI shows `Unavailable` or
`Unpersisted preview` - never validated, authoritative, live or NVIDIA-backed.

## Evidence and exports

`src/components/dsx/CanonicalEvidencePanel.tsx` queries authorized persisted
runs and renders the canonical evidence record built by
`src/truth/canonicalEvidence.ts`. With no visible run it shows an honest empty
state. CSV, JSON and HTML/print exports are serialized from that same record and
carry the run id and `aura-evidence-v1` schema version;
`src/truth/__tests__/evidenceParity.test.ts` proves display/export parity.

Evidence Beta fixtures remain for tests, Storybook and an explicitly labelled
demonstration section (`FIXTURE_DEMONSTRATION_NOTICE`). They no longer populate
production evidence and can no longer produce durable decision records.

## Human decisions

`supabase/functions/record-decision` derives the approver, permission, tenant,
server timestamp, canonical run, evidence snapshot, snapshot hash and decision
record hash. The browser submits only the run id, requested outcome, reason,
optional idempotency key and expected hash. Decisions are rejected when the run
is missing, cross-tenant, unauthorized, stale-hashed, a fixture or an
unpersisted preview. `decision_records` is append-only: update and delete grants
are revoked and an immutability trigger enforces it; corrections are superseding
records that link to the record they supersede.

## Telemetry vertical slice

The MQTT ingest slice remains labelled `TEST_EVIDENCE`. `LIVE_MODE_ENABLED`
stays false: no production source completes the entire chain yet, and one
vertical slice does not prove the platform is live. Stale, invalid, missing or
unmapped readings return `Unavailable`.

## Verdict

`PHASE_3_NOT_CLOSED_EXTERNAL_VALIDATION_REQUIRED` - the canonical chain, server
boundaries, immutability and parity tests are in place, but deployed RLS and
tenant-isolation execution against a live backend is gated by the live-backend
guard and is reported as UNVERIFIED. Mocked RLS tests cannot close Phase 3.

---

## Phase 3 external validation and missing-evidence closure pass

Date of pass: see git history for this file. Scope: close or accurately
reclassify the gates that the implementation pass left unproven. No Phase 4
work was started and the production live-backend guard was not disabled.

### 1. Reconciliation of claimed implementation

| Claim from the implementation pass | Verified state | Evidence |
| --- | --- | --- |
| Canonical persisted run model on `simulation_runs` | Confirmed deployed | `pg_trigger` shows `simulation_runs_write_boundary` |
| Trusted server write boundary | Confirmed deployed | trigger `enforce_simulation_run_write_boundary` forces `run_intent='preview'`, `verification_level='client-generated-unverified'`, `execution_origin='client-browser'` on every non-service-role insert, and rejects any client change to `run_intent`, `verification_level`, `execution_origin`, `validation_status`, `tenant_id`, `user_id`, plus any reopening of a terminal run |
| Decisions are append-only | Confirmed deployed | trigger `decision_records_no_update` raises on UPDATE and DELETE; grants on `decision_records` for `authenticated` are `arDxtm` - insert and select only, no update, no delete |
| No anonymous access to the truth chain | Confirmed deployed | `anon` holds no grant on `simulation_runs` or `decision_records`; every policy is `TO authenticated` |
| Canonicalization is shared across runtimes | **Was false. Now corrected.** | The edge copy lacked NFC normalization, `-0` handling and `@` escaping, and emitted a prefixed hash while the browser emitted bare hex - so `expected_output_hash` conflict detection could not be relied on. Both implementations now follow `aura-canonical-v1` exactly and emit bare lowercase hex. |

### 2. Validation backend

An ephemeral local Supabase is not available in this environment (no Docker
daemon), and no staging project was supplied. The production project was not
used for write tests. The sandbox database role cannot `SET ROLE
authenticated`, so real RLS execution cannot be performed here at all.

Instead of asserting an unproven pass, the pass delivers an executable harness
that produces the evidence the moment a throwaway backend exists:

- `scripts/phase3/rls-matrix.sql` - the full tenant isolation matrix, executed
  as the `authenticated` role with forged `request.jwt.claims`, inside a
  transaction that rolls back.
- `scripts/phase3/external-validation.mjs` - applies every migration in order
  to prove reproducibility, runs the matrix, then exercises the
  `run-lifecycle` and `record-decision` boundaries over real HTTP.
  Exit codes: `0` pass, `1` fail, `78` blocked.

Current result in this environment: `78 BLOCKED - AURA_VALIDATION_DB_URL is
not set`. This is recorded as a blocker, not as a pass.

### 3. Canonicalization parity - CLOSED

Two suites run one shared corpus (`supabase/functions/_shared/canonicalCorpus.ts`)
through both implementations:

- `src/truth/__tests__/canonicalParity.test.ts` - 29 assertions, Node
- `supabase/functions/_shared/canonicalHash.test.ts` - 26 assertions, Deno

They pin exact canonical text per case, prove semantically equal inputs hash
identically (key order, NFC composed vs decomposed), prove distinct inputs
never collide (`0` vs `-0`, `NaN` vs the literal string `"@NaN"`, array order,
`{}` vs `[]`), prove cyclic input is rejected rather than truncated, and prove
`Map`, `Set`, `BigInt` and `Date` serialize identically in both runtimes.

### 4. Telemetry-to-evidence vertical slice - CLOSED in the deterministic layers

`src/truth/__tests__/telemetryVerticalSlice.test.ts` proves the chain from a
persisted `twin_property_values` row through `mapReadingRow`, the fail-closed
`resolveReading` data-mode contract, the canonical telemetry snapshot hash
(identical client-side and edge-side), the `CanonicalRun`, and into the
evidence record and the JSON and CSV exports, which carry the same snapshot
hash and the same `simulation_runs:<id>` citation.

Confirmed fail-closed behaviours: a MEASURED reading is not presentable as
LIVE without a verified gateway; a stale reading resolves to UNAVAILABLE and
never to SIMULATED; harness output labelled TEST_EVIDENCE is never presented
as operational; a mixed set aggregates to the weakest honest claim.

The database read itself is RLS-scoped and remains part of the blocked
external harness.

### 5. Repository gates

- typecheck: 0 errors
- lint: 0 errors, 1347 warnings (all pre-existing `no-explicit-any`, under the
  established ratchet)
- tests: 1951 passed, 91 skipped, 0 failed, across 187 files

### Verdict

**PHASE_3_NOT_CLOSED_EXTERNAL_VALIDATION_REQUIRED**

Everything provable without a live backend is now proven and one real
implementation defect (canonicalization drift across the client/server
boundary) was found and fixed. The remaining gates - migration
reproducibility on an empty database, real RLS and tenant isolation executed
as `authenticated`, and the HTTP behaviour of the two edge boundaries - are
blocked on infrastructure, not on code. Supply `AURA_VALIDATION_DB_URL` (and
optionally `AURA_VALIDATION_FN_URL` with two tenant JWTs) and run
`node scripts/phase3/external-validation.mjs` to close them.
