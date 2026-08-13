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
import { Button } from '@/components/ui/button';
import { Box, Grid2x2, Loader2, Maximize2, Minus, Plus, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SimulationErrorBoundary } from '@/components/twin-visualization/SimulationErrorBoundary';
import { DataCenter3DScene } from '@/components/twin-visualization/DataCenter3DScene';
import { useTwinVisualizationData } from '@/components/twin-visualization/hooks/useTwinVisualizationData';
import { useTwinOverlaySafe, type TwinOverlay } from '@/context/TwinOverlayContext';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from './workspaceStore';
import { LayerSelector } from './LayerSelector';
import { FacilityFloorPlan } from './FacilityFloorPlan';
import { buildRackGrid } from './dashboard/rackModel';
import { type FacilityDefinition } from './facilityModel';

/** Hard ceiling on the 3D initialisation window. */
const LOAD_TIMEOUT_MS = 8000;
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3;

/** Status legend for the model, readable without relying on colour alone. */
const LEGEND: Array<{ label: string; className: string }> = [
  { label: 'Nominal', className: 'bg-success' },
  { label: 'Watch', className: 'bg-warning' },
  { label: 'Constraint', className: 'bg-destructive' },
  { label: 'Unavailable', className: 'bg-muted-foreground' },
];

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

  const showLoading = viewMode === '3d' && modelState === 'loading';
  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

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
              onRackClick={handleSelect}
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

      {/* Protected zone, top-left: layer selection and 3D/2D. */}
      <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-11rem)] flex-wrap items-center gap-2">
        <LayerSelector
          value={activeOverlay as TwinOverlay | 'none'}
          onChange={(layer) => setOverlay(layer)}
        />
        <div className="flex items-center gap-1 rounded-md border border-border bg-card/90 p-1 backdrop-blur">
          <Button
            type="button"
            size="sm"
            variant={viewMode === '3d' ? 'secondary' : 'ghost'}
            aria-pressed={viewMode === '3d'}
            className="h-8 px-2.5 text-xs"
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
            className="h-8 px-2.5 text-xs"
            onClick={() => setViewMode('2d')}
          >
            <Grid2x2 className="mr-1 h-3.5 w-3.5" aria-hidden />
            2D
          </Button>
        </div>
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
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[min(28rem,calc(100%-1.5rem))] flex-col gap-2">
        {(modelState === 'degraded' || modelState === 'error') && viewMode === '2d' && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/95 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="min-w-0">Interactive 3D unavailable in this browser. Showing the 2D floor plan of the same model.</span>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={retry}>
              <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
              Retry 3D
            </Button>
          </div>
        )}
        <ul
          className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur"
          aria-label="Model status legend"
        >
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className={cn('h-2 w-2 rounded-full', item.className)} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
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
