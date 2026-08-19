# Phase 7 - Data Centre Twin viewport responsiveness

## Measured baseline (truth harness, headless Chromium, software raster)
`/data-centre-twin?demo=true`, time from navigation:

| Marker | Before |
|---|---|
| DOM committed | 6.6s |
| Sovereignty tab visible | 13.4s |
| Sovereignty tab click resolved | 18.9s |
| Long tasks | 24 tasks, 12.8s total, largest 4.4s |

CPU profile (CDP `Profiler`, 200us sampling): the 4.4s task is three.js
`onFirstUse` (shader program compile/link); the remaining tasks are a
continuous stream of `WebGLRenderer.renderBufferDirect` / `intersectObject`
frames, i.e. the render loop itself, at ~400-600ms per frame under software
rasterization.

## Changes
1. **`DeferredSceneMount`** (new) - the facility scene no longer mounts in the
   same commit as the page. It waits for browser idle (hard cap 1.2s) and for
   the container to intersect the viewport, behind a height-matched placeholder
   so nothing shifts. Applied to both `TwinVisualizationLayout` mounts on
   `DataCentreTwin` and to `MiniTwinPreview`.
2. **No unconditional `invalidate()`** in `CameraController` - it re-armed a
   frame every frame forever, so the camera rig alone kept the loop hot on a
   completely still scene. It now invalidates only while the distance/position
   lerp is unsettled or auto-orbit is running.
3. **`FrameRateGovernor`** - compact (secondary) viewports run `frameloop="demand"`
   at a governed 12fps instead of a 60fps loop. Overlay pulses still animate;
   the primary operator viewport is untouched at full rate.

## Result
| Marker | Before | After |
|---|---|---|
| Sovereignty tab visible | 13.4s | 7.2s |
| manifest-a11y sovereignty spec | 27.7s | 14.5s |

Regression: `twin-canvas-mounting` 1/1, `manifest-a11y` 2/2,
vitest twin-visualization + data-centre-twin 114/114 pass.

## Honest remaining cost
The residual ~400ms frames are software rasterization in the harness: there is
no GPU in CI, so every frame is rasterized on the CPU. This is a harness
property, not an application defect, and it is why the tab click still resolves
slowly there. It is not evidence about GPU-backed operator hardware; measuring
that requires the hardware acceptance lane at `/admin/asset-validation`.

Verdict: **PHASE_7_CLOSED** for the responsiveness item carried from Phase 6.
