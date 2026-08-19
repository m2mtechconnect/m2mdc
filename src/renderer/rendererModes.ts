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

/**
 * Phase 1 of the NVIDIA operational-readiness program re-keys this module to
 * the four modes mandated by `docs/architecture/adr-hybrid-nvidia-runtime.md`.
 * The ADR and this file previously disagreed on the vocabulary, which meant a
 * renderer label could be argued either way. The ADR wins.
 *
 * `unavailable` covers every case where no 3D renderer is drawing: the
 * deterministic 2D plan view is the surface AURA shows in that state, not a
 * renderer of its own.
 */
export type RendererModeId =
  /** AURA's own WebGL2 runtime (three.js) drawing GLB derivatives of OpenUSD. */
  | 'browser-preview'
  /** Omniverse Kit pixel stream delivered by NVIDIA Cloud Functions. */
  | 'kit-stream-nvcf'
  /** Omniverse Kit pixel stream from a self-managed GPU cluster. */
  | 'kit-stream-self-managed'
  /** No 3D renderer is drawing; AURA presents the deterministic plan view. */
  | 'unavailable';

/**
 * Identifiers used before the ADR re-key. Kept so persisted rows, evidence
 * files and older tests still resolve to a real mode instead of throwing.
 */
export const LEGACY_RENDERER_MODE_ALIASES: Record<string, RendererModeId> = {
  'aura-web-runtime': 'browser-preview',
  'aura-2d-fallback': 'unavailable',
  'nvidia-kit-stream': 'kit-stream-nvcf',
};

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
    id: 'browser-preview',
    label: 'AURA browser preview',
    description:
      'AURA renders the twin in the browser with WebGL2, using GLB derivatives generated from the OpenUSD masters.',
    nvidiaRuntime: false,
    implementation: 'src/components/twin-visualization/DataCenter3DScene.tsx',
    blockedReason: null,
  },
  {
    id: 'kit-stream-nvcf',
    label: 'Omniverse Kit stream (NVCF)',
    description:
      'A pixel stream rendered by NVIDIA Omniverse Kit and delivered over WebRTC from NVIDIA Cloud Functions. This is the selected production-pilot streaming path and is not present in this build.',
    nvidiaRuntime: true,
    implementation: 'src/components/twin-visualization/OmniverseStreamViewer.tsx',
    blockedReason: KIT_BLOCKED_REASON,
  },
  {
    id: 'kit-stream-self-managed',
    label: 'Omniverse Kit stream (self-managed GPU)',
    description:
      'An Omniverse Kit pixel stream from a self-managed GPU cluster. Deferred by the hybrid runtime ADR; no implementation exists and none may be added without a separate ADR.',
    nvidiaRuntime: true,
    implementation: null,
    blockedReason:
      'Self-managed Kit streaming is deferred by the hybrid runtime ADR. NVCF is the single production pilot path until a documented sovereignty requirement changes that.',
  },
  {
    id: 'unavailable',
    label: 'No 3D renderer (deterministic plan view)',
    description:
      'No renderer is drawing the twin. AURA shows the deterministic 2D plan view of the same model when WebGL2 is unusable or the canvas fails to mount.',
    nvidiaRuntime: false,
    implementation: 'src/components/twin-visualization/TwinFallback2D.tsx',
    blockedReason: null,
  },
];

export function getRendererMode(id: RendererModeId): RendererModeRecord {
  const mode = RENDERER_MODES.find((m) => m.id === id);
  if (!mode) throw new Error(`Unknown renderer mode: ${id}`);
  return mode;
}

/** Resolve a possibly-legacy identifier to a current mode. */
export function resolveRendererModeId(id: string): RendererModeRecord {
  return getRendererMode((LEGACY_RENDERER_MODE_ALIASES[id] ?? id) as RendererModeId);
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
  const mode = getRendererMode('kit-stream-nvcf');
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
      mode: getRendererMode('unavailable'),
      availability: 'fallback',
      reason: input.canvasFailed
        ? 'The 3D canvas failed to mount. Showing the deterministic plan view of the same model.'
        : 'WebGL2 is unavailable in this browser. Showing the deterministic plan view of the same model.',
    };
  }

  return {
    mode: getRendererMode('browser-preview'),
    availability: 'active',
    reason: 'Rendered by AURA in the browser. This is not an Omniverse Kit or RTX session.',
  };
}