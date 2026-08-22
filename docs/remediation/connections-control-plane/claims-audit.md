# Connections claims audit — 2026-08-21

| Customer-visible claim | Evidence / allowed interpretation |
| --- | --- |
| Operational data sources: 0 | No facility/OT connection has accepted operational records. |
| DSX events received: 0 | No persisted DSX event proves an operational event flow. |
| DSX Ingest Gateway endpoint verified | Fixed server-side probe proves reachability and correct auth rejection behaviour only. It does **not** prove data flow. |
| MQTT transport requires runtime wiring | Code exists, but the production runtime source resolver does not yet select the transport. |
| DSX Exchange not deployed | No accepted deployed exchange runtime/contracts are present. |
| Redfish planned | Forward definition exists; no runtime adapter or operational Redfish endpoint is verified. |
| NVIDIA DCGM planned | Forward definition exists; no runtime adapter or operational DCGM feed is verified. |
| DDN Infinia target not deployed | Forward definition exists; no DDN runtime binding or dedicated probe is verified. Existing AURA-managed OpenUSD storage is a separate binding. |
| OpenUSD asset storage available | Existing AURA-managed storage adapter is implemented. This claim is never relabelled as DDN Infinia. |
| ServiceNow native integration required | Managed substitution is not treated as the ServiceNow runtime integration. |
| CAD / BIM design imports planned | PLM/CAD and BIM/IFC definitions have no runtime adapters; Blueprint shows readiness only and exposes no fake importer. |
| Workspace Documents supported but not linked | Knowledge-source capability evidence comes from the server-owned manifest. No user authorization is shown without a configured project connector client. |
| Search analytics absent from operational catalogue | Web-presence analytics is not a facility, twin, storage or enterprise-operations data path. |
| Internal platform services absent from operational catalogue | Application backend and deployment substrate are assessed under Platform Administration instead. |

No catalogue card, provider name or vendor mark implies partnership, certification, deployment, runtime availability or data ingestion. A configured connection is not counted as operational until its evidence satisfies the status model.

## Catalogue ownership rules

- **Connections** owns configured facility systems, edge/exchange paths, twin/storage bindings, enterprise workflow, observability, optional cloud and custom operational connectors.
- **Platform Administration → Platform readiness** owns implementation class, managed-gateway eligibility, DSX/GPU/storage deployment readiness and internal platform dependencies.
- **Blueprint → Assets & Systems** owns design-import readiness for PLM/CAD and BIM/IFC.
- **Agent Policies → Knowledge sources** owns Workspace Documents readiness and future grounding-source authorization.
- Generic REST is never represented as a completed ServiceNow integration.
- DSX Exchange is never represented as deployed solely because the DSX ingest endpoint is reachable.
- DDN Infinia is never represented as connected solely because current AURA-managed OpenUSD storage is healthy.

## Historical corrections retained by the control-plane remediation

Earlier audit snapshots identified unsupported claims around tenant scope, role permissions, wizard readiness and mapping readiness. Subsequent implementation and security work must be judged from the current code, current migrations and current CI evidence rather than those historical snapshots. This document intentionally records only claims permitted by the current hybrid-stack surface.

Current definition count after the forward hybrid-stack alignment is **28**; the three new target definitions create **zero** new connection instances.
