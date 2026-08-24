# Diagnosis: "Loading workspace..." on /dashboard (read-only)

No code, deployment or database changes were made. This is a findings report only.

## 1. Exact UI that renders the string

`src/AuthenticatedShell.tsx`, `export default function AuthenticatedShell()` (lines ~183-207).

The string exists exactly once in the source tree. It is the `fallback` of a single `<Suspense>`:

```text
TourProvider
 └─ CoPilotProvider
     └─ CoPilotCommandProvider
         └─ DatasetProvider
             └─ Layout
                 └─ ReferenceRouteGate
                     └─ RouteLoadRecovery (error boundary, resetKey = pathname)
                         └─ Suspense fallback="Loading workspace..."
                             └─ ApprovedUserRoutes  →  <Route path="/dashboard" element={<Dashboard/>} />
```

`Dashboard` is `lazy(() => import("./pages/Dashboard"))` (line 20), and `src/pages/Dashboard.tsx` re-exports `src/workspace/CommandCentre.tsx`.

## 2. What must resolve before the text disappears

Two layers, and only the second one owns this text.

Ancestors that must already have succeeded for this text to be on screen at all (if any of these were unresolved the user would see a *different* surface):

- `src/App.tsx` → `src/AuthenticatedSessionApp.tsx`: `supabase.auth.getSession()` and `fetchProfileFields(user.id, 'is_approved')` (`src/lib/auth/profileQuery.ts`). Unresolved ⇒ `BoundedLoading stage="session"|"approval"`; not approved ⇒ `PendingApproval`.
- `src/ApprovedUserRouter.tsx` + `src/contexts/RBACContext.tsx` (`RBACProvider.fetchAuthorization`): `auth.getUser()`, `select user_roles`, `select org_memberships (status=active)`, conditional `select organizations`, `rpc('active_org_id')`. Unresolved ⇒ `BoundedLoading stage="authorization"`; any error ⇒ `src/pages/AuthorizationError.tsx` ("Authorization unavailable").
- `DatasetProvider` (`src/data/dataset/DatasetProvider.tsx`) and `ReferenceRouteGate` (`src/components/dataset/ReferenceRouteGate.tsx`) are synchronous; they read RBAC context only.

The Suspense boundary itself resolves on exactly one condition:

- the dynamic `import("./pages/Dashboard")` module request (and its statically imported graph: `workspace/CommandCentre`, `facilityModel`, `workspaceStore`, `runFixtures`, `scenarioEngine`, `dashboard/*`) settles.

Verified: no data dependency can hold this boundary. `CommandCentre` performs no suspending reads - it uses `useFacilityModel` (pure, derives from `useActiveTwin` state), Zustand stores, `useSearchParams` and `sessionStorage`. There is no `useSuspenseQuery`, no React `use()`, no `suspense: true` React Query config, and no top-level `await` anywhere in `src/` (only in a test file). `ActiveTwinProvider` renders children unconditionally and never gates on `isLoading`.

## 3. Behaviour under the stated production data shape

324 profiles, 20 user_roles, 0 organizations, 0 org_memberships, all `profiles.org_id` null.

Verified against the live schema (read-only): `public.active_org_id()`, `public.is_org_member(uuid,uuid)` and `public.has_role(uuid,app_role)` all exist; `user_roles_read_own` (`auth.uid() = user_id`) and `org_memberships_read` (`user_id = auth.uid() OR org_has_role(...)`) are non-recursive and return an empty set rather than an error; `organizations` is only queried when `orgIds.length > 0`, so it is never queried at all in this state; `active_org_id()` returns null.

Consequence in `RBACContext`:

- `memberships = []`, `activeMembership = null`, `activeOrgId = null`, `organizationRole = null`.
- If the user has any mapped platform grant, `resolution = { status: 'internal' }`.
- If not, `resolution = { status: 'pilot' }` ⇒ `ApprovedUserRouter` redirects to `/pilot/overview`; `/dashboard` is never reached, so this text is not what those users see.

So none of the org-shaped dependencies can hold "Loading workspace..." on screen. Their failure modes are the pilot shell, `AuthorizationError`, or `BoundedLoading` - all visually distinct.

## 4. Most likely root cause

The persistent "Loading workspace..." is a **module-loading stall of the `/dashboard` lazy chunk**, not an authorization or tenancy condition. The boundary has exactly one dependency (the dynamic import), and the observed state means RBAC already resolved to `internal` or `tenant`.

Ranked causes consistent with the code:

1. Stale `index.html` referencing hashed chunks removed by a newer deploy, where the chunk request hangs (or is served a non-JS body) rather than rejecting. A clean rejection would be caught by `RouteLoadRecovery` and render "This workspace could not be loaded", so an *indefinite* fallback implies a request that never settles.
2. A never-settling network fetch for the chunk (proxy/CDN hold, offline tab resumed).
3. Any ancestor re-mount loop restarting the boundary. `RouteLoadRecovery` resets on `resetKey = location.pathname`; `DatasetProvider`'s effect issues `navigate(..., { replace: true })` only when an admin reference-canary intent exists and the param is missing, which would re-run on pathname change - worth confirming in a live console before excluding.

Files to inspect for confirmation: `src/AuthenticatedShell.tsx` (boundary), `src/routing/RouteLoadRecovery.tsx` (would have caught a rejection), `src/data/dataset/DatasetProvider.tsx` (navigate effect). Evidence needed from production: the Network panel state of the `Dashboard-*.js` request (pending vs 404 vs 200 text/html) and whether `[RouteLoadRecovery]` appears in the console.

## 5. Can an approved global admin enter the normal shell without an organization?

Yes, under current code. `AuthenticatedSessionApp` gates only on `profiles.is_approved`. `RBACContext` sets `status: 'internal'` from `platformAuthorization.primaryRole` (derived from `user_roles`) **before** it considers membership, and `ApprovedUserRouter` routes both `internal` and `tenant` to `AuthenticatedShell`. `activeOrgId` stays null and org-scoped RLS simply returns no rows; nothing blocks shell entry. Users with no platform grant and no membership are the ones sealed into `/pilot/overview`.

No remediation proposed.
