# DSX_DISPOSABLE_JWT_SECRET — requirement audit

Date: 2026-08-04
Scope: read-only audit of why the DSX resume gate demanded the disposable
project's legacy JWT signing secret, and the resulting refactor.

## 1. Finding: the secret was never consumed

Repository-wide search for `JWT_SECRET` across `scripts/`, `tests/`,
`src/`, `supabase/`, `docs/` and `.github/` returned only:

- `scripts/dsx-resume-gate.mjs` — the name listed in `REQUIRED_SECRETS`.
- `scripts/__tests__/dsxResumeGate.test.ts` and
  `scripts/__tests__/dsxDisposableVerify.test.ts` — fixture values that
  only existed to satisfy that list.
- `docs/remediation/evidence/dsx-audit/audit.jsonl` — blocked-gate
  reasons echoing the same list.

No code path ever read the value. `scripts/dsx-disposable-verify.mjs`
authenticates exclusively with `DSX_DISPOSABLE_SERVICE_ROLE_KEY` (admin
REST reads) and `DSX_DISPOSABLE_ANON_KEY` (default-deny probes,
`/auth/v1/signup` reachability, unauthenticated `dsx-ingest` 401 probe).
`tests/database/02_dsx_rls_suite.sh` switches roles with
`SET LOCAL ROLE` / `request.jwt.claims` inside a psql transaction — it
never mints a signed JWT either.

Conclusion: the requirement was vestigial. It was carried over from an
earlier intent to mint test-user tokens locally, which was never
implemented.

## 2. Why it must not be reinstated

- Supabase now recommends asymmetric signing keys with JWKS verification;
  the shared HS256 project secret is legacy and slated for deprecation.
- Handing the master signing secret to a test harness lets that harness
  forge any user, any role, any claim. That is a strictly larger blast
  radius than the tests need, and it is unverifiable against JWKS.
- Real test users must instead be created with the service-role Admin API
  and signed in through `/auth/v1/token?grant_type=password`. The
  resulting access token is issued and verified by Supabase itself.

Note: the RS256 JWKS used by the `dsx-ingest` edge function
(`DSX_GATEWAY_JWKS_JSON`) is unrelated to this secret. Gateway identity
stays on its own key material, verified locally by the function.

## 3. Change applied

`DSX_DISPOSABLE_JWT_SECRET` removed from `REQUIRED_SECRETS` in
`scripts/dsx-resume-gate.mjs`, with an inline comment pointing here.
Fixtures updated; a regression test asserts the gate passes without it
and never names it in a blocking reason.

## 4. Resulting gate contract (7 names)

```
DSX_DISPOSABLE_CONFIRMED=1
DSX_EXPECTED_DISPOSABLE_REF
DSX_DISPOSABLE_PROJECT_REF
DSX_DISPOSABLE_URL
DSX_DISPOSABLE_ANON_KEY
DSX_DISPOSABLE_SERVICE_ROLE_KEY
DSX_DISPOSABLE_DB_URL
```

`DSX_DISPOSABLE_SUPABASE_URL` and `DSX_DISPOSABLE_DATABASE_URL` are not
accepted — the gate matches the exact names above.

On the anon/service_role vs publishable/secret key transition: legacy key
names remain valid during migration and the verifier sends them as
`apikey` + `Bearer`, which works identically for the new key format. If
the disposable project is created with only publishable/secret keys,
store the publishable key in `DSX_DISPOSABLE_ANON_KEY` and the secret key
in `DSX_DISPOSABLE_SERVICE_ROLE_KEY`; no code change is needed.

## 5. Status

AURA DSX READ-ONLY FOUNDATION PARTIAL — PHASE 2 HAS SPECIFIC DATABASE,
RLS, AUTHENTICATION OR VERIFICATION GAPS

Nothing was provisioned, migrated, deployed, or mutated. Production
project `psfvrskpnwcshvajzeix` was not contacted.
