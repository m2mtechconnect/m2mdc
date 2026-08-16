# Role and access matrix

Role model derived from `src/contexts/RBACContext.tsx`, `src/auth/permissions.ts`,
`public.user_roles` + `has_role()`, and the three-way classification in
`src/App.tsx` (`internal` / pilot / `error`). Permissions, not role labels, gate
the Manage navigation (`visibleManageNav`).

## Tested identities

| Identity | How obtained | Result |
| --- | --- | --- |
| Unauthenticated | no session, published host | All 47 internal routes and all `/admin/*` routes redirect to `/`. No protected DOM or protected data was rendered. Public surfaces limited to `/`, `/onboarding`, `/login`, `/twin-datacentre`, `/data-centre-twin`, `/omniverse-scene`. |
| Authenticated internal (injected preview session) | managed session | Full shell, all routes rendered as intended. |
| Approved-without-roles (pilot), unapproved, RBAC-error | not obtainable without creating or altering accounts | BLOCKED_UNVERIFIED - code paths reviewed only, not exercised. |

## Verified controls

- Direct-URL access to every admin route as an anonymous visitor: no bypass (P0 clean).
- Approval gate queries `profiles.is_approved` before any privileged shell mounts.
- RBAC lookup failure renders AuthorizationError instead of downgrading to pilot.
- Server-side enforcement is present (RLS + `has_role`), so client hiding is not the only protection.

## Limitations

Role-differentiated behaviour (pilot seal at `/pilot/*`, permission-filtered
Manage nav, elevated vs standard operator) could not be exercised because
creating or re-roling accounts was out of audit scope. Classified
BLOCKED_UNVERIFIED, not Pass.
