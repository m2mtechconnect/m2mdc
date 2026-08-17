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

## Limitations
No credential vault, so secret-bearing authentication methods (mtls, oauth2, api_key and similar)
are refused with a named reason. Tenant scoping is recorded but row-level tenant isolation is not
enforced. Drafts are not persisted before step 5; cancelling earlier discards the form.

## Runtime evidence (2026-08-17)
A wizard-created OpenUSD asset storage connection was created, health-checked (PASSED),
activated (HEALTHY) and deleted through the UI. The audit trail recorded
`connection.created, connection.health_check, connection.activated` and the delete event.
