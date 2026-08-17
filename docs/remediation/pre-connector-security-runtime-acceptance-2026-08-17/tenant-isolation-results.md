# Tenant isolation results

All calls are direct PostgREST requests with each identity's own JWT. No
application code and no client-side filter is involved.

## connection_data_contracts

| Identity | Query | Result |
| --- | --- | --- |
| Anonymous | unfiltered read | 401, permission denied |
| User A | unfiltered read | 200, Tenant A probe present, Tenant B probe absent |
| User A | `tenant_id=eq.<Tenant B>` | 200, `[]` |
| User B | unfiltered read | 200, Tenant B probe present, Tenant A probe absent |
| User B | `tenant_id=eq.<Tenant A>` | 200, `[]` |
| User A | INSERT with Tenant B `tenant_id` | 403 |
| User A | INSERT with own `tenant_id` | 403 (contract authoring is admin-only) |
| Admin | unfiltered read | 200, all rows (documented admin read-all) |

Both directions are proved positively and negatively: each user reads its own
tenant row and cannot read the other's.

## connection_instances, connection_health_checks, connection_audit_events

Same matrix, same outcome. These tables are scoped through
`connection_visible()` / `connection_tenant_visible()`, which resolve tenancy
from `public.current_tenant_id()`.

| Identity | Unfiltered read | Cross-tenant filtered read |
| --- | --- | --- |
| Anonymous | 401 | 401 |
| User A | own tenant rows only | `[]` |
| User B | own tenant rows only | `[]` |

## connector_definitions (catalogue)

Publication-scoped rather than tenant-scoped, by design: a catalogue is a
platform-level list.

| Identity | Result |
| --- | --- |
| Anonymous | no rows |
| User A / User B | PUBLISHED `aura_test_probe_connector` visible; DRAFT `aura_test_probe_unpublished` not visible |
| Admin | both visible |

## app_user_connections (managed per-user connections)

Returns `200 []` for every non-service identity. The table's only policy is
`USING (false)`; the empty result is a fail-closed policy denial, not an
absence of data. Encrypted per-user handles are readable only by edge functions
using the service role.

## Bypass attempts, all failed

| Attempt | Outcome |
| --- | --- |
| Supplying a different `tenant_id` in the query string | ignored; policy predicate compares to `current_tenant_id()` |
| Supplying `tenant_id` in an INSERT body | 403 |
| Omitting all filters (relying on the server to leak) | only own-tenant rows returned |
| Calling REST directly instead of through the app | identical result; no client-side filter exists to remove |
| Anonymous access to any connection-plane table | 401 / permission denied |

Isolation does not depend on the client supplying a filter. That is the
material property: the unfiltered query is already isolated.

## Service-role access

`service_role` reaches these tables only through deployed edge functions
(`connection-health-check`, `managed-connector-verify`, `public-intake`). The
service key is never present in the browser bundle
(see `credential-exposure-audit.md`).

## Teardown

Probe rows removed; the two profiles' `org_id` values restored.
