/**
 * TwinVisualizationLayout Component
 * Standard wrapper composing 3D view, KPI cards, legends, and timeline
 */

import { lazy, Suspense, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Thermometer, 
  Zap, 
  Network, 
  Cpu, 
  Leaf,
  Eye,
  EyeOff,
  Maximize2
} from 'lucide-react';
import { useTwinVisualizationData } from './hooks/useTwinVisualizationData';
import { NetworkTopologyLayer } from './NetworkTopologyLayer';
import { SimulationTimeline } from './SimulationTimeline';
import type { TwinVisualizationMode } from './types';

// Lazy load the 3D scene for performance
const DataCenter3DScene = lazy(() => 
  import('./DataCenter3DScene').then(m => ({ default: m.DataCenter3DScene }))
);

interface TwinVisualizationLayoutProps {
  mode: TwinVisualizationMode;
  showTimeline?: boolean;
  onRackSelect?: (rackId: string) => void;
  className?: string;
}

function LoadingSkeleton() {
  return (
    <div className="h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading Digital Twin...</p>
      </div>
    </div>
  );
}

export function TwinVisualizationLayout({ 
  mode, 
  showTimeline = false,
  onRackSelect,
  className = ''
}: TwinVisualizationLayoutProps) {
  const data = useTwinVisualizationData();
  
  const [showPower, setShowPower] = useState(false);
  const [showThermal, setShowThermal] = useState(true);
  const [showNetwork, setShowNetwork] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const isCompact = mode === 'dashboard';
  const showControls = mode !== 'dashboard';

  // Calculate summary stats
  const criticalRacks = data.racks.filter(r => r.isCritical).length;
  const avgUtilization = data.racks.reduce((sum, r) => sum + r.utilizationPercent, 0) / (data.racks.length || 1);
  const totalPower = data.racks.reduce((sum, r) => sum + r.powerKw, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with facility info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{data.facilityName}</h3>
          <p className="text-sm text-muted-foreground">
            {data.racks.length} Racks • {data.rows.length} Rows • {data.totalCapacityKw} kW Capacity
          </p>
        </div>
        
        {mode === 'simulation' && data.activeScenario && (
          <Badge variant="secondary" className="text-xs">
            Scenario: {data.activeScenario}
          </Badge>
        )}
      </div>

      {/* Main visualization area */}
      <div className={`grid gap-4 ${isCompact ? '' : 'lg:grid-cols-[1fr_280px]'}`}>
        {/* 3D Scene */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {mode === 'blueprint' ? 'Blueprint Layout' : 
               mode === 'simulation' ? 'Live Simulation' : 
               'Twin Preview'}
            </CardTitle>
            
            {showControls && (
              <div className="flex items-center gap-1">
                <Button
                  variant={showThermal ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setShowThermal(!showThermal)}
                >
                  <Thermometer className="h-3 w-3 mr-1" />
                  Thermal
                </Button>
                <Button
                  variant={showPower ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setShowPower(!showPower)}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Power
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
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-0 relative">
            <Suspense fallback={<LoadingSkeleton />}>
              <DataCenter3DScene
                racks={data.racks}
                rows={data.rows}
                powerSegments={data.powerSegments}
                thermalZones={data.thermalZones}
                events={data.events}
                showPower={showPower}
                showThermal={showThermal}
                compact={isCompact}
                mode={mode}
                onRackClick={onRackSelect}
              />
            </Suspense>

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

      {/* Simulation timeline */}
      {(mode === 'simulation' || showTimeline) && data.events.length > 0 && (
        <SimulationTimeline
          events={data.events}
          durationSeconds={600}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onSeek={setCurrentTime}
          onEventClick={setSelectedEvent}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => {
            setCurrentTime(0);
            setIsPlaying(false);
          }}
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
