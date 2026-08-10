/**
 * AURA DC engineering workspace.
 *
 * A single full-width surface: the facility model is the primary object,
 * the tool rail changes what you do to it, and the context panel reacts to
 * the current selection. Every action lives in the rail or the panel, so
 * there are no duplicate KPI cards or scattered call-to-action buttons.
 */
import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelRightOpen } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { TwinOverlayProvider } from '@/context/TwinOverlayContext';
import { useShellLayoutStore } from '@/stores/shellLayoutStore';
import { FacilityCanvas } from './FacilityCanvas';
import { KpiStrip } from './KpiStrip';
import { ContextPanel } from './ContextPanel';
import { WorkspaceToolRail } from './WorkspaceToolRail';
import { EvidenceDrawer } from './EvidenceDrawer';
import { RoleViewSelector } from './RoleViewSelector';
import { useFacilityModel } from './facilityModel';
import { ROLE_VIEWS, useWorkspaceStore } from './workspaceStore';

/** True below the lg breakpoint (1280px), where the panel becomes a sheet. */
function useBelowXl(): boolean {
  const [below, setBelow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1279px)');
    const sync = () => setBelow(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);
  return below;
}

export default function AuraWorkspace() {
  const { facility, assets, isFallback } = useFacilityModel();
  const overrides = useWorkspaceStore((s) => s.overrides);
  const panelOpen = useWorkspaceStore((s) => s.panelOpen);
  const setPanelOpen = useWorkspaceStore((s) => s.setPanelOpen);
  const roleView = useWorkspaceStore((s) => s.roleView);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const isMobile = useIsMobile();
  const belowXl = useBelowXl();
  const setFullBleed = useShellLayoutStore((s) => s.setFullBleed);

  useEffect(() => {
    setFullBleed(true);
    return () => setFullBleed(false);
  }, [setFullBleed]);

  useEffect(() => {
    document.title = `${facility.name} | AURA simulation workspace`;
  }, [facility.name]);

  // Below xl the panel is an overlay, so it must not cover the model on load.
  useEffect(() => {
    setPanelOpen(!belowXl);
  }, [belowXl, setPanelOpen]);

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

  return (
    <TwinOverlayProvider twinId={facility.id} defaultOverlay="thermal">
      <div
        className="flex h-[calc(100vh-8.5rem)] min-h-[32rem] w-full flex-col overflow-hidden bg-background"
        data-testid="aura-workspace"
      >
        {/* Workspace bar: identity + role view. No duplicated actions. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {facility.name}
            <span className="ml-2 font-normal text-muted-foreground">Simulation workspace</span>
          </h1>
          {isFallback && (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Reference facility model
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <RoleViewSelector />
            {!panelOpen && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => setPanelOpen(true)}>
                <PanelRightOpen className="mr-1.5 h-4 w-4" aria-hidden />
                Panel
              </Button>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {!isMobile && <WorkspaceToolRail />}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-[16rem] flex-1">
              <FacilityCanvas facility={facility} />
            </div>
            <KpiStrip facility={facility} overrides={overrides} />
          </div>

          {/* Desktop: docked panel. Tablet and mobile: sheet. */}
          <div className="hidden min-h-0 w-[22rem] shrink-0 lg:flex">
            {panelOpen && (
              <ContextPanel
                facility={facility}
                assets={assets}
                overrides={overrides}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </div>

          {isMobile && <WorkspaceToolRail orientation="horizontal" />}
        </div>

        {belowXl && (
          <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
            <SheetContent side="right" className="w-full bg-card p-0 sm:max-w-md">
              <ContextPanel facility={facility} assets={assets} overrides={overrides} />
            </SheetContent>
          </Sheet>
        )}

        <EvidenceDrawer facility={facility} overrides={overrides} />
      </div>
    </TwinOverlayProvider>
  );
}