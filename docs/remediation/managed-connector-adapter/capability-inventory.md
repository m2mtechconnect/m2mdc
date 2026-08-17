# Verified connector capability inventory

Verified 2026-08-17 against the workspace integration state. Source of truth:
`supabase/functions/_shared/managedConnectorManifest.ts` (server-owned). There is no
reliable runtime discovery API for project-level connector linkage, so the manifest is an
explicit operator-verified configuration. Nothing is inferred from a catalogue card, icon,
provider name or documentation page.

| AURA connector | Class | Eligibility | Linked to project | Runtime selectable |
| --- | --- | --- | --- | --- |
| Search analytics (web presence) | Managed shared | RUNTIME_SHARED_SUPPORTED | yes | yes |
| Workspace documents | Managed user | PLATFORM_SUPPORTED_NOT_LINKED | no | no |
| ServiceNow | AURA native (AURA_NATIVE_REQUIRED) | NATIVE_RUNTIME_REQUIRED | no | no |
| MQTT | AURA native | BLOCKED_MISSING_DEPLOYMENT | no | no |
| DSX Exchange | External DSX runtime | BLOCKED_MISSING_DEPLOYMENT | no | no |
| BMS edge gateway, BACnet/IP, Modbus TCP, OPC UA, SNMP, DCIM | AURA native | NATIVE_RUNTIME_REQUIRED | no | no |

Truths preserved, unchanged by this phase:

- No operational BMS or DCIM source is connected.
- DSX Exchange is not deployed; only a local harness exists.
- MQTT has been verified against a disposable test broker only; cloud runtime acceptance is blocked.
- Production telemetry is simulated or unavailable.
- No capability is NVIDIA-integrated or SimReady-validated.
- The only linked managed shared connector is a web-presence search analytics source. It is
  not a data-centre telemetry source and is not represented as one.

Build-time assistant (MCP) connectors are excluded from the manifest entirely, so they can
never surface as operational AURA integrations.
