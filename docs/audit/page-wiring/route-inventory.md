# AURA route inventory (evidence-based)

Source of truth: `src/App.tsx` (public + gate router), `src/AuthenticatedShell.tsx`
(approved-internal router), `src/pilot/PilotShell.tsx` (pilot router),
`src/config/routeAliases.ts` (aliases). Runtime evidence:
`evidence/published-sweep-anonymous.json`, `evidence/published-sweep-authenticated.json`.
Host swept: `https://auradc.m2mtechconnect.com` (the `m2mdc.lovable.app` URL 302s here).

## Router layers

| Layer | Gate | Routes |
| --- | --- | --- |
| Public (unauthenticated) | none | `/`, `/onboarding`, `/login`, `/auth`, `/sign-in`, `/sign-up`, `/sign-out`, `/forgot-password`, `/mfa`, `/twin-datacentre`, `/data-centre-twin`, `/omniverse-scene`, `*` -> `/` |
| Approved but unclassified | session + `profiles.is_approved` | `*` -> PendingApproval |
| RBAC error | resolution error | `*` -> AuthorizationError |
| Pilot (restricted) | approved, no `user_roles` row | `/pilot/overview`, `/pilot/asset/:twinId`, `*` -> `/pilot/overview` |
| Internal (full app) | approved + `user_roles` row | 47 declared routes + 25 alias routes + `*` -> NotFound |

Auth pages under the unauthenticated router are additionally gated on
`localStorage.onboarding_completed`; without it `/auth`, `/sign-in`, `/sign-up`,
`/forgot-password`, `/mfa` redirect to `/onboarding` (confirmed at runtime).

## Declared internal routes (evidence summary)

65 paths were navigated on the published host as an anonymous visitor and as an
authenticated internal user. Per-route final URL, title, H1, spinner state,
console errors and application network failures are recorded in
`route-inventory.json`. Highlights:

- Every authenticated route rendered its intended component and title as the
  internal user (e.g. `/analytics` -> "Telemetry and analytics",
  `/admin/asset-pipeline` -> "Asset pipeline").
- Every authenticated route, including all `/admin/*` routes, redirected an
  anonymous visitor to the public landing page. No direct-URL bypass was found.
- Alias routes resolve as declared: `/agents`->`/app/agents`,
  `/integrations`->`/manage/integrations`, `/facilities`->`/manage/facilities`,
  `/command`->`/dashboard`, `/universal-search`->`/search`,
  `/twin-datacentre`->`/blueprint/default`.
- `/dsx/evidence-beta/*` rewrites the URL with `scenario`, `mode`, `run` and
  `tick` query parameters and those survive hard refresh.

## Dynamic and query-controlled routes

`/agent/:id`, `/agents/:id/chat`, `/app/agents/:slug/detail`,
`/app/agents/:agentId/manage`, `/app/agents/:agentId/operations` (redirect),
`/twins/:instanceId/manage` (redirect), `/studio/systems/:systemId/manage`,
`/blueprint/:id`, `/data-centre-twin/:id`, `/data-centre-twin/:id/blueprint`,
`/admin/asset-validation/:assetId`, `/pilot/asset/:twinId`.
Query-controlled surfaces: `/data-centre-twin` (`facility`, `view`, `layer`,
`designScenario`, `realism`), `/simulation` (`twin`, `step`), `/blueprint/:id`
(`tab`, `sub`, `layer`), `/builder` (`twinId`), evidence workspaces
(`scenario`, `mode`, `run`, `tick`, `kpi`, `claim`).

## Deprecated / dev-only

`/dev-overlays` is mounted only when `import.meta.env.DEV`; it is absent from
the published bundle. `/deploy` still resolves but immediately toasts
"No system selected" and lands on `/builder`.
