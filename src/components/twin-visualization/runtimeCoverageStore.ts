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
  /**
   * Per-rack cabinet mount evidence. `true` only once the approved derivative
   * actually mounted; `false` while the procedural cabinet is rendering.
   */
  rackMounts: Record<string, { mounted: boolean; assetId: string | null; url: string | null }>;
  /** Procedural geometry the scene is rendering, reported by its owner. */
  procedural: Record<string, { label: string; count: number; kind: 'physical' | 'overlay' }>;
  resetCoverage: (token: string) => void;
  reportRole: (token: string, coverage: RoleCoverage) => void;
  reportRackMount: (
    token: string,
    rackId: string,
    mount: { mounted: boolean; assetId: string | null; url: string | null },
  ) => void;
  reportProcedural: (
    key: string,
    entry: { label: string; count: number; kind: 'physical' | 'overlay' },
  ) => void;
}

export const useRuntimeCoverageStore = create<CoverageState>((set, get) => ({
  token: 'initial',
  roles: {},
  rackMounts: {},
  procedural: {},
  resetCoverage: (token) => set({ token, roles: {}, rackMounts: {} }),
  /**
   * A report carries the token of the scene build that produced it. A newer
   * token supersedes the previous build: the store rolls over to it and drops
   * the stale rows. Reports are never dropped for being "early", because child
   * effects always run before the parent's - dropping them was how a fully
   * mounted scene could still read as zero coverage.
   */
  reportRole: (token, coverage) => {
    const current = get().token;
    if (current === token) {
      set((s) => ({ roles: { ...s.roles, [coverage.role]: coverage } }));
      return;
    }
    set({ token, roles: { [coverage.role]: coverage } });
  },
  reportRackMount: (token, rackId, mount) => {
    const current = get().token;
    if (current !== token) {
      set({ token, roles: {}, rackMounts: { [rackId]: mount } });
      return;
    }
    set((s) => ({ rackMounts: { ...s.rackMounts, [rackId]: mount } }));
  },
  reportProcedural: (key, entry) =>
    set((s) => ({ procedural: { ...s.procedural, [key]: entry } })),
}));

declare global {
  interface Window {
    __auraRuntimeCoverage?: () => { token: string; roles: Record<string, RoleCoverage> };
  }
}

if (typeof window !== 'undefined') {
  window.__auraRuntimeCoverage = () => {
    const { token, roles } = useRuntimeCoverageStore.getState();
    return { token, roles };
  };
}

export function coverageTotals(roles: Record<string, RoleCoverage>) {
  // Diagnostic surface: the acceptance harness reads the same store the badge
  // reads, so runtime evidence can never be taken from a manifest promise.
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