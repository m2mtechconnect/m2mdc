# Disposable Test Environment Guard + Test-Delta Reconciliation

Status date: 2026-08-07 UTC. No production mutation performed. Production
project `psfvrskpnwcshvajzeix` was never targeted by any tool in this slice.

## 1. Guard (`scripts/aura-test-env-guard.mjs`)

Fails closed before any migration replay, provisioning or test mutation.

Checks, in order:
1. Explicit test-environment marker `AURA_DC_TEST_ENV === "aura-dc-security-test"`.
2. `SUPABASE_PROJECT_ID` and `VITE_SUPABASE_URL` both present and parseable.
3. Aborts if either value contains the production reference.
4. Aborts unless the reference resolved from the URL exactly equals `SUPABASE_PROJECT_ID`.
5. Requires `VITE_SUPABASE_PUBLISHABLE_KEY` (auth probes sign in normally).

Output discipline: prints only the resolved project reference and the UTC
timestamp. Never prints tokens, DB passwords, secret keys or connection
strings. `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and
`AURA_DC_TEST_SUPABASE_SECRET_KEY` are never read by the guard.

Every evaluation appends a JSON line to
`docs/evidence/phase-1/b0x-test-env-guard.log` with decision, target ref,
reasons, UTC timestamp and exit code.

Entry points:
- `npm run guard:test-env`
- `npm run db:migrate:test` / `npm run db:reset:test` (guard runs first; `&&` short-circuits)
- programmatic: `assertTestEnvAllowed()`

First recorded run (current sandbox env, which still resolves to production):
BLOCKED, exit code 1, three reasons. This is the intended behaviour and is the
proof the guard is not vacuous.

Unit tests: `scripts/__tests__/auraTestEnvGuard.test.ts`, 7/7 passing, including
a credential-leak assertion.

## 2. Supabase CLI

Pinned dev dependency `supabase@2.34.3`, executed through the package runner.
Docker is not required for the hosted disposable project.

## 3. Full-suite delta vs the Phase 0 baseline (commit 6f6a502)

| Run | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Phase 0 baseline | 1430 | 1097 | 224 | 109 |
| Current, run 1 | 1438 | 1102 | 227 | 109 |
| Current, run 2 | 1438 | 1102 | 227 | 109 |

Runs 1 and 2 produced **byte-identical failing-test identity sets** (227 each,
zero symmetric difference), so the current failures are deterministic, not flaky.

Collected-test delta: +8 (7 are the new guard tests in this slice, all passing).

Failure delta: +3 relative to baseline. **These three cannot be attributed by
test identity, because the Phase 0 baseline recorded only aggregate counts — no
per-test identity list was preserved.** That gap is now closed: the full
identity list for the current run is committed at
`docs/evidence/phase-1/b0x-failing-test-identities.txt` and is the reference
point for all future deltas.

What can be stated on evidence:
- Zero failures occur in any authorization file (`src/auth/**`,
  `src/contexts/RBACContext.tsx`, permission suites); the focused authz suite
  remains 18/18 green.
- Zero failing tests reference roles, permissions, RBAC or `has_role` anywhere
  in their failure output (grep count: 0).
- All 227 failures sit in builder / YVR template / intake / analytics /
  simulation suites, which the Phase 0 baseline already recorded as failing.

Therefore the +3 is **UNATTRIBUTED**, not "proven unrelated". It is not a
regression in B-01/B-02/B-03/B-06 by the evidence above, but the exact identity
of the three requires re-running the suite at commit 6f6a502, which is outside
what this slice may do.

## 4. Hazard discovered while classifying failures

21 failing tests abort with `AuthWeakPasswordError` from **live Supabase Auth
signup calls**. Those integration tests resolve their client from the ambient
`.env`, i.e. they attempt to create users against the production project. They
fail before creating anything today only because the password policy rejects
them. This must be redirected at the disposable project (and gated by the guard)
before any authenticated verification work begins.

## 5. Not done, deliberately

B-04 tenant isolation is NOT implemented and no further authorization proof is
claimed. Both remain blocked pending the disposable project variables.
