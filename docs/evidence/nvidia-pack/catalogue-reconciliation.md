# NVIDIA Data Center pack - USD stage catalogue reconciliation

Source archive: `Datacenter_NVD@10012.zip`
sha256 `4972d1a9726b36279d7c26531b4d0a084156b7d512f5340b6e1063a9cf458fd4`
Catalogue evidence: `docs/evidence/nvidia-pack/usd-stage-catalogue.json`
Catalogue tool: `scripts/asset-ingestion/catalogue.py`

## The 99 / 75 reconciliation

Both numbers are correct and must always be reported together with the split below.
No future report may quote one without the other.

| Count | Meaning |
| --- | --- |
| 99 | Every file with a `.usd` / `.usda` / `.usdc` / `.usdz` extension anywhere in the extracted pack |
| 75 | Stages under the equipment/reference asset root `Assets/DigitalTwin/Assets`, opened and catalogued |
| 24 | Files outside that root, all under `Assets/DigitalTwin/Materials` |
| 19 | Catalogued stages that qualify as independently placeable runtime masters |

## The exact 24 exclusions

None of the 24 is a thumbnail, proxy or SubUSD layer. Every one is a shading
library layer under `Assets/DigitalTwin/Materials`: 10 MDL/base material
libraries and 14 physics-material layers.

| File | Bytes | Exclusion class | Why it is not an independently placeable runtime asset |
| --- | --- | --- | --- |
| `Assets/DigitalTwin/Materials/Base/Concrete/concrete.usda` | 22,723 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Fabrics/fabrics.usda` | 34,310 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Glass/glass.material.usda` | 57,504 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Illuminated/illuminated.usd` | 8,615 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Metals/metals.material.usda` | 144,768 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Misc/misc.usd` | 8,825 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Paint/paint.material.usda` | 35,082 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Plastics/plastics.material.usda` | 124,796 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Rubber/rubber.usd` | 9,611 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/Base/Wood/wood.material.usda` | 40,466 | MDL/base material library layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/asphalt_mat.usda` | 316 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/cardboard_mat.usda` | 319 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/concrete_mat.usda` | 319 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/fabric_mat.usda` | 318 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/glass_mat.usda` | 314 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/leaf_mat.usda` | 311 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/leather_mat.usda` | 320 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/metal_mat.usda` | 310 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/organic_mat.usda` | 315 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/plastic_mat.usda` | 316 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/rubber_mat.usda` | 313 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/stone_mat.usda` | 311 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/vinyl_mat.usda` | 315 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |
| `Assets/DigitalTwin/Materials/physics_materials/wood_mat.usda` | 313 | physics material layer | No `UsdGeom.Mesh` prims; sublayered by equipment stages for shading only |

These layers declare `Material`, `Shader` and physics-material prims only. They
carry no geometry, no bounds and no default prim that can be placed in a scene:
they are composed *into* equipment stages, which is why the 75 catalogued
equipment stages already account for their contribution.

## Within the 75 catalogued stages

| Disposition | Stages |
| --- | --- |
| eligible master (converted in batches A-D) | 19 |
| full facility stage, not a placeable equipment asset | 7 |
| mounting hardware with no AURA domain object | 2 |
| no mesh geometry in stage | 19 |
| sub-layer/instance proxy, not a standalone publishable master | 26 |
| unresolved composition dependencies | 2 |

Sub-layer/instance proxies (`*_inst`, `SubUSDs/`, `.geo.`, `.material.`) are
component layers of a master stage and are published only as part of that
master's dependency closure. Facility stages are whole data halls, not
placeable equipment. Mounting hardware has no AURA domain object to bind to.
