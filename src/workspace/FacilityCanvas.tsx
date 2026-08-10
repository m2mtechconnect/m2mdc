/**
 * The facility model canvas. This is the primary surface of the workspace:
 * it fills the available space and never sits inside a card.
 */
import { Suspense, lazy } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SimulationErrorBoundary } from '@/components/twin-visualization/SimulationErrorBoundary';
import { useTwinVisualizationData } from '@/components/twin-visualization/hooks/useTwinVisualizationData';
import { useTwinOverlaySafe, OVERLAY_CONFIG, type TwinOverlay } from '@/context/TwinOverlayContext';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from './workspaceStore';
import type { FacilityDefinition } from './facilityModel';

const DataCenter3DScene = lazy(() =>
  import('@/components/twin-visualization/DataCenter3DScene').then((m) => ({ default: m.DataCenter3DScene })),
);

const OVERLAYS: TwinOverlay[] = ['thermal', 'power', 'cooling', 'gpu', 'workload', 'network', 'sovereignty', 'carbon'];

function CanvasSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/40">
      <div className="text-center">
        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" aria-hidden />
        <p className="text-xs text-muted-foreground">Loading facility model...</p>
      </div>
    </div>
  );
}

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

  return (
    <div className="relative h-full w-full bg-background" data-testid="facility-model-canvas">
      <SimulationErrorBoundary fallbackMessage="The facility model could not be rendered in this browser.">
        <Suspense fallback={<CanvasSkeleton />}>
          <DataCenter3DScene
            racks={data.racks}
            rows={data.rows}
            powerSegments={data.powerSegments}
            thermalZones={data.thermalZones}
            events={[]}
            mode="blueprint"
            activeOverlay={activeOverlay as never}
            onRackClick={(rackId) => {
              selectAsset(rackId);
              setTool('inspect');
            }}
          />
        </Suspense>
      </SimulationErrorBoundary>

      {/* Overlay switcher, anchored to the model itself */}
      <div
        className="pointer-events-auto absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1 rounded-md border border-border bg-card/90 p-1 backdrop-blur"
        role="group"
        aria-label="Model overlays"
      >
        {OVERLAYS.map((overlay) => (
          <Button
            key={overlay}
            type="button"
            size="sm"
            variant={activeOverlay === overlay ? 'secondary' : 'ghost'}
            aria-pressed={activeOverlay === overlay}
            className="h-7 px-2 text-[11px]"
            onClick={() => setOverlay(activeOverlay === overlay ? 'none' : overlay)}
          >
            {OVERLAY_CONFIG[overlay].label}
          </Button>
        ))}
      </div>

      {/* Facility identity + selection context */}
      <div className="pointer-events-none absolute right-3 top-3 max-w-[16rem] rounded-md border border-border bg-card/90 px-3 py-2 text-right backdrop-blur">
        <p className="truncate text-sm font-semibold text-foreground">{facility.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {facility.city} · {facility.tier} · {facility.capacityKw.toLocaleString()} kW
        </p>
        {selectedAssetId && selectedAssetId !== 'facility' && (
          <Badge variant="outline" className="mt-1 text-[10px]">
            Selected: {selectedAssetId}
          </Badge>
        )}
      </div>

      {isRunning && (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full border border-border',
            'bg-card/90 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur',
          )}
          role="status"
        >
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />
          Running simulated scenario against the modelled configuration
        </div>
      )}
    </div>
  );
}