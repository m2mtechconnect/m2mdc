/**
 * Phase 3 - facility viewport registry.
 *
 * AURA renders the facility through several surfaces. They are not variants of
 * one component: the workspace viewport is a full-bleed WebGL scene with a 2D
 * fallback, the Command Centre card is an SVG floor plan, the overview tile is
 * a compact WebGL thumbnail. Merging them would be a false consolidation.
 *
 * What genuinely must be shared is the *provenance claim*: how a surface is
 * allowed to describe what the user is looking at. Before this registry each
 * surface hard-coded its own disclosure string, and the Command Centre card
 * (then also named `FacilityCanvas`) claimed a "Procedural 3D preview ... rendered from a validated USD-derived
 * GLB" while rendering a 2D SVG plan with no GLB in the tree.
 *
 * `src/workspace/__tests__/viewportRegistry.test.ts` proves each surface's
 * declared renderer against its actual imports, so a surface can never again
 * claim geometry it does not mount.
 */

/** How the surface puts pixels on screen. */
export type ViewportRenderer =
  /** three.js / WebGL scene (`DataCenter3DScene`). */
  | 'three-webgl'
  /** Server-free SVG floor plan (`FacilityFloorPlan`). */
  | 'svg-2d';

export interface ViewportSurface {
  id: string;
  /** Module path, relative to `src/`, that mounts the surface. */
  module: string;
  renderer: ViewportRenderer;
  /**
   * True only when the surface can mount a validated USD-derived GLB.
   * Requires `three-webgl`; the test enforces that.
   */
  canMountApprovedGlb: boolean;
  /** The disclosure the surface is allowed to show. */
  disclosure: string;
  purpose: string;
}

export const VIEWPORT_SURFACES: ViewportSurface[] = [
  {
    id: 'workspace-model-viewport',
    module: 'workspace/FacilityCanvas.tsx',
    renderer: 'three-webgl',
    canMountApprovedGlb: true,
    disclosure:
      'Procedural 3D preview, except one canary rack rendered from a validated USD-derived GLB',
    purpose: 'Full-bleed model viewport for Blueprint and Simulation, with a 2D floor-plan fallback.',
  },
  {
    id: 'command-centre-plan-card',
    module: 'workspace/dashboard/FacilityPlanCard.tsx',
    renderer: 'svg-2d',
    canMountApprovedGlb: false,
    disclosure: 'Procedural 2D floor plan of the modelled design',
    purpose: 'Command Centre facility card with rack search and quick view.',
  },
  {
    id: 'overview-mini-preview',
    module: 'components/data-centre-twin/overview/MiniTwinPreview.tsx',
    renderer: 'three-webgl',
    canMountApprovedGlb: true,
    disclosure:
      'Procedural 3D preview, except one canary rack rendered from a validated USD-derived GLB',
    purpose: 'Compact read-only thumbnail on the twin Overview tab.',
  },
  {
    id: 'twin-visualization-layout',
    module: 'components/twin-visualization/TwinVisualizationLayout.tsx',
    renderer: 'three-webgl',
    canMountApprovedGlb: true,
    disclosure:
      'Procedural 3D preview, except one canary rack rendered from a validated USD-derived GLB',
    purpose: 'Standalone visualisation layout used by the twin preview route.',
  },
];

export function viewportSurface(id: string): ViewportSurface {
  const surface = VIEWPORT_SURFACES.find((s) => s.id === id);
  if (!surface) throw new Error(`Unknown viewport surface: ${id}`);
  return surface;
}

/** The disclosure a surface is allowed to display. */
export function viewportDisclosure(id: string): string {
  return viewportSurface(id).disclosure;
}
