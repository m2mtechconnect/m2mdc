# Brev GPU lane - access status and runbook

## Access status (Phase 3 preflight)

| Check | Result |
| --- | --- |
| Brev account reachable from this environment | **No** - no Brev credential or API token is configured, and none may be created here |
| Credits available | **Unknown / not granted** |
| GPU instance started | **No** |
| `nvidia-smi` recorded | **No** |
| Published host reachable from a Brev instance | Not tested (no instance) |

No Brev execution is claimed. The existing Launchable
(`infra/brev/aura-usd-pipeline.launchable.json`) is preserved unchanged; no competing
configuration was created.

## Requested to proceed

- Hardware: 1x NVIDIA L40S (48 GB) preferred; any graphics-capable NVIDIA GPU with a
  recorded model and VRAM is acceptable.
- Estimated cost: L40S on-demand is roughly USD 1.00-1.60 per hour depending on the
  underlying cloud. Confirm the live rate in the Brev console before launch.
- Estimated validation duration: ~2 hours (instance start and driver check ~15 min,
  two 35 s benchmarks plus 20 paired captures ~45 min, evidence export and review ~45 min,
  buffer ~15 min).
- Requested credit amount: **USD 50** to cover the run plus one repeat after material tuning.
- Evidence output: written back into `docs/evidence/cloud-gpu/brev/`.

No reusable credential is placed in the Launchable defaults, repository files, logs or
screenshots. Supply the Brev token interactively in the console session only.

## Run steps (execute in the Brev instance shell)

```bash
nvidia-smi                                   # record GPU model, VRAM, driver, CUDA
Xvfb :99 -screen 0 1920x1080x24 &            # hardware-backed display via the NVIDIA driver
export DISPLAY=:99
google-chrome --version
```

Then, for each realism mode:

```
https://m2mdc.lovable.app/data-centre-twin?geometry=nvidia-reference&realism=baseline
https://m2mdc.lovable.app/data-centre-twin?geometry=nvidia-reference&realism=video-informed
```

The `realism` parameter is honoured only for signed-in asset administrators
(`admin` / `owner`); an operator session always renders the default video-informed
presentation.

In each session:

1. Confirm the WebGL renderer string via `window.__auraSceneBridge.getStats()`.
   Reject the run if it contains SwiftShader, llvmpipe or `software`.
2. Confirm `window.__auraRealismMode` matches the requested variant.
3. Confirm mounts via `window.__auraRuntimeCoverage` and `window.__auraFacilityFamilies`
   (>= 178 NVIDIA objects, 40 cabinets, >= 916 AURA facility objects, 0 fallbacks).
4. Run the fixed 35 s benchmark: `startSampling()`, drive `window.__auraTwinCamera(preset)`
   through the ten deterministic views in `src/validation/cloudGpu/views.ts`, then
   `stopSampling()`.
5. Capture one PNG per view per mode at 1920x1080, DPR 1, using the
   `captureFileName(mode, viewId)` naming.
6. Export the benchmark JSON and markdown into this folder.
7. Stop the instance.