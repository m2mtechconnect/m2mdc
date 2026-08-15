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
  /**
   * Runtime semantics. Present only on pack-wide ingested entries; absent on
   * older entries, which therefore resolve to no semantic role at all.
   */
  semanticRole?: SemanticRole;
  /** Derivative class this entry represents. */
  qualityLevel?: QualityLevel;
  /** Sibling entries for the other derivative classes of the same source. */
  qualityVariants?: Partial<Record<QualityLevel, string>>;
  /** True when the entry may be instanced across many placements. */
  instanceable?: boolean;
  /** Measured cost of this derivative, recorded by the ingestion pipeline. */
  qualityMetrics?: {
    triangles: number;
    drawCalls: number;
    meshes: number;
    materials: number;
    textures: number;
    sizeBytes: number;
    boundsMin?: number[];
    boundsMax?: number[];
    silhouette?: string | null;
    decodeMsMeasured?: number | null;
  };
  /** 1 = cheapest derivative of the same logical asset. */
  renderCostRank?: number;
  /** Explicit runtime permission. False keeps the entry for audit only. */
  runtimePreferred?: boolean;
  /** Camera distance bands this derivative is the recorded choice for. */
  preferredFor?: DistanceBand[];
  cameraDistanceMeters?: { min: number; max: number } | null;
  /** Human-readable justification for the quality decision. */
  qualityDecision?: string;
}

/** Camera distance bands the runtime selects derivatives for. */
export type DistanceBand = 'selected' | 'nearby' | 'overview';

export const DISTANCE_BANDS: DistanceBand[] = ['selected', 'nearby', 'overview'];

/** Band a camera distance in metres falls into. */
export function bandForDistance(metres: number): DistanceBand {
  if (metres <= 3) return 'selected';
  if (metres <= 12) return 'nearby';
  return 'overview';
}

/**
 * Composite render cost of a derivative, from measured pipeline metrics.
 * Used by tests to prove distance never selects a more expensive derivative.
 */
export function derivativeCost(entry: AssetManifestEntry): {
  triangles: number;
  drawCalls: number;
  sizeBytes: number;
} {
  const m = entry.qualityMetrics;
  return {
    triangles: m?.triangles ?? entry.triangleCount ?? Number.POSITIVE_INFINITY,
    drawCalls: m?.drawCalls ?? entry.drawCallBudget ?? Number.POSITIVE_INFINITY,
    sizeBytes: m?.sizeBytes ?? Number.POSITIVE_INFINITY,
  };
}

interface AssetManifestFile {
  manifestVersion: number;
  generatedAt: string;
  assets: AssetManifestEntry[];
}

const FILE = manifest as unknown as AssetManifestFile;

/**
 * Semantic roles the runtime can place. A role is only ever satisfied by an
 * asset whose manifest entry declares it; nothing is inferred from filenames.
 */
export type SemanticRole =
  | 'liquid-cooled-rack'
  | 'rack-core-reference'
  | 'server-1u'
  | 'server-2u'
  | 'network-switch'
  | 'rack-pdu'
  | 'liquid-cooling-equipment'
  | 'cable-tray'
  | 'blanking-panel';

/** Derivative classes, ordered from most to least detailed. */
export type QualityLevel = 'inspection' | 'operations' | 'lod';

const QUALITY_ORDER: QualityLevel[] = ['inspection', 'operations', 'lod'];

export const SEMANTIC_ROLE_LABEL: Record<SemanticRole, string> = {
  'liquid-cooled-rack': 'Liquid-cooled rack',
  'rack-core-reference': 'Rack core (reference)',
  'server-1u': '1U server',
  'server-2u': '2U server',
  'network-switch': 'Network switch',
  'rack-pdu': 'Rack PDU',
  'liquid-cooling-equipment': 'Liquid-cooling equipment',
  'cable-tray': 'Cable tray',
  'blanking-panel': 'Blanking panel',
};

/** Every runtime-resolvable asset declaring the given semantic role. */
export function listAssetsForRole(role: SemanticRole): AssetManifestEntry[] {
  return FILE.assets.filter(
    (a) => a.semanticRole === role && resolveRuntimeAsset(a.assetId).glbUrl !== null,
  );
}

/**
 * Resolve the asset to mount for a semantic role at a requested quality level.
 * Falls back to a coarser derivative class only, never to a finer one, so the
 * runtime can never silently exceed a device's geometry budget.
 */
export function resolveRoleAsset(
  role: SemanticRole,
  quality: QualityLevel = 'operations',
): { entry: AssetManifestEntry; quality: QualityLevel } | null {
  const candidates = listAssetsForRole(role);
  if (candidates.length === 0) return null;
  const start = QUALITY_ORDER.indexOf(quality);
  for (const level of QUALITY_ORDER.slice(Math.max(0, start))) {
    const match = candidates.find((a) => (a.qualityLevel ?? 'operations') === level);
    if (match) return { entry: match, quality: level };
  }
  return { entry: candidates[0], quality: candidates[0].qualityLevel ?? 'operations' };
}

/** Sibling entry for another derivative class of the same source asset. */
export function resolveQualityVariant(
  assetId: string,
  quality: QualityLevel,
): AssetManifestEntry | null {
  const entry = getAsset(assetId);
  const variantId = entry?.qualityVariants?.[quality];
  if (!variantId) return null;
  return getAsset(variantId) ?? null;
}

/**
 * Runtime derivative for a semantic role at a camera distance band.
 *
 * The decision is read from the manifest (`preferredFor` + `runtimePreferred`),
 * which the ingestion pipeline records from measured triangles, draw calls and
 * transfer size. Filenames, class names and triangle counts are never used to
 * infer quality at runtime, so a declared LOD that is objectively more
 * expensive than its operations build can never be selected.
 */
export function resolveRoleAssetForBand(
  role: SemanticRole,
  band: DistanceBand,
): { entry: AssetManifestEntry; band: DistanceBand } | null {
  const candidates = listAssetsForRole(role).filter((a) => a.runtimePreferred !== false);
  const declared = candidates.filter((a) => a.preferredFor?.includes(band));
  const pool = declared.length > 0 ? declared : candidates;
  if (pool.length === 0) return null;
  // Within a band several logical assets may qualify (four blanking panels,
  // five switches). Take the cheapest recorded cost: they are alternatives of
  // the same role, not quality variants of one another.
  const best = [...pool].sort((a, b) => {
    const ca = derivativeCost(a);
    const cb = derivativeCost(b);
    return ca.triangles - cb.triangles || ca.drawCalls - cb.drawCalls || ca.sizeBytes - cb.sizeBytes;
  })[0];
  return { entry: best, band };
}

function legacyResolveQualityVariant(
  assetId: string,
  quality: QualityLevel,
): AssetManifestEntry | null {
  const entry = getAsset(assetId);
  const variantId = entry?.qualityVariants?.[quality];
  if (!variantId) return null;
  return getAsset(variantId) ?? null;
}

/** True only when the manifest explicitly declares the asset instanceable. */
export function isInstanceable(assetId: string): boolean {
  return getAsset(assetId)?.instanceable === true;
}

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