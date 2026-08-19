# Phase 2 — Service-role attack surface closure

Captured: 2026-08-19 (UTC). Evidence: `evidence/phase2/`.
Verdict unchanged: **AURA_NVIDIA_OPERATIONAL_NOT_READY**. No NVIDIA software was
integrated, no OpenUSD stage was mounted in an NVIDIA runtime, no SimReady asset
was validated and no live telemetry source was bound. Capability counts remain
0/0/0/0 and `productionVerdict` remains `NO-GO`.

Scope: convert the Phase 1 interim containment (gateway `verify_jwt` blocks) into
a real control — delete the endpoints that should not exist, and give the ones
that must exist an in-code identity check plus scoped CORS.

## 1. Orphaned service-role endpoints deleted
Six endpoints held a `SUPABASE_SERVICE_ROLE_KEY` client behind a wildcard origin
and had **no caller anywhere in the product**. Guarding dead code is not a fix;
they are removed from the repository and from the deployed project:

`metrics-summary`, `ops-environments`, `ops-events`, `ops-ingest-health`,
`templates-seed`, `zapier-apps-sync`.

`zapier-apps-sync` additionally carried a large hardcoded catalogue of fabricated
Zapier app records, which conflicts with the no-fabricated-data policy.

Edge function count: 170 → 164 (163 with an `index.ts`).

## 2. Retained handlers now verify the caller in code
`supabase/functions/_shared/callerIdentity.ts` is new. `requireCaller()` resolves
the bearer token through the anon client and throws `CallerRejected(401)` when it
is missing or invalid; `requireCallerRole()` adds a `public.has_role` check for
future admin-only endpoints; `callerRejectedResponse()` renders the rejection with
scoped CORS headers.

Applied to the four retained service-role endpoints, each of which also replaced
its wildcard `Access-Control-Allow-Origin: *` block with per-request
`getCorsHeaders(origin)` from `_shared/cors.ts`:

| Function | Caller in product |
|---|---|
| `funding-scraper` | `src/lib/funding/queryClient.ts` |
| `website-cache-clear` | `src/components/search/CacheStatusBanner.tsx` |
| `zapier-auto-refresh` | `src/hooks/useTokenRefresh.ts` |
| `zapier-action-execute` | retained as an integration contract surface |

`zapier-auto-refresh` previously documented itself as "public background/cron,
no authentication needed"; that comment was false in security terms and is gone.
The gateway `verify_jwt = true` entries are retained as defense in depth.

## 3. Residual wildcard-CORS service-role surface
`evidence/phase2/cors-inventory.csv` (163 functions):

| Class | Phase 1 | Phase 2 |
|---|---|---|
| Scoped CORS | 79 | 83 |
| Wildcard CORS + in-code identity check | 73 | 72 |
| Wildcard CORS, no service role | 7 | 7 |
| **Wildcard CORS + service-role + no in-code check** | **11** | **1** |

The single remaining case is `zapier-oauth-callback`, which is an OAuth redirect
target anonymous browsers must reach and which validates its own `state`
parameter before touching state. It is deliberately excluded from both the
gateway gate and the caller check.

## 4. Not done in this phase
- Per-tenant scoping of the retained handlers' queries. They now prove *who* is
  calling; they do not yet constrain reads to that caller's tenant. Carried
  forward.
- Wildcard CORS on the 72 functions that do check identity in code. Lower risk,
  still a hardening item.
- Phase 3 external validation — `PHASE_3_NOT_CLOSED_EXTERNAL_VALIDATION_REQUIRED`
  is untouched.

## Gate results
| Gate | Result |
|---|---|
| Typecheck | PASS (0 errors) |
| Vitest | 1905 passed / 81 skipped / **0 failed** (195 files) |

## Rollback
Restore the six deleted function directories, revert the four hardened
`index.ts` files, delete `supabase/functions/_shared/callerIdentity.ts`, and
restore the Phase 1 block in `supabase/config.toml`.

## Verdict
**PHASE_2_CLOSED** for service-role attack-surface reduction.
**AURA_NVIDIA_OPERATIONAL_NOT_READY** stands. Permitted external description is
unchanged: "AURA DC is an NVIDIA-aligned controlled demonstration using
OpenUSD-derived browser assets."
