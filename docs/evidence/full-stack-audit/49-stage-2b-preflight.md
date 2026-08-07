# Stage 2B Runtime Preflight - Result: BLOCKED (2026-08-07T19:58:57Z)

Zero database, Auth, Storage, Realtime or Edge Function runtime requests were made against any project as
part of Stage 2B. No probe of the 26-probe manifest (`42-blocked-runtime-execution-manifest.md`) was executed.

## Preflight gate results

| # | Condition | Result |
|---|---|---|
| 1 | Resolve configured project reference without printing credentials | resolved: `psfvrskpnwcshvajzeix` (reference only; no key, URL secret, password or token read or printed) |
| 2 | Confirm it is **not** `psfvrskpnwcshvajzeix` | **FAIL** - the resolved reference *is* the production project |
| 3 | Environment marker exactly `AURA_DC_TEST_ENV=aura-dc-security-test` | **FAIL** - marker is unset |
| 4 | Target is disposable and cleanup authorized | **FAIL** - production project, cleanup not authorizable |
| 5 | Production-target zero-network-request control | **PASS** - `tests/unit/live-backend-guard.test.ts`, 6/6 passed; `installLiveBackendGuard` rejects `*.supabase.co\|in` fetches locally and the thrown message omits the query string (no `apikey` leakage) |
| 6 | Environment guard (`node scripts/aura-test-env-guard.mjs`) | **BLOCKED**, exit code 1 |

Guard output (verbatim, credential-free):

```
AURA test-env guard: target reference = psfvrskpnwcshvajzeix
AURA test-env guard: BLOCKED
  - AURA_DC_TEST_ENV must be exactly "aura-dc-security-test"
  - SUPABASE_PROJECT_ID references the production project (forbidden)
  - VITE_SUPABASE_URL references the production project (forbidden)
No migration replay, provisioning, or test mutation is authorized.
```

Because the guard did not return ALLOWED, **zero runtime requests were issued** and Stage 2B returns
**BLOCKED**, as specified.

## Target configuration fingerprint (no secret material)

| Field | Value |
|---|---|
| resolved_project_ref | `psfvrskpnwcshvajzeix` |
| ref_source | `SUPABASE_PROJECT_ID` and `VITE_SUPABASE_URL` (agree) |
| disposable | no |
| env_marker_present | no |
| publishable_key_present | yes (presence only; value never read, printed or stored) |
| service_key_present | not evaluated - never requested |
| guard_decision | blocked |
| decision_utc | 2026-08-07T19:58:57Z |
| audit_log | `docs/evidence/phase-1/b0x-test-env-guard.log` (append-only JSON lines) |

No password, JWT, service key, connection string, refresh token or reusable credential was requested,
read, printed or recorded. Names and fingerprints only.

## Resume condition

Stage 2B may begin only when the secure execution environment supplies a disposable Supabase project with
`AURA_DC_TEST_ENV=aura-dc-security-test`, a project reference that is not `psfvrskpnwcshvajzeix`, and
explicit cleanup authorization. The guard must then return ALLOWED before the first request. On resume the
26 probes execute in the mandated order: clean migration replay; upgrade-path migration; fixture creation;
authentication lifecycle; authorization and B-06; cross-tenant and B-04; disabled/expired membership;
ownership reassignment; Storage isolation; Realtime isolation; RPC isolation; Edge Function abuse cases
(R-20..R-25 now carry the refined F-15 child findings); audit-record verification; cleanup verification.

Production remains **NO-GO** regardless of Stage 2B results until F-01 is remediated and independently
reverified. F-15b and F-15c are now additional CRITICAL gates on that verdict.
