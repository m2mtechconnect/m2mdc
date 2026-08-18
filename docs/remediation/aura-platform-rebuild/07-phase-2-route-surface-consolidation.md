# Phase 2 - Route surface consolidation

Baseline: 101 `path=` declarations across two routers, 8 duplicate literals, no
machine-readable inventory of which URL owns which page (see `00-baseline.md`
and `03-route-and-component-merge-map.md`).

## What was built

**`src/config/routeRegistry.ts`** - one declaration per mounted URL, recording
the owning shell (`public` / `session` / `internal`), the kind (`canonical`,
`redirect`, `dev-only`, `catch-all`), any permission guard, and a note for
every legacy route that is still mounted. Redirect *sources* stay in
`src/config/routeAliases.ts`; the registry deliberately does not duplicate them.

**`src/config/__tests__/routeRegistry.test.ts`** (10 tests) reads `App.tsx` and
`AuthenticatedShell.tsx` as source text and fails on:

- a mounted path with no declaration, in either router or in the Evidence
  child block;
- a stale declaration for a path that no longer exists;
- the same internal path declared twice;
- a `ROUTE_ALIASES` source that is also mounted as an implementation;
- an alias whose target is itself an alias (redirect chains);
- an `/admin/*` route, or any route the registry marks `guard: 'admin'`, that
  is not wrapped in `AdminRouteGuard`.

## Defects the registry exposed and fixed

| Defect | Fix |
|---|---|
| `/twin-debug` rendered tenant twin ids, raw query state and telemetry sources to any internal user | now wrapped in `AdminRouteGuard`, declared `guard: 'admin'` |
| `/auth`, `/sign-in`, `/sign-up`, `/forgot-password`, `/mfa`, `/digital-twins`, `/digital-twins/:slug` redirected to `/`, which is itself an alias of `/dashboard` | retargeted to `/dashboard`: one hop, one history entry, no landing-page frame |

## Duplicate literals: measured vs real

The 8 duplicate literals in the baseline are not 8 conflicts. `/sign-out`
(x6) and the catch-alls (x6) are one declaration per *disjoint* router branch
- unauthenticated, pending-approval, authorization-error, internal, pilot -
and only one branch ever renders. `/sign-out` in particular must stay in every
branch so that signing out never depends on the classification that is
failing. `/twin-preview`, `/login`, `/onboarding`, `/data-centre-twin` and
`/dev-overlays` appear once in the public router and once in the internal
shell, which are likewise mutually exclusive. The registry records the shell
for each, so the distinction is now explicit rather than inferred.

## Not done in this phase

The page *merges* in `03-route-and-component-merge-map.md` -
`/infrastructure` into operations, `/data-centre-twin` into `/blueprint/:id`,
`/blueprint/preview` and `/simulation/preview` into their parents, the five
viewport implementations into one - move real functionality and are Phase 3+.
Every one of those routes is now declared with a note stating why it is still
mounted, so the remaining work is enumerable rather than archaeological.

## Verification

- `vitest`: 1756 passed / 91 skipped (+10).
- Typecheck: clean.
- Build: succeeds.
