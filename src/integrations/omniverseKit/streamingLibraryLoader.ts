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
 * Provenance (recorded in the SBOM, docs/remediation/phase-11/sbom-supplement.md):
 *   source    vendored from the NVIDIA Omniverse AppStreaming web client SDK
 *   file      public/omniverse-webrtc-streaming-library.umd.js
 *   licence   NVIDIA Omniverse licence - redistribution is entitlement-gated
 *   update    replace the file, refresh the checksum, re-run the SBOM script
 */

import { readKitConfig } from './config';

export const STREAMING_LIBRARY_PATH = '/omniverse-webrtc-streaming-library.umd.js';
export const STREAMING_LIBRARY_GLOBAL = 'OmniverseWebrtcStreamingLibrary';

export type StreamingLoadRefusal =
  | 'provider-not-selected'
  | 'provider-unavailable'
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
