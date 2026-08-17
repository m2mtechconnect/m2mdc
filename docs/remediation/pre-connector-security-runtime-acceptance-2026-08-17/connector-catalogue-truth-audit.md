# Connector catalogue truth audit

A catalogue entry is not a configured connection. A configured connection is not
proof of ingestion. A passing internal health check is not provider telemetry.
Each entry below is classified against that ladder.

| Entry | Classification | Evidence |
| --- | --- | --- |
| MQTT ingest | **AURA native, implemented, runtime verified** | `services/mqtt-ingest-worker` vertical slice, ingest runs and messages persisted |
| DSX exchange | **External runtime required, not deployed** | `dsx_events` probe returns policy-denied / empty; surface reports "not deployed" |
| Generic managed shared connector | **Available architecture, not configured** | authorization gates and fail-closed states present; no client linked |
| Generic managed user connection | **Available architecture, not configured** | `app_user_connections` exists and is fail-closed; zero rows |
| Google Drive | **Available architecture, not configured — and intentionally out of scope** | authorization affordance removed from the UI entirely; legacy parallel OAuth path deleted |
| Microsoft / SharePoint / OneDrive (RAG) | **Configured but not runtime verified** | credentials exist; no provider round-trip evidence recorded in this phase |
| AWS S3 (RAG) | **Configured but not runtime verified** | same |
| Assistant / AI gateway | **Build-time only** | never presented as a runtime data connection |
| Draft catalogue entries | **Not published** | `publication_status = DRAFT` rows are invisible to non-admin identities (proved in the isolation run) |

## Phase-specific requirements

- Google Drive is not shown as connected anywhere. Rendered-text scan across
  every authenticated route swept returned zero occurrences.
- Google Drive authorization is not enabled: there is no button, no handler and
  no endpoint.
- No provider-specific operational claim is made without runtime evidence.
- Generic managed-connector infrastructure remains visible only with an honest
  "Available architecture, not configured" status.
- All customer-facing surfaces remain AURA-branded; the white-label regression
  suite passes.
