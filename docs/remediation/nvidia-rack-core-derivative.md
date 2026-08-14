# Rack-core derivative - corrected claim and component-selection evidence

## Correction of the earlier claim

An earlier report stated the NVIDIA pack "contains only a liquid-cooled rack and
has no front-door subtree". Both halves of that statement are now corrected
against the source stage.

1. The pack ships exactly one rack master, `Rack_42U_A_01.usd`. There is no
   air-cooled rack master in the pack. `nvidia.rack.42u_a_core` is therefore an
   **AURA-authored derivative**, not an NVIDIA-shipped air-cooled rack, and is
   labelled as such everywhere it is surfaced.
2. The source stage **does** contain a `/Front_Door` subtree (4 mesh prims:
   `Front_Door_Frame`, `MetalMeshPanel`, and two `Handle` meshes). Every one of
   them is authored `visibility = invisible` with `purpose = default`. That is
   why no front-door geometry appears in any derivative and why the front door
   is not independently addressable at runtime. The absence is a source-authoring
   fact, not a conversion loss.

## Component selection

The chassis in this asset sits beneath a misleadingly named parent,
`Rack_42RU_Rear_Door_V2_Component_01`. Selection is therefore anchored on the
real `/Rear_Cooler_Door` subtree and never on a substring match.

| Subtree | Mesh prims | Disposition |
| --- | --- | --- |
| `/World/Rack_42U_inst/Rack_42U_01/Rack_42RU_Rear_Door_V2_Component_01/Rack_Core` | 395 | included |
| `.../Rack_42RU_Rear_Door_V2_Component_01/Leveling_Post_Set_1_Component_496611` | 16 | included |
| `/World/Rack_42U_inst/Rack_42U_01/Rear_Cooler_Door/Rear_Door_Frame` | 13 | excluded |
| `/World/Rack_42U_inst/Rack_42U_01/Rear_Cooler_Door/Rear_Fan_Asy` | 108 | excluded |
| `/World/Rack_42U_inst/Rack_42U_01/Rear_Cooler_Door/Rear_Door_Chilled_Water_Lines_Component_01` | 14 | excluded |
| `/World/Rack_42U_inst/Rack_42U_01/Rear_Cooler_Door/RearLabel` | 2 | excluded |
| `/World/Rack_42U_inst/Rack_42U_01/Front_Door/*` | 4 | not present - authored invisible in source |

Full prim lists: `docs/evidence/nvidia-pack/rack-core-component-selection.json`.

## Result

| Level | Triangles | Draw calls | Size (m, X/Y/Z) |
| --- | --- | --- | --- |
| inspection | 26,872 | 1 | 0.60 / 2.00 / 1.19 |
| operations | 26,872 | 1 | 0.60 / 2.00 / 1.19 |
| lod | 8,875 | 1 | 0.60 / 2.00 / 1.19 |

Removing the rear cooler door drops the depth from 1.42 m to 1.19 m and the
height from 3.17 m to 2.00 m, which is consistent with the cooler door and its
riser stack being the tallest and deepest part of the cabinet.
