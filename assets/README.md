# AURA 3D asset pipeline

OpenUSD is the authoritative source of truth. The browser only ever consumes
approved GLB derivatives. Nothing here may be fabricated.

## Layout

```
assets/
  manifest.json                  # registry consumed by the web app
  <asset_type>/<model_name>/
    <model_name>.usda            # master stage (metres, Y-up, floor origin)
    layers/
      <model_name>_Properties.usda
      <model_name>_ConnectionPoints.usda
    payloads/
      external.usdc              # shell geometry
      internal.usdc              # interior detail, loaded on demand
    data/
      manifest.json              # per-asset provenance and validation record
      optimizer.json             # Scene Optimizer recipe for the derivative
    web/
      <model_name>.glb           # approved browser derivative (only when validated)
```

## Source rules

Allowed: user-provided CAD/USD/GLB, licensed vendor models, approved NVIDIA
data-centre OpenUSD assets, internally authored unbranded models with
documented dimensions.

Forbidden: invented vendor products, fake logos, approximated vendor geometry
labelled as a real product, placeholder text inside binary files, frames from
reference video, bulk asset libraries or source CAD committed to the frontend.

## Current state

No licensed vendor model and no approved NVIDIA SimReady pack is reachable from
this environment, and no USD toolchain (`usdcat`, `usdchecker`, USD-to-glTF) is
installed here. Therefore:

- USD masters are authored as ASCII `.usda` with real, standards-derived
  dimensions (EIA-310 for racks).
- `payloads/*.usdc` are intentionally **not** created as placeholder files. The
  master references them so a real toolchain can populate them; an empty or
  text-filled `.usdc` would be a fabricated binary.
- No `web/*.glb` derivative exists, so every manifest entry is
  `pending-review` or `pending-source`, and the viewer renders documented
  unbranded procedural geometry instead.

## Producing a derivative (run where a USD toolchain exists)

```bash
usdchecker assets/rack/generic_42u_rack/generic_42u_rack.usda
# apply data/optimizer.json with the Omniverse Scene Optimizer extension
# export the optimized stage to web/generic_42u_rack.glb
# then update assets/manifest.json: glbUrl, glbVersion, triangleCount,
# textureMemoryMb, checksum, lastValidatedAt, approvalStatus = "approved"
```