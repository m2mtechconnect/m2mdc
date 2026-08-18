/**
 * Gated loader for the NVIDIA Omniverse WebRTC streaming library.
 *
 * Phase 11. The library used to be a global <script> in index.html, so every
 * anonymous visitor downloaded ~722 KB of vendor code for a provider that
 * `readKitConfig()` reports as unavailable in every build. It is now loaded
 * lazily and only when ALL gates pass:
 *
 *   1. the caller selected Omniverse streaming as the renderer,
 *   2. the Kit provider is configured (`readKitConfig().streamEnabled`),
 *   3. a server-side health check succeeded,
 *   4. the current user holds the streaming permission.
 *
 * Phase 1 (dead-code and redistribution closure): the vendored bundle at
 * `public/omniverse-webrtc-streaming-library.umd.js` had NO production
 * consumer - only this loader and its own tests referenced it - yet it was
 * served publicly from the origin, redistributing an entitlement-gated NVIDIA
 * artifact to anonymous visitors. The file has been removed and the loader now
 * refuses with `asset-not-vendored` before touching the DOM.
 *
 * To reinstate: restore the bundle under an authenticated, entitlement-checked
 * delivery path (not `public/`), set `STREAMING_LIBRARY_VENDORED`, record the
 * source, licence and checksum in the SBOM, and confirm the exported global
 * name matches the shipped bundle.
 */

import { readKitConfig } from './config';

export const STREAMING_LIBRARY_PATH = '/omniverse-webrtc-streaming-library.umd.js';
export const STREAMING_LIBRARY_GLOBAL = 'OmniverseWebrtcStreamingLibrary';

/**
 * False while no entitlement-checked bundle is vendored in this build.
 * Flipping this alone is not sufficient - see the reinstatement note above.
 */
export const STREAMING_LIBRARY_VENDORED = false;

export type StreamingLoadRefusal =
  | 'provider-not-selected'
  | 'provider-unavailable'
  | 'asset-not-vendored'
  | 'health-check-failed'
  | 'permission-denied'
  | 'load-failed';

export interface StreamingLoadResult {
  loaded: boolean;
  refusal?: StreamingLoadRefusal;
}

export interface StreamingLoadGates {
  /** True only when the user explicitly chose Omniverse streaming. */
  providerSelected: boolean;
  /** Server-side health probe for the Kit AppStreaming endpoint. */
  healthCheck: () => Promise<boolean>;
  /** Route/role permission check for streaming. */
  hasPermission: boolean;
}

let inflight: Promise<StreamingLoadResult> | null = null;

function alreadyLoaded(): boolean {
  return typeof window !== 'undefined' &&
    Boolean((window as unknown as Record<string, unknown>)[STREAMING_LIBRARY_GLOBAL]);
}

function injectScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('script');
    el.src = STREAMING_LIBRARY_PATH;
    el.async = true;
    el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });
}

export async function loadOmniverseStreamingLibrary(
  gates: StreamingLoadGates,
): Promise<StreamingLoadResult> {
  if (!gates.providerSelected) return { loaded: false, refusal: 'provider-not-selected' };
  if (!gates.hasPermission) return { loaded: false, refusal: 'permission-denied' };
  if (!STREAMING_LIBRARY_VENDORED) return { loaded: false, refusal: 'asset-not-vendored' };

  const cfg = readKitConfig();
  if (!cfg.enabled || !cfg.streamEnabled) {
    return { loaded: false, refusal: 'provider-unavailable' };
  }

  const healthy = await gates.healthCheck().catch(() => false);
  if (!healthy) return { loaded: false, refusal: 'health-check-failed' };

  if (alreadyLoaded()) return { loaded: true };
  if (inflight) return inflight;

  inflight = injectScript().then((ok) => {
    inflight = null;
    return ok ? { loaded: true } : { loaded: false, refusal: 'load-failed' as const };
  });

  return inflight;
}

/** Test/reset helper. */
export function __resetStreamingLoader() {
  inflight = null;
}
