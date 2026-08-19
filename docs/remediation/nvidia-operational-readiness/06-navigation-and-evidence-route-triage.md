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

## Status
- navigation-click-audit: 5/5 pass
- dsx-drawer-sequence: 5/5 pass (was 1 fail, fixed by the redirect repair)
- manifest-a11y: 1 fail remaining - sovereignty domain manifest is not
  keyboard-openable (carried to Phase 7)
- dsx-card-destinations: re-run pending after the redirect repair

Verdict: **PHASE_6_PARTIAL** - `AURA_NVIDIA_OPERATIONAL_NOT_READY` stands.
