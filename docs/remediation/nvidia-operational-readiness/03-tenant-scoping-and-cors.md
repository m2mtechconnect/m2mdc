# Phase 3 — Tenant scoping and CORS consolidation

Captured: 2026-08-19 (UTC). Evidence: `evidence/phase3/`.
Verdict unchanged: **AURA_NVIDIA_OPERATIONAL_NOT_READY**. No NVIDIA software was
integrated, no OpenUSD stage was mounted in an NVIDIA runtime, no SimReady asset
was validated and no live telemetry source was bound. Capability counts remain
0/0/0/0 and `productionVerdict` remains `NO-GO`. This phase is a security and
correctness phase only.

(Not to be confused with the canonical truth-chain "Phase 3" of the earlier
programme, whose
`PHASE_3_NOT_CLOSED_EXTERNAL_VALIDATION_REQUIRED` verdict is untouched.)

## 1. Retained service-role handlers are now tenant-scoped
Phase 2 proved *who* calls; this phase constrains *what they can reach*.

| Function | Control added |
|---|---|
| `zapier-auto-refresh` | reads `integrations_connections` filtered by `user_id = caller` — it no longer sweeps every tenant's tokens |
| `zapier-action-execute` | the target connection must satisfy `id = connectionId AND user_id = caller`; a foreign connection now resolves to "not found" |
| `website-cache-clear` | mutates the shared, non-tenant `website_content_cache`, so it requires the `admin` role via `requireCallerRole()` |
| `funding-scraper` | writes the shared `funding_programs` catalogue, so it requires the `admin` role via `requireCallerRole()` |

Role checks go through the existing `public.has_role` security-definer function.

## 2. Wildcard CORS consolidated onto the shared allowlist
67 functions carried a hardcoded `Access-Control-Allow-Origin: *`. They now
resolve per request through `_shared/cors.ts`:

| Class | Phase 2 | Phase 3 |
|---|---|---|
| Scoped CORS | 83 | **150** |
| Wildcard CORS + in-code identity check | 72 | 11 |
| Wildcard CORS, no service role | 7 | 1 |
| Wildcard CORS + service-role + no in-code check | 1 | 1 |

The 13 remaining wildcard functions are the managed-connector/DSX family
(`canary-deploy`, `connection-*`, `dsx-ingest`, `managed-*`, `green-dc-recommend`)
plus `zapier-oauth-callback`. Each builds its headers through a non-trivial
local helper or is an anonymous redirect/ingest target with its own token
verification, so they were left for individual review rather than a codemod.

Nine functions render responses from module-level helpers, so the resolved
headers are held in a module-scoped `corsHeaders` that is refreshed per request
rather than passed through every call site.

`_shared/cors.ts` itself was stale — it allowed a retired preview host and did
not list the live domains. It now allows `auradc.m2mtechconnect.com`,
`m2mdc.lovable.app`, the historical `aura.m2mtechconnect.com`, localhost dev
ports, and matches generated preview/sandbox hosts by pattern. `Vary: Origin`
is emitted so caches cannot cross-serve an origin.

## 3. Pre-existing edge-function type errors fixed
`deno check` across all 163 functions previously reported 5 errors that had
never been gated: `const` reassignment in `builders-get`, `url-recommendations`
and `url-turbo-capture`, plus two unused `@ts-expect-error` directives.
All are fixed; `deno check` is now clean.

## 4. Runtime probes against the deployed project
`evidence/phase3/runtime-probes.txt`:

- `OPTIONS /public-intake` with `Origin: https://m2mdc.lovable.app` → echoes that origin.
- `OPTIONS /public-intake` with `Origin: https://evil.example.com` → falls back to the primary allowed origin; the attacker origin is never echoed.
- `POST /website-cache-clear` unauthenticated → **401**.

## Gate results
| Gate | Result |
|---|---|
| `deno check` (163 functions) | PASS (0 errors, was 5) |
| Vitest | 1905 passed / 81 skipped / 0 failed (195 files) |

## Not done
- The 13 remaining wildcard functions.
- Per-tenant scoping for handlers outside the four above.
- Canonical truth-chain Phase 3 external validation.

## Rollback
Revert `supabase/functions/_shared/cors.ts`, the four scoped handlers, the 67
codemod'd functions and the three `const` → `let` fixes, then redeploy.

## Verdict
**PHASE_3_SECURITY_CLOSED** for tenant scoping and CORS consolidation.
**AURA_NVIDIA_OPERATIONAL_NOT_READY** stands.
