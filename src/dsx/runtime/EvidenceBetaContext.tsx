/**
 * Shared Evidence Beta workspace context.
 *
 * One runtime, one investigation context and one set of drawers are shared by
 * every workspace, so a selection made anywhere is reflected everywhere.
 * The context lives in the URL: refresh, back/forward and deep links all
 * restore the same investigation. Components never branch on "is this mock
 * data"; an unresolved id renders as unavailable.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEvidenceBeta, type EvidenceBetaRuntime } from './useEvidenceBeta';
import { buildConstraintStack, type DomainConstraint } from '../workspaces/constraints';
import { ancestryFor, identityByAuraId, type AssetIdentity } from '../workspaces/facilityGraph';
import type { DsxProvenancedMetric } from '../contracts/provenancedMetric';
import { DATA_MODES, freshnessFor, type DataMode, type FreshnessState } from '../modes';
import {
  CONTEXT_PARAM, buildContextChips, contextToParams, linkWithContext, parseContext,
  type ContextChip, type InvestigationContext,
} from './investigationContext';
import { TIMELINE_IDS, type TimelineId } from '../fixtures/timelines';

export interface EvidenceBetaWorkspace {
  rt: EvidenceBetaRuntime;
  freshness: FreshnessState;
  constraints: DomainConstraint[];

  /** Shared, URL-persisted investigation context. */
  context: InvestigationContext;
  chips: ContextChip[];
  clearContextField: (field: keyof InvestigationContext) => void;
  clearContext: () => void;
  /** Builds a link to another workspace that preserves the whole context. */
  hrefWithContext: (path: string) => string;

  selectedAssetId: string | null;
  selectedAsset: AssetIdentity | null;
  /** Ancestry of the selected asset, root first. Empty when nothing is selected. */
  selectedAncestry: AssetIdentity[];
  /** True when a selected id does not resolve to a declared record. */
  selectionUnavailable: boolean;
  selectAsset: (auraAssetId: string | null, options?: { openDrawer?: boolean }) => void;
  selectWorkload: (workloadId: string | null) => void;
  setTimeRange: (range: string | null) => void;
  /** Active visual overlay / domain, restored from the URL on reload. */
  overlay: string | null;
  setOverlay: (overlayId: string | null) => void;
  /** Metric currently under investigation, restored from the URL on reload. */
  focusedMetricName: string | null;

  assetDrawerOpen: boolean;
  openAssetDrawer: () => void;
  closeAssetDrawer: () => void;

  investigatedConstraint: DomainConstraint | null;
  openConstraint: (c: DomainConstraint) => void;
  closeConstraint: () => void;

  provenanceMetric: DsxProvenancedMetric | null;
  openProvenance: (metric: DsxProvenancedMetric) => void;
  closeProvenance: () => void;
}

const Ctx = createContext<EvidenceBetaWorkspace | null>(null);

export function EvidenceBetaProvider({ children }: { children: ReactNode }) {
  const rt = useEvidenceBeta();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Inspector state is derived from the URL (`inspector`, `metric`, `overlay`)
   * so a direct reload or a shared deep link reopens the same panel. The local
   * metric fallback only covers metrics that are not part of the KPI bundle.
   */
  const [localMetric, setLocalMetric] = useState<DsxProvenancedMetric | null>(null);

  /**
   * Focus restoration. The drawers unmount their content the moment their
   * backing state clears, so Radix's own `onCloseAutoFocus` never runs. We
   * record the element that opened a drawer and return focus to it on close,
   * which keeps keyboard users where they were.
   */
  const triggerRef = useRef<HTMLElement | null>(null);
  const rememberTrigger = useCallback(() => {
    const el = document.activeElement;
    triggerRef.current = el instanceof HTMLElement ? el : null;
  }, []);
  const restoreTrigger = useCallback(() => {
    const el = triggerRef.current;
    triggerRef.current = null;
    if (!el || !el.isConnected) return;
    // The closing overlay's focus scope may reclaim focus for a few frames
    // after unmount, so keep re-asserting until the trigger actually holds it.
    let attempts = 0;
    const tryFocus = () => {
      attempts += 1;
      if (!el.isConnected) return;
      if (document.activeElement === el) return;
      el.focus();
      if (attempts < 12) requestAnimationFrame(tryFocus);
    };
    requestAnimationFrame(tryFocus);
  }, []);

  const context = useMemo(() => parseContext(searchParams), [searchParams]);

  // Deep link restore: a shared scenario id reopens the same scenario once.
  const urlScenario = context.scenario_id;
  useEffect(() => {
    if (urlScenario && urlScenario !== rt.timeline && (TIMELINE_IDS as string[]).includes(urlScenario)) {
      rt.setTimeline(urlScenario as TimelineId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlScenario]);

  // Deep link restore: data mode and run position. Applied once on arrival so
  // later user changes are never overwritten by the incoming URL.
  const restored = useRef(false);
  const arrivalMode = context.data_mode;
  const arrivalTick = context.observation_tick;
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (arrivalMode && arrivalMode !== rt.mode && (DATA_MODES as readonly string[]).includes(arrivalMode)) {
      rt.setMode(arrivalMode as DataMode);
    }
    const tick = arrivalTick === null ? NaN : Number.parseInt(arrivalTick, 10);
    if (Number.isFinite(tick) && tick >= 0) rt.setTick(Math.min(tick, rt.maxTick));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeContext = useCallback(
    (next: InvestigationContext, replace = false) => {
      // Investigation keys are rewritten; every other query parameter the
      // caller arrived with (deep links, feature flags) is carried through,
      // and the incoming anchor is preserved.
      setSearchParams(
        (current) => {
          const params = contextToParams(next);
          const owned = new Set(params.keys());
          const contextKeys = new Set(Object.values(CONTEXT_PARAM));
          current.forEach((value, key) => {
            if (owned.has(key) || contextKeys.has(key)) return;
            params.append(key, value);
          });
          return params;
        },
        { replace, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

  // `setSearchParams` rewrites the URL without a fragment, so a deep link's
  // anchor would be lost the first time context is mirrored into the URL.
  const arrivalHash = useRef(typeof window === 'undefined' ? '' : window.location.hash);
  useEffect(() => {
    if (!arrivalHash.current || typeof window === 'undefined') return;
    if (window.location.hash === arrivalHash.current) return;
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${arrivalHash.current}`,
    );
  }, [location.search, location.pathname]);

  // Scenario, data mode, run identity and run position are runtime facts;
  // mirror them into the URL so a deep link reproduces the same evidence,
  // without ever implying live data.
  const runId = rt.snapshot.run_id;
  const tickParam = String(rt.tick);
  useEffect(() => {
    if (!restored.current) return;
    if (
      context.scenario_id === rt.timeline &&
      context.data_mode === rt.mode &&
      context.run_id === (runId ?? null) &&
      context.observation_tick === tickParam
    ) return;
    writeContext(
      {
        ...context,
        scenario_id: rt.timeline,
        data_mode: rt.mode,
        run_id: runId ?? null,
        observation_tick: tickParam,
      },
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt.timeline, rt.mode, runId, tickParam, context.scenario_id, context.data_mode, context.run_id, context.observation_tick]);

  const selectedAssetId = context.stable_asset_id;
  const selectedAsset = useMemo(() => identityByAuraId(selectedAssetId), [selectedAssetId]);
  const selectedAncestry = useMemo(
    () => (selectedAssetId ? ancestryFor(selectedAssetId) : []),
    [selectedAssetId],
  );
  const selectionUnavailable = !!selectedAssetId && !selectedAsset;

  const currentWorkspace = location.pathname.split('/').pop() ?? 'overview';

  const selectAsset = useCallback(
    (id: string | null, options?: { openDrawer?: boolean }) => {
      if (!id) {
        writeContext({
          ...context,
          stable_asset_id: null,
          openusd_prim_path: null,
          building_id: null,
          data_hall_id: null,
          inspector: context.inspector === 'asset' ? null : context.inspector,
        });
        return;
      }
      const identity = identityByAuraId(id);
      const chain = ancestryFor(id);
      const building = chain.find((a) => a.asset_class === 'site') ?? null;
      const hall = chain.find((a) => a.asset_class === 'data_hall') ?? null;
      if (options?.openDrawer !== false && context.inspector !== 'asset') rememberTrigger();
      writeContext({
        ...context,
        facility_id: identity?.facility_id ?? context.facility_id,
        building_id: building?.stable_asset_id ?? null,
        data_hall_id: hall?.stable_asset_id ?? null,
        stable_asset_id: id,
        openusd_prim_path: identity?.openusd_prim_path ?? null,
        source_workspace: currentWorkspace,
        inspector: options?.openDrawer === false ? context.inspector : 'asset',
      });
    },
    [context, writeContext, currentWorkspace, rememberTrigger],
  );

  const selectWorkload = useCallback(
    (workloadId: string | null) => writeContext({ ...context, workload_id: workloadId }),
    [context, writeContext],
  );

  const setTimeRange = useCallback(
    (range: string | null) => writeContext({ ...context, time_range: range }),
    [context, writeContext],
  );

  const setOverlay = useCallback(
    (overlayId: string | null) => writeContext({ ...context, overlay_id: overlayId }),
    [context, writeContext],
  );

  const clearContextField = useCallback(
    (field: keyof InvestigationContext) => {
      const next = { ...context, [field]: null };
      if (field === 'stable_asset_id') next.openusd_prim_path = null;
      if (field === 'building_id') {
        next.data_hall_id = null;
        next.stable_asset_id = null;
        next.openusd_prim_path = null;
      }
      if (field === 'stable_asset_id' || field === 'building_id') {
        if (next.inspector === 'asset') next.inspector = null;
      }
      if (field === 'metric_id' && next.inspector === 'metric') next.inspector = null;
      if (field === 'overlay_id' && next.inspector === 'constraint') next.inspector = null;
      writeContext(next);
    },
    [context, writeContext],
  );

  const clearContext = useCallback(() => {
    setLocalMetric(null);
    navigate({ pathname: location.pathname, search: '' });
  }, [navigate, location.pathname]);

  const hrefWithContext = useCallback(
    (path: string) => linkWithContext(path, context, currentWorkspace),
    [context, currentWorkspace],
  );

  const chips = useMemo(
    () => buildContextChips(context, (id) => identityByAuraId(id)),
    [context],
  );

  const freshness = freshnessFor(rt.snapshot.last_observed_at, Date.parse(rt.nowIso));
  const constraints = useMemo(() => buildConstraintStack(rt.bundle, rt.snapshot), [rt.bundle, rt.snapshot]);

  // Inspector resolution. Each panel's target is addressable, so a reload
  // reopens the same record; a target that no longer resolves stays closed
  // rather than being invented.
  const assetDrawerOpen = context.inspector === 'asset' && !!selectedAssetId;
  const investigatedConstraint = useMemo(
    () =>
      context.inspector === 'constraint' && context.overlay_id
        ? constraints.find((c) => c.domain === context.overlay_id) ?? null
        : null,
    [context.inspector, context.overlay_id, constraints],
  );
  const provenanceMetric = useMemo(() => {
    if (context.inspector !== 'metric' || !context.metric_id) return null;
    return rt.bundle.metrics[context.metric_id] ?? (localMetric?.metric_name === context.metric_id ? localMetric : null);
  }, [context.inspector, context.metric_id, rt.bundle.metrics, localMetric]);

  const openInspector = useCallback(
    (next: Partial<InvestigationContext>) => {
      if (!context.inspector) rememberTrigger();
      writeContext({ ...context, ...next });
    },
    [context, writeContext, rememberTrigger],
  );
  const closeInspector = useCallback(() => {
    writeContext({ ...context, inspector: null });
    restoreTrigger();
  }, [context, writeContext, restoreTrigger]);

  const value: EvidenceBetaWorkspace = {
    rt,
    freshness,
    constraints,
    context,
    chips,
    clearContextField,
    clearContext,
    hrefWithContext,
    selectedAssetId,
    selectedAsset,
    selectedAncestry,
    selectionUnavailable,
    selectAsset,
    selectWorkload,
    setTimeRange,
    overlay: context.overlay_id,
    setOverlay,
    focusedMetricName: context.metric_id,
    assetDrawerOpen,
    openAssetDrawer: () => openInspector({ inspector: 'asset' }),
    closeAssetDrawer: closeInspector,
    investigatedConstraint,
    openConstraint: (c) => openInspector({ inspector: 'constraint', overlay_id: c.domain }),
    closeConstraint: closeInspector,
    provenanceMetric,
    openProvenance: (m) => {
      setLocalMetric(m);
      openInspector({ inspector: 'metric', metric_id: m.metric_name });
    },
    closeProvenance: closeInspector,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): EvidenceBetaWorkspace {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWorkspace must be used inside EvidenceBetaProvider');
  return v;
}
