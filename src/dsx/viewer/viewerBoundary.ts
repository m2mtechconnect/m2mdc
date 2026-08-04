/**
 * OpenUSD viewer synchronization boundary.
 *
 * AURA does not embed a renderer here. This module defines the contract a
 * viewer provider must satisfy and the deterministic selection/state
 * synchronization between AURA assets and OpenUSD prim paths.
 *
 * Truthfulness rules:
 *  - Selection is keyed on the stable aura_asset_id, never on a display name.
 *  - An asset with no approved mapping resolves to `unmapped`, never to a
 *    guessed prim path.
 *  - When no viewer provider is attached the viewer state is `unavailable`.
 *    It is never presented as a live 3D view.
 */
import type { AssetMapping } from '../contracts/assetMapping';
import { lookupMapping } from '../contracts/assetMapping';
import type { FixtureAsset } from '../fixtures/evidenceBetaFacility';

export type ViewerState = 'unavailable' | 'stage_loaded' | 'error';

export interface ViewerStageInfo {
  stage_id: string;
  stage_version: string;
  /** Prim paths the stage actually contains. */
  prim_paths: string[];
}

export interface ViewerProvider {
  readonly id: string;
  readonly description: string;
  state(): ViewerState;
  stage(): ViewerStageInfo | null;
  /** Highlight a prim. Returns false when the prim is absent from the stage. */
  select(primPath: string | null): boolean;
}

export type PrimResolution =
  | { status: 'resolved'; aura_asset_id: string; usd_prim_path: string }
  | { status: 'unmapped'; aura_asset_id: string; reason: string }
  | { status: 'absent_in_stage'; aura_asset_id: string; usd_prim_path: string };

export interface ViewerSyncResult {
  viewer_state: ViewerState;
  resolution: PrimResolution | null;
  /** True only when the provider confirmed the highlight. */
  highlighted: boolean;
  /** Human-readable, non-fabricated explanation for any degraded state. */
  notice: string | null;
}

/** Viewer provider used whenever no renderer is attached. Fails closed. */
export function createUnavailableViewerProvider(reason: string): ViewerProvider {
  return {
    id: 'viewer:unavailable',
    description: reason,
    state: () => 'unavailable',
    stage: () => null,
    select: () => false,
  };
}

/** In-memory provider backed by a declared prim list. Used for tests. */
export function createStaticViewerProvider(stage: ViewerStageInfo): ViewerProvider & {
  selected(): string | null;
} {
  const prims = new Set(stage.prim_paths);
  let selected: string | null = null;
  return {
    id: `viewer:static:${stage.stage_id}`,
    description: `Static OpenUSD stage ${stage.stage_id} v${stage.stage_version}`,
    state: () => 'stage_loaded',
    stage: () => stage,
    select(primPath) {
      if (primPath === null) {
        selected = null;
        return true;
      }
      if (!prims.has(primPath)) return false;
      selected = primPath;
      return true;
    },
    selected: () => selected,
  };
}

/**
 * Resolve an AURA asset to its OpenUSD prim through the APPROVED mapping
 * contract only. No name matching, no path construction.
 */
export function resolvePrimForAsset(
  asset: FixtureAsset,
  mappings: readonly AssetMapping[],
  sourceSystem: string,
  atIso: string,
  stage: ViewerStageInfo | null,
): PrimResolution {
  const mapping = lookupMapping(mappings, sourceSystem, asset.source_asset_id, atIso);
  if (mapping.ok !== true) {
    return {
      status: 'unmapped',
      aura_asset_id: asset.aura_asset_id,
      reason: `asset mapping ${(mapping as { reason: string }).reason}`,
    };
  }
  const prim = mapping.mapping.usd_prim_path;
  if (stage !== null && !stage.prim_paths.includes(prim)) {
    return { status: 'absent_in_stage', aura_asset_id: asset.aura_asset_id, usd_prim_path: prim };
  }
  return { status: 'resolved', aura_asset_id: asset.aura_asset_id, usd_prim_path: prim };
}

/** Push an AURA selection into the viewer. Pure, deterministic, fail-closed. */
export function syncSelection(
  provider: ViewerProvider,
  asset: FixtureAsset | null,
  mappings: readonly AssetMapping[],
  sourceSystem: string,
  atIso: string,
): ViewerSyncResult {
  const state = provider.state();
  if (state !== 'stage_loaded') {
    return {
      viewer_state: state,
      resolution: null,
      highlighted: false,
      notice:
        state === 'unavailable'
          ? `3D viewer unavailable: ${provider.description}`
          : 'Viewer reported an error; no geometry is being displayed.',
    };
  }
  if (asset === null) {
    provider.select(null);
    return { viewer_state: state, resolution: null, highlighted: false, notice: null };
  }
  const resolution = resolvePrimForAsset(asset, mappings, sourceSystem, atIso, provider.stage());
  if (resolution.status !== 'resolved') {
    provider.select(null);
    return {
      viewer_state: state,
      resolution,
      highlighted: false,
      notice:
        resolution.status === 'unmapped'
          ? `No approved OpenUSD mapping for this asset (${resolution.reason}).`
          : `Mapped prim ${resolution.usd_prim_path} is not present in the loaded stage.`,
    };
  }
  const ok = provider.select(resolution.usd_prim_path);
  return {
    viewer_state: state,
    resolution,
    highlighted: ok,
    notice: ok ? null : 'Viewer refused the selection request.',
  };
}

/** Reverse direction: viewer prim click -> AURA asset id. */
export function assetIdForPrim(
  primPath: string,
  mappings: readonly AssetMapping[],
): string | null {
  const approved = mappings.filter(
    (m) => m.usd_prim_path === primPath && m.approval_status === 'approved',
  );
  if (approved.length === 0) return null;
  return approved.reduce((a, b) => (b.mapping_version > a.mapping_version ? b : a)).aura_asset_id;
}