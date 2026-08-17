# Published route sweep - final build

Host: https://auradc.m2mtechconnect.com
Build: bmswht9e1 | Bundle: index-C6g0i7CT.js | Manifest: v7 | Deployed: 2026-08-17T00:56Z (UTC)

- Anonymous routes tested: 65 (`evidence/final-published-build/sweep-anonymous.json`)
- Authenticated routes tested: 65, engineer session lucas@m2mtechconnect.com (`evidence/final-published-build/sweep-authenticated.json`)

Results:
- All 52 protected routes redirect anonymous visitors to `/` (landing). No protected content rendered.
- Public routes (`/`, `/login`, `/onboarding`, `/twin-datacentre`, `/data-centre-twin`, `/omniverse-scene`) render anonymously by design.
- Signed-in `/login`, `/onboarding`, `/auth`, `/sign-in`, `/sign-up`, `/forgot-password`, `/mfa` redirect to `/dashboard`. No 404.
- `/deploy` renders its deliberate explanation ("Deployment runs against one configured system ... this route needs an ?id= system identifier") with an Open Builder action.
- `/connect/monitor` reaches a truthful terminal state: "No ingestion service is connected to this workspace. The jobs below are demonstration data, not live telemetry." plus a last-checked timestamp. No permanent blocking spinner; only the inline refresh affordance is animated.
- Admin-only routes (`/admin/asset-preview`, `/admin/asset-pipeline`, `/admin/asset-validation/...`, `/admin/reference-facility-validation`) redirect the non-admin engineer to `/dashboard`.
- Alias routes resolve once: `/agents` to `/app/agents`, `/integrations` to `/manage/integrations`, `/facilities` to `/manage/facilities`, `/universal-search` to `/search`, `/command` to `/dashboard`. No duplicate `/integrations` navigation entry present.
- `/simulation` resolves to `?step=inspect`; `?step=` deep links hold (see simulation-workflow.md).
- Unknown route renders the 404 page with an explicit logged message.
- Only recurring failed requests are third-party analytics beacons (`*.clarity.ms/collect`) blocked by the sandbox network, not application requests.
