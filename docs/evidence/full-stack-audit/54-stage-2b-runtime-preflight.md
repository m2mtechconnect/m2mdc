# 54 - Stage 2B Runtime Preflight - Result: BLOCKED (2026-08-07T20:44:36Z)

Zero database, Auth, Storage, Realtime or Edge Function requests were issued. No probe of the 26-probe
manifest was executed. No fixture was created. No migration was replayed.

## 1. Disposable environment provisioning

**Not provisioned.** The agent cannot create a Supabase project; this workspace is bound to a single
project, which is the production project `psfvrskpnwcshvajzeix`. Provisioning must be performed by the
secure execution environment per `51-stage-2b-environment-provisioning-handoff.md` (13 isolation
requirements, owner and deletion date, synthetic data only, test-only function secrets, integrations
redirected to sinks, destructive cleanup authorized).

No production password, JWT, service-role key, refresh token, webhook secret or integration credential
was read, requested, copied or reused.

## 2. Runner configuration

The six required variables (`AURA_DC_TEST_ENV`, `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `AURA_DC_TEST_DISPOSABLE`, `AURA_DC_TEST_CLEANUP_AUTHORIZED`) were **not**
supplied. The runner retains inherited production configuration, which the guard treats as a hard failure.
Mixed production/test configuration is rejected by construction (reference-agreement check).

## 3. Preflight gate results

| # | Control | Result |
|---|---|---|
| 1 | Production-target zero-network-request control | PASS - `tests/unit/live-backend-guard.test.ts`; denylisted hosts rejected locally, query strings never surfaced |
| 2 | Environment guard `node scripts/aura-test-env-guard.mjs` | **BLOCKED**, exit code 1 |
| 3 | Marker exactly `aura-dc-security-test` | FAIL - unset |
| 4 | Project reference differs from production | FAIL - resolves to `psfvrskpnwcshvajzeix` |
| 5 | Disposability flag | FAIL - unset |
| 6 | Cleanup authorization flag | FAIL - unset |
| 7 | Production privileged credentials unavailable | PASS - none present or reachable; presence-only evaluation |
| 8 | Production hostname denylist preserved | PASS - guard and Vitest runner both deny unconditionally |

Guard output (verbatim, credential-free):

```
AURA test-env guard: target reference = psfvrskpnwcshvajzeix
AURA test-env guard: utc = 2026-08-07T20:44:36.269Z
AURA test-env guard: BLOCKED
  - AURA_DC_TEST_ENV must be exactly "aura-dc-security-test"
  - SUPABASE_PROJECT_ID references the production project (forbidden)
  - VITE_SUPABASE_URL references the production project (forbidden)
  - AURA_DC_TEST_DISPOSABLE must be exactly "true" (target not labelled disposable)
  - AURA_DC_TEST_CLEANUP_AUTHORIZED must be exactly "true" (destructive cleanup not authorized)
  - VITE_SUPABASE_URL resolves to a denylisted production hostname
No migration replay, provisioning, or test mutation is authorized.
```

## 4. Non-secret fingerprints

| Field | Value |
|---|---|
| resolved_project_ref | `psfvrskpnwcshvajzeix` |
| ref_source | `SUPABASE_PROJECT_ID` and `VITE_SUPABASE_URL` (agree) |
| disposable | no |
| env_marker_present | no |
| publishable_key_present | yes (presence only) |
| service_key_present | no |
| network_requests_before_guard | 0 |
| guard_decision | blocked |
| decision_utc | 2026-08-07T20:44:36Z |
| audit_log | `docs/evidence/phase-1/b0x-test-env-guard.log` |

## 5. Consequence

Sections 4 (migration gates), 5 (26-probe manifest) and the cleanup verification of the Stage 2B order are
**not authorized to begin**. Stage 2B halts here with zero requests, as specified.
