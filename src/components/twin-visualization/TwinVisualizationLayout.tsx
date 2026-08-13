/**
 * TwinVisualizationLayout Component
 * Standard wrapper composing 3D view, KPI cards, legends, and timeline
 * 
 * CRITICAL: Uses TwinOverlayContext as single source of truth for overlay state
 * UPGRADED: Added KPI tab → 3D overlay domain binding
 * HARDENED: Wrapped with SimulationErrorBoundary for crash protection
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Thermometer, 
  Zap, 
  Network, 
  Cpu, 
  Leaf,
  Snowflake,
  Shield,
} from 'lucide-react';
import { useTwinVisualizationData } from './hooks/useTwinVisualizationData';
import { NetworkTopologyLayer } from './NetworkTopologyLayer';
import { SimulationTimeline } from './SimulationTimeline';
import { SimulationErrorBoundary } from './SimulationErrorBoundary';
import { useSimulationVisualization } from '@/hooks/useSimulationVisualization';
import { useTwinOverlaySafe, OVERLAY_CONFIG, type TwinOverlay } from '@/context/TwinOverlayContext';
import type { TwinVisualizationMode } from './types';
import { DataCenter3DScene, type OverlayDomain } from './DataCenter3DScene';

interface TwinVisualizationLayoutProps {
  mode: TwinVisualizationMode;
  showTimeline?: boolean;
  /** Show overlay controls inside the 3D panel - this is the canonical source */
  showOverlayControls?: boolean;
  onRackSelect?: (rackId: string) => void;
  className?: string;
  /** @deprecated Use TwinOverlayProvider instead */
  initialOverlay?: OverlayDomain;
}

export function TwinVisualizationLayout({ 
  mode, 
  showTimeline = false,
  showOverlayControls,
  onRackSelect,
  className = '',
}: TwinVisualizationLayoutProps) {
  const data = useTwinVisualizationData();
  const simulation = useSimulationVisualization();
  
  // Use global overlay context - single source of truth
  const { activeOverlay: contextOverlay, setOverlay } = useTwinOverlaySafe();
  const activeOverlay = contextOverlay as OverlayDomain;
  
  // Network is a special toggle (not exclusive with other overlays)
  const [showNetwork, setShowNetwork] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  
  // Toggle overlay handler
  const toggleOverlay = useCallback((overlay: TwinOverlay) => {
    setOverlay(activeOverlay === overlay ? 'none' : overlay);
  }, [activeOverlay, setOverlay]);

  // Keyboard shortcuts for overlay switching (1-8)
  useEffect(() => {
    const overlayKeys: Record<string, TwinOverlay> = {
      '1': 'thermal',
      '2': 'power',
      '3': 'cooling',
      '4': 'gpu',
      '5': 'network',
      '6': 'workload',
      '7': 'sovereignty',
      '8': 'carbon',
      '0': 'none',
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const overlay = overlayKeys[e.key];
      if (overlay) {
        e.preventDefault();
        setOverlay(overlay);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOverlay]);

  // Sync playing state with simulation
  useEffect(() => {
    setIsPlaying(simulation.isSimulating);
  }, [simulation.isSimulating]);

  const isCompact = mode === 'dashboard';
  // Show controls if explicitly requested OR if not in compact mode
  const showControls = showOverlayControls ?? (mode !== 'dashboard');

  // Calculate summary stats
  const criticalRacks = data.racks.filter(r => r.isCritical).length;
  const avgUtilization = data.racks.reduce((sum, r) => sum + r.utilizationPercent, 0) / (data.racks.length || 1);
  const totalPower = data.racks.reduce((sum, r) => sum + r.powerKw, 0);

  // Use simulation time or local state
  const currentTime = simulation.isSimulating ? simulation.currentTime : data.currentTime;
  
  // Timeline duration from active scenario or default
  const timelineDuration = 600; // Default 10 minutes

  return (
    <div data-testid="twin-visualization-layout" className={`space-y-4 ${className}`}>
      {/* Header with facility info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{data.facilityName}</h3>
          <p className="text-sm text-muted-foreground">
            {data.racks.length} Racks • {data.rows.length} Rows • {data.totalCapacityKw} kW Capacity
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {simulation.isSimulating && (
            <Badge variant="default" className="bg-success text-success-foreground animate-pulse">
              Simulating
            </Badge>
          )}
          {mode === 'simulation' && data.activeScenario && (
            <Badge variant="secondary" className="text-xs">
              Scenario: {data.activeScenario}
            </Badge>
          )}
        </div>
      </div>

      {/* Main visualization area */}
      <div className={`grid gap-4 ${isCompact ? '' : 'lg:grid-cols-[1fr_280px]'}`}>
        {/* 3D Scene */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {mode === 'blueprint' ? 'Blueprint Layout' : 
               mode === 'simulation' ? 'Digital Twin' : 
               'Twin Preview'}
              {showControls && (
                <span className="text-xs font-normal text-muted-foreground">• Overlay</span>
              )}
            </CardTitle>
            
            {showControls && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button
                      variant={activeOverlay === 'thermal' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleOverlay('thermal')}
                    >
                      <Thermometer className="h-3 w-3 mr-1" />
                      Thermal
                    </Button>
                    <Button
                      variant={activeOverlay === 'power' || activeOverlay === 'pue' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleOverlay('power')}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Power
                    </Button>
                    <Button
                      variant={activeOverlay === 'cooling' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleOverlay('cooling')}
                    >
                      <Snowflake className="h-3 w-3 mr-1" />
                      Cooling
                    </Button>
                    <Button
                      variant={activeOverlay === 'gpu' || activeOverlay === 'workload' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleOverlay('gpu')}
                    >
                      <Cpu className="h-3 w-3 mr-1" />
                      GPU
                    </Button>
                    <Button
                      variant={activeOverlay === 'sovereignty' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleOverlay('sovereignty')}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Sovereignty
                    </Button>
                    <Button
                      variant={showNetwork ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setShowNetwork(!showNetwork)}
                    >
                      <Network className="h-3 w-3 mr-1" />
                      Network
                    </Button>
                    <Button
                      variant={activeOverlay === 'carbon' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleOverlay('carbon')}
                    >
                      <Leaf className="h-3 w-3 mr-1" />
                      Carbon
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  <p>Overlays control how the digital twin is visualized.</p>
                  <p className="text-muted-foreground mt-1">Keyboard: 1-8 to switch, 0 to clear</p>
                </TooltipContent>
              </Tooltip>
            )}
          </CardHeader>
          
          <CardContent className="p-0 relative">
            <SimulationErrorBoundary fallbackMessage="3D Visualization Error">
              <DataCenter3DScene
                racks={data.racks}
                rows={data.rows}
                powerSegments={data.powerSegments}
                thermalZones={data.thermalZones}
                events={data.events}
                compact={isCompact}
                mode={mode}
                onRackClick={onRackSelect}
                activeOverlay={activeOverlay}
                simulationKpis={simulation.currentKpis}
              />
            </SimulationErrorBoundary>

            {/* Network topology overlay */}
            {showNetwork && (
              <NetworkTopologyLayer
                nodes={data.networkNodes}
                links={data.networkLinks}
                visible={showNetwork}
                compact={isCompact}
              />
            )}
          </CardContent>
        </Card>

        {/* KPI sidebar (hidden in compact mode) */}
        {!isCompact && (
          <div className="space-y-3">
            {/* PUE Card */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">PUE</span>
                  <Cpu className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-foreground">{data.pue.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Power Usage Effectiveness</div>
              </CardContent>
            </Card>

            {/* Utilization Card */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Avg Utilization</span>
                  <Cpu className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-foreground">{avgUtilization.toFixed(0)}%</div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-primary rounded-full h-1.5 transition-all" 
                    style={{ width: `${avgUtilization}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Power Card */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Power</span>
                  <Zap className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-foreground">{totalPower.toFixed(0)} kW</div>
                <div className="text-xs text-muted-foreground">of {data.totalCapacityKw} kW capacity</div>
              </CardContent>
            </Card>

            {/* Carbon Card */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Carbon Intensity</span>
                  <Leaf className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-foreground">{data.carbonIntensity}</div>
                <div className="text-xs text-muted-foreground">gCO₂/kWh</div>
              </CardContent>
            </Card>

            {/* Alerts */}
            {criticalRacks > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <span className="text-sm font-medium">⚠ {criticalRacks} Critical Racks</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Simulation timeline - SYNCED with simulation engine */}
      {(mode === 'simulation' || showTimeline || simulation.isSimulating) && data.events.length > 0 && (
        <SimulationTimeline
          events={data.events}
          durationSeconds={timelineDuration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onSeek={(time) => simulation.seekToTime(time)}
          onEventClick={setSelectedEvent}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => simulation.seekToTime(0)}
        />
      )}

      {/* Compact mode KPI strip */}
      {isCompact && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{data.pue.toFixed(2)}</span>
            <span className="text-muted-foreground">PUE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{totalPower.toFixed(0)} kW</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Leaf className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{data.carbonIntensity} gCO₂</span>
          </div>
          {simulation.isSimulating && (
            <Badge variant="default" className="bg-success/80 text-success-foreground text-xs">
              Live
            </Badge>
          )}
          {criticalRacks > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalRacks} Critical
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
