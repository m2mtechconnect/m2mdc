# Console and network findings (published host)

Evidence: `evidence/published-sweep-authenticated.json`, `evidence/published-sweep-anonymous.json`.

| Route | Finding | Class | Severity |
| --- | --- | --- | --- |
| `/login` (signed in) | Renders the 404 page and logs "404 Error: User attempted to access non-existent route: /login". `/login` exists only in the unauthenticated router. | DEAD_ROUTE | P2 |
| `/onboarding` (signed in) | Same 404 behaviour. | DEAD_ROUTE | P3 |
| `/simulation/preview` | 6 uncaught `TypeError: Failed to fetch` from the Supabase auth client; `/auth/v1/user` aborted repeatedly. | DATA_INTEGRITY_DEFECT | P2 |
| `/admin/reference-facility-validation` | 6 aborted `GET /rest/v1/profiles?...&user_id=` with an empty user id. | DATA_INTEGRITY_DEFECT | P2 |
| `/connect/monitor` | Loading spinner never settles. | NOT_WIRED (partial) | P2 |
| `/` (landing) | `rack_42u_a.glb` request aborts; fallback renders. | WIRED_WITH_LIMITATIONS | P3 |
| All pages | `*.clarity.ms/collect` beacons abort (analytics blocked in the harness). Not an application defect. | informational | - |
| All pages | Two `fonts.gstatic.com` woff2 requests abort on the landing page. | informational | P3 |

No CORS errors, no failed dynamic imports, no missing exports, no hydration
errors, no unexpected redirect loops and no unauthorized data in redirect
responses were observed. `*` correctly renders NotFound inside the shell and
redirects to `/` for anonymous visitors (SPA fallback is not masking a missing
bundle: `index.html` returns 200 and the app boots on every path).
