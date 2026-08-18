# Phase 3 - Viewport surfaces and provenance claims

`03-route-and-component-merge-map.md` listed five viewport implementations and
proposed collapsing them into one, deleting `workspace/dashboard/FacilityCanvas.tsx`
"after adapter proves parity". Reading the code shows that disposition was wrong,
and this phase records why.

## Finding: the surfaces are not duplicates

| Surface | Renderer | Shape |
|---|---|---|
| `workspace/FacilityCanvas.tsx` | `DataCenter3DScene` (WebGL) + 2D fallback | full-bleed, URL-owned view state, bounded 8s readiness probe |
| `workspace/dashboard/FacilityCanvas.tsx` | `FacilityFloorPlan` (SVG) only | card with rack search, overlay toolbar, rack quick view |
| `components/data-centre-twin/overview/MiniTwinPreview.tsx` | `DataCenter3DScene`, compact | read-only 160px thumbnail |
| `components/twin-visualization/TwinVisualizationLayout.tsx` | `DataCenter3DScene` | standalone layout for the preview route |
| `pages/TwinPreview.tsx` | route wrapper | mounts the layout above |

They already share the two things that matter - `DataCenter3DScene` for 3D and
`FacilityFloorPlan` for 2D. The remaining differences are the *chrome* (card vs
full-bleed vs thumbnail), which is the surface's reason to exist. Collapsing
them would have produced one component with a `variant` prop and every prop of
all three, which is a merge on paper and a regression in practice. Parity was
therefore not attempted, and the merge map entry is superseded by this note.

## Real defect found: a false provenance claim

The Command Centre facility card mounts **only** `FacilityFloorPlan`, an SVG
floor plan. Its disclosure footer read:

> Procedural 3D preview, except one canary rack rendered from a validated
> USD-derived GLB

There is no 3D scene and no GLB anywhere in that component's tree. The string
had been copied from the workspace viewport, where it is true. On the Command
Centre - the first screen an operator sees - it asserted validated NVIDIA
USD-derived geometry for a hand-drawn 2D diagram.

## What was built

**`src/workspace/viewportRegistry.ts`** declares each surface with its module,
renderer (`three-webgl` / `svg-2d`), whether it can mount an approved GLB, and
the one disclosure it is allowed to display.

**`src/workspace/__tests__/viewportRegistry.test.ts`** (6 tests) proves the
declarations against the source:

- every declared module exists, with unique ids;
- `three-webgl` is claimed only by modules that actually import
  `DataCenter3DScene`, and only those may set `canMountApprovedGlb`;
- a surface that cannot mount approved geometry may not use the words "3D",
  "GLB" or "USD" in its disclosure;
- the Command Centre card reads its disclosure from the registry rather than a
  literal.

The card now shows "Procedural 2D floor plan of the modelled design".

## Secondary fix: name collision

Two unrelated components both exported `FacilityCanvas`, which is how the
disclosure string was copied between them in the first place. The Command
Centre one is now `FacilityPlanCard` in
`src/workspace/dashboard/FacilityPlanCard.tsx`; `data-testid` values are
unchanged so the Playwright truth suite is unaffected.

## Verification

- `vitest`: 1762 passed / 91 skipped (+6).
- Typecheck: clean. Build: succeeds.
