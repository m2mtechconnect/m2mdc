# Domain model

| Concept | Table | Notes |
| --- | --- | --- |
| Connector definition | `connector_definitions` | What AURA knows how to connect to. Never counted as a connection. |
| Connection instance | `connection_instances` | One configured connection per tenant/facility/environment. |
| Data contract | `connection_data_contracts` | Schema type/version, direction, classification, unit and timestamp rules, checksum. |
| Twin mapping | `connection_twin_mappings` | Source signal to AURA entity and OpenUSD prim property, with unit conversion. |
| Health check | `connection_health_checks` | Server-side probe result: DNS, network, TLS, auth, schema, mapping, latency, correlation ID. |
| Ingest run | `connection_ingest_runs` | Received/accepted/rejected, mapping failures, duplicates, retries, dead-letter. |
| Audit event | `connection_audit_events` | Actor, action, previous state, new state, correlation ID. |

Credential material is never stored in these tables. `connection_instances.credential_reference`
holds only a server-side secret name; no column can be decrypted by the browser.
