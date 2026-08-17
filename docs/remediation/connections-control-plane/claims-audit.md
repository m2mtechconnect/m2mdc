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
