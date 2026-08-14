# AURA NVIDIA rack - hardware GPU acceptance harness

Route: `/admin/asset-validation/nvidia.rack.42u_a_01.ops` (admin/owner only)

## What it does
- Probes the renderer (WebGL version, WebGL2 availability, GPU vendor/renderer, browser, OS,
  canvas resolution, DPR, quality profile) with a `high-performance` power preference.
  SwiftShader / llvmpipe / software identifiers are reported as **Software renderer detected**
  and can never receive a GPU-verified verdict. A hidden renderer string is reported as
  **Renderer unavailable** - no GPU identity is invented.
- Verifies production-equivalent delivery: the derivative must arrive over `/__l5e/assets-v1/`
  with HTTP 200, `model/gltf-binary`, the published content length, and downloaded bytes whose
  SHA-256 equals `sha256:2db61ead...`. A development host or non-CDN path marks the run invalid.
- Runs the standardized benchmark: scenario `SIM-LIQUID-COOLED-RACK-PILOT-001`, Balanced profile,
  1920x1080, DPR cap 1, overlays limited to the scenario label, fixed camera path with a 5 s
  stabilization followed by a 15 s deterministic orbit split into front, rear and elevated holds.
  `preserveDrawingBuffer` stays disabled; screenshots use the browser/platform mechanism.
- Evaluates acceptance thresholds and reports network limitations separately from rendering
  limitations.

## Expected derivative
| Property | Value |
| --- | --- |
| Checksum | `sha256:2db61ead578559c2a5c2e98a0c75da31485b90445ed0d96118fc521bc83d0e46` |
| Triangles | 133,173 |
| Asset draw calls | 6 |
| Bounds | 0.6035 x 3.1663 x 1.4215 m |
| Floor contact | minY = 0 |
| Front orientation | +Z |
| Textures / converted materials | 0 / 1 |

The earlier `1.0.0-ops` build (`sha256:f60ca0b5...`) is marked superseded and
`runtimeEligible: false`. It is retained for audit history and can never resolve or mount;
`src/validation/gpuAcceptance/__tests__/supersededBuild.test.ts` proves this.

## Capability map (from validation evidence)
- Rack core - addressable
- Rear cooler door - addressable
- Chilled-water risers - addressable
- Front door - **not independently addressable** (no such subtree exists in the NVIDIA source);
  no front-door interaction is advertised or animated.

## Memory reporting
WebGL exposes no reliable actual GPU-memory figure. Only a calculated geometry/material memory
estimate is reported, always labelled estimated.

## Evidence
Results are shown locally first. `Save validation` writes one `asset_gpu_validation_runs` row
(asset, checksum, scenario, timestamp, administrator id, renderer, benchmark configuration,
performance, acceptance result, screenshot references, application version, manifest version).
No IP addresses or extra hardware fingerprinting are stored. `Export validation JSON` and
`Download acceptance report` produce the offline artefacts.

## Rollout state
Until a saved hardware run passes, the operational facility stays procedural, the NVIDIA asset
remains limited to Admin Preview and the opt-in simulated scenario, and the UI keeps showing
"Awaiting hardware GPU validation". A passing run marks the simulated scenario GPU-validated
only; facility rollout still requires real compatible rack and cooling-infrastructure data.
