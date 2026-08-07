# Stage 2B Preflight - Handoff Result (2026-08-07T20:07Z)

```
Environment marker:                    absent (AURA_DC_TEST_ENV is unset; required value "aura-dc-security-test")
Target project fingerprint:            ref=psfvrskpnwcshvajzeix | source=SUPABASE_PROJECT_ID + VITE_SUPABASE_URL (agree)
                                       | publishable_key_present=yes (presence only) | disposable_flag=absent
                                       | cleanup_flag=absent | guard_decision=blocked | utc=2026-08-07T20:07Z
Target is non-production:              no
Target is disposable:                  no
Synthetic-data-only confirmed:         no
Production reference denied:           yes
Production hostnames denied:           yes
Production credentials unavailable:    yes (no service-role key or database password was requested, read or resolved)
Cleanup authorized:                    no
Migration replay status:               blocked
Environment guard:                     BLOCKED
Network requests before guard:         0
Stage 2B probes authorized to begin:   no
```

Guard output, verbatim and credential-free:

```
AURA test-env guard: target reference = psfvrskpnwcshvajzeix
AURA test-env guard: BLOCKED
  - AURA_DC_TEST_ENV must be exactly "aura-dc-security-test"
  - SUPABASE_PROJECT_ID references the production project (forbidden)
  - VITE_SUPABASE_URL references the production project (forbidden)
  - AURA_DC_TEST_DISPOSABLE must be exactly "true" (target not labelled disposable)
  - AURA_DC_TEST_CLEANUP_AUTHORIZED must be exactly "true" (destructive cleanup not authorized)
  - VITE_SUPABASE_URL resolves to a denylisted production hostname
No migration replay, provisioning, or test mutation is authorized.
```

Zero-request control: `tests/unit/live-backend-guard.test.ts` 7/7 passed, including denial of
`psfvrskpnwcshvajzeix.supabase.co` and `auradc.m2mtechconnect.com` inside an otherwise-allowed disposable
environment, with no query string and no secret value in the thrown message.
`scripts/__tests__/auraTestEnvGuard.test.ts` 11/11 passed.

No project key, JWT, password, connection string, refresh token or webhook secret was requested, read,
printed, stored or logged.

Production remains **NO-GO**. No production deployment may proceed until F-01 (tenant isolation) and F-15
(service-role authorization bypass, children F-15b `ops-heartbeat` and F-15c `zapier-webhook`) are remediated
and independently runtime-verified.
