/**
 * Protected pre-realism baseline for the cloud-GPU phase.
 *
 * Recorded from the verified production build before any realism work. The
 * regression tests below this file's consumers assert that realism changes
 * cannot silently move these counts.
 */

export const CLOUD_GPU_BASELINE = {
  buildId: 'bmsv58pp8',
  route: '/data-centre-twin?geometry=nvidia-reference',
  publishedUrl: 'https://m2mdc.lovable.app',
  nvidiaObjects: 178,
  auraFacilityObjects: 916,
  rackCabinets: 40,
  /** Unintended procedural physical stand-ins. Must stay at zero. */
  physicalFallbacks: 0,
  materialClasses: 7,
  nvidiaSourcesWithOverrideLayer: 20,
  geometryModified: false,
} as const;

export type CloudGpuBaseline = typeof CLOUD_GPU_BASELINE;