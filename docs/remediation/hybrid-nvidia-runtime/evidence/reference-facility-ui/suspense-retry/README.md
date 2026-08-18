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
- AURA_SUSPENSE_RETRY_NOT_CLOSED
- AURA_TEST_HARNESS_NOT_CLOSED
- AURA_DATA_CENTRE_ROUTE_NOT_CLOSED
- AURA_NVIDIA_REFERENCE_UI_NOT_CLOSED
- Phase 3 verdict unchanged.
