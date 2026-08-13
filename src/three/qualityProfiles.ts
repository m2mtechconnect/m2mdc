/**
 * Rendering quality profiles for the WebGL twin.
 *
 * A safe default is auto-selected from device capability; operators can
 * override it. The scene must stay understandable at every profile, so the
 * low profile only removes shadows / soft lighting, never information.
 */

export type QualityProfileId = 'high' | 'balanced' | 'low';

export interface QualityProfile {
  id: QualityProfileId;
  label: string;
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  antialias: boolean;
  environment: boolean;
  contactShadows: boolean;
  /** Maximum number of racks rendered with interior detail geometry. */
  detailBudget: number;
  /** Rack geometry level of detail. */
  rackDetail: 'full' | 'exterior' | 'simple';
  /** Screen-space ambient occlusion / grounded contact shadows. */
  ambientOcclusion: boolean;
  /** Texture anisotropy for floor tiles and faceplates. */
  anisotropy: number;
  /** Environment reflection strength applied to metals. */
  envIntensity: number;
}

export const QUALITY_PROFILES: Record<QualityProfileId, QualityProfile> = {
  high: {
    id: 'high',
    label: 'High (discrete GPU)',
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 2048,
    antialias: true,
    environment: true,
    contactShadows: true,
    detailBudget: 240,
    rackDetail: 'full',
    ambientOcclusion: true,
    anisotropy: 8,
    envIntensity: 1,
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced (default)',
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 1024,
    antialias: true,
    environment: true,
    contactShadows: false,
    detailBudget: 120,
    rackDetail: 'exterior',
    ambientOcclusion: false,
    anisotropy: 4,
    envIntensity: 0.7,
  },
  low: {
    id: 'low',
    label: 'Low (integrated GPU / mobile)',
    dpr: [1, 1],
    shadows: false,
    shadowMapSize: 512,
    antialias: false,
    environment: false,
    contactShadows: false,
    detailBudget: 48,
    rackDetail: 'simple',
    ambientOcclusion: false,
    anisotropy: 1,
    envIntensity: 0.35,
  },
};

const STORAGE_KEY = 'aura.twin.qualityProfile';

/** Best-effort automatic profile selection. Never throws. */
export function detectQualityProfile(): QualityProfileId {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'balanced';

  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  const smallViewport = window.innerWidth < 900;

  if (coarse || smallViewport || memory <= 4 || cores <= 4) return 'low';
  if (memory >= 8 && cores >= 8 && window.devicePixelRatio <= 2) return 'high';
  return 'balanced';
}

/** Read the operator override, falling back to auto-detection. */
export function readQualityProfile(): QualityProfileId {
  if (typeof window === 'undefined') return 'balanced';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'high' || stored === 'balanced' || stored === 'low') return stored;
  } catch {
    /* storage unavailable - fall through to detection */
  }
  return detectQualityProfile();
}

/** Persist an explicit operator override. */
export function writeQualityProfile(id: QualityProfileId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* non-fatal */
  }
}