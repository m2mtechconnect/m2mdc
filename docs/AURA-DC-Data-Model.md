# AURA DC — Canonical Data Model

Status: PLANNED (Phase 1). No entity below exists with a `tenant_id` today.

## Entities
Organization, Tenant, User, Membership, Role, Permission, RolePermission, Site,
Facility, Room, Row, Rack, Asset, Sensor, TelemetrySource, Twin, TwinVersion,
Document, DocumentVersion, DocumentChunk, SimulationRun, SimulationArtifact,
Incident, Alert, Recommendation, ApprovalRequest, ApprovalDecision,
OperationalAction, Integration, AuditEvent.

Every tenant-owned entity carries `tenant_id NOT NULL`.

## Asset (twin-visible, required fields)
`asset_id, tenant_id, site_id, asset_type, manufacturer, model, serial_number,
openusd_prim_path, twin_version_id, operational_status, created_at, updated_at`

## Telemetry record (normalized contract)
`tenant_id, site_id, asset_id, sensor_id, observed_at, received_at, metric_name,
value, unit, quality, source, source_event_id, schema_version, trace_id`

## SimulationRun
`simulation_run_id, tenant_id, site_id, twin_version_id, simulation_type,
input_telemetry_window, input_configuration, solver_name, solver_version,
model_version, requested_by, approved_by, started_at, completed_at, status,
result_summary, confidence, artifact_locations, error_details`

## Rules
- Versioned migrations only. No schema mutation from application startup code.
- TwinVersion is immutable once published; superseding versions are new rows.
- AuditEvent is append-only and not writable by normal application roles.

## Current-state gaps
- No Organization/Tenant/Membership tables; ownership is `user_id` only.
- Two role vocabularies in use (`app_role` enum vs `admin|operator|viewer|owner`).
- `has_role(uuid, app_role)` compares `text` to `app_role` — 10 policies never evaluate.
