/**
 * Admin-only realism A/B lane.
 *
 * Two presentation variants over *identical* geometry, facility data, camera
 * and lighting:
 *
 *   • `baseline`        - the pre-policy uniform tuning that shipped before the
 *                         video-informed material policy. One material family
 *                         for every converted mesh.
 *   • `video-informed`  - the AURA-authored seven-class material policy.
 *
 * The mode is a presentation-only switch. It never changes which derivatives
 * are requested, how many objects mount, telemetry, or simulation results, and
 * it is only honoured for asset administrators.
 */

import type { MaterialSpec } from './materialPolicy';

export type RealismMode = 'baseline' | 'video-informed';

export const DEFAULT_REALISM_MODE: RealismMode = 'video-informed';

/** Query parameter used by the cloud-GPU validation harness. */
export const REALISM_QUERY_PARAM = 'realism';

/**
 * The single uniform tuning applied to every converted mesh before the
 * video-informed policy existed. Recorded here verbatim so the A/B comparison
 * is against the real prior appearance rather than a reconstruction.
 */
export const BASELINE_UNIFORM_SPEC: MaterialSpec = {
  color: 0x8a9099,
  roughness: 0.55,
  metalness: 0.8,
  envMapIntensity: 0.6,
  emissive: 0x000000,
  emissiveIntensity: 0,
};

export function parseRealismMode(value: string | null | undefined): RealismMode | null {
  if (value === 'baseline' || value === 'video-informed') return value;
  return null;
}

/** Read the requested mode from a location search string. */
export function readRealismModeFromSearch(search: string): RealismMode | null {
  try {
    return parseRealismMode(new URLSearchParams(search).get(REALISM_QUERY_PARAM));
  } catch {
    return null;
  }
}

let currentMode: RealismMode = DEFAULT_REALISM_MODE;
const listeners = new Set<(mode: RealismMode) => void>();

export function getRealismMode(): RealismMode {
  return currentMode;
}

export function setRealismMode(mode: RealismMode) {
  if (mode === currentMode) return;
  currentMode = mode;
  listeners.forEach((listener) => listener(mode));
  if (typeof window !== 'undefined') window.__auraRealismMode = mode;
}

export function subscribeRealismMode(listener: (mode: RealismMode) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

declare global {
  interface Window {
    /** Read by the cloud-GPU harness to label captured evidence. */
    __auraRealismMode?: RealismMode;
  }
}