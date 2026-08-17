# Phase 11 - security P0 remediation and bundle hardening

## 1. MFA - simulation removed (P0)

`src/pages/auth/MFA.tsx` accepted any six digits, waited 1500 ms, showed
"Verification successful!" and navigated to `/`. No Supabase `auth.mfa.*`
call, no enrollment, no challenge, no AAL2 requirement on any route: it was a
visual imitation of a security control.

The page is now a non-interactive `Status: UNAVAILABLE` panel. The MFA toggle
in `src/pages/account/Settings.tsx` is forced off, disabled and labelled
unavailable. Re-enable only with enroll -> challenge -> verify -> recovery
codes -> route-level AAL2 enforcement.

## 2. Administration routes - authorization added (P0)

`/admin/*` pages were mounted unconditionally by `AuthenticatedShell`; access
control was navigation-link hiding plus per-page checks. Any approved user who
typed the URL mounted the page and its queries.

`src/routing/AdminRouteGuard.tsx` now wraps all 10 admin routes. It fails
closed: `loading` renders a status message, anything other than an internal
resolution holding `admin` / `security_admin` redirects to `/dashboard`. This
is defence in depth only - RLS remains the security boundary.

## 3. Omniverse streaming library - no longer global

`index.html` loaded `/omniverse-webrtc-streaming-library.umd.js` (722 KB) on
every page view, including anonymous marketing routes, while
`readKitConfig()` reports Kit as typed-unavailable in every build.

The tag is removed. `src/integrations/omniverseKit/streamingLibraryLoader.ts`
loads it on demand behind four gates: provider selected, provider configured,
health check passed, permission held. Four tests assert each refusal and that
no script element is injected on a refused load. Vendor provenance and licence
are recorded in the module header.

## 4. Route-level code splitting

Only `Dashboard` and `NotFound` remain eager in the authenticated shell; 57
other routes are `React.lazy`, under one `Suspense` boundary with a polite
live-region fallback.

| Artifact | Before | After |
| --- | --- | --- |
| `AuthenticatedShell` chunk | 2,448,792 B | 385,545 B (-84%) |
| Largest route chunk | (in shell) | `Builder` 561,388 B |
| Global Omniverse script in `index.html` | 722 KB | none |

Evidence: `evidence/build-before.txt`, `evidence/build-after.txt`.

## Verification

- `bunx tsgo --noEmit`: no diagnostics.
- `bunx vitest run`: 1728 passed / 91 skipped, 165 files.
- `bunx vite build`: exit 0; `dist/index.html` contains zero
  `omniverse-webrtc` references.
