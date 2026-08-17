# NVIDIA DSX reference-data canary - published-runtime acceptance closure

## Verdict

**AURA_DSX_REFERENCE_CANARY_PUBLISHED_RUNTIME_ACCEPTANCE_VERIFIED_WITH_LIMITATIONS**

## What was proven

- **Deployment identity.** The canonical host serves `assets/index-FdvYIjv6.js`
  from source revision `f7bad7f8`, manifest v7, no service worker, no cache
  masking. A republish follows this report to ship the rollback fix below.
- **Test inventory reconciled.** 1,625 collected / 1,534 passed / 0 failed /
  91 skipped. The `1,678 → 1,534` gap was an apples-to-oranges comparison of a
  collected total against a passed total; the real delta of 53 is fully
  accounted for by 188 retired aviation-era cases and 135 new dataset/DSX cases.
  The 91 skips are backend-gated and are recorded BLOCKED_UNVERIFIED, never as
  passes. 928 Playwright cases are excluded by config and were not run.
- **Page identity is genuine, not a facade.** 19 reference consumer routes each
  render a distinct page id, title, tab/section shape and export stem, verified
  both by unit assertions and by administrator sweeps on the published host
  against the legacy rendering of the same routes.
- **Zero runtime-reachable synthetic dependencies** across the 45 published
  routes exercised in reference mode: 0 console errors, 0 failed requests,
  0 permanent loading states. The legacy component is never mounted in
  reference mode, which is what makes the property enforceable.
- **Evidence beta.** 25/25 routes show a terminal unavailable state that names
  the missing source and offers rollback. No fabricated evidence.
- **Authority.** Anonymous visitors cannot activate the canary; 20/20 anonymous
  attempts redirected with no banner.
- **Security.** Six permissive `USING (true)` read policies on tenant content
  were removed across two passes. Anonymous reads returned 401 before and after
  (no role held a table grant), so this closes a latent defect rather than an
  active exposure.
- **Claims.** No NVIDIA runtime integration, no SimReady validation, no live or
  measured claim. NGC `dsx_dataset` v2.1 is still HTTP 401 and stays a terminal
  unavailable state with no substitution.

## Defect found and fixed this phase

`DatasetProvider` re-asserted the remembered canary intent even when an operator
deliberately deleted `?dataset=` from the address bar. The intent is now
re-applied only across a pathname change, so manual parameter removal is an
honest rollback. Dataset scope: 58 tests pass; typecheck clean.

## Why not VERIFIED

Nine acceptance areas were not executed and are recorded honestly rather than
inferred:

1. Simulation → Compare → Review → Evidence → Export end-to-end run with
   persistence and duplicate-submit rejection.
2. Export file download and content inspection.
3. Nine Assistant grounding evaluations, including abstention and citation
   inspection.
4. Search query deep links, refresh, empty and unauthorized states.
5. Parameterized, invalid-ID and 26-alias published cases.
6. Full four-role, 87-route published matrix (two roles exist in the backend:
   engineer and admin; no viewer, owner or second-tenant fixture).
7. Per-control interaction testing on the 19 migrated surfaces.
8. Responsive breakpoints beyond 1440x900/1280x1800 and the keyboard,
   focus, contrast and dialog-semantics accessibility set.
9. Durable-record diffing and audit-event read-back during the rollback drill.

## Honest characterisation

No route reached FUNCTIONALLY_MIGRATED. The pinned reference source publishes
no mutation inputs, so every migrated surface is read-only by design: it states
the original user job, marks each unsupported interaction unavailable with a
reason, and offers a one-action rollback. That is the ceiling of what this data
source permits, and it is stated rather than dressed up.

## State

- Production default: `legacy-synthetic` (unchanged).
- Canary: `?dataset=nvidia-dsx-reference`, administrator only (unchanged).
- Capability classifications and claims policy: unchanged.

## Open backlog

`visual-debt-backlog.md`: >300 sub-11px text utilities and 82 hardcoded colour
utilities on legacy pages, one unnamed icon-only button on `/settings/ai`, and
an unpaginated 324-row admin signups table.
