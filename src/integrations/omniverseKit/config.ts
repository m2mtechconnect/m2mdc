/**
 * Validated Omniverse Kit configuration + connection state machine.
 *
 * All Kit endpoints MUST be read through this module. No hard-coded fallback
 * IPs; a missing / malformed `VITE_OMNIVERSE_KIT_URL` fails closed.
 *
 * Envs consumed:
 *   - VITE_OMNIVERSE_KIT_URL         (required to enable Kit REST)
 *   - VITE_OMNIVERSE_SIGNALING_HOST  (optional; derived from KIT_URL when absent)
 *   - VITE_OMNIVERSE_STREAM_ENABLED  ('true'/'1' to enable WebRTC stream)
 */

import type { SourceConnectionState } from '@/lib/provenance/types';

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

function isHttpUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function readEnv(key: string): string | undefined {
  // Vite exposes VITE_* at build time via import.meta.env; guarded for tests.
  const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const v = meta?.[key];
  return v && v.trim() !== '' ? v : undefined;
}

function isDev(): boolean {
  const meta = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
  return Boolean(meta?.DEV);
}

/**
 * Read + validate the Kit configuration from the current Vite env.
 * Never throws; returns a disabled config with `reason` on any misconfig.
 */
export function readKitConfig(): KitConfig {
  const url = readEnv('VITE_OMNIVERSE_KIT_URL');
  const streamFlag = readEnv('VITE_OMNIVERSE_STREAM_ENABLED');
  const signalingEnv = readEnv('VITE_OMNIVERSE_SIGNALING_HOST');

  if (!url) {
    return {
      enabled: false,
      restBaseUrl: null,
      streamEnabled: false,
      signalingHost: null,
      signalingPort: 49100,
      reason: 'VITE_OMNIVERSE_KIT_URL is not set — Kit disabled, demo scaffolding active.',
    };
  }
  if (!isHttpUrl(url)) {
    return {
      enabled: false,
      restBaseUrl: null,
      streamEnabled: false,
      signalingHost: null,
      signalingPort: 49100,
      reason: 'VITE_OMNIVERSE_KIT_URL is not a valid http(s) URL — Kit disabled.',
    };
  }

  const parsed = new URL(url);
  const streamEnabled = streamFlag === 'true' || streamFlag === '1';
  const signalingHost = signalingEnv ?? parsed.hostname;

  return {
    enabled: true,
    // In dev, browser fetches use the Vite proxy path to avoid CORS.
    restBaseUrl: isDev() ? DEV_PROXY_PREFIX : parsed.origin,
    streamEnabled,
    signalingHost,
    signalingPort: 49100,
  };
}

/** Machine-readable connection-state helper for UI badges. */
export function connectionStateForConfig(cfg: KitConfig): SourceConnectionState {
  if (!cfg.enabled) return 'demo';
  return 'connecting';
}