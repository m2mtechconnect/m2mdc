# Published runtime verification

Canonical host: https://auradc.m2mtechconnect.com
Bundle: `assets/index-BLh1dE2h.js` (previous: `assets/index-CTdIrJhu.js`)
Source revision: ae7c8049df705dfb0d0a0ed17e2f35f03c78ed01
Verified: 2026-08-17T02:27:21.734915Z

## Route sweep

| Role | Routes | Console errors | Permanent spinners | Hard failures |
|---|---|---|---|---|
| Anonymous | 83 | 1 | 0 | 0 |
| Authenticated (admin) | 83 | 4 | 1 | 0 |

Anonymous requests to protected routes redirect to the public entry (79 of 83 routes land on `/`, `/login`, `/auth` or `/onboarding`). Authenticated entry redirect sends `/`, `/login`, `/auth`, `/sign-up` and `/mfa` to `/dashboard`.

## Known limitations carried forward

- `/blueprint/%%%bad-id` returns HTTP 400 from the static host before the SPA executes. Accepted hosting limitation, not a bundle defect.
- `/studio/systems/does-not-exist/manage` (400) and `/app/agents/does-not-exist/detail` (406) now terminate with error states rather than spinning.
- `/connect/monitor` shows a transient sync-feed spinner during initial fetch.
- Third-party `clarity.ms` and Google Fonts requests fail inside the sandbox network; excluded from defect counts.
- One optional GLB derivative (`rack_42u_a.glb`) 404s on the landing route and falls back cleanly.

Raw evidence: `evidence/published-build/anon-route-sweep.json`, `evidence/published-build/admin-route-sweep.json`, `evidence/published-build/build-metadata.json`.
