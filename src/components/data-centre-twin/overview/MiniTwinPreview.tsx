/**
 * MiniTwinPreview - Compact 3D twin preview for Overview tab
 * Read-only, minimal interaction, shows current thermal/power state
 * Uses TwinOverlayContext for consistent overlay state
 */

import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Maximize2, Activity } from 'lucide-react';
import { useTwinVisualizationData } from '@/components/twin-visualization/hooks/useTwinVisualizationData';
import { useSimulationVisualization } from '@/hooks/useSimulationVisualization';
import { SimulationErrorBoundary } from '@/components/twin-visualization/SimulationErrorBoundary';
import { useTwinOverlaySafe, OVERLAY_CONFIG } from '@/context/TwinOverlayContext';
import { cn } from '@/lib/utils';

const DataCenter3DScene = lazy(() => 
  import('@/components/twin-visualization/DataCenter3DScene').then(m => ({ default: m.DataCenter3DScene }))
);

interface MiniTwinPreviewProps {
  onExpand?: () => void;
  className?: string;
}

function LoadingSkeleton() {
  return (
    <div className="h-40 bg-muted rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Loading preview...</p>
      </div>
    </div>
  );
}

export function MiniTwinPreview({ onExpand, className }: MiniTwinPreviewProps) {
  const data = useTwinVisualizationData();
  const simulation = useSimulationVisualization();
  const { activeOverlay } = useTwinOverlaySafe();
  const overlayConfig = OVERLAY_CONFIG[activeOverlay];
  
  const criticalRacks = data.racks.filter(r => r.isCritical).length;
  const avgTemp = data.racks.reduce((sum, r) => sum + r.thermalCelsius, 0) / (data.racks.length || 1);
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="py-2.5 px-4 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          Twin Preview
          {/* Read-only overlay badge - non-interactive */}
          <Badge variant="outline" className="text-[10px] h-5 font-normal">
            {overlayConfig.label}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          {simulation.isSimulating && (
            <Badge variant="default" className="bg-success/80 text-success-foreground text-[10px] h-5 animate-pulse">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onExpand}
              aria-label="Expand twin preview"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        <SimulationErrorBoundary fallbackMessage="Preview unavailable">
          <Suspense fallback={<LoadingSkeleton />}>
            <div className="h-40">
              <DataCenter3DScene
                racks={data.racks}
                rows={data.rows}
                powerSegments={data.powerSegments}
                thermalZones={data.thermalZones}
                events={[]}
                compact
                mode="dashboard"
                activeOverlay={activeOverlay as any}
                simulationKpis={simulation.currentKpis}
              />
            </div>
          </Suspense>
        </SimulationErrorBoundary>
        
        {/* Quick stats overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-muted-foreground">
              {data.racks.length} Racks
            </span>
            <span className="text-muted-foreground">
              Avg {avgTemp.toFixed(0)}°C
            </span>
          </div>
          {criticalRacks > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {criticalRacks} Critical
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
