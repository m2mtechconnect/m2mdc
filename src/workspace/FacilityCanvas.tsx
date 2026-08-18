/**
 * The facility model canvas. This is the primary surface of the workspace:
 * it fills the available space and never sits inside a card.
 *
 * Model-loading contract:
 *   loading  -> the 3D renderer is initialising (bounded to LOAD_TIMEOUT_MS)
 *   ready    -> the 3D renderer produced a drawing surface
 *   degraded -> 3D was not usable in time, the 2D floor plan is shown instead
 *   error    -> the renderer threw; the 2D floor plan is shown with a retry
 * The canvas can never remain in `loading` indefinitely.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Box, Grid2x2, Loader2, Maximize2, Minus, Plus, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SimulationErrorBoundary } from '@/components/twin-visualization/SimulationErrorBoundary';
import { DataCenter3DScene } from '@/components/twin-visualization/DataCenter3DScene';
import { useDesignScenario } from './useDesignScenario';
import type { ShellMode } from '@/components/twin-visualization/DataHall';
import { useTwinVisualizationData } from '@/components/twin-visualization/hooks/useTwinVisualizationData';
import { useTwinOverlaySafe, type TwinOverlay } from '@/context/TwinOverlayContext';
import { cn } from '@/lib/utils';
import { overlayContract } from '@/three/overlayContract';
import { useWorkspaceStore } from './workspaceStore';
import { LayerSelector } from './LayerSelector';
import { useCanvasFocusStore } from './canvasFocusStore';
import { FacilityGeometrySelector } from './FacilityGeometrySelector';
import {
  FACILITY_GEOMETRY_PARAM,
  parseFacilityGeometryParam,
  type FacilityGeometryMode,
} from '@/components/twin-visualization/facilityGeometry';
import { FacilityFloorPlan } from './FacilityFloorPlan';
import { buildRackGrid } from './dashboard/rackModel';
import { type FacilityDefinition } from './facilityModel';

/** Hard ceiling on the 3D initialisation window. */
const LOAD_TIMEOUT_MS = 8000;
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3;

type ModelState = 'loading' | 'ready' | 'degraded' | 'error';
type ViewMode = '3d' | '2d';

interface Props {
  facility: FacilityDefinition;
}

export function FacilityCanvas({ facility }: Props) {
  const data = useTwinVisualizationData();
  const { activeOverlay, setOverlay } = useTwinOverlaySafe();
  const selectAsset = useWorkspaceStore((s) => s.selectAsset);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const selectedAssetId = useWorkspaceStore((s) => s.selectedAssetId);

  const rackGrid = useMemo(() => buildRackGrid(facility), [facility]);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [modelState, setModelState] = useState<ModelState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [legendOpen, setLegendOpen] = useState(false);
  // Yield the bottom-left zone while a KPI evidence tooltip occupies it.
  const kpiTooltipOpen = useCanvasFocusStore((s) => s.kpiTooltipOpen);

  // View state is URL-addressable: shell mode and label visibility survive
  // reloads and deep links without reloading the scene.
  const shellParam = searchParams.get('shell');
  const shellMode: ShellMode =
    shellParam === 'cutaway' || shellParam === 'full' ? shellParam : 'off';
  const showLabels = searchParams.get('labels') !== 'off';

  // Geometry source is URL-owned, so a shared link always reproduces the same
  // mounted geometry as the screenshot it came from.
  const parsedGeometry = parseFacilityGeometryParam(searchParams.get(FACILITY_GEOMETRY_PARAM));
  const facilityGeometry: FacilityGeometryMode = parsedGeometry.mode;

  const setViewParam = useCallback(
    (key: string, value: string | null, options?: { push?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      if (value === null) next.delete(key);
      else next.set(key, value);
      // Geometry is a navigational choice, so it is pushed and browser
      // back/forward restores the previously mounted geometry.
      setSearchParams(next, { replace: options?.push !== true });
    },
    [searchParams, setSearchParams],
  );

  const handleSelect = useCallback(
    (assetId: string) => {
      selectAsset(assetId);
      setTool('inspect');
    },
    [selectAsset, setTool],
  );

  const retry = useCallback(() => {
    setModelState('loading');
    setViewMode('3d');
    setAttempt((a) => a + 1);
  }, []);

  // Bounded readiness probe: a drawing surface or an explicit renderer
  // fallback must appear inside LOAD_TIMEOUT_MS, otherwise we degrade to 2D.
  useEffect(() => {
    if (viewMode !== '3d') return;
    setModelState('loading');
    let done = false;

    const poll = window.setInterval(() => {
      const host = hostRef.current;
      if (!host) return;
      if (host.querySelector('canvas')) {
        done = true;
        window.clearInterval(poll);
        window.clearTimeout(timeout);
        setModelState('ready');
      } else if (host.querySelector('[role="status"]')) {
        // The renderer decided it cannot run (WebGL unavailable / software).
        done = true;
        window.clearInterval(poll);
        window.clearTimeout(timeout);
        setModelState('degraded');
        setViewMode('2d');
      }
    }, 250);

    const timeout = window.setTimeout(() => {
      if (done) return;
      window.clearInterval(poll);
      setModelState('degraded');
      setViewMode('2d');
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(timeout);
    };
  }, [viewMode, attempt]);

  const contract = overlayContract(activeOverlay as never);
  const showLoading = viewMode === '3d' && modelState === 'loading';
  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  // Panel selection and mounted scene read the same URL-owned value.
  const { requestedId: designScenarioId } = useDesignScenario();

  return (
    <TooltipProvider delayDuration={200}>
    <div className="relative h-full min-h-0 w-full min-w-0 overflow-hidden bg-background" data-testid="facility-model-canvas">
      <div ref={hostRef} className="h-full w-full" data-model-state={modelState}>
        {viewMode === '3d' ? (
          <SimulationErrorBoundary
            key={attempt}
            fallbackMessage="The facility model could not be rendered in this browser."
            onReset={retry}
          >
            <DataCenter3DScene
              racks={data.racks}
              rows={data.rows}
              powerSegments={data.powerSegments}
              thermalZones={data.thermalZones}
              events={[]}
              mode="blueprint"
              fill
              hostChromeTop
              activeOverlay={activeOverlay as never}
              selectedAssetId={selectedAssetId}
              onRackClick={handleSelect}
              shellMode={shellMode}
              onShellModeChange={(mode) => setViewParam('shell', mode === 'off' ? null : mode)}
              showLabels={showLabels}
              onShowLabelsChange={(next) => setViewParam('labels', next ? null : 'off')}
              designScenarioId={designScenarioId}
              facilityGeometry={facilityGeometry}
            />
          </SimulationErrorBoundary>
        ) : (
          <FacilityFloorPlan
            facility={facility}
            overlay={activeOverlay}
            grid={rackGrid}
            selectedRackId={selectedAssetId}
            onSelect={handleSelect}
            zoom={zoom}
            onZoomChange={(next) => setZoom(clampZoom(next))}
          />
        )}
      </div>

      {showLoading && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70"
          aria-live="polite"
        >
          <div className="text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" aria-hidden />
            <p className="text-xs text-muted-foreground">Preparing facility model...</p>
          </div>
        </div>
      )}

      {/* Protected zone, top-left: one grouped canvas toolbar. */}
      <div
        className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-15rem)] flex-col gap-1.5"
        data-testid="canvas-top-left-zone"
      >
        <div
          role="toolbar"
          aria-label="Facility canvas controls"
          data-testid="canvas-toolbar"
          className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card/95 p-1 backdrop-blur"
        >
          <div className="flex items-center gap-0.5" role="group" aria-label="View mode">
            <Button
              type="button"
              size="sm"
              variant={viewMode === '3d' ? 'secondary' : 'ghost'}
              aria-pressed={viewMode === '3d'}
              className="h-8 px-2.5 text-xs focus-visible:ring-2"
              onClick={retry}
            >
              <Box className="mr-1 h-3.5 w-3.5" aria-hidden />
              3D
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === '2d' ? 'secondary' : 'ghost'}
              aria-pressed={viewMode === '2d'}
              className="h-8 px-2.5 text-xs focus-visible:ring-2"
              onClick={() => setViewMode('2d')}
            >
              <Grid2x2 className="mr-1 h-3.5 w-3.5" aria-hidden />
              2D
            </Button>
          </div>
          <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden />
          <FacilityGeometrySelector
            value={facilityGeometry}
            onChange={(mode) =>
              setViewParam(FACILITY_GEOMETRY_PARAM, mode === 'aura-model' ? null : mode, {
                push: true,
              })
            }
          />
          <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden />
          <LayerSelector
            value={activeOverlay as TwinOverlay | 'none'}
            onChange={(layer) => setOverlay(layer)}
          />
        </div>
        {parsedGeometry.invalidValue !== null && (
          <div
            role="alert"
            data-testid="geometry-param-invalid"
            className="max-w-[26rem] rounded-md border border-destructive/40 bg-card/95 px-2.5 py-1.5 text-[11px] text-destructive backdrop-blur"
          >
            Unsupported geometry "{parsedGeometry.invalidValue}" in the link. Showing the baseline
            preview instead.
          </div>
        )}
      </div>

      {/* Protected zone, top-right: zoom and camera controls only. */}
      {viewMode === '2d' && (
        <div
          className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-md border border-border bg-card/90 p-1 backdrop-blur"
          role="group"
          aria-label="Model zoom controls"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => clampZoom(z / 1.2))}
              >
                <Minus className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Zoom out</TooltipContent>
          </Tooltip>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => clampZoom(z * 1.2))}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Zoom in</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Fit facility to view"
                onClick={() => setZoom(1)}
              >
                <Maximize2 className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Fit to view</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Protected zone, bottom-left: legend and degraded-model notice. */}
      <div
        data-testid="canvas-bottom-left-zone"
        data-yielded={kpiTooltipOpen ? 'true' : 'false'}
        className={cn(
          'pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[min(28rem,calc(100%-16rem))] flex-col gap-2 transition-opacity duration-150',
          kpiTooltipOpen && 'pointer-events-none opacity-0',
        )}
        aria-hidden={kpiTooltipOpen}
      >
        {(modelState === 'degraded' || modelState === 'error') && viewMode === '2d' && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/95 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="min-w-0">Interactive 3D unavailable in this browser. Showing the 2D floor plan of the same model.</span>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={retry}>
              <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
              Retry 3D
            </Button>
          </div>
        )}
        <div
          className="pointer-events-auto max-w-full rounded-md border border-border bg-card/95 px-2.5 py-2 text-xs text-muted-foreground backdrop-blur"
          data-testid="model-overlay-legend"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-foreground">{contract.label}</span>
            {contract.unit && <span className="text-[11px]">{contract.unit}</span>}
            {contract.legend.length > 0 && (
              <ul
                className="flex flex-wrap items-center gap-x-2.5 gap-y-1"
                aria-label={`${contract.label} legend`}
              >
                {contract.legend.map((stop) => (
                  <li key={stop.label} className="flex items-center gap-1 whitespace-nowrap text-[11px]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stop.color }}
                      aria-hidden
                    />
                    {stop.label}
                  </li>
                ))}
              </ul>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[11px]"
              aria-expanded={legendOpen}
              onClick={() => setLegendOpen((o) => !o)}
            >
              Details
            </Button>
            {activeOverlay !== 'none' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => setOverlay('none')}
              >
                Clear layer
              </Button>
            )}
          </div>
          {legendOpen && (
            <div className="mt-1">
              {contract.unavailableNote && (
                <p className="max-w-[26rem] text-[11px] text-foreground">{contract.unavailableNote}</p>
              )}
              <p className="mt-1 max-w-[26rem] text-[11px]">{contract.provenance}</p>
            </div>
          )}
        </div>
      </div>

      {isRunning && (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-14 z-20 mx-auto w-fit max-w-[80%] rounded-full border border-border',
            'bg-card/90 px-3 py-1 text-xs text-muted-foreground backdrop-blur',
          )}
          role="status"
        >
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />
          Running simulated scenario against the modelled configuration
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
