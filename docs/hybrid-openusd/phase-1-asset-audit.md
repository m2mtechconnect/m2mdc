# Phase 1 - Hybrid OpenUSD asset audit (before modification)

Evidence sources: `assets/manifest.json` (manifest v6), the runtime coverage
store (`window.__auraRuntimeCoverage()`), the scene components under
`src/components/twin-visualization/`, and
`docs/evidence/nvidia-pack/conversion-state.json`.

Rule applied throughout: a category is called OpenUSD-derived only where a USD
master identifier, a recorded conversion and a source-plus-derivative checksum
chain all exist. Everything else is named procedural.

## Category evidence table

| Category | Rendering component | Procedural geometry calls | Source USD master | Author | Licence | USD prim path | USD checksum | GLB derivative | Derivative checksum | Runtime loader | Semantic role | Mounted objects (verified build `bmsv58pp8`) | Fallback | Approval |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Rack cabinet | `RackGroup` -> `ApprovedRackAsset` | `Rack.tsx` box/cylinder primitives when no derivative resolves | `Assets/.../Racks/Rack_42U_A/Rack_42U_A_01.usd` | NVIDIA pack geometry, AURA-authored component selection | NVIDIA Data Center OpenUSD Assets Pack (Datacenter_NVD@10012) | `/World/Rack_42U_inst/.../Rack_Core/...` (see `rack-core-component-selection.json`) | `f8505db7...c26eb1b3` | `rack_42u_a_core_operations.glb` | `sha256:a77ae674e917c8f4...` | `useDerivativeGltf` | `rack-core-reference` | mounted per cabinet, not previously reported to the coverage store | procedural `Rack.tsx` | approved, runtime eligible |
| Rack core | same as above | none once mounted | same master, rear cooler door excluded | AURA-authored selection of NVIDIA geometry | as above | see selection record | `f8505db7...` | `rack_42u_a_core_operations.glb` | `sha256:a77ae674...` | `useDerivativeGltf` | `rack-core-reference` | as above | procedural | approved |
| Servers | `ReferenceEquipmentLayer` | none | `Server_1U_A_01.usd`, `Server_2U_B_01.usd`, `Server_2U_C_01.usd` | NVIDIA | pack licence | pack prim paths | recorded per entry | `server_1u_a_*`, `server_2u_*` | `sha256:7011e15c...`, `d185e425...`, `11686ea3...` | `useDerivativeGltf` | `server-1u`, `server-2u` | 48 / 24 | procedural rack detail | approved |
| Switches | `ReferenceEquipmentLayer` | none | `SN3700C_01.usd`, `SN2700C_01.usd`, `QM8700*_01.usd` | NVIDIA | pack licence | pack prim paths | recorded per entry | `sn3700c_01_*` etc. | `sha256:5b01bc5a...` | `useDerivativeGltf` | `network-switch` | 8 | procedural | approved (`qm8700_f_01` pending-review, `ua950h_2sf_01` not runtime eligible) |
| PDUs | `ReferenceEquipmentLayer` | none | `rPDU_A_01.usd` | NVIDIA | pack licence | pack prim path | recorded | `rpdu_a_01_*` | `sha256:65e368d3...` | `useDerivativeGltf` | `rack-pdu` | 8 | procedural | approved |
| Blanking panels | `ReferenceEquipmentLayer` | none | `Blank_1U_*_A_01.usd` (4 masters) | NVIDIA | pack licence | pack prim paths | recorded | `blank_1u_*` | `sha256:903885da...` (selected) | `useDerivativeGltf` | `blanking-panel` | 32 | procedural | approved |
| Cable trays | `ReferenceEquipmentLayer` | `DataHall.tsx` slim tray boxes (baseline mode) | `Cable_Tray_*_A01_01.usd` (3 masters) | NVIDIA | pack licence | pack prim paths | recorded | `cable_tray_*` | `sha256:c49603d3...` | `useDerivativeGltf` | `cable-tray` | 24 | procedural tray boxes | approved |
| Liquid-cooling equipment | `ReferenceEquipmentLayer` | none | `DCP_A_01.usd` | NVIDIA | pack licence | pack prim path | recorded | `dcp_a_01_*` | `sha256:74e3c2b4...` | `useDerivativeGltf` | `liquid-cooling-equipment` | 3 | procedural | approved |
| Raised-floor tiles | `DataHall.tsx` | one `planeGeometry` for the whole floor plus a tiled material | none before this change | AURA | AURA-authored | none | none | none | none | none | not represented | 1 procedural plane | n/a (procedural is the only path) | procedural |
| Perforated floor tiles | `DataHall.tsx` | `planeGeometry` strip per cold aisle with `perforatedTileMaterial()` | none before this change | AURA | AURA-authored | none | none | none | none | none | not represented | 1 per cold aisle | n/a | procedural |
| Luminaires | `FacilityLighting.tsx` | native lights plus emissive strip meshes | none before this change | AURA | AURA-authored | none | none | none | none | none | not represented | per rig | n/a | procedural |
| Facility shell | `DataHall.tsx` `FacilityShell` group | wall boxes, mode-dependent | none before this change | AURA | AURA-authored | none | none | none | none | none | not represented | 2 (cutaway) / 4 (full) | n/a | procedural |
| Walls | as facility shell | as above | none | AURA | AURA-authored | none | none | none | none | none | not represented | as above | n/a | procedural |
| Structural members | removed from every shell mode (occlusion) | none rendered | none before this change | AURA | AURA-authored | none | none | none | none | none | not represented | 0 | n/a | procedural, deliberately not rendered |
| Pipes | `DataHall.tsx` | 2 `cylinderGeometry` chilled-water runs | none | AURA | AURA-authored | none | none | none | none | none | not represented | 2 | n/a | procedural |
| Analytical overlays | `ThermalOverlayLayer`, `PowerFlowLayer`, `CoolingOverlayLayer`, `WorkloadOverlayLayer`, `SovereigntyOverlayLayer`, carbon group | plane/box/line primitives, transparent, `depthWrite=false` | none, and none intended | AURA | AURA-authored | none | none | none | none | none | not a physical role | 1 layer per active overlay | n/a | procedural by design |

## Nine manifest roles versus seven reported runtime roles

| Manifest semantic role | Runtime status before this change | Explanation |
|---|---|---|
| `server-1u` | reported | mounted by `ReferenceEquipmentLayer` |
| `server-2u` | reported | mounted by `ReferenceEquipmentLayer` |
| `network-switch` | reported | mounted by `ReferenceEquipmentLayer` |
| `rack-pdu` | reported | mounted by `ReferenceEquipmentLayer` |
| `blanking-panel` | reported | mounted by `ReferenceEquipmentLayer` |
| `cable-tray` | reported | mounted by `ReferenceEquipmentLayer`, infrastructure-gated |
| `liquid-cooling-equipment` | reported | mounted by `ReferenceEquipmentLayer` |
| `rack-core-reference` | **mounted but not reported** | `referenceRackAssetId()` passes the approved rack-core derivative to every cabinet through `RackGroup`, but the cabinets never reported to the runtime coverage store, so the badge counted seven roles while the eighth was actually on screen. Fixed in this change: `ApprovedRackAsset` now emits per-cabinet mount evidence and the store counts it. |
| `liquid-cooled-rack` | excluded from ordinary rows by design | the complete NVIDIA liquid-cooled rack mounts only inside the simulated design scenario `SIM-LIQUID-COOLED-RACK-PILOT-001`, where the facility model declares compatible liquid cooling and clearance. It is intentionally absent from as-built rows. |

Quarantined or blocked entries that must stay unresolvable and remain so:
`nvidia.network_switch.qm8700_f_01.*` (pending-review), `nvidia.network_switch.ua950h_2sf_01.*`
(approved but not runtime eligible), `aura.rack.generic_42u` (blocked-missing-payloads),
`nvidia.rack.42u_a_01.ops@1.0.0` (superseded).
