/**
 * AURA DC engineering workspace.
 *
 * A single full-width surface: the facility model is the primary object,
 * the tool rail changes what you do to it, and the context panel reacts to
 * the current selection. Every action lives in the rail or the panel, so
 * there are no duplicate KPI cards or scattered call-to-action buttons.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { TwinOverlayProvider } from '@/context/TwinOverlayContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useShellLayoutStore } from '@/stores/shellLayoutStore';
import { FacilityCanvas } from './FacilityCanvas';
import { KpiStrip } from './KpiStrip';
import { ContextPanel } from './ContextPanel';
import { WorkspaceToolRail } from './WorkspaceToolRail';
import { EvidenceDrawer } from './EvidenceDrawer';
import { WorkspaceRecordHeader } from './WorkspaceRecordHeader';
import { useFacilityModel } from './facilityModel';
import { ROLE_VIEWS, useWorkspaceStore } from './workspaceStore';
import { useSeededRunFixtures } from './runFixtures';
import { parseSimulationHandoff } from '@/simulation/handoff';

/** Docked inspector width envelope (Salesforce-style split workspace). */
const PANEL_DEFAULT = 368;
const PANEL_MIN = 336;
const PANEL_MAX = 440;
/** Below this width the inspector becomes a non-destructive overlay drawer. */
const OVERLAY_BREAKPOINT = 1180;

/** True below the overlay breakpoint, where the panel becomes a drawer. */
function useOverlayInspector(): boolean {
  const [below, setBelow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${OVERLAY_BREAKPOINT - 1}px)`);
    const sync = () => setBelow(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);
  return below;
}

export default function AuraWorkspace() {
  useSeededRunFixtures();
  const { pathname } = useLocation();
  const workspaceLabel = pathname.startsWith('/simulation') ? 'Simulation' : 'Blueprint';
  const { facility, assets, isFallback } = useFacilityModel();
  const { activeTwinId, twins, setActiveTwin } = useActiveTwin();
  const overrides = useWorkspaceStore((s) => s.overrides);
  const panelOpen = useWorkspaceStore((s) => s.panelOpen);
  const setPanelOpen = useWorkspaceStore((s) => s.setPanelOpen);
  const roleView = useWorkspaceStore((s) => s.roleView);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const runs = useWorkspaceStore((s) => s.runs);
  const setActiveRun = useWorkspaceStore((s) => s.setActiveRun);
  const toggleCompareRun = useWorkspaceStore((s) => s.toggleCompareRun);
  const selectAsset = useWorkspaceStore((s) => s.selectAsset);
  const setHandoff = useWorkspaceStore((s) => s.setHandoff);
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const overlayInspector = useOverlayInspector();
  const setFullBleed = useShellLayoutStore((s) => s.setFullBleed);
  const setPageOwnsOperatingState = useShellLayoutStore((s) => s.setPageOwnsOperatingState);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const panelToggleRef = useRef<HTMLButtonElement | null>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    setFullBleed(true);
    setPageOwnsOperatingState(true);
    return () => {
      setFullBleed(false);
      setPageOwnsOperatingState(false);
    };
  }, [setFullBleed, setPageOwnsOperatingState]);

  const clampWidth = (w: number) => Math.min(PANEL_MAX, Math.max(PANEL_MIN, w));

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      resizeRef.current = { startX: event.clientX, startWidth: panelWidth };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [panelWidth],
  );

  const onResizePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeRef.current;
    if (!state) return;
    setPanelWidth(clampWidth(state.startWidth - (event.clientX - state.startX)));
  }, []);

  const endResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  // Closing the overlay drawer returns focus to the control that opened it.
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    window.requestAnimationFrame(() => panelToggleRef.current?.focus());
  }, [setPanelOpen]);

  useEffect(() => {
    document.title = `${facility.name} | AURA simulation workspace`;
  }, [facility.name]);

  // Below xl the panel is an overlay, so it must not cover the model on load.
  useEffect(() => {
    setPanelOpen(!overlayInspector);
  }, [overlayInspector, setPanelOpen]);

  // This surface is the simulation workspace, so it always opens on the
  // scenario step. Later role changes still move to the role's default tool.
  const initialTool = useRef(true);
  useEffect(() => {
    if (initialTool.current) {
      initialTool.current = false;
      setTool('simulate');
      return;
    }
    setTool(ROLE_VIEWS[roleView].defaultTool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleView]);

  // Deep links from the command centre: open a run result, a comparison, or
  // an asset. Routing state is explicit in the URL, never component-local.
  const runParam = searchParams.get('run');
  const compareParam = searchParams.get('compare');
  const assetParam = searchParams.get('asset');
  const twinParam = searchParams.get('twin');
  const blueprintParam = searchParams.get('blueprintId');
  const versionParam = searchParams.get('versionId');

  // Blueprint handoff: load a DRAFT configuration only. No run is created and
  // no simulation mutation is issued on arrival.
  useEffect(() => {
    const handoff = parseSimulationHandoff(searchParams);
    if (handoff) {
      setHandoff({ blueprintId: handoff.blueprintId, versionId: handoff.versionId });
      setTool('simulate');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintParam, versionParam]);

  useEffect(() => {
    if (assetParam) {
      selectAsset(assetParam);
      setTool('inspect');
    }
    if (compareParam) {
      const ids = compareParam.split(',').filter((id) => runs.some((r) => r.id === id));
      if (ids.length > 0) {
        ids.slice(0, 2).forEach((id) => toggleCompareRun(id));
        setActiveRun(ids[0]);
        setTool('compare');
        return;
      }
    }
    if (runParam && runs.some((r) => r.id === runParam)) {
      setActiveRun(runParam);
      setTool('compare');
    }
    // Deep links are applied once per URL change, not on every run mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runParam, compareParam, assetParam, runs.length]);

  // Facility preselection: a ?twin=... deep-link from the command centre
  // (or a shared URL) should activate that facility if the user has access.
  useEffect(() => {
    if (!twinParam || twinParam === activeTwinId) return;
    const requestedTwin = twins.find((t) => t.id === twinParam);
    if (requestedTwin) {
      setActiveTwin(requestedTwin.id);
    }
    // Only react to explicit twinParam changes; ignore activeTwinId updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twinParam]);

  return (
    <TwinOverlayProvider twinId={facility.id} defaultOverlay="thermal">
      <div
        className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background"
        data-testid="aura-workspace"
      >
        {/* One record header: identity, truth line, view selector, actions. */}
        <WorkspaceRecordHeader
          facility={facility}
          workspaceLabel={workspaceLabel}
          isFallback={isFallback}
          panelOpen={panelOpen}
          onOpenPanel={() => setPanelOpen(true)}
          panelToggleRef={panelToggleRef}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
          {!isMobile && <WorkspaceToolRail />}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <FacilityCanvas facility={facility} />
            </div>
            <KpiStrip facility={facility} overrides={overrides} />
          </div>

          {/* Desktop: docked, resizable inspector. Narrow: overlay drawer. */}
          {!overlayInspector && panelOpen && (
            <div className="flex min-h-0 shrink-0" style={{ width: panelWidth }}>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize inspector"
                tabIndex={0}
                onPointerDown={onResizePointerDown}
                onPointerMove={onResizePointerMove}
                onPointerUp={endResize}
                onPointerCancel={endResize}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') setPanelWidth((w) => clampWidth(w + 16));
                  if (e.key === 'ArrowRight') setPanelWidth((w) => clampWidth(w - 16));
                }}
                className="w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <ContextPanel
                facility={facility}
                assets={assets}
                overrides={overrides}
                onClose={closePanel}
              />
            </div>
          )}

          {isMobile && <WorkspaceToolRail orientation="horizontal" />}
        </div>

        {overlayInspector && (
          <Sheet
            open={panelOpen}
            onOpenChange={(open) => {
              if (!open) closePanel();
              else setPanelOpen(true);
            }}
          >
            <SheetContent
              side="right"
              className="flex w-full flex-col gap-0 bg-card p-0 sm:max-w-[440px]"
              data-testid="workspace-inspector-drawer"
            >
              <SheetTitle className="sr-only">Workspace inspector</SheetTitle>
              <ContextPanel facility={facility} assets={assets} overrides={overrides} onClose={closePanel} />
            </SheetContent>
          </Sheet>
        )}

        <EvidenceDrawer facility={facility} overrides={overrides} />
      </div>
    </TwinOverlayProvider>
  );
}