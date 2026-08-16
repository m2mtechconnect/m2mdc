# Phases 8-10 - AURA mapped to the NVIDIA Omniverse DSX Blueprint

DSX is a reference architecture. AURA is aligned to it where AURA genuinely
implements the concept, and is marked as a gap where it does not. No DSX
component is claimed as integrated.

## DSX Flex - design-time configuration and variants

| DSX concept | AURA implementation | Evidence | Status |
|---|---|---|---|
| Parametric facility design | Blueprint store as the single authoritative model | `src/stores/blueprintStore.ts` | implemented |
| Design variants | OpenUSD `variantSet` on the AURA facility shell (`off` / `cutaway` / `full`) and the composed `design_scenarios.usda` layer | `assets/shell/aura_facility_shell/aura_facility_shell.usda`, `assets/facility/aura_reference_hall/design_scenarios.usda` | implemented |
| Simulated design scenarios kept apart from as-built | `SIM-LIQUID-COOLED-RACK-PILOT-001`, gated by cooling compatibility and always badged as simulated | `src/components/twin-visualization/designScenario.ts`, `AssetProvenancePanel.tsx` | implemented |
| Non-destructive layer editing round-trip from the browser | not implemented - AURA edits its own model, not the USD stage | - | gap |

## DSX Boost - simulation and optimisation

| DSX concept | AURA implementation | Evidence | Status |
|---|---|---|---|
| Deterministic scenario simulation | seeded simulation facade | `src/simulation/api.ts` | implemented |
| Thermal / power / cooling analysis surfaces | analytical overlays, explicitly procedural and switchable | `overlayContract.ts` and the overlay layers | implemented as approximation, labelled as such |
| CFD, PhysicsX or Omniverse solver coupling | not implemented, no solver is reachable | - | gap |

## DSX Exchange - interoperability

| DSX concept | AURA implementation | Evidence | Status |
|---|---|---|---|
| Stable semantic identity between systems | `semantic_bindings.json` binds USD prim paths to AURA asset ids | `assets/facility/aura_reference_hall/semantic_bindings.json` | implemented |
| Approved mapping contract, fail-closed | `lookupMapping`, `resolvePrimForAsset`, `syncSelection` refuse to guess prim paths | `src/dsx/viewer/viewerBoundary.ts` | implemented |
| Exchange transport (MQTT / OPC-UA style ingest) | local harness only | `infra/dsx-exchange/` | partial |
| Live Omniverse Kit / Nucleus session | endpoint boundary exists, no live Kit instance is reachable | `src/integrations/omniverseKit/` | gap |

## Layer separation contract

| Layer | Authority | Never does |
|---|---|---|
| Physical geometry, identity, hierarchy, design variants | OpenUSD masters under `assets/` | carry live telemetry |
| Browser rendering | approved GLB derivatives with source and derivative checksums | become the source of truth |
| Live operational data | AURA databases and the simulation facade | modify geometry |
| Analytical overlays | AURA runtime, procedural, transparent, `depthWrite=false` | permanently recolour or replace an approved derivative |
