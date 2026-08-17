# Connection workflow

Status: IMPLEMENTED (setup wizard) with named limitations.

## Wizard steps (`src/components/connections/ConnectionSetupWizard.tsx`)
1. Connector - only definitions with `implementation_status = IMPLEMENTED` and a runtime adapter.
2. Tenant and scope - tenant (`organizations`), facility (`data_centre_twins`), environment.
3. Data contract - connection name, direction, data classes drawn from the connector definition.
4. Authentication - method must be supported by the connector and must not require a stored secret.
5. Test - server-side health check via `connection-health-check`.
6. Activate - enables the connection, only after a persisted PASSED check.

Step logic is pure and unit-tested in `src/connections/wizardModel.ts`
(`src/connections/__tests__/wizardModel.test.ts`, 8 tests).

## Server enforcement (`supabase/functions/connection-provision`)
Admin/owner role required; connector eligibility re-checked server-side; tenant and facility
existence verified; duplicate scope rejected (unique index, surfaced as 409); credential material
rejected outright; activation refused without a PASSED health check; every transition
(`connection.created`, `connection.activated`, `connection.deactivated`, `connection.deleted`)
writes a `connection_audit_events` row with a correlation ID. Endpoints are server-owned, so the
caller never supplies a URL.

## Rules honoured
Cancellation is non-destructive, no secret is ever displayed or stored, every blocker is explained
in place, and system connections cannot be deleted.

## Credentials
Secret-bearing authentication methods (mtls, oauth2, api_key and similar) are supported through the
server-side credential vault. The wizard collects the credential at step 4, submits it once to the
`connection-credential` edge function immediately after the instance is created, and clears it from
component state. The value is AES-GCM encrypted with a key derived from `CONNECTION_CREDENTIAL_KEY`
and written to `connection_credentials`, a table whose only RLS policy is `USING (false)` for
signed-in users; only the service role can read it. No endpoint returns plaintext, so the UI exposes
a fingerprint, version, rotation date and expiry only. Rotation replaces the material in place,
increments the version and refuses an unchanged value; revocation destroys the material and disables
the connection. Every store, rotation and revocation writes both a `connection_credential_events`
row and a `connection_audit_events` row.

## Limitations
Drafts are not persisted before step 5; cancelling earlier discards the form. Credential expiry is
recorded but not yet enforced by an automated rotation reminder.

## Tenant isolation
Enforced. `public.current_tenant_id()` resolves the caller's organisation from their profile;
`connection_tenant_visible()` and `connection_visible()` gate the SELECT policies on
`connection_instances`, `connection_twin_mappings`, `connection_health_checks`,
`connection_ingest_runs` and `connection_audit_events`, and the admin write policies on instances
and mappings. Rows with a null tenant are platform-scope (system connections) and stay readable by
every signed-in user. Edge functions use the service-role client, which bypasses RLS, so
`supabase/functions/_shared/connectionTenant.ts` re-checks the same rule on every provisioning and
health-check call and returns `tenant_scope_violation`. The catalogue (`connector_definitions`,
`connection_data_contracts`) stays tenant-neutral because it describes capabilities, not
customer data.

## Runtime evidence (2026-08-17)
A wizard-created OpenUSD asset storage connection was created, health-checked (PASSED),
activated (HEALTHY) and deleted through the UI. The audit trail recorded
`connection.created, connection.health_check, connection.activated` and the delete event.
