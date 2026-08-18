# Suspense retry / route-commit — diagnosis pass (incomplete)

## Runtime inventory (installed, from node_modules)
react 18.3.1, react-dom 18.3.1 (match, single copy under node_modules/react — no
nested duplicate found), react-router-dom ^6.30.1, vite ^5.4.19, zustand ^5.0.8,
@tanstack/react-query ^5.83.0, typescript ^5.8.3, node v22.22.0, bun 1.3.3,
@playwright/test ^1.56.1 (chromium channel).

## Step 2 — deterministic stress reproducer (NEW, retained)
`tests/route-stress/route-commit-stress.spec.ts` + `playwright.route-stress.config.ts`.
Asserts a terminal state (layout committed or bounded recovery); no fixed sleeps.

Baseline run (`stress-baseline.json`, dev server, 10 cold + 10 warm):
- failures 3/20 (cold-0, warm-7, warm-8) — both geometries, direct and Back/Forward
- healthy commit time p50 1,385 ms, p95 1,601 ms, max 1,601 ms
- every failure sat at exactly the 20 s budget on `Loading workspace...`

Healthy commits are ~1.3-1.6 s, so the current 90 s regression timeout is pure
inflation; a ~10 s budget is defensible once the defect is fixed.

## Step 7E — main-thread scheduling (diagnostic, probe removed)
On a reproduced hang:
- longtasks: 112 ms, 497 ms, 74 ms — all before 4.4 s, none during the stall
- requestAnimationFrame kept ticking (862 ticks) — main thread is idle and alive
- a synthetic click did not wake the tree
- a viewport resize did not wake the tree
- no console errors, no pending requests

Conclusion: the retry is **not** starved by a synchronous main-thread task, and no
external event re-schedules the boundary. React holds a resolved lazy thenable and
performs no further work on that root.

## Steps 3-4 — identity (static audit, no regression test yet)
- every `lazy(() => import(...))` in `src/AuthenticatedShell.tsx` (incl.
  `DataCentreTwin`, line 64) and `src/App.tsx` (line 38) is declared at module scope
- no lazy declared inside a component, hook, `useMemo` or route factory
- no `startTransition`, `useTransition` or `useDeferredValue` anywhere in `src/`
- `main.tsx` does not use `StrictMode`
- the route-level `<Suspense>` in `AuthenticatedShell` carries no key, and no
  `location.key`/twin-id key is applied to the shell, gate or boundary

## Not completed in this pass
Steps 5, 6, 7A-7D, 8, 9, 10, 11. Root cause is **not** proven, so no product code
was changed and no fix was retained.

## Verdicts

## Parts 6-7 — suspending-resource inventory and partial A/B matrix

Inventory (static, `rg` over `src/`): the only suspending resources reachable
above/inside `/data-centre-twin` are `React.lazy` module thenables. There are no
`use()`, no `useSuspenseQuery`, no `suspense: true`, no `.read()` resource
patterns, no lazy i18n/flag loading. `AuthenticatedShell` is lazy in `App.tsx`
(caught by the App-level `<Suspense fallback={<LoadingScreen/>}>`); every page
including `DataCentreTwin` is lazy at module scope in `AuthenticatedShell.tsx`
(caught by the shared `Loading workspace...` boundary). All promises are created
once per module by `lazy()` and cached in the lazy payload, so retry reuses the
same thenable and success is synchronously readable afterwards.

A/B matrix executed with a temporary probe harness (24 warm navigations each,
both geometries, direct + Back/Forward + reload; probes removed afterwards):

| Variant | Route | Failures |
| --- | --- | --- |
| Warm baseline (real lazy page, shared boundary) | `/data-centre-twin` | 1 / 24 |
| B — minimal module-scope lazy page (no stores, no queries, no effects), shared boundary | `/dev-minimal-lazy` | 8 / 24 |
| C — same minimal lazy page, stable route-local `<Suspense>` | `/dev-minimal-lazy-local` | 2 / 24 |

Raw rows: `variant-warm-baseline.json`, `variant-B-minimal-lazy.json`,
`variant-C-local-boundary.json`.

### What this proves
- The defect is **not** in `DataCentreTwin`, its module graph, the visualization
  subtree, or any store/query it owns: a page that returns a static `<div>`
  immediately after import hangs *more* often (8/24 vs 1/24).
- The defect is **not** the shared boundary alone: a stable route-local
  boundary still hangs (2/24), and in that variant the shared fallback was not
  even visible.
- Therefore the lost retry originates **above** the route boundary — in the
  shell ancestor chain (`TourProvider` → `CoPilotProvider` →
  `CoPilotCommandProvider` → `DatasetProvider` → `Layout` →
  `ReferenceRouteGate`) or in the App-level lazy/`Suspense` for
  `AuthenticatedShell` itself. Variants A (eager), D (pre-resolved) and E
  (visualization-free shell) and the Part 5 store-churn timelines were not run.

Root cause is **not** proven, so no product code was changed and no fix was
retained. Parts 8-11 were not started.

## Verdicts
- AURA_SUSPENSE_RETRY_NOT_CLOSED
- AURA_TEST_HARNESS_NOT_CLOSED
- AURA_DATA_CENTRE_ROUTE_NOT_CLOSED
- AURA_NVIDIA_REFERENCE_UI_NOT_CLOSED
- Phase 3 verdict unchanged.

## Shell/route matrix (this pass) — nested lazy suspension is causal

Harness: `tests/route-stress/route-commit-stress.spec.ts` (now accepts
`AURA_STRESS_URLS`), dev server, 24 warm navigations per variant, both geometry
values, direct + Back/Forward + reload, budget 15 s. Navigation discipline: the
harness is strictly sequential (each navigation awaits a terminal state), so no
overlapping navigations are possible; the URL was stable during every stall.

| Variant | App shell | Route page | Failures / 24 | p50 |
| --- | --- | --- | --- | --- |
| S1 | lazy | lazy minimal | 11 | 842 ms |
| S2 | eager (static import) | lazy minimal | 0 | 811 ms |
| S3 | lazy | eager minimal | 0 | 475 ms |
| S5 | pre-resolved lazy (import kicked off at module scope) | lazy minimal | 7 | 789 ms |

### Proven
The hang requires **two nested lazy suspensions in the same navigation**: the
App-level `AuthenticatedShell` lazy AND a route-level lazy page under the shell's
`Suspense`. Removing either side of the nesting eliminates it completely (S2, S3
both 0/24). Pre-resolving the shell promise only reduces the rate (7/24), so the
defect is a lost retry/ping on the inner boundary when the outer boundary retries
in the same pass — not module-load timing and not any single provider.

Store-churn, provider-peeling, ReferenceRouteGate and Layout isolation were NOT
needed to reach this boundary and were not run: S3 shows the entire ancestor
chain (TourProvider → CoPilotProvider → CoPilotCommandProvider → DatasetProvider
→ Layout → ReferenceRouteGate) commits an eagerly-imported page 24/24 with the
shell still lazy.

### Not implemented
No fix was retained. The obvious candidate (eager shell, S2) conflicts with the
pilot bundle isolation contract enforced by `scripts/pilot-bundle-canary.mjs`,
which forbids a static `AuthenticatedShell` import from `App.tsx`. A
non-suspending shell loader was prototyped (S8) and failed 24/24, i.e. the
prototype was wrong, not the idea; it needs redoing before adoption. All
temporary variants, the minimal probe page and the loader prototype were removed;
only the `AURA_STRESS_URLS` parameter on the stress harness is retained.

### Verdicts (unchanged)
- AURA_SUSPENSE_RETRY_NOT_CLOSED
- AURA_TEST_HARNESS_NOT_CLOSED
- AURA_DATA_CENTRE_ROUTE_NOT_CLOSED
- AURA_NVIDIA_REFERENCE_UI_NOT_CLOSED
- Phase 3 verdict unchanged.
