/**
 * Hardware GPU acceptance specification for approved 3D asset derivatives.
 *
 * Every expected value below is copied from the recorded manifest / approval
 * record for the derivative. Nothing here is estimated or inferred.
 */

import {
  getAsset,
  getAssetCapabilityParts,
  getManifestVersion,
  type AssetCapabilityPart,
} from '@/components/twin-visualization/assetRegistry';
import { LIQUID_RACK_SCENARIO_ID } from '@/components/twin-visualization/designScenario';

export const VALIDATION_ASSET_ID = 'nvidia.rack.42u_a_01.ops';
export const VALIDATION_SCENARIO_ID = LIQUID_RACK_SCENARIO_ID;

export interface AssetExpectation {
  assetId: string;
  checksum: string;
  triangleCount: number;
  assetDrawCalls: number;
  bounds: { x: number; y: number; z: number };
  minY: number;
  frontAxis: '+Z';
  textureCount: number;
  convertedMaterialCount: number;
  derivativeBytes: number;
  mimeType: string;
  glbUrl: string;
  manifestVersion: number;
  addressableParts: AssetCapabilityPart[];
  supersededChecksums: string[];
}

/** Standardised benchmark configuration. Changing it invalidates comparison. */
export const BENCHMARK_CONFIG = {
  scenarioId: VALIDATION_SCENARIO_ID,
  qualityProfile: 'balanced' as const,
  viewport: { width: 1920, height: 1080 },
  devicePixelRatioCap: 1,
  overlays: 'scenario-label-only' as const,
  stabilizationMs: 5_000,
  orbitMs: 15_000,
  holds: ['front', 'rear', 'elevated'] as const,
  powerPreference: 'high-performance' as const,
  preserveDrawingBuffer: false,
};

export type BenchmarkConfig = typeof BENCHMARK_CONFIG;

/** Acceptance thresholds for the standardised 1920x1080, DPR 1, Balanced run. */
export const THRESHOLDS = {
  passAverageFps: 45,
  passOnePercentLowFps: 30,
  warnAverageFpsFloor: 30,
  maxDrawCallDelta: 10,
  maxMainThreadStallMs: 500,
  warnColdTransferMs: 8_000,
  warnParseMs: 3_000,
  warnMountMs: 3_000,
};

export function buildAssetExpectation(
  assetId: string = VALIDATION_ASSET_ID,
): AssetExpectation | null {
  const entry = getAsset(assetId);
  if (!entry || !entry.checksum || !entry.glbUrl || !entry.dimensionsMeters) return null;
  const provenance = (entry as unknown as {
    provenance?: { derivativeBytes?: number; drawCallMeshes?: number; imageCount?: number; materialCount?: number };
  }).provenance;

  return {
    assetId,
    checksum: entry.checksum,
    triangleCount: entry.triangleCount ?? 0,
    assetDrawCalls: entry.drawCallBudget ?? provenance?.drawCallMeshes ?? 0,
    bounds: entry.dimensionsMeters,
    minY: 0,
    frontAxis: '+Z',
    textureCount: provenance?.imageCount ?? 0,
    convertedMaterialCount: provenance?.materialCount ?? 0,
    derivativeBytes: provenance?.derivativeBytes ?? 0,
    mimeType: 'model/gltf-binary',
    glbUrl: entry.glbUrl,
    manifestVersion: getManifestVersion(),
    addressableParts: getAssetCapabilityParts(assetId),
    supersededChecksums: entry.supersededChecksums ?? [],
  };
}