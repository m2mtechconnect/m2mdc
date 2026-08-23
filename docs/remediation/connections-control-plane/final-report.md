# Connections control-plane report

## Current state — 2026-08-21

- Canonical customer route remains `/manage/integrations`; `/manage/connections` remains a compatibility alias.
- Customer-facing name is **Connections**.
- Customer tabs are **Overview**, **Connected systems**, **Data flows**, **Available connectors**, and **Health & audit**.
- The operational catalogue is organized by the AURA hybrid stack:
  1. Facility & OT
  2. Edge & Exchange
  3. Digital Twin & Storage
  4. Enterprise Workflow
  5. Observability
  6. Cloud — Optional
  7. Custom
- Internal application dependencies, build-time knowledge sources and Blueprint-owned design imports are not presented as operational connectors.
- Connector definitions: **28** after the forward-only hybrid-stack alignment migration. Existing connection instances remain **5**; the new definitions create no runtime connection by themselves.
- New target definitions are **Redfish**, **NVIDIA DCGM**, and **DDN Infinia**. All three remain non-addable until a real runtime adapter/deployment exists.
- Actual operational facility data sources remain **0** and DSX event count remains **0** until runtime evidence proves otherwise.
- MQTT remains implemented but not wired into the production runtime source resolver.
- DSX Ingest Gateway health proves endpoint reachability/auth behaviour only; it does not prove facility data flow.
- DSX Exchange remains **not deployed**.
- Existing AURA-managed OpenUSD storage is verified as its own binding. It is **not** evidence that DDN Infinia is deployed or connected.
- ServiceNow remains an AURA-native target integration; no managed third-party substitution is treated as equivalent.
- Managed connector implementation/binding capability inventory now lives under `/admin/platform-readiness`, not in the customer operational catalogue.
- Workspace Documents is owned by Agent Policies as a knowledge-source readiness item. No user authorization is offered unless the server reports a configured project connector client.
- PLM/CAD and BIM/IFC import readiness is owned by Blueprint Assets. Both remain explicitly planned; AURA does not expose a non-functional CAD/BIM uploader.

## Control-plane safety properties

- Catalogue definitions and configured connection instances remain distinct objects.
- Connection status is evidence-derived; catalogue presence never means connected.
- `Add connection` remains available only for `IMPLEMENTED` definitions with a non-null runtime adapter.
- Connection provisioning, health checks, credential handling and protected writes remain server-controlled.
- Health probes use fixed server-owned targets; callers never submit arbitrary probe URLs.
- Data-flow mappings bind persisted source identifiers to AURA/OpenUSD destinations and do not invent source values.
- Hybrid-stack additions were made through `20260821151000_align_hybrid_stack_connectors.sql`; historical migrations were not rewritten.

## Remaining hybrid-stack blockers

- Wire MQTT into the accepted runtime source path.
- Deploy DSX Exchange and its required contracts/infrastructure.
- Implement and validate AURA-native Redfish and NVIDIA DCGM adapters against real sources.
- Deploy and runtime-verify the DDN Infinia object-storage binding before presenting DDN as connected.
- Implement the AURA-native ServiceNow runtime contract when enterprise workflow write-back is required.
- Implement native PLM/CAD and BIM/IFC ingestion before enabling design-import actions.
- Configure a per-user Workspace Documents connector client before enabling document authorization.
- Complete the end-to-end hybrid-stack vertical slice against target infrastructure.

## Verdict

`AURA_CONNECTIONS_CONTROL_PLANE_REFACTOR_PARTIAL`

The control plane and customer information architecture are evidence-backed and aligned to the target hybrid stack, but the target infrastructure is not fully deployed. The UI intentionally distinguishes implemented, planned, blocked, connected and data-flowing states rather than collapsing them into a generic integration marketplace.
