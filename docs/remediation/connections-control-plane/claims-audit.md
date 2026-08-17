# Claims audit

| Claim rendered | Evidence |
| --- | --- |
| Application platform healthy | passed server-side platform query, latency recorded |
| Operational data sources: 0 | no connection has accepted records |
| DSX events received: 0 | `connection_ingest_runs` empty |
| DSX ingest gateway: connected, no data | endpoint probe passed, zero events |
| MQTT transport: blocked | runtime source resolver does not select the transport |
| DSX Exchange: not deployed | no cluster, no schema packages |
| Agent tools: not implemented | no handshake, no tool invocation |
| BMS / DCIM / SNMP / BACnet / Modbus / OPC UA: planned | no runtime adapter |

No capability was promoted to NVIDIA_INTEGRATED or SIMREADY_VALIDATED. No vendor logo implies
partnership or certification. No point-in-time value is rendered as a trend.

## Claims corrected by the implementation audit
- "Tenant isolation pass" was unsupported: SELECT policies are unscoped. Corrected to a known gap.
- "Engineer may test permitted connections" was unsupported: the health-check function is
  administrator-only. Corrected in `rbac-matrix.md`.
- The connection wizard was described as implemented; it is design-only, corrected in
  `connection-workflow.md`.
- The mapping editor was design-only at audit time and has since been implemented:
  `src/connections/mappingValidation.ts`, `src/components/connections/MappingEditorDialog.tsx`,
  admin/owner-gated writes on `connection_twin_mappings`, 7 unit tests.
- Counts were stated as 22 definitions and 4 instances; the database holds 25 and 5.
