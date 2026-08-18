# Phase 1 - single authorization decision, and dead entitlement-gated code removed

## 1. Authorization consolidation (baseline finding 4.6)

Three sources of truth answered "may this caller reach the administration console":

| Source | Rule before |
|---|---|
| `src/auth/permissions.ts` (declared canonical) | `platform.view_admin_console` -> admin, security_admin, **owner** |
| `src/routing/AdminRouteGuard.tsx` | hardcoded `['admin','security_admin']` - excluded `owner` |
| `AdminUserApproval.tsx`, `AdminSignupsDashboard.tsx` | `allowedRoles={['executive','manager','admin']}` - **admitted executive and manager** |

The third rule was the security-relevant one: an `executive` or `manager` who typed
`/admin/user-approvals` was refused by the route guard, but the same page component rendered
its content wherever else it was mounted, because it policed itself with a wider list.

After:
- `AdminRouteGuard` compares no role labels. It resolves `can('platform.view_admin_console')`
  and exports `ADMIN_CONSOLE_PERMISSION`. Fail-closed states are unchanged (loading renders a
  status region, error and pilot redirect to `/dashboard`).
- Both admin pages now use `requiredPermissions={['platform.view_admin_console']}`.
- Effective change in who is admitted: `owner` gains access (matching the canonical matrix),
  `executive` and `manager` lose it (they never should have had it).

Locked by `src/routing/__tests__/adminAuthorization.test.ts` (17 tests): per-role admission,
expired grant, scope-qualified grant, no `hasAccess`/role literal in the guard, no
`allowedRoles` on admin pages, and every `/admin/*` route wrapped by the guard.

## 2. Entitlement-gated dead code removed

`public/omniverse-webrtc-streaming-library.umd.js` (722,923 bytes, NVIDIA Omniverse licence,
redistribution entitlement-gated) had **no production consumer** - only
`streamingLibraryLoader.ts` and that loader's own tests referenced it - yet it was served
from the public origin to anonymous visitors.

- File deleted; it is no longer emitted into `dist/`.
- `STREAMING_LIBRARY_VENDORED = false` added, and the loader now refuses with the new
  `asset-not-vendored` outcome before touching the DOM, ahead of the config/health gates.
- Reinstatement requires an authenticated, entitlement-checked delivery path (not `public/`),
  an SBOM entry with source/licence/checksum, and confirmation that the exported global name
  matches the shipped bundle. Recorded in the file header.

Matrix row updated: App Streaming session management stays **absent**, and the "dead code"
qualifier is now accurate rather than aspirational.

## 3. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `npx vitest run` | **1746 passed / 91 skipped** (was 1728/91; +18 new tests) |
| `SKIP_SEO_GATE=1 npx vite build` | exit 0, no omniverse asset in `dist/` |
| lint | unchanged at 1288 errors / 153 warnings - not addressed in this phase |

## 4. Rollback

Restore `src/routing/AdminRouteGuard.tsx`, the two admin pages,
`src/integrations/omniverseKit/streamingLibraryLoader.ts` and its test, delete the new test
file, and restore the vendored bundle from history. No schema, route or dependency changed.

## 5. Claims status

Permitted: "administration-console access is decided by one canonical permission, verified by
test"; "no entitlement-gated NVIDIA binary is shipped to browsers".
Withdrawn: the Phase 11 statement that the streaming loader was a live demand-load path - it
was unreachable dead code.
Still blocked: B-1 to B-9 from `00-baseline.md` are unchanged.
