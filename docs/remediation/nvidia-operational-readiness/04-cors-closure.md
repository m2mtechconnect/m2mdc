# Phase 4 — CORS closure and OAuth redirect correctness

Captured: 2026-08-19 (UTC). Evidence: `evidence/phase4/`.
Verdict unchanged: **AURA_NVIDIA_OPERATIONAL_NOT_READY**. No NVIDIA runtime,
OpenUSD stage, SimReady asset or live telemetry binding was added in this phase.

## 1. Wildcard CORS eliminated
Phase 3 left 13 functions on wildcard CORS because their headers were built by
non-trivial local helpers. All 13 now resolve the origin per request through
`_shared/cors.ts`, preserving each function's own method and header allowances:

`canary-deploy`, `connection-credential`, `connection-health-check`,
`connection-provision`, `dsx-ingest`, `green-dc-recommend`,
`managed-connector-capabilities`, `managed-connector-invoke`,
`managed-connector-verify`, `managed-user-disconnect`,
`managed-user-oauth-complete`, `managed-user-oauth-start`,
`zapier-oauth-callback`.

| Class | Phase 0 | Phase 3 | Phase 4 |
|---|---|---|---|
| Scoped CORS | 78 | 150 | **161** |
| Wildcard CORS | 92 | 13 | **0** |

`zapier-webhook` and `zapier-webhook-trigger` are excluded by design: they are
machine-to-machine entrypoints that send `Access-Control-Allow-Origin: null`,
which denies every browser origin and is stricter than the allowlist.

## 2. OAuth redirect targets corrected
`zapier-oauth-callback` and `zapier-oauth-start` both defaulted their
`redirect_uri` to a **foreign Supabase project ref**
(`mlhcdcvpvztfjfndmxzl`), which is not this deployment. Both now derive it from
`SUPABASE_URL`, so the two sides of the exchange agree.

The callback also redirected the browser to the retired
`aura.m2mtechconnect.com` host on both success and error paths. It now uses
`APP_BASE_URL`, defaulting to the live `auradc.m2mtechconnect.com`.

The callback remains anonymous by design (it is a browser redirect target); its
security boundary is the one-time, expiring `state` token it validates against
`oauth_states` before any token exchange, which is unchanged.

## 3. Regression ratchet
`src/test/edgeFunctionCors.test.ts` fails the build if any function reintroduces
a wildcard origin, emits CORS without going through the shared allowlist, or
relaxes the two browserless webhooks.

## 4. Runtime probes against the deployed project
For `managed-connector-invoke`, `dsx-ingest`, `green-dc-recommend` and
`canary-deploy`:

- `Origin: https://m2mdc.lovable.app` → echoed.
- `Origin: https://evil.example.com` → not echoed; falls back to the primary allowed origin.
- Unauthenticated `POST` to `managed-connector-invoke`, `connection-credential`, `canary-deploy` → **401**.

## Gate results
| Gate | Result |
|---|---|
| `deno check` (163 functions) | PASS, 0 errors |
| Vitest | 1908 passed / 81 skipped / 0 failed |

## Rollback
Revert the 14 function entrypoints and `src/test/edgeFunctionCors.test.ts`, then redeploy.

## Verdict
**PHASE_4_CLOSED**. **AURA_NVIDIA_OPERATIONAL_NOT_READY** stands.
