# AURA_MANAGED_CONNECTOR_ADAPTER - final implementation report

## Implemented
- Three explicit connection classes: AURA Managed Shared Connector, AURA Managed User
  Connection, AURA Native / External DSX Runtime (`src/connections/managedConnectors.ts`,
  `supabase/functions/_shared/managedConnectorManifest.ts`).
- Server-owned capability manifest distinguishing platform support, project linkage,
  build-time-only, per-user support, shared support, native-required, unsupported, blocked
  and not-verified. Build-chat connectors are excluded from the runtime surface.
- Shared-connector authorization layer enforcing tenant, facility, role, operation
  allowlist, read/write classification, approval, revocation and hourly rate ceiling
  (`managedConnectorAuthz.ts`, gate in `managed-connector-invoke`).
- Registry extension: `connection_instances.binding_class`, `platform_binding_state`,
  `last_verified_at`, `disclosure_limitations`; new `managed_user_connections`,
  `managed_connector_write_approvals`, `managed_connector_invocations`. No token or OAuth
  secret is stored in any of them.
- Setup wizard now names the implementation class, the data classes and permissions
  requested, and states honestly when authorization leaves AURA.
- Catalogue surfaces the verified capability inventory with per-entry evidence and
  disclosure limitations.
- Agent tool policy and white-label disclosure matrix recorded.

## Runtime verified
- Authorization decision model: 16 unit cases, all passing.
- Migration applied; new tables enforce tenant-scoped reads and service-role-only writes.

## Configured
- One managed shared binding (web-presence search analytics) is linked to this project.

## Available but unlinked
- Per-user connector class: supported by the platform, no client configured for this
  project, so no user can authorize it yet.

## Build-time only
- Assistant (MCP) connectors. Deliberately absent from the manifest.

## Blocked
- MQTT cloud runtime acceptance (disposable test broker evidence only).
- DSX Exchange (not deployed).
- Managed shared invocation against live provider data: `LOVABLE_API_KEY` and the
  connection key are not present in this edge environment, so the function fails closed
  with `managed_credential_unavailable` rather than reporting a healthy path.

## Unsupported
- BACnet/IP, Modbus TCP, OPC UA, SNMP, BMS edge gateway, DCIM through any managed binding.
  All marked AURA_NATIVE_REQUIRED.
- ServiceNow through a managed binding: strict white-labelling required.

## Not tested
- Two users connecting separate personal accounts and per-user isolation between them.
- End-to-end managed shared invocation returning provider data.

## Verdict
AURA_MANAGED_CONNECTOR_ADAPTER_PARTIAL

The adapter, registry, authorization layer, manifest, wizard and evidence surfaces are
implemented and unit-verified, but no managed connector path has returned live provider
data in this environment, and the per-user binding flow cannot be exercised without a
configured connector client. No connection is reported healthy without runtime evidence.
