# AURA_UX_P1_REMEDIATION_AND_RUNTIME_ACCEPTANCE - final report

## Build and revision
- Previous published build: index-CCUS0faN.js (unchanged; this pass was not published)
- New build identifier: not issued
- Git revision: see `baseline.json`
- Manifest version: unchanged
- Production default dataset: legacy-synthetic (unchanged)
- Capability registry and claims policy: unchanged, no NVIDIA capability added

## Scope executed
- Routes probed: 8 for overflow (5 breakpoints), 13 for dataset labelling, 9 for screenshots
- Roles tested: administrator only (injected preview session)
- Dataset modes tested: legacy-synthetic and nvidia-dsx-reference

## Results
- Reference-label coverage: 13/13 authenticated routes in reference mode, 0 duplicates, 0 labels in legacy mode
- Chart semantics: typed gate added; point-in-time and unavailable series cannot reach a trend renderer (5 tests)
- Overflow: 0 of 40 route-breakpoint probes overflow; root cause was a missing `min-w-0` on the shared main region
- Onboarding / entry loading: bounded to 12s with a terminal explained state; `/dashboard` settles under 2s
- Disabled actions, typography, target size, headings: NOT_REMEDIATED, carried in backlog
- Search, Assistant, exports, mutations, 3D manipulation, keyboard, screen reader, published-host role testing: BLOCKED_UNVERIFIED
- Screenshots captured: 54 (6 breakpoints x 9 pages); browser-zoom levels not captured
- Console errors observed: 0; failed-request instrumentation not run

## Files changed
- src/components/Layout.tsx
- src/components/dataset/DatasetCanaryBanner.tsx
- src/components/dsx/TrendStrip.tsx
- src/components/shared/BoundedLoading.tsx (new)
- src/data/dataset/chartSemantics.ts (new)
- src/data/dataset/__tests__/chartSemantics.test.ts (new)
- src/App.tsx

## Verdict
AURA_UX_P1_REMEDIATION_AND_RUNTIME_ACCEPTANCE_PARTIAL
