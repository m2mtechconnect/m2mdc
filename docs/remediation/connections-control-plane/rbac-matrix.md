# RBAC matrix

Existing roles only; no role invented.

| Capability | admin / owner | engineer / operator | viewer | anonymous |
| --- | --- | --- | --- | --- |
| View connections, catalogue, mappings, activity | yes | yes | yes | no (route requires auth) |
| Run health check | yes | yes (permitted connections) | no | no |
| Configure / activate / disable | yes | no | no | no |
| Manage credential references | yes | no | no | no |
| Manage mappings | yes | no | no | no |
| Remove connection | yes (confirmation; system connections blocked) | no | no | no |
| Platform readiness page | yes | read-only | read-only | no |

Enforced client-side through `RBACContext` (`twin.edit` gate on the navigation entry) and
server-side by RLS plus the edge function's role check.
