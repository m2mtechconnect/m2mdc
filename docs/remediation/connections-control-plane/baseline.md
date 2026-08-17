# Connections control plane - baseline

Phase: AURA_CONNECTIONS_CONTROL_PLANE_REFACTOR
Date: 2026-08-17 (UTC)

## Before
- `/manage/integrations` rendered a static readiness report (`src/pages/Integrations.tsx` + `IntegrationHub.tsx`).
- No connector/connection separation, no lifecycle, no health checks, no mappings, no audit trail.
- Static DSX environment requirements were mixed into the same page.

## After
- `/manage/integrations` (canonical) and `/manage/connections` (alias) render `src/pages/Connections.tsx`.
- Six tabs: Connections, Catalogue, Mappings, Activity & health, DSX Exchange, Agent tools.
- Static capability assessment moved to `/admin/platform-readiness`.
- Seven database tables carry the domain model; status is derived from stored evidence.
- Health checks execute server-side in the `connection-health-check` edge function.

## Preserved truths
Application platform is the only proven live platform service. Zero DSX events. MQTT client
implemented but not wired to the runtime source resolver. DSX Exchange not deployed. No BMS,
DCIM, SNMP, BACnet, Modbus, OPC UA or Prometheus source connected. No genuine MCP.
