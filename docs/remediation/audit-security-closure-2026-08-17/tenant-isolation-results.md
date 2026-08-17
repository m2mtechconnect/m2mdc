# Tenant isolation results

Two probe contracts were inserted (`ISOLATION_PROBE_TENANT_A` with
`tenant_id = 1111...`, `ISOLATION_PROBE_TENANT_B` with `tenant_id = 2222...`), queried
through PostgREST as real identities, then deleted.

| Identity | Query | Result |
| --- | --- | --- |
| Anonymous | `GET /connection_data_contracts` | 401, no grant |
| Engineer (non-admin, no tenant membership in either probe tenant) | `GET /connection_data_contracts?select=schema_type,tenant_id` (**unfiltered**) | 200, 1 row: the platform template (`tenant_id: null`). Neither probe row returned |
| Engineer | `...&tenant_id=eq.1111...` (explicit tenant A) | 200, `[]` |
| Engineer | `...&tenant_id=eq.2222...` (explicit tenant B) | 200, `[]` |
| Admin | unfiltered | 200, all rows (admin/owner read-all policy, intentional) |

Key result: the **unfiltered** query is isolated. Row visibility does not depend on the
client supplying a filter, so no surface relies on client-side filtering.

`connection_instances`, `connection_health_checks`, `connection_audit_events`,
`connection_credentials` and the rest of the connections control plane were already
scoped through `public.current_tenant_id()` / `connection_visible()` in the earlier
tenant-scoping phase and were not modified here.

Limitation recorded honestly: only one live non-admin identity was available, and no
existing tenant currently owns contract rows, so tenant A vs tenant B was proved by
denial from a third identity rather than by two mutually-scoped memberships. The policy
predicate (`tenant_id = current_tenant_id()`) admits no other outcome, but a
two-membership positive test is listed as `BLOCKED_UNVERIFIED` in `remaining-skips.md`.
