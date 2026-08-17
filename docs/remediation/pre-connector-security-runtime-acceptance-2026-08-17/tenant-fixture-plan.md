# Tenant fixture plan

## Design

Synthetic, clearly-labelled, no customer data. All identifiers are RFC-style
reserved patterns so a fixture row is unmistakable in any table dump.

| Element | Value |
| --- | --- |
| Tenant A | `11111111-1111-1111-1111-1111111111a1` |
| Tenant B | `22222222-2222-2222-2222-2222222222b1` |
| User A (non-admin) | existing engineer account, `org_id` temporarily set to Tenant A |
| User B (non-admin) | existing engineer account, `org_id` temporarily set to Tenant B |
| Probe marker | every row carries `ISOLATION_PROBE_TENANT_A` / `ISOLATION_PROBE_TENANT_B` |

Tenant identity is not a fixture-only concept: `public.current_tenant_id()` is
`SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1`, so a
membership is expressed by the user's own profile row and cannot be supplied by
the client.

## Tables seeded

One Tenant-A row and one Tenant-B row in each of:

- `connection_data_contracts`
- `connection_instances`
- `connection_health_checks`
- `connection_audit_events`

Plus two catalogue rows in `connector_definitions`
(`aura_test_probe_connector` = PUBLISHED, `aura_test_probe_unpublished` = DRAFT)
to prove publication scoping, which is global rather than tenant-scoped.

## Access paths exercised

Direct PostgREST REST calls with each identity's own JWT — not through the
application UI — so the result measures the database policy, not client-side
filtering. Anonymous calls use the publishable key with no JWT.

## Teardown

Probe rows are deleted and the two profiles' `org_id` values are restored after
the run. Nothing about this fixture is required for the application to operate.
