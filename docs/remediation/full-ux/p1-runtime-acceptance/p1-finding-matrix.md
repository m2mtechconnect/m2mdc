# P1 finding matrix - before and after

| Finding | Before | Action | After |
|---|---|---|---|
| Reference canary label present on 2/17 sampled reference routes | FAIL | Shell-owned sticky label with single-instance guard and one-time announcement (`src/components/dataset/DatasetCanaryBanner.tsx`) | 13/13 probed authenticated routes labelled, 0 duplicates, 0 labels in legacy mode |
| Point-in-time reference values rendered as trends | FAIL | Typed series-semantics gate (`src/data/dataset/chartSemantics.ts`) plus snapshot rendering path in `TrendStrip` | Point-in-time and unavailable series cannot reach a trend renderer; 5 regression tests |
| Horizontal overflow on 15 primary routes at 1024x768 and 390x844 | FAIL | `min-w-0` on the shared `<main>` content region (`src/components/Layout.tsx`) | 0 overflow rows across 8 routes x 5 breakpoints (40 probes), no document-level `overflow-x: hidden` used |
| `/onboarding` and authenticated entry spinning without a terminal state | FAIL | `BoundedLoading` with a 12s budget and retry / sign-out terminal state, wired into both App-level gates | `/dashboard` settles under 2s; a stalled resolution now reaches a terminal explained state |
