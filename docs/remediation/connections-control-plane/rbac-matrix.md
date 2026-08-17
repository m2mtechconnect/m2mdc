# RBAC matrix

Existing roles only; no role invented. Corrected after implementation audit.

| Capability | admin / owner | engineer / operator | viewer | anonymous |
| --- | --- | --- | --- | --- |
| View connections, catalogue, mappings, activity | yes | yes | yes | no (auth required) |
| Run health check | yes | **no** (edge function requires admin or owner) | no | no |
| Insert/update connection instances | yes (RLS `has_role admin/owner`) | no | no | no |
| Insert/update twin mappings | yes (RLS `has_role admin/owner`) | no | no | no |
| Write health checks, ingest runs, audit events | no client write path; service role only | no | no | no |
| Platform readiness page | yes | read-only | read-only | no |

Navigation entry is gated on `twin.edit`. Data API privileges were tightened after the audit: the
five evidence tables grant `SELECT` only to `authenticated`; `connection_instances` and
`connection_twin_mappings` grant write, gated by administrator RLS policies. `anon` has no
privilege on any control-plane table.

Known gap: SELECT policies are `USING (true)` for authenticated users. There is no tenant or
facility scoping yet, so tenant isolation is NOT enforced at the row level. This must be added
before multi-tenant data is stored.
