# Stage 2B - Environment Provisioning Handoff (2026-08-07)

Preparation only. **No runtime probe was executed. Zero network requests were issued to any project.**
Production `psfvrskpnwcshvajzeix` is permanently denylisted in code, not only in prose.

## 1. What was implemented this stage

| Control | Location | Behaviour |
|---|---|---|
| Environment marker check | `scripts/aura-test-env-guard.mjs` | `AURA_DC_TEST_ENV` must equal `aura-dc-security-test` exactly |
| Production reference denial | same | blocks if `SUPABASE_PROJECT_ID` or `VITE_SUPABASE_URL` contains the production ref |
| Reference agreement | same | URL-resolved ref must equal `SUPABASE_PROJECT_ID` |
| **Disposability label (new)** | same | requires `AURA_DC_TEST_DISPOSABLE=true` |
| **Cleanup authorization (new)** | same | requires `AURA_DC_TEST_CLEANUP_AUTHORIZED=true` |
| **Production hostname denylist (new)** | same + `tests/_setup/liveBackendGuard.ts` | denies `psfvrskpnwcshvajzeix.supabase.{co,in}`, `m2mdc.lovable.app`, `auradc.m2mtechconnect.com`, `m2mtechconnect.com` and their subdomains |
| **Production service-role denial (new)** | same | blocks when a service-role key is present while the target resolves to production |
| Unconditional runtime denial | `tests/_setup/liveBackendGuard.ts` | denylisted hosts are rejected **even when the guard returns ALLOWED**; the thrown message keeps origin+path only, never the query string |
| Credential hygiene | both | only project references and presence flags are evaluated, printed or logged - never a value |
| Append-only decision log | `docs/evidence/phase-1/b0x-test-env-guard.log` | one JSON line per guard decision |

Tests: `scripts/__tests__/auraTestEnvGuard.test.ts` (11 passed) and `tests/unit/live-backend-guard.test.ts`
(7 passed), including a case proving a production host is refused inside an otherwise-allowed disposable
environment and that no secret value appears in any guard output.

## 2. Provisioning specification for the disposable project

The agent cannot create a second Supabase project; this environment is bound to the production project only.
The following must be supplied by the secure execution environment. **Do not send any value into this chat.**

| Variable | Required value | Notes |
|---|---|---|
| `AURA_DC_TEST_ENV` | `aura-dc-security-test` | exact string |
| `SUPABASE_PROJECT_ID` | the disposable ref | must not be `psfvrskpnwcshvajzeix` |
| `VITE_SUPABASE_URL` | `https://<disposable-ref>.supabase.co` | must agree with the ref |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | disposable project publishable key | presence checked only |
| `AURA_DC_TEST_DISPOSABLE` | `true` | asserts the project may be destroyed |
| `AURA_DC_TEST_CLEANUP_AUTHORIZED` | `true` | asserts destructive cleanup is authorized |

Isolation requirements the provisioner must satisfy, each mapped to the probe that later verifies it:

| # | Requirement | Verified by |
|---|---|---|
| 1 | Unique non-production project reference | guard, then R-01 |
| 2 | No connection to production data (no dump, no restore, no replication, no FDW) | R-01, R-03 |
| 3 | Synthetic fixtures only - generated identities, no production rows, no personal data | R-03 |
| 4 | Separate Auth users, created in the test project only | R-04 |
| 5 | Separate Storage buckets, none marked public unless the probe requires it | R-09 |
| 6 | Separate Realtime configuration and publication set | R-10 |
| 7 | Separate Edge Function secrets - no production secret rebound | R-20..R-25 |
| 8 | Email sink is a capture mailbox; no real recipient domain | R-04 |
| 9 | External integrations (Zapier, webhooks, AI gateway) pointed at sinks or disabled | R-25 |
| 10 | Production domains denylisted at the runner | implemented above, unit-proven |
| 11 | No production service-role key reachable by the runner | implemented above, unit-proven |
| 12 | Cost and resource limits set (smallest compute, spend cap, short log retention) | provisioner attestation |
| 13 | Project name/description clearly labelled disposable | provisioner attestation |

## 3. Migration replay preparation

The repository contains **35** migrations in `supabase/migrations/`. They are to be applied **unmodified**,
in filename order, into the clean disposable project. `52-migration-replay-ledger.csv` is pre-seeded with all
35 rows and the required columns (`migration`, `status`, `duration`, `failure_identity`, `schema_effect`,
`manual_dependency`, `environment_assumption`); every row currently reads `not_executed`.

Replay rules, binding on the executing run:

1. Stop at the **first** non-hermetic migration. Record its identity and the exact error.
2. Do **not** hand-repair the database and continue. A repaired database is not a replay pass.
3. A migration that only succeeds because of Supabase bootstrap state is `pass_with_environment_assumption`,
   not `pass`. F-17 predicts at least 102 relations will depend on the bootstrap
   `ALTER DEFAULT PRIVILEGES IN SCHEMA public`; R-01 is the measurement that confirms or refutes this.
4. Record `schema_effect` per migration (tables, policies, functions, grants created or altered).

Command, runnable only when the guard is ALLOWED: `npm run db:migrate:test` (already guard-wired).

## 4. Result

The guard was executed and returned **BLOCKED**; therefore **zero** network requests were issued and the
26-probe manifest was not started. Full non-secret evidence is in `53-stage-2b-preflight-handoff-result.md`.
