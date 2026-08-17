/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 5.
 *
 * One source of truth for how AURA puts a twin on screen.
 *
 * Before this module, renderer naming was decided independently in the scene
 * component, the stream viewer and the capability registry, which is how a
 * WebGL canvas ends up described as an "Omniverse scene". Every surface now
 * resolves its renderer label and availability here.
 *
 * Truth rules enforced by `src/renderer/__tests__/rendererModes.test.ts`:
 *   - A mode may set `nvidiaRuntime: true` only when NVIDIA software actually
 *     renders the pixels. AURA's own WebGL canvas never qualifies.
 *   - The NVIDIA Kit / RTX streaming mode is available only when
 *     `readKitConfig()` reports an enabled, server-mediated transport. It
 *     fails closed today and must state why.
 */

import { readKitConfig } from '@/integrations/omniverseKit/config';

export type RendererModeId =
  /** AURA's own WebGL2 runtime (three.js) drawing GLB derivatives of OpenUSD. */
  | 'aura-web-runtime'
  /** Deterministic 2D plan view used when WebGL2 is unusable. */
  | 'aura-2d-fallback'
  /** NVIDIA Omniverse Kit / RTX pixel stream delivered over WebRTC. */
  | 'nvidia-kit-stream';

export type RendererAvailability = 'active' | 'fallback' | 'unavailable';

export interface RendererModeRecord {
  id: RendererModeId;
  /** Label shown to users. Never names an NVIDIA product for an AURA renderer. */
  label: string;
  description: string;
  /** True only when NVIDIA software renders the pixels. */
  nvidiaRuntime: boolean;
  /** Module that implements this mode, or null when nothing implements it. */
  implementation: string | null;
  /** Why the mode is not usable, when it is not. */
  blockedReason: string | null;
}

const KIT_BLOCKED_REASON =
  'No Omniverse Kit or RTX streaming session is reachable from this build. A server-mediated transport is required.';

export const RENDERER_MODES: RendererModeRecord[] = [
  {
    id: 'aura-web-runtime',
    label: 'AURA Web Runtime',
    description:
      'AURA renders the twin in the browser with WebGL2, using GLB derivatives generated from the OpenUSD masters.',
    nvidiaRuntime: false,
    implementation: 'src/components/twin-visualization/DataCenter3DScene.tsx',
    blockedReason: null,
  },
  {
    id: 'aura-2d-fallback',
    label: 'AURA 2D plan view',
    description:
      'Deterministic plan view of the same model, shown when WebGL2 is unavailable or the canvas fails to mount.',
    nvidiaRuntime: false,
    implementation: 'src/components/twin-visualization/TwinFallback2D.tsx',
    blockedReason: null,
  },
  {
    id: 'nvidia-kit-stream',
    label: 'Omniverse Kit / RTX stream',
    description:
      'A pixel stream rendered by NVIDIA Omniverse Kit and delivered over WebRTC. Not part of this build.',
    nvidiaRuntime: true,
    implementation: 'src/components/twin-visualization/OmniverseStreamViewer.tsx',
    blockedReason: KIT_BLOCKED_REASON,
  },
];

export function getRendererMode(id: RendererModeId): RendererModeRecord {
  const mode = RENDERER_MODES.find((m) => m.id === id);
  if (!mode) throw new Error(`Unknown renderer mode: ${id}`);
  return mode;
}

export interface RendererModeState {
  mode: RendererModeRecord;
  availability: RendererAvailability;
  /** Plain-language explanation suitable for a badge tooltip or banner. */
  reason: string;
}

/**
 * Whether the NVIDIA Kit / RTX stream can be offered. Fails closed: the
 * browser build holds Kit in a typed-unavailable state.
 */
export function resolveKitStreamState(): RendererModeState {
  const cfg = readKitConfig();
  const mode = getRendererMode('nvidia-kit-stream');
  const usable = cfg.enabled && cfg.streamEnabled && Boolean(cfg.signalingHost);
  return usable
    ? { mode, availability: 'active', reason: 'Streaming session reachable.' }
    : {
        mode,
        availability: 'unavailable',
        reason: cfg.reason ?? mode.blockedReason ?? KIT_BLOCKED_REASON,
      };
}

/**
 * Resolve which renderer a twin surface should present, given what the
 * browser can actually do.
 */
export function resolveRendererMode(input: {
  webgl2Available: boolean;
  canvasFailed?: boolean;
}): RendererModeState {
  const kit = resolveKitStreamState();
  if (kit.availability === 'active') return kit;

  if (!input.webgl2Available || input.canvasFailed) {
    return {
      mode: getRendererMode('aura-2d-fallback'),
      availability: 'fallback',
      reason: input.canvasFailed
        ? 'The 3D canvas failed to mount. Showing the deterministic plan view of the same model.'
        : 'WebGL2 is unavailable in this browser. Showing the deterministic plan view of the same model.',
    };
  }

  return {
    mode: getRendererMode('aura-web-runtime'),
    availability: 'active',
    reason: 'Rendered by AURA in the browser. This is not an Omniverse Kit or RTX session.',
  };
}