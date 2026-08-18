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
