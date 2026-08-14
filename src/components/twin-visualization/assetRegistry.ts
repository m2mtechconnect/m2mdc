/**
 * AURA 3D asset registry.
 *
 * The OpenUSD masters under `assets/` are the source of truth for geometry,
 * dimensions and SimReady semantics. The browser consumes approved GLB
 * derivatives only. Until a derivative is approved, the viewer falls back to
 * documented, unbranded procedural geometry - it never claims vendor accuracy.
 */

import manifest from '../../../assets/manifest.json';

export type AssetApprovalStatus =
  | 'approved'                  // USD master + GLB derivative validated, safe to load
  | 'pending-source'            // no licensed source model available yet
  | 'pending-review'            // source exists, validation not complete
  | 'blocked-missing-payloads'; // master references payloads that do not exist

export type FallbackReason =
  | 'no-asset-assigned'
  | 'asset-not-approved'
  | 'asset-not-runtime-eligible'
  | 'derivative-missing'
  | 'unsupported-format'
  | 'checksum-missing'
  | 'checksum-mismatch'
  | 'checksum-superseded'
  | 'build-superseded'
  | 'quality-profile-selected-fallback';

/** Addressable-part capability declared by validation evidence, not assumption. */
export interface AssetCapabilityPart {
  id: string;
  group: string | null;
  label: string;
  addressable: boolean;
  reason?: string;
}

export interface AssetManifestEntry {
  assetId: string;
  displayName: string;
  manufacturer: string | null;
  model: string | null;
  sourceUrl: string | null;
  licence: string;
  sourceFormat: string;
  usdVersion: string | null;
  glbVersion: string | null;
  /** Public URL of the approved GLB derivative, or null when unavailable. */
  glbUrl: string | null;
  dimensionsMeters: { x: number; y: number; z: number } | null;
  triangleCount: number | null;
  textureMemoryMb: number | null;
  lods: string[];
  lastValidatedAt: string | null;
  checksum: string | null;
  approvalStatus: AssetApprovalStatus;
  runtimeEligible?: boolean;
  blocker?: string;
  notes?: string;
  /** True when a newer build replaced this one. Never runtime resolvable. */
  superseded?: boolean;
  supersededBy?: string;
  /** Checksums of earlier builds that must never resolve or mount. */
  supersededChecksums?: string[];
  capabilities?: { addressableParts: AssetCapabilityPart[] };
  drawCallBudget?: number;
  gpuValidation?: { status: string; lastPassedRunId: string | null };
}

interface AssetManifestFile {
  manifestVersion: number;
  generatedAt: string;
  assets: AssetManifestEntry[];
}

const FILE = manifest as unknown as AssetManifestFile;

export function listAssets(): AssetManifestEntry[] {
  return FILE.assets;
}

export function getAsset(assetId: string): AssetManifestEntry | undefined {
  return FILE.assets.find((a) => a.assetId === assetId);
}

/**
 * Resolve the loadable GLB derivative for an asset, or null when the asset is
 * still awaiting an approved source. Callers must render documented procedural
 * geometry in the null case.
 */
export function resolveGlbDerivative(assetId: string): string | null {
  return resolveRuntimeAsset(assetId).glbUrl;
}

export interface RuntimeAssetResolution {
  assetId: string;
  /** Approved, loadable GLB URL, or null when the procedural fallback must render. */
  glbUrl: string | null;
  /** Why the procedural fallback is active; null when a derivative resolved. */
  fallbackReason: FallbackReason | null;
  usdMasterPath: string | null;
  usdChecksum: string | null;
  glbChecksum: string | null;
  approvalStatus: AssetApprovalStatus | 'unknown';
  validatedAt: string | null;
  provenance: {
    displayName: string | null;
    licence: string | null;
    sourceFormat: string | null;
    manufacturer: string | null;
    model: string | null;
  };
}

const SUPPORTED_DERIVATIVE = /\.glb$/i;

/**
 * Single runtime entry point. A manifest entry alone never makes an asset
 * runtime-eligible: the entry must be approved, explicitly runtime-eligible,
 * validated, carry a supported derivative and a checksum for it.
 */
export function resolveRuntimeAsset(
  assetId: string,
  options: { expectedChecksum?: string | null; preferFallback?: boolean } = {},
): RuntimeAssetResolution {
  const asset = getAsset(assetId);
  const base: RuntimeAssetResolution = {
    assetId,
    glbUrl: null,
    fallbackReason: 'no-asset-assigned',
    usdMasterPath: asset?.sourceUrl ?? null,
    usdChecksum: asset?.checksum ?? null,
    glbChecksum: null,
    approvalStatus: asset?.approvalStatus ?? 'unknown',
    validatedAt: asset?.lastValidatedAt ?? null,
    provenance: {
      displayName: asset?.displayName ?? null,
      licence: asset?.licence ?? null,
      sourceFormat: asset?.sourceFormat ?? null,
      manufacturer: asset?.manufacturer ?? null,
      model: asset?.model ?? null,
    },
  };

  if (!asset) return base;
  if (options.preferFallback) return { ...base, fallbackReason: 'quality-profile-selected-fallback' };
  // A superseded build is retained only for audit history. It can never mount,
  // regardless of approval flags left behind on the entry.
  if (asset.superseded === true) return { ...base, fallbackReason: 'build-superseded' };
  if (asset.approvalStatus !== 'approved') return { ...base, fallbackReason: 'asset-not-approved' };
  if (asset.runtimeEligible !== true) return { ...base, fallbackReason: 'asset-not-runtime-eligible' };
  if (!asset.glbUrl) return { ...base, fallbackReason: 'derivative-missing' };
  if (!SUPPORTED_DERIVATIVE.test(asset.glbUrl)) return { ...base, fallbackReason: 'unsupported-format' };
  if (!asset.checksum) return { ...base, fallbackReason: 'checksum-missing' };
  if (asset.supersededChecksums?.includes(asset.checksum)) {
    return { ...base, fallbackReason: 'checksum-superseded' };
  }
  if (options.expectedChecksum && options.expectedChecksum !== asset.checksum) {
    if (asset.supersededChecksums?.includes(options.expectedChecksum)) {
      return { ...base, fallbackReason: 'checksum-superseded' };
    }
    return { ...base, fallbackReason: 'checksum-mismatch' };
  }
  if (!asset.lastValidatedAt) return { ...base, fallbackReason: 'asset-not-runtime-eligible' };

  return {
    ...base,
    glbUrl: asset.glbUrl,
    glbChecksum: asset.checksum,
    fallbackReason: null,
  };
}

export const FALLBACK_REASON_LABEL: Record<FallbackReason, string> = {
  'no-asset-assigned': 'No approved asset is assigned to this rack',
  'asset-not-approved': 'Approved derivative unavailable: source asset is not approved',
  'asset-not-runtime-eligible': 'Approved derivative unavailable: asset is not runtime-eligible',
  'derivative-missing': 'Approved derivative unavailable: no GLB derivative exists',
  'unsupported-format': 'Approved derivative unavailable: unsupported derivative format',
  'checksum-missing': 'Approved derivative unavailable: derivative checksum missing',
  'checksum-mismatch': 'Approved derivative unavailable: derivative checksum mismatch',
  'checksum-superseded':
    'Approved derivative unavailable: that checksum belongs to a superseded build and is retained for audit history only',
  'build-superseded':
    'Approved derivative unavailable: this build is superseded and is retained for audit history only',
  'quality-profile-selected-fallback': 'Procedural geometry selected by the active quality profile',
};

/** Canonical rack asset id used by the 3D scene. */
export const RACK_ASSET_ID = 'aura.rack.generic_42u';

/** True when at least one approved GLB derivative exists in the manifest. */
export function hasApprovedDerivatives(): boolean {
  return FILE.assets.some((a) => resolveRuntimeAsset(a.assetId).glbUrl !== null);
}

/** Assets blocking the photoreal upgrade, for honest UI/reporting. */
export function assetsAwaitingSource(): AssetManifestEntry[] {
  return FILE.assets.filter((a) => a.approvalStatus !== 'approved');
}

export function getManifestVersion(): number {
  return FILE.manifestVersion;
}

/**
 * Capability map for an asset, derived from validation evidence recorded in
 * the manifest. The UI must derive available interactions from this map and
 * never from assumed rack features.
 */
export function getAssetCapabilityParts(assetId: string): AssetCapabilityPart[] {
  return getAsset(assetId)?.capabilities?.addressableParts ?? [];
}

/** True only when the named part is proven addressable in the derivative. */
export function isPartAddressable(assetId: string, partId: string): boolean {
  return getAssetCapabilityParts(assetId).some((p) => p.id === partId && p.addressable);
}

/** Checksums that must never resolve or mount anywhere in the runtime. */
export interface GpuValidationStatus {
  status: string;
  gpuValidated: boolean;
  label: string;
  lastPassedRunId: string | null;
}

/**
 * Hardware GPU validation state for an asset. Until a saved administrator run
 * passes, the UI must keep saying "Awaiting hardware GPU validation".
 */
export function getGpuValidationStatus(assetId: string): GpuValidationStatus {
  const record = getAsset(assetId)?.gpuValidation;
  const gpuValidated = record?.status === 'gpu-validated';
  return {
    status: record?.status ?? 'awaiting-hardware-run',
    gpuValidated,
    label: gpuValidated ? 'GPU-validated' : 'Awaiting hardware GPU validation',
    lastPassedRunId: record?.lastPassedRunId ?? null,
  };
}

export function isSupersededChecksum(checksum: string): boolean {
  const normalized = checksum.trim().toLowerCase();
  return FILE.assets.some(
    (a) =>
      (a.supersededChecksums ?? []).some((c) => c.toLowerCase() === normalized) ||
      (a.superseded === true && a.checksum?.toLowerCase() === normalized),
  );
}

/** Resolve by checksum. Superseded checksums resolve to nothing. */
export function resolveByChecksum(checksum: string): AssetManifestEntry | null {
  if (isSupersededChecksum(checksum)) return null;
  const normalized = checksum.trim().toLowerCase();
  const entry = FILE.assets.find((a) => a.checksum?.toLowerCase() === normalized);
  if (!entry || entry.superseded) return null;
  return resolveRuntimeAsset(entry.assetId).glbUrl ? entry : null;
}