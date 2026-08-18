/**
 * Runtime geometry coverage.
 *
 * Every claim the UI makes about NVIDIA-derived geometry must come from what
 * actually mounted, never from a manifest promise.
 *
 * Ownership model
 * ---------------
 * Coverage is scoped by a *session* (stable semantic identity of the active
 * facility/twin plus the selected geometry mode) and partitioned by *owner*
 * (the reporting subsystem: facility shell, equipment, racks, overlays).
 *
 *  - facility and equipment owners report into the same active session;
 *  - one owner can never erase another owner's rows;
 *  - duplicate reports are idempotent;
 *  - reports carrying a stale session id are ignored;
 *  - unregistering an owner removes only that owner's rows;
 *  - ending a session clears its coverage entirely.
 *
 * The previous single-token model rolled the token on every report, so the
 * facility layer and the equipment layer silently wiped each other and a fully
 * mounted scene read as zero coverage.
 */
import { create } from 'zustand';
import { isAuraAuthoredAsset } from './assetRegistry';
import type { QualityLevel, SemanticRole } from './assetRegistry';

export type RoleRuntimeState =
  | 'openusd-derived'
  | 'procedural-fallback'
  | 'preparing'
  | 'blocked'
  | 'not-represented';

/** Lifecycle stage of a derivative, from request through to disposal. */
export type MountStage =
  | 'requested'
  | 'downloaded'
  | 'parsed'
  | 'attached'
  | 'visible'
  | 'fallback'
  | 'failed'
  | 'disposed';

export type CoverageOwnerId =
  | 'facility'
  | 'equipment'
  | 'racks'
  | 'overlays'
  | (string & {});

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
  /** Furthest lifecycle stage this role reached in the active session. */
  stage?: MountStage;
  /** Runtime identity of the attached root (three.js uuid or equivalent). */
  objectUuid?: string | null;
  /** Identity of the scene root the object was attached under. */
  parentUuid?: string | null;
  /** Explicit visibility, or an intentional hide with a reason in `detail`. */
  visible?: boolean;
  /** Derivative checksum where the manifest publishes one. */
  checksum?: string | null;
  /** Epoch ms of the attach report. */
  mountedAt?: number | null;
  failureReason?: string | null;
}

export interface RackMountReport {
  mounted: boolean;
  assetId: string | null;
  url: string | null;
  stage?: MountStage;
  objectUuid?: string | null;
  failureReason?: string | null;
}

export interface ProceduralEntry {
  label: string;
  count: number;
  kind: 'physical' | 'overlay';
}

interface OwnerState {
  roles: Record<string, RoleCoverage>;
  rackMounts: Record<string, RackMountReport>;
}

/**
 * Who is allowed to own the active session.
 *
 * A page can mount more than one scene at once (the full model viewport plus a
 * compact thumbnail). Both used to call `beginSession`, so the thumbnail's
 * session replaced the viewport's and every viewport report was then dropped
 * as stale. A `secondary` scene may report, but never takes the session away
 * from a `primary` one.
 */
export type CoveragePriority = 'primary' | 'secondary';

const STATE_RANK: Record<RoleRuntimeState, number> = {
  'openusd-derived': 5,
  'procedural-fallback': 4,
  blocked: 3,
  preparing: 2,
  'not-represented': 1,
};

const STAGE_RANK: Record<MountStage, number> = {
  requested: 1,
  downloaded: 2,
  parsed: 3,
  attached: 4,
  visible: 5,
  fallback: 2,
  failed: 2,
  disposed: 0,
};

/** Deterministic merge of the same role reported by more than one owner. */
function mergeRole(a: RoleCoverage, b: RoleCoverage): RoleCoverage {
  const primary = STATE_RANK[b.state] > STATE_RANK[a.state] ? b : a;
  const other = primary === a ? b : a;
  return {
    ...primary,
    mountedObjects: a.mountedObjects + b.mountedObjects,
    glbInstances: a.glbInstances + b.glbInstances,
    proceduralObjects: a.proceduralObjects + b.proceduralObjects,
    triangles: a.triangles + b.triangles,
    drawCalls: a.drawCalls + b.drawCalls,
    stage:
      (STAGE_RANK[b.stage ?? 'requested'] > STAGE_RANK[a.stage ?? 'requested'] ? b.stage : a.stage) ??
      primary.stage,
    detail: primary.detail ?? other.detail,
  };
}

function deriveRoles(owners: Record<string, OwnerState>): Record<string, RoleCoverage> {
  const out: Record<string, RoleCoverage> = {};
  // Sorted owner iteration keeps aggregation deterministic.
  for (const ownerId of Object.keys(owners).sort()) {
    for (const [role, coverage] of Object.entries(owners[ownerId].roles)) {
      out[role] = out[role] ? mergeRole(out[role], coverage) : coverage;
    }
  }
  return out;
}

function deriveRackMounts(owners: Record<string, OwnerState>): Record<string, RackMountReport> {
  const out: Record<string, RackMountReport> = {};
  for (const ownerId of Object.keys(owners).sort()) {
    for (const [rackId, mount] of Object.entries(owners[ownerId].rackMounts)) {
      // A mounted report always wins over a not-mounted one for the same rack.
      if (!out[rackId] || (!out[rackId].mounted && mount.mounted)) out[rackId] = mount;
    }
  }
  return out;
}

function shallowEqualRole(a: RoleCoverage | undefined, b: RoleCoverage): boolean {
  if (!a) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof RoleCoverage>;
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

export interface CoverageState {
  /** Stable semantic identity of the active facility + geometry selection. */
  sessionId: string;
  /** Priority of the scene that owns the active session. */
  sessionPriority: CoveragePriority;
  /** Roles the active manifest requires for this session, when known. */
  expectedRoles: SemanticRole[];
  /** Rack cabinet mounts the active configuration requires, when known. */
  expectedMounts: number;
  owners: Record<string, OwnerState>;
  /**
   * Reports that arrived for a session that is not (yet) active. React runs
   * child effects before parent effects, so owners register before the scene
   * opens the session. Buffering here means those reports are adopted when the
   * session opens instead of being lost; buffers for sessions that never open
   * are discarded on the next session switch.
   */
  pending: Record<string, Record<string, OwnerState>>;
  /** Derived from active owner reports. Never written directly. */
  roles: Record<string, RoleCoverage>;
  rackMounts: Record<string, RackMountReport>;
  /** Procedural geometry the scene is rendering, reported by its owner. */
  procedural: Record<string, ProceduralEntry>;

  beginSession: (
    sessionId: string,
    expected?: {
      expectedRoles?: SemanticRole[];
      expectedMounts?: number;
      priority?: CoveragePriority;
    },
  ) => void;
  registerOwner: (sessionId: string, ownerId: CoverageOwnerId) => void;
  reportRole: (sessionId: string, ownerId: CoverageOwnerId, coverage: RoleCoverage) => void;
  reportMount: (
    sessionId: string,
    ownerId: CoverageOwnerId,
    rackId: string,
    mount: RackMountReport,
  ) => void;
  unregisterOwner: (sessionId: string, ownerId: CoverageOwnerId) => void;
  endSession: (sessionId: string) => void;
  reportProcedural: (key: string, entry: ProceduralEntry) => void;
}

const EMPTY_OWNER: OwnerState = { roles: {}, rackMounts: {} };

export const useRuntimeCoverageStore = create<CoverageState>((set, get) => ({
  sessionId: 'initial',
  sessionPriority: 'primary',
  expectedRoles: [],
  expectedMounts: 0,
  owners: {},
  pending: {},
  roles: {},
  rackMounts: {},
  procedural: {},

  beginSession: (sessionId, expected) => {
    const s = get();
    const priority = expected?.priority ?? 'primary';
    if (s.sessionId === sessionId) {
      // Re-entering the same session (StrictMode remount) keeps live reports.
      if (expected) {
        set({
          expectedRoles: expected.expectedRoles ?? s.expectedRoles,
          expectedMounts: expected.expectedMounts ?? s.expectedMounts,
          sessionPriority: priority === 'primary' ? 'primary' : s.sessionPriority,
        });
      }
      return;
    }
    // A secondary scene (compact thumbnail) never displaces the primary
    // viewport's session; its reports stay buffered instead.
    if (priority === 'secondary' && s.sessionPriority === 'primary' && s.sessionId !== 'initial') {
      return;
    }
    const adopted = s.pending[sessionId] ?? {};
    set({
      sessionId,
      sessionPriority: priority,
      expectedRoles: expected?.expectedRoles ?? [],
      expectedMounts: expected?.expectedMounts ?? 0,
      owners: adopted,
      pending: {},
      roles: deriveRoles(adopted),
      rackMounts: deriveRackMounts(adopted),
    });
  },

  registerOwner: (sessionId, ownerId) => {
    const s = get();
    if (s.sessionId !== sessionId) {
      if (s.pending[sessionId]?.[ownerId]) return;
      set({
        pending: {
          ...s.pending,
          [sessionId]: { ...(s.pending[sessionId] ?? {}), [ownerId]: { ...EMPTY_OWNER } },
        },
      });
      return;
    }
    if (s.owners[ownerId]) return;
    const owners = { ...s.owners, [ownerId]: { ...EMPTY_OWNER } };
    set({ owners });
  },

  reportRole: (sessionId, ownerId, coverage) => {
    const s = get();
    if (s.sessionId !== sessionId) {
      // Not the active session: buffer it. If the session never opens the
      // buffer is dropped, so a stale report can never surface as coverage.
      const bucket = s.pending[sessionId] ?? {};
      const owner = bucket[ownerId] ?? EMPTY_OWNER;
      if (shallowEqualRole(owner.roles[coverage.role], coverage)) return;
      set({
        pending: {
          ...s.pending,
          [sessionId]: {
            ...bucket,
            [ownerId]: { ...owner, roles: { ...owner.roles, [coverage.role]: coverage } },
          },
        },
      });
      return;
    }
    const owner = s.owners[ownerId] ?? EMPTY_OWNER;
    if (shallowEqualRole(owner.roles[coverage.role], coverage)) return; // idempotent
    const owners = {
      ...s.owners,
      [ownerId]: { ...owner, roles: { ...owner.roles, [coverage.role]: coverage } },
    };
    set({ owners, roles: deriveRoles(owners), rackMounts: deriveRackMounts(owners) });
  },

  reportMount: (sessionId, ownerId, rackId, mount) => {
    const s = get();
    if (s.sessionId !== sessionId) {
      const bucket = s.pending[sessionId] ?? {};
      const owner = bucket[ownerId] ?? EMPTY_OWNER;
      set({
        pending: {
          ...s.pending,
          [sessionId]: {
            ...bucket,
            [ownerId]: { ...owner, rackMounts: { ...owner.rackMounts, [rackId]: mount } },
          },
        },
      });
      return;
    }
    const owner = s.owners[ownerId] ?? EMPTY_OWNER;
    const existing = owner.rackMounts[rackId];
    if (
      existing &&
      existing.mounted === mount.mounted &&
      existing.assetId === mount.assetId &&
      existing.url === mount.url &&
      existing.stage === mount.stage
    ) {
      return;
    }
    const owners = {
      ...s.owners,
      [ownerId]: { ...owner, rackMounts: { ...owner.rackMounts, [rackId]: mount } },
    };
    set({ owners, roles: deriveRoles(owners), rackMounts: deriveRackMounts(owners) });
  },

  unregisterOwner: (sessionId, ownerId) => {
    const s = get();
    if (s.sessionId !== sessionId) {
      if (!s.pending[sessionId]?.[ownerId]) return;
      const bucket = { ...s.pending[sessionId] };
      delete bucket[ownerId];
      set({ pending: { ...s.pending, [sessionId]: bucket } });
      return;
    }
    if (!s.owners[ownerId]) return;
    const owners = { ...s.owners };
    delete owners[ownerId];
    set({ owners, roles: deriveRoles(owners), rackMounts: deriveRackMounts(owners) });
  },

  endSession: (sessionId) => {
    const s = get();
    if (s.sessionId !== sessionId) {
      if (!s.pending[sessionId]) return;
      const pending = { ...s.pending };
      delete pending[sessionId];
      set({ pending });
      return;
    }
    set({ owners: {}, roles: {}, rackMounts: {}, expectedRoles: [], expectedMounts: 0 });
  },

  reportProcedural: (key, entry) =>
    set((s) => {
      const existing = s.procedural[key];
      if (existing && existing.count === entry.count && existing.label === entry.label) return s;
      return { procedural: { ...s.procedural, [key]: entry } };
    }),
}));

/** Roles that are required by the session but have not reached `visible`. */
export function preparingRoles(state: Pick<CoverageState, 'expectedRoles' | 'roles'>): string[] {
  return state.expectedRoles.filter((role) => {
    const r = state.roles[role];
    return !r || r.mountedObjects <= 0;
  });
}

declare global {
  interface Window {
    __auraRuntimeCoverage?: () => {
      sessionId: string;
      /** Kept for existing harnesses that read `token`. */
      token: string;
      expectedRoles: SemanticRole[];
      expectedMounts: number;
      owners: string[];
      roles: Record<string, RoleCoverage>;
      rackMounts: Record<string, RackMountReport>;
      procedural: Record<string, ProceduralEntry>;
      stages: Record<string, MountStage>;
      preparingRoles: string[];
      /** Role keys whose mounted asset has an AURA-authored USD master. */
      auraAuthoredRoles: string[];
    };
  }
}

if (typeof window !== 'undefined') {
  window.__auraRuntimeCoverage = () => {
    const s = useRuntimeCoverageStore.getState();
    return {
      sessionId: s.sessionId,
      token: s.sessionId,
      expectedRoles: s.expectedRoles,
      expectedMounts: s.expectedMounts,
      owners: Object.keys(s.owners).sort(),
      roles: s.roles,
      rackMounts: s.rackMounts,
      procedural: s.procedural,
      stages: Object.fromEntries(
        Object.entries(s.roles).map(([k, r]) => [k, r.stage ?? 'requested']),
      ),
      preparingRoles: preparingRoles(s),
      auraAuthoredRoles: Object.entries(s.roles)
        .filter(([, r]) => isAuraAuthoredAsset(r.assetId))
        .map(([key]) => key),
    };
  };
}

export function coverageTotals(
  roles: Record<string, RoleCoverage>,
  /**
   * Optional role filter. The equipment claim counts NVIDIA-derived roles
   * only, so AURA-authored facility families are never folded into a claim
   * about NVIDIA equipment.
   */
  include?: (role: RoleCoverage) => boolean,
) {
  // Diagnostic surface: the acceptance harness reads the same store the badge
  // reads, so runtime evidence can never be taken from a manifest promise.
  const list = Object.values(roles).filter((r) => (include ? include(r) : true));
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

/**
 * Hybrid provenance breakdown (Phase 9).
 *
 * The scene is never reduced to a single "OpenUSD facility" claim. Three
 * origins are counted separately from runtime evidence only:
 *
 *  - NVIDIA OpenUSD-derived equipment: approved derivatives of NVIDIA Data
 *    Center pack masters that actually mounted (including the AURA-authored
 *    component selection of NVIDIA rack geometry, which stays NVIDIA-sourced);
 *  - AURA OpenUSD-derived facility assets: approved derivatives of
 *    AURA-authored USD masters that actually mounted;
 *  - AURA procedural geometry: physical geometry and analytical overlays that
 *    have no USD master behind them at runtime.
 */
export interface ProvenanceBreakdown {
  nvidiaDerivedObjects: number;
  auraUsdDerivedObjects: number;
  proceduralPhysicalObjects: number;
  proceduralOverlayObjects: number;
  cabinetsMounted: number;
  cabinetsProcedural: number;
  label: string;
}

export function provenanceBreakdown(
  roles: Record<string, RoleCoverage>,
  rackMounts: Record<string, { mounted: boolean }>,
  procedural: Record<string, { count: number; kind: 'physical' | 'overlay' }>,
  isAuraAuthored: (assetId: string | null) => boolean,
): ProvenanceBreakdown {
  let nvidia = 0;
  let aura = 0;
  for (const r of Object.values(roles)) {
    if (r.mountedObjects <= 0) continue;
    if (isAuraAuthored(r.assetId)) aura += r.mountedObjects;
    else nvidia += r.mountedObjects;
  }
  const cabinets = Object.values(rackMounts);
  const cabinetsMounted = cabinets.filter((c) => c.mounted).length;
  const cabinetsProcedural = cabinets.length - cabinetsMounted;
  nvidia += cabinetsMounted;

  let physical = cabinetsProcedural;
  let overlay = 0;
  for (const p of Object.values(procedural)) {
    if (p.kind === 'overlay') overlay += p.count;
    else physical += p.count;
  }
  return {
    nvidiaDerivedObjects: nvidia,
    auraUsdDerivedObjects: aura,
    proceduralPhysicalObjects: physical,
    proceduralOverlayObjects: overlay,
    cabinetsMounted,
    cabinetsProcedural,
    label:
      `NVIDIA OpenUSD-derived equipment: ${nvidia} · ` +
      `AURA OpenUSD-derived facility assets: ${aura} · ` +
      `AURA procedural physical geometry: ${physical} · ` +
      `Procedural operational overlays: ${overlay}`,
  };
}

/**
 * Truthful preview label. This is browser GLB rendering, never NVIDIA Kit,
 * RTX, NVCF or a solver session, so the vocabulary here is deliberately small.
 */
export function previewLabel(input: {
  derivedObjects: number;
  proceduralObjects: number;
  lineageVerified: boolean;
}): string {
  if (input.derivedObjects <= 0) {
    return input.proceduralObjects > 0 ? 'Procedural 3D preview' : 'Unavailable';
  }
  if (input.proceduralObjects > 0) return 'Mixed browser preview';
  return input.lineageVerified
    ? 'Browser GLB preview - NVIDIA-derived assets'
    : 'Browser GLB preview';
}
