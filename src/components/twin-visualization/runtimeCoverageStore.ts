/**
 * Runtime geometry coverage.
 *
 * Every claim the UI makes about NVIDIA-derived geometry must come from what
 * actually mounted, never from a manifest promise. Components register the
 * objects they mounted here after the loader succeeded; the badge and the
 * coverage list read only this store.
 */
import { create } from 'zustand';
import type { QualityLevel, SemanticRole } from './assetRegistry';

export type RoleRuntimeState =
  | 'openusd-derived'
  | 'procedural-fallback'
  | 'preparing'
  | 'blocked'
  | 'not-represented';

export interface RoleCoverage {
  role: SemanticRole;
  state: RoleRuntimeState;
  assetId: string | null;
  quality: QualityLevel | null;
  /**
   * Logical scene objects of this role mounted from an approved derivative.
   * One placement is one logical object, never a manifest row or a variant.
   */
  mountedObjects: number;
  /** GLB instances in the graph for those logical objects. */
  glbInstances: number;
  /** Derivative file backing the mount; one network fetch per unique URL. */
  derivativeUrl: string | null;
  /** Objects of this role currently rendered as AURA procedural geometry. */
  proceduralObjects: number;
  triangles: number;
  drawCalls: number;
  detail?: string;
}

interface CoverageState {
  /** Increments whenever the scene is rebuilt, so stale reports are dropped. */
  token: string;
  roles: Record<string, RoleCoverage>;
  resetCoverage: (token: string) => void;
  reportRole: (token: string, coverage: RoleCoverage) => void;
}

export const useRuntimeCoverageStore = create<CoverageState>((set, get) => ({
  token: 'initial',
  roles: {},
  resetCoverage: (token) => set({ token, roles: {} }),
  reportRole: (token, coverage) => {
    if (get().token !== token) return;
    set((s) => ({ roles: { ...s.roles, [coverage.role]: coverage } }));
  },
}));

export function coverageTotals(roles: Record<string, RoleCoverage>) {
  const list = Object.values(roles);
  const derivativeUrls = new Set(
    list.filter((r) => r.mountedObjects > 0 && r.derivativeUrl).map((r) => r.derivativeUrl as string),
  );
  const logicalAssets = new Set(
    list.filter((r) => r.mountedObjects > 0 && r.assetId).map((r) => r.assetId as string),
  );
  return {
    mountedObjects: list.reduce((n, r) => n + r.mountedObjects, 0),
    glbInstances: list.reduce((n, r) => n + r.glbInstances, 0),
    uniqueDerivatives: derivativeUrls.size,
    logicalAssets: logicalAssets.size,
    proceduralObjects: list.reduce((n, r) => n + r.proceduralObjects, 0),
    triangles: list.reduce((n, r) => n + r.triangles, 0),
    drawCalls: list.reduce((n, r) => n + r.drawCalls, 0),
    derivedRoles: list.filter((r) => r.state === 'openusd-derived').length,
    totalRoles: list.length,
  };
}