# Duplicate destinations - recommendations only, no routes removed

| Destination | Classification | Recommended canonical | Strategy |
|---|---|---|---|
| User approvals (`/admin/user-approval`, `/admin/signups-dashboard`) | Duplicate primary navigation | Signups dashboard | Keep both routes, demote the older one to an alias in a later navigation phase |
| Agent chat (`/agent-chat`, agent workspace chat) | Contextual entry | Agent workspace | Keep the standalone route as a bookmarkable alias |
| Three 3D entry routes (`/data-centre-twin`, `/omniverse-scene`, `/twin-debug`) | Legacy plus diagnostic | `/data-centre-twin` | `/omniverse-scene` becomes an alias; `/twin-debug` stays developer-only |
| `/deploy` | Legacy route | Deployment history | Alias with preserved query string |
| `/omniverse-scene` | Legacy route with an NVIDIA-implying name | `/data-centre-twin` | Alias, preserving bookmarks and permissions |

Implementation belongs to the later navigation-remediation phase. None of these creates a P1
workflow error today.
