/**
 * Omniverse Kit configuration — PR-0.1 Checkpoint B7 lockdown.
 *
 * The browser client is NOT permitted to read Omniverse endpoints from
 * `import.meta.env`. Any Omniverse endpoint value present at build time would
 * be inlined into the production bundle by Vite, exposing infrastructure to
 * every anonymous visitor. The Omniverse client is therefore held in a
 * typed-unavailable state on all builds until an approved, server-mediated
 * transport is delivered in Checkpoint C.
 *
 * No `VITE_OMNIVERSE_*` variable is read here or anywhere else in the client
 * build graph. The enforcer in `scripts/verify-production-perimeter.mjs`
 * blocks reintroduction.
 */

import type { SourceConnectionState } from '@/lib/provenance/types';

/** Public reason returned to UI when Kit is queried. Does not disclose config. */
const UNAVAILABLE_REASON =
  'Omniverse Kit is unavailable in this build. Server-mediated transport is required.';

export interface KitConfig {
  enabled: boolean;               // Kit REST usage allowed (env valid).
  restBaseUrl: string | null;     // Fully-qualified base URL or null when disabled.
  streamEnabled: boolean;         // WebRTC stream feature flag.
  signalingHost: string | null;   // Signaling host derived from KIT_URL when absent.
  signalingPort: number;          // Fixed 49100 per NVIDIA AppStreamer defaults.
  reason?: string;                // Human-readable reason when `enabled === false`.
}

/**
 * Dev proxy path used by the browser client to avoid CORS. Vite proxies
 * `/kit-api/*` -> `${VITE_OMNIVERSE_KIT_URL}/*` when the env is set.
 */
export const DEV_PROXY_PREFIX = '/kit-api';

/**
 * Return the Kit configuration. In every build variant this returns a
 * typed-unavailable, disabled configuration — no environment access.
 *
 * Any future re-enablement MUST route through an authenticated server-side
 * proxy (Checkpoint C). Direct browser access to Kit endpoints is forbidden.
 */
export function readKitConfig(): KitConfig {
  return {
    enabled: false,
    restBaseUrl: null,
    streamEnabled: false,
    signalingHost: null,
    signalingPort: 49100,
    reason: UNAVAILABLE_REASON,
  };
}

/** Machine-readable connection-state helper for UI badges. */
export function connectionStateForConfig(_cfg: KitConfig): SourceConnectionState {
  // Always 'demo' — Kit is typed-unavailable in the browser build.
  return 'demo';
}