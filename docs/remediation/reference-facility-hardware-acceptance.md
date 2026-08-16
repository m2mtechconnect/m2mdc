# NVIDIA Reference Facility - hardware visual acceptance

Route: `/admin/reference-facility-validation` (admin/owner only), linked from `/admin/asset-pipeline`.

## What it does
- Embeds the real twin route `/data-centre-twin?geometry=nvidia-reference` at 1920x1080 (scaled for
  display only). No screenshot mock, no separate scene.
- Identifies the renderer with `probeRenderer`. SwiftShader / llvmpipe or a hidden renderer string can
  never produce a hardware verdict; the run records
  `AURA_NVIDIA_REFERENCE_FACILITY_HARDWARE_VALIDATION_FAILED`.
- Reconciles all nine semantic roles: published manifest rows, the derivative the quality policy
  selects for a nearby camera, and what the runtime coverage store reports actually mounted. Roles
  that were published but never mounted are listed as such, never as derived.
- Runs a fixed camera path in the live scene through the harness bridge
  (`window.__auraTwinCamera`): 5 s stabilisation then five 6 s segments (facility overview, front
  aisles, rear infrastructure, cooling area, top down). Frame times are sampled inside the canvas by
  `SceneStatsBridge`; draw calls and triangles come from `renderer.info`.
- Records explicit human verdicts (Pass / Fail / Not applicable plus a note) for five guided views
  and eight visual realism criteria.

## Thresholds
Pass at >= 45 FPS average and >= 30 FPS 1% low. Below 30 FPS average, any human Fail, any blocked
role or any WebGL context loss produces `AURA_NVIDIA_REFERENCE_FACILITY_VISUAL_REMEDIATION_REQUIRED`.
Other findings downgrade the run to
`AURA_NVIDIA_REFERENCE_FACILITY_HARDWARE_VERIFIED_WITH_LIMITATIONS`.

## Memory reporting
WebGL exposes no reliable GPU memory figure, so no GPU memory value is reported for a facility run.

## Evidence
`Save validation` writes one `asset_gpu_validation_runs` row under asset id
`nvidia.reference-facility` (renderer, benchmark configuration, reconciliation, performance,
verdict, human checks, build id, manifest version). `Export validation JSON` and
`Download acceptance report` produce the offline artefacts. No IP addresses or extra hardware
fingerprinting are stored.
