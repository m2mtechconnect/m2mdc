# Database table-family inventory (measured at 66d2c2a)

132 unique tables created across 57 migrations. Full per-object columns (readers, writers,
edge-function callers, RLS, FKs, row counts, last access) require database statistics and
gateway logs that are **not reachable from this sandbox** - **Blocker B-9**. This document
records the family-level plan only; no drop may be planned from it.

## Families and proposed canonical target
| Family | Members observed | Canonical target | Disposition |
|---|---|---|---|
| Facility identity | `data_centre_twins`, `digital_twins` | `data_centre_twins` | additive migration + backfill from `digital_twins`, dual-read, observe, separate drop migration |
| Simulation runs | `simulation_runs`, `sovereign_dc_simulation_runs`, `twin_simulation_runs` | `simulation_runs` | merge with run envelope (seed, engine version, input/config/output hashes, provenance) |
| Connections | `integrations_connections`, `dsx_connections`, `managed_user_connections`, `app_user_connections`, `connection_instances` | `connection_instances` with `binding_class` | **done (Phase 10)**: `connection_instances` is the only client-read identity; both legacy generations hold 0 rows and are edge-function-only, so no merge migration is justified. `dsx_connections` stays separate (ingest-authorization semantics) |
| Ingest evidence | `connection_ingest_runs`, `connection_ingest_messages` | keep as-is | canonical raw evidence layer |
| Telemetry / KPI | `twin_property_values` + overlapping KPI tables | raw -> normalized -> derived -> current-state projection | define layers in Phase 4, no merge across differing retention |
| Deployments | `deployments`, `cloud_deployments`, `deployment_tracking` | `deployments` + `deployment_events` (immutable) | **done (Phase 9)**: events table added, timer-driven UI removed, `deployment_tracking` deprecated (0 rows, grants revoked); `cloud_deployments` retained for the AOC runtime feature |
| Assets | asset/version/validation tables | one asset/version/validation model | Phase 6 |
| Evidence/decisions | evidence-beta + decision tables | one evidence/decision model | Phase 2/4 |

Rule applied: tables with genuinely different retention, security or audit semantics
(ingest evidence vs normalized telemetry; deployment events vs deployment state) are **not**
merged.
