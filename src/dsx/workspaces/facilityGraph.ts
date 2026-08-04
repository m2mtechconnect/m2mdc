/**
 * Cross-workspace asset identity and dependency tracing.
 *
 * Identity is always the stable AURA asset id. Display names are never used
 * as identity. An OpenUSD prim path is exposed only when an approved mapping
 * exists; otherwise the caller must render "OpenUSD mapping unavailable".
 */
import {
  EVIDENCE_BETA_ASSETS,
  EVIDENCE_BETA_MAPPINGS,
  EVIDENCE_BETA_RACKS,
  EVIDENCE_BETA_SITE,
  assetByAuraId,
  assetBySourceId,
  type FixtureAsset,
} from '../fixtures/evidenceBetaFacility';
import type { AssetClass } from '../contracts/assetMapping';

export interface AssetIdentity {
  stable_asset_id: string;
  source_asset_id: string;
  facility_id: string;
  asset_class: AssetClass;
  name: string;
  /** Null when no approved mapping exists. Never fabricated. */
  openusd_prim_path: string | null;
  mapping_approval: string;
}

export const OPENUSD_UNAVAILABLE = 'OpenUSD mapping unavailable';

export function identityFor(asset: FixtureAsset): AssetIdentity {
  const mapping = EVIDENCE_BETA_MAPPINGS.find((m) => m.source_asset_id === asset.source_asset_id);
  const approved = mapping?.approval_status === 'approved';
  return {
    stable_asset_id: asset.aura_asset_id,
    source_asset_id: asset.source_asset_id,
    facility_id: EVIDENCE_BETA_SITE.aura_asset_id,
    asset_class: asset.asset_class,
    name: asset.name,
    openusd_prim_path: approved ? (mapping?.usd_prim_path ?? null) : null,
    mapping_approval: mapping?.approval_status ?? 'unmapped',
  };
}

export function identityByAuraId(id: string | null): AssetIdentity | null {
  if (!id) return null;
  const a = assetByAuraId(id);
  return a ? identityFor(a) : null;
}

export function identityBySourceId(id: string): AssetIdentity | null {
  const a = assetBySourceId(id);
  return a ? identityFor(a) : null;
}

/** Site -> hall -> row-less racks/equipment hierarchy for the facility tree. */
export interface HierarchyNode {
  asset: FixtureAsset;
  children: HierarchyNode[];
}

export function buildHierarchy(): HierarchyNode[] {
  const byParent = new Map<string | null, FixtureAsset[]>();
  for (const a of EVIDENCE_BETA_ASSETS) {
    const list = byParent.get(a.parent_id) ?? [];
    list.push(a);
    byParent.set(a.parent_id, list);
  }
  const build = (a: FixtureAsset): HierarchyNode => ({
    asset: a,
    children: (byParent.get(a.aura_asset_id) ?? []).map(build),
  });
  return (byParent.get(null) ?? []).map(build);
}

export interface TraceHop {
  identity: AssetIdentity;
  role: string;
}

function hop(sourceId: string, role: string): TraceHop | null {
  const identity = identityBySourceId(sourceId);
  return identity ? { identity, role } : null;
}

/**
 * Electrical dependency chain for a rack: UPS -> RPP -> rack.
 * Derived from declared fixture connection points, never guessed.
 */
export function electricalTrace(rackSourceId: string): TraceHop[] {
  const rack = assetBySourceId(rackSourceId);
  if (!rack) return [];
  const rppId = rack.connection_points.find((c) => assetBySourceId(c)?.asset_class === 'rpp');
  const rpp = rppId ? assetBySourceId(rppId) : undefined;
  const ups = rpp
    ? EVIDENCE_BETA_ASSETS.find((a) => a.asset_class === 'ups' && a.connection_points.includes(rpp.source_asset_id))
    : undefined;
  return [
    ups ? hop(ups.source_asset_id, 'Uninterruptible power supply') : null,
    rpp ? hop(rpp.source_asset_id, 'Remote power panel') : null,
    hop(rack.source_asset_id, 'Rack'),
  ].filter((h): h is TraceHop => h !== null);
}

/** Cooling dependency chain for a rack: CDU -> cooling unit -> rack. */
export function coolingTrace(rackSourceId: string): TraceHop[] {
  const rack = assetBySourceId(rackSourceId);
  if (!rack) return [];
  const crahId = rack.connection_points.find((c) => assetBySourceId(c)?.asset_class === 'cooling_unit');
  const crah = crahId ? assetBySourceId(crahId) : undefined;
  const cduId = crah?.connection_points.find((c) => assetBySourceId(c)?.asset_class === 'cdu');
  const cdu = cduId ? assetBySourceId(cduId) : undefined;
  return [
    cdu ? hop(cdu.source_asset_id, 'Coolant distribution unit') : null,
    crah ? hop(crah.source_asset_id, 'Cooling unit') : null,
    hop(rack.source_asset_id, 'Rack'),
  ].filter((h): h is TraceHop => h !== null);
}

/** Racks that depend on a given equipment asset (RPP, UPS, cooling unit or CDU). */
export function dependentRacks(equipmentSourceId: string): AssetIdentity[] {
  const equipment = assetBySourceId(equipmentSourceId);
  if (!equipment) return [];
  const direct = EVIDENCE_BETA_RACKS.filter((r) => r.connection_points.includes(equipmentSourceId));
  if (direct.length > 0) return direct.map(identityFor);

  // Second-tier equipment (UPS, CDU): resolve through its downstream children.
  const downstream = equipment.connection_points
    .map((c) => assetBySourceId(c))
    .filter((a): a is FixtureAsset => !!a && (a.asset_class === 'rpp' || a.asset_class === 'cooling_unit'));
  const racks = new Map<string, AssetIdentity>();
  for (const d of downstream) {
    for (const r of EVIDENCE_BETA_RACKS.filter((r) => r.connection_points.includes(d.source_asset_id))) {
      racks.set(r.aura_asset_id, identityFor(r));
    }
  }
  return [...racks.values()];
}

/** Equipment relevant to the electrical single-line diagram, in supply order. */
export function electricalChain(): FixtureAsset[] {
  const ups = EVIDENCE_BETA_ASSETS.filter((a) => a.asset_class === 'ups');
  const rpps = EVIDENCE_BETA_ASSETS.filter((a) => a.asset_class === 'rpp');
  return [...ups, ...rpps];
}

/** Equipment relevant to the mechanical / hydraulic cooling network. */
export function coolingChain(): FixtureAsset[] {
  const cdus = EVIDENCE_BETA_ASSETS.filter((a) => a.asset_class === 'cdu');
  const units = EVIDENCE_BETA_ASSETS.filter((a) => a.asset_class === 'cooling_unit');
  return [...cdus, ...units];
}

export const ALL_RACK_IDENTITIES = EVIDENCE_BETA_RACKS.map(identityFor);
/**
 * Ancestry of an asset, root first. Used to derive the building and data-hall
 * scope for the shared investigation context. Never invents a parent.
 */
export function ancestryFor(auraId: string): AssetIdentity[] {
  const chain: AssetIdentity[] = [];
  let current = assetByAuraId(auraId);
  const guard = new Set<string>();
  while (current && !guard.has(current.aura_asset_id)) {
    guard.add(current.aura_asset_id);
    chain.unshift(identityFor(current));
    current = current.parent_id ? assetByAuraId(current.parent_id) : undefined;
  }
  return chain;
}

/** Direct children of an asset, as identities. Empty when none are declared. */
export function childrenOf(auraId: string): AssetIdentity[] {
  return EVIDENCE_BETA_ASSETS.filter((a) => a.parent_id === auraId).map(identityFor);
}

/**
 * Buildings declared in the dataset. This fixture declares a single site with
 * one data hall, so no "related buildings" list may be shown: there are none.
 */
export function declaredBuildings(): AssetIdentity[] {
  return EVIDENCE_BETA_ASSETS.filter((a) => a.asset_class === 'site').map(identityFor);
}
