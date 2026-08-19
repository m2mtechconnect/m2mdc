# Phase 1 — Truth, taxonomy and authorization reconciliation

Captured: 2026-08-19 (UTC). Evidence: `evidence/phase1/`.
Verdict unchanged: **AURA_NVIDIA_OPERATIONAL_NOT_READY**. Nothing in this phase
integrates NVIDIA software, mounts an OpenUSD stage in an NVIDIA runtime,
validates a SimReady asset or binds a live telemetry source. Capability counts
are unchanged at 0/0/0/0 and `productionVerdict` remains `NO-GO`.

Scope: close the Phase 0 blockers that are internal contradictions, so later
phases cannot argue taxonomy. No new capability was claimed.

## 1. Route registry failure closed
`/auth/callback` (SSO redirect target) and `/invite/accept` (mounted in the
unauthenticated branch as a sign-in redirect and in every session branch as the
acceptance page) were mounted in `src/App.tsx` but undeclared. Both are now
declared in `src/config/routeRegistry.ts` with their purpose recorded. The
mounts were not changed — the registry was wrong, not the router.
`routeRegistry.test.ts`: 10/10 pass.

## 2. Renderer taxonomy contradiction closed
`docs/architecture/adr-hybrid-nvidia-runtime.md` mandates four renderer modes;
`src/renderer/rendererModes.ts` shipped three differently-named ones. The ADR
wins. `RENDERER_MODES` is re-keyed to `browser-preview`, `kit-stream-nvcf`,
`kit-stream-self-managed`, `unavailable`.

- `kit-stream-nvcf` carries the NVCF pilot path and stays blocked with a reason.
- `kit-stream-self-managed` is declared with `implementation: null` and the ADR's
  deferral as its blocker, so the deferred path is visible instead of absent.
- `unavailable` is the state in which AURA shows the deterministic 2D plan view.
  The plan view is a fallback surface, not a renderer.
- `LEGACY_RENDERER_MODE_ALIASES` + `resolveRendererModeId()` keep persisted
  legacy identifiers resolving instead of throwing.

Labels still never name an NVIDIA product for an AURA renderer (guard retained).

## 3. Duplicate execution-class union removed
`src/simulation/providers/types.ts` declared a second, incompatible
`SimulationExecutionClass` union containing the non-taxonomy values
`nvidia-dsx-sim` and `specialist-solver`. It now re-exports the canonical union
from `src/simulation/orchestrator/executionClass.ts`, and
`src/simulation/providers/omniverseProvider.ts` advertises `nvidia-solver`
instead of `nvidia-dsx-sim`, as the ADR requires. The provider remains a
disabled, non-executing stub returning `provenance: 'unavailable'`; the
provider *id* `nvidia-dsx-sim` is retained only as a routing key so existing
configuration resolves.

## 4. Wildcard CORS classified and the worst cases gated
Full inventory: `evidence/phase1/cors-inventory.csv` (all 170 functions).

| Class | Count |
|---|---|
| Scoped CORS (no wildcard) | 79 |
| Wildcard CORS + in-code bearer/identity check | 73 |
| Wildcard CORS, no service role, unauthenticated | 7 |
| **Wildcard CORS + service-role client + no in-code identity check** | **11** |

The 11: `funding-scraper`, `metrics-summary`, `ops-environments`, `ops-events`,
`ops-ingest-health`, `templates-seed`, `website-cache-clear`,
`zapier-action-execute`, `zapier-apps-sync`, `zapier-auto-refresh`,
`zapier-oauth-callback`. Each answers an anonymous origin while holding a
service-role client, and several (`ops-events`, `metrics-summary`,
`ops-environments`, `templates-seed`, `zapier-apps-sync`,
`zapier-action-execute`) have **no caller anywhere in the repository**.

Interim control: explicit `verify_jwt = true` blocks added to
`supabase/config.toml` for 10 of them, so the gateway rejects an anonymous
caller before a service-role query runs. `zapier-oauth-callback` is excluded on
purpose — it is an OAuth redirect target anonymous browsers must reach, and it
validates its own state parameter.

This is containment, not a fix. It does not scope reads to a tenant. Open items
carried forward: rewrite each function to derive identity from the caller and
scope its queries, and delete the orphaned endpoints outright rather than
guarding dead code.

## 5. Lockfile ambiguity closed
`bun.lockb` (legacy binary) and `package-lock.json` removed. `bun.lock` is the
single lockfile; bun is the package manager the toolchain already uses.

## Gate results after Phase 1
| Gate | Before | After |
|---|---|---|
| Typecheck | PASS | PASS (0 errors) |
| ESLint | 0 errors / 1169 warnings | 0 errors / 1169 warnings |
| Vitest | **1 failed** / 1902 passed / 81 skipped | **0 failed / 1905 passed / 81 skipped** (195 files) |
| Production build + SEO gate | PASS | PASS |

## Not done in this phase
- Full `playwright.truth.config.ts` and route-stress runs (exceed the sandbox
  time budget; must run in CI).
- Reference-facility coverage artifact emission.
- Phase 3 external validation — `PHASE_3_NOT_CLOSED_EXTERNAL_VALIDATION_REQUIRED`
  is untouched.

## Rollback
Revert `src/config/routeRegistry.ts`, `src/renderer/rendererModes.ts` (+ its
test), `src/simulation/providers/types.ts`,
`src/simulation/providers/omniverseProvider.ts`,
`src/simulation/__tests__/engineConsolidation.test.ts`, the appended block in
`supabase/config.toml`, and restore the two deleted lockfiles.

## Verdict
**PHASE_1_CLOSED** for internal-contradiction remediation.
**AURA_NVIDIA_OPERATIONAL_NOT_READY** stands. Permitted external description is
unchanged: "AURA DC is an NVIDIA-aligned controlled demonstration using
OpenUSD-derived browser assets."
