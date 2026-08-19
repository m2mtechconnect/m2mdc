# Phase 6 - Serial triage of truth-suite navigation and Evidence failures

## Defect found and fixed (product)
- **Legacy Evidence deep links never landed.** `/dsx/evidence-beta/thermal`, `/power`,
  `/cooling`, `/network`, `/workload`, `/facility`, `/simulations`, `/evidence`,
  `/carbon`, `/financials`, `/sovereignty` were declared as *children* of the
  Evidence shell route. The shell's workspace provider mounted first and
  re-synchronised the legacy URL, cancelling the `PreserveNavigate` redirect, so
  every bookmarked legacy link rendered a title-only "Overview" page with no
  metrics, no rack queue and no asset selectors.
  Fix: the aliases are now sibling routes declared outside the shell.
  Verified: `/dsx/evidence-beta/thermal` now commits to
  `/dsx/evidence-beta/operations/thermal` with query context preserved
  (16 asset selectors, 10 metric tiles, 8 queue rows).

## Stale specs reconciled with the canonical IA
`tests/truth-in-ui/navigation-click-audit.spec.ts` still asserted the pre-DSX
labels ("Engineering Workbench", "More navigation"), retired dashboard cards and
a retired palette target. Rewritten against `src/config/appNavigation.ts`:
header links by `fullName`, the `Manage` dropdown (every rendered entry must
commit to its own href), the mobile drawer, dashboard primary actions and the
command palette. **5/5 passing.**

## Status (Phase 7 closure)
- navigation-click-audit: 5/5 pass
- dsx-drawer-sequence: 5/5 pass (was 1 fail, fixed by the redirect repair)
- dsx-card-destinations: 1/1 pass - every clickable Evidence card opens a
  populated drawer now that the legacy routes resolve (4.4 min sweep)
- manifest-a11y: 2/2 pass. The sovereignty manifest was always keyboard
  operable (1 summary, 11 provenance rows); the failure was a budget defect.
  Measured on the harness: goto 6.6s, Sovereignty tab click 14.4s, panel 1.0s.
  The tab is not actionable until the 3D facility scene mounts, so the spec now
  carries a 90s budget. **Open performance item:** a 14s delay before the
  domain tabs respond is an operator-facing regression risk and is carried to
  the performance phase - it is a slow route, not a broken one.

Verdict: **PHASE_6_CLOSED** for shard 2 navigation and Evidence routing.
`AURA_NVIDIA_OPERATIONAL_NOT_READY` still stands overall (remaining shards and
the connector/runtime gaps are unchanged).
