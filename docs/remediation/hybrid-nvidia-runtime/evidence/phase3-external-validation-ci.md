# Phase 3 - External Validation in CI (infrastructure closure pass)

## What this closes

Phase 3 previously carried the verdict `PHASE_3_NOT_CLOSED_EXTERNAL_VALIDATION_REQUIRED`
because RLS, tenant isolation, migration reproducibility and the trusted write
boundary can only be proven inside a real Postgres / PostgREST / GoTrue
deployment. The build sandbox cannot `SET ROLE authenticated` and must never
touch the production project, so those gates were recorded as BLOCKED rather
than passed.

`.github/workflows/phase3-external-validation.yml` removes the blocker by
provisioning an **ephemeral local Supabase stack** (`supabase start`, CLI
2.34.3) per run and executing the real assertions against it.

## Components

| Artifact | Role |
| --- | --- |
| `.github/workflows/phase3-external-validation.yml` | Provisions the ephemeral stack, serves edge functions, runs the validator in required mode, uploads evidence |
| `scripts/phase3/external-validation.mjs` | Orchestrator: safety perimeter, migration replay, object inventory, rollback drill, RLS matrix, HTTP boundary |
| `scripts/phase3/rls-matrix.sql` | Executable RLS/tenant matrix, run as `authenticated` and `anon`, wrapped in a transaction that always rolls back |
| `scripts/phase3/phase3-migrations.json` | Manifest of the Phase 3 migrations used by the rollback/reapplication drill |
| `phase3-external-validation.json` (artifact) | Machine-readable result document, one entry per assertion |

## Assertions executed

**Database (psql, real roles)**
- every migration in `supabase/migrations` applies in order to an empty `public` schema
- Phase 3 object inventory: write-boundary and immutability functions, their triggers, RLS enabled on `simulation_runs` and `decision_records`, tenant index, absence of `anon` grants, absence of `UPDATE`/`DELETE` grants on `decision_records`
- rollback drill: replay without the Phase 3 migrations, then reapply them; the schema signature (columns, policies, indexes, functions, triggers, grants) must be byte-identical, and the RLS matrix must pass again
- RLS matrix: owner reads, cross-tenant read/write denial, forged `run_intent`/`verification_level` downgrade, terminal-state reopen denial, decision immutability, anonymous read/insert/update denial, administrator read without implicit write, self-granted admin denial

**HTTP (real GoTrue sessions for two tenants)**
- missing, malformed and forged/expired tokens are rejected with 401
- invalid request bodies are rejected with 400
- `tenant_id`, `run_intent`, `verification_level` and timestamps are server-derived, never client-authored
- lifecycle transitions: legal transitions accepted, terminal reopen rejected with 409, cross-tenant transition rejected
- decisions: append-only write accepted for own run, stale `expectedOutputHash` rejected with 409, approval of an unverified preview rejected with 403, cross-tenant decision rejected, approver identity and decision time server-generated
- CORS never combines a wildcard origin with credentials on a credentialed route

## Safety perimeter

- The job exports empty `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_*` so ambient production configuration cannot leak in, and no production secret is bound to the workflow.
- The validator aborts immediately if any target string matches the production project ref, `lovable.app` or `m2mtechconnect.com`.
- In `--require-infrastructure` mode the API URL must be loopback; anything else is a hard failure.
- Test identities are created only through the local GoTrue admin API with per-run random passwords. Tokens and keys are masked in the log and never written to the evidence document.
- The RLS matrix runs inside a transaction that always `ROLLBACK`s.

## Verdict semantics

`--require-infrastructure` converts every BLOCKED or SKIPPED assertion into a
failure, so the job cannot pass by not running. The JSON artifact carries the
verdict (`PASS` / `FAIL` / `BLOCKED`), per-assertion status, commit SHA and run
id. Phase 3 is closed only on a `PASS` artifact produced by this workflow; local
runs without the ephemeral stack still exit `78 BLOCKED` and prove nothing.
