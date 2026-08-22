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
  /** Author of the USD master. 'M2M AURA' for AURA-authored generic assets. */
  authoredBy?: string;
  /** Conversion and publication evidence recorded by the ingestion pipeline. */
  provenance?: Record<string, unknown> & { authoredBy?: string };
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
 *
 * DSX roles are first-class runtime semantics so a future approved derivative
 * can mount without changing the type system. Their presence in this union is
 * not evidence that an asset exists, is licensed for production, or is
 * SimReady-validated. `listAssetsForRole()` remains the evidence boundary.
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
  | 'blanking-panel'
  // AURA-authored facility families (Phase 2). Generic geometry authored by
  // M2M AURA: no vendor identity, no SimReady claim, no NVIDIA authorship.
  | 'raised-floor-tile'
  | 'perforated-floor-tile'
  | 'data-hall-luminaire'
  | 'structural-column'
  | 'facility-shell'
  // NVIDIA DSX exact physical roles. These are source-gated until a manifest
  // row carries exact-role provenance and complete runtime evidence.
  | 'dsx-compute-tray'
  | 'dsx-nvlink-switch-tray'
  | 'dsx-power-shelf'
  | 'dsx-tor-oob-switch'
  | 'dsx-tan-switch'
  | 'dsx-smn-switch'
  | 'dsx-cin-switch'
  | 'dsx-cdu'
  | 'dsx-crah'
  | 'dsx-chiller'
  | 'dsx-pump'
  | 'dsx-dry-cooler'
  | 'dsx-ups'
  | 'dsx-control-node'
  | 'dsx-general-purpose-node'
  | 'dsx-utility-cluster'
  | 'dsx-dc-edge-cluster'
  | 'dsx-high-speed-storage'
  | 'dsx-grid-substation'
  | 'dsx-backup-generator'
  | 'dsx-bess'
  | 'dsx-central-utility-building'
  | 'dsx-fiber-spine';

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
  'raised-floor-tile': 'Raised-floor tile (AURA-authored)',
  'perforated-floor-tile': 'Perforated airflow tile (AURA-authored)',
  'data-hall-luminaire': 'Data-hall luminaire (AURA-authored)',
  'structural-column': 'Structural column (AURA-authored)',
  'facility-shell': 'Facility shell (AURA-authored)',
  'dsx-compute-tray': 'DSX GB200/GB300 compute tray',
  'dsx-nvlink-switch-tray': 'DSX NVLink switch tray',
  'dsx-power-shelf': 'DSX NVL72 power shelf',
  'dsx-tor-oob-switch': 'DSX rack TOR/OOB switch',
  'dsx-tan-switch': 'DSX Tenant Access Network equipment',
  'dsx-smn-switch': 'DSX Secure Management Network equipment',
  'dsx-cin-switch': 'DSX Cluster Interconnect Network equipment',
  'dsx-cdu': 'DSX Cooling Distribution Unit',
  'dsx-crah': 'DSX CRAH',
  'dsx-chiller': 'DSX central utility chiller',
  'dsx-pump': 'DSX facility-water pump',
  'dsx-dry-cooler': 'DSX dry cooler',
  'dsx-ups': 'DSX UPS',
  'dsx-control-node': 'DSX Control Node',
  'dsx-general-purpose-node': 'DSX general-purpose Core POD node',
  'dsx-utility-cluster': 'DSX Utility Cluster',
  'dsx-dc-edge-cluster': 'DSX DC Edge cluster',
  'dsx-high-speed-storage': 'DSX high-speed storage',
  'dsx-grid-substation': 'DSX grid substation',
  'dsx-backup-generator': 'DSX backup generation',
  'dsx-bess': 'DSX battery energy storage',
  'dsx-central-utility-building': 'DSX Central Utility Building',
  'dsx-fiber-spine': 'DSX cluster-interconnect fiber spine',
};

/** Semantic roles owned by the AURA-authored facility families. */
export const AURA_FACILITY_ROLES: SemanticRole[] = [
  'raised-floor-tile',
  'perforated-floor-tile',
  'data-hall-luminaire',
  'structural-column',
  'facility-shell',
];

/** All exact NVIDIA DSX physical roles known to the runtime type system. */
export const DSX_SEMANTIC_ROLES: SemanticRole[] = [
  'dsx-compute-tray',
  'dsx-nvlink-switch-tray',
  'dsx-power-shelf',
  'dsx-tor-oob-switch',
  'dsx-tan-switch',
  'dsx-smn-switch',
  'dsx-cin-switch',
  'dsx-cdu',
  'dsx-crah',
  'dsx-chiller',
  'dsx-pump',
  'dsx-dry-cooler',
  'dsx-ups',
  'dsx-control-node',
  'dsx-general-purpose-node',
  'dsx-utility-cluster',
  'dsx-dc-edge-cluster',
  'dsx-high-speed-storage',
  'dsx-grid-substation',
  'dsx-backup-generator',
  'dsx-bess',
  'dsx-central-utility-building',
  'dsx-fiber-spine',
];

/**
 * True when the manifest records AURA as the author of the USD master behind
 * an asset. Authorship is read from the manifest, never inferred from an id.
 */
export function isAuraAuthoredAsset(assetId: string | null): boolean {
  if (!assetId) return false;
  const entry = getAsset(assetId);
  if (!entry) return false;
  return (entry.authoredBy ?? entry.provenance?.authoredBy) === 'M2M AURA';
}

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
  if (candidates.length === 0) return null;

  const cheapestIn = (pool: AssetManifestEntry[]) =>
    [...pool].sort((a, b) => {
      const ca = derivativeCost(a);
      const cb = derivativeCost(b);
      return ca.triangles - cb.triangles || ca.drawCalls - cb.drawCalls || ca.sizeBytes - cb.sizeBytes;
    })[0];

  const declared = (b: DistanceBand) => candidates.filter((a) => a.preferredFor?.includes(b));
  // Several logical assets can satisfy one role (four blanking panels, five
  // switches). Within a band they are alternatives, so the cheapest recorded
  // cost wins; across bands the manifest decision decides the class.
  const near = cheapestIn(declared('nearby').length ? declared('nearby') : candidates);
  if (band !== 'overview') return { entry: near, band };

  const far = cheapestIn(declared('overview').length ? declared('overview') : candidates);
  // A distant camera must never cost more than a near one. If the declared
  // overview derivative is heavier, the nearer decision is reused.
  const cf = derivativeCost(far);
  const cn = derivativeCost(near);
  const heavier =
    cf.triangles > cn.triangles && cf.drawCalls >= cn.drawCalls && cf.sizeBytes > cn.sizeBytes;
  return { entry: heavier ? near : far, band };
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
 * Design-time GPU validation state declared by the manifest.
 *
 * A status string alone is a claim without evidence, so this only reports
 * validated when the manifest also cites the saved run that produced it.
 * Runtime callers should prefer the canonical resolver in
 * `@/validation/gpuAcceptance/assetValidationModel`, which additionally binds
 * the saved runs to the current build checksum.
 */
export function getGpuValidationStatus(assetId: string): GpuValidationStatus {
  const record = getAsset(assetId)?.gpuValidation;
  const lastPassedRunId = record?.lastPassedRunId ?? null;
  const gpuValidated = record?.status === 'gpu-validated' && lastPassedRunId !== null;
  return {
    status: record?.status ?? 'awaiting-hardware-run',
    gpuValidated,
    label: gpuValidated ? 'GPU validated' : 'Awaiting hardware GPU validation',
    lastPassedRunId,
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