/**
 * Enhanced Rack Status Overview with filtering and quick actions
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Server, Thermometer, Cpu, Eye, PlayCircle, ChevronRight, Filter } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { cn } from '@/lib/utils';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface EnhancedRackOverviewProps {
  facility: DataCentreFacility;
  onInspectRack?: (rackId: string) => void;
  onSimulateRack?: (rackId: string) => void;
  onOpenGpuDashboard?: (rackId: string) => void;
}

type SortOption = 'deltaT' | 'inletTemp' | 'gpuLoad' | 'healthScore';
type FilterOption = 'all' | 'critical' | 'warning' | 'gpu' | 'highDensity';

interface ProcessedRack {
  id: string;
  name: string;
  inletTemp: number;
  outletTemp: number;
  deltaT: number;
  hotspotRisk: number;
  gpuLoad: number;
  powerKw: number;
  healthScore: number;
  coolingZone: string;
  status: 'normal' | 'warning' | 'critical';
  hasGpu: boolean;
  isHighDensity: boolean;
}

export function EnhancedRackOverview({ 
  facility, 
  onInspectRack,
  onSimulateRack,
  onOpenGpuDashboard
}: EnhancedRackOverviewProps) {
  const [sortBy, setSortBy] = useState<SortOption>('deltaT');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);
  
  const processedRacks = useMemo<ProcessedRack[]>(() => {
    return facility.thermalHardware.racks.map(rack => {
      const avgInlet = rack.servers.reduce((acc, s) => acc + s.cpuTempC, 0) / rack.servers.length * 0.35 + 18;
      const avgOutlet = avgInlet + 6 + Math.random() * 4;
      const deltaT = avgOutlet - avgInlet;
      const gpuLoad = rack.servers.reduce((acc, s) => acc + (s.gpuTempC || 0), 0) / rack.servers.length;
      const powerKw = rack.servers.reduce((acc, s) => acc + s.powerDrawW, 0) / 1000;
      
      const status = deltaT > 10 ? 'critical' : deltaT > 7 ? 'warning' : 'normal';
      
      return {
        id: rack.id,
        name: rack.name,
        inletTemp: Math.round(avgInlet * 10) / 10,
        outletTemp: Math.round(avgOutlet * 10) / 10,
        deltaT: Math.round(deltaT * 10) / 10,
        hotspotRisk: Math.min(100, Math.round((deltaT / 15) * 100)),
        gpuLoad: Math.round(gpuLoad),
        powerKw: Math.round(powerKw * 10) / 10,
        healthScore: Math.round(100 - (deltaT * 3)),
        coolingZone: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
        status,
        hasGpu: gpuLoad > 30,
        isHighDensity: powerKw > 15,
      };
    });
  }, [facility]);
  
  const filteredAndSortedRacks = useMemo(() => {
    let result = [...processedRacks];
    
    // Filter
    switch (filterBy) {
      case 'critical':
        result = result.filter(r => r.status === 'critical');
        break;
      case 'warning':
        result = result.filter(r => r.status === 'warning' || r.status === 'critical');
        break;
      case 'gpu':
        result = result.filter(r => r.hasGpu);
        break;
      case 'highDensity':
        result = result.filter(r => r.isHighDensity);
        break;
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'deltaT': return b.deltaT - a.deltaT;
        case 'inletTemp': return b.inletTemp - a.inletTemp;
        case 'gpuLoad': return b.gpuLoad - a.gpuLoad;
        case 'healthScore': return a.healthScore - b.healthScore;
        default: return 0;
      }
    });
    
    return result;
  }, [processedRacks, filterBy, sortBy]);
  
  const getTempColor = (temp: number): string => {
    if (temp < 22) return 'bg-success';
    if (temp < 26) return 'bg-yellow-500';
    if (temp < 30) return 'bg-orange-500';
    return 'bg-destructive';
  };
  
  const getDeltaTBarWidth = (deltaT: number): string => {
    return `${Math.min(100, (deltaT / 15) * 100)}%`;
  };
  
  const getDeltaTColor = (deltaT: number): string => {
    if (deltaT < 6) return 'bg-success';
    if (deltaT < 8) return 'bg-yellow-500';
    if (deltaT < 10) return 'bg-orange-500';
    return 'bg-destructive';
  };
  
  return (
    <CollapsibleSection
      title="Rack Status Overview"
      badge={`${filteredAndSortedRacks.length} racks`}
      defaultOpen={true}
      icon={<Server className="h-5 w-5 text-primary" />}
    >
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Racks</SelectItem>
              <SelectItem value="critical">Critical Only</SelectItem>
              <SelectItem value="warning">Warning+</SelectItem>
              <SelectItem value="gpu">GPU Racks</SelectItem>
              <SelectItem value="highDensity">High Density</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deltaT">Highest ΔT</SelectItem>
            <SelectItem value="inletTemp">Highest Inlet</SelectItem>
            <SelectItem value="gpuLoad">GPU Load</SelectItem>
            <SelectItem value="healthScore">Worst Health</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success" />
            <span className="text-muted-foreground">&lt;22°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-muted-foreground">22-26°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span className="text-muted-foreground">26-30°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive" />
            <span className="text-muted-foreground">&gt;30°C</span>
          </div>
        </div>
      </div>
      
      {/* Rack Grid */}
      <TooltipProvider>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {filteredAndSortedRacks.slice(0, 20).map((rack) => (
            <Tooltip key={rack.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative p-2 rounded-lg border transition-all cursor-pointer group',
                    rack.status === 'critical' && 'border-destructive/50 bg-destructive/10',
                    rack.status === 'warning' && 'border-warning/50 bg-warning/10',
                    rack.status === 'normal' && 'border-border bg-muted/30 hover:border-primary/30',
                    hoveredRack === rack.id && 'ring-2 ring-primary ring-offset-1'
                  )}
                  onMouseEnter={() => setHoveredRack(rack.id)}
                  onMouseLeave={() => setHoveredRack(null)}
                >
                  {/* Temperature indicator */}
                  <div className={cn(
                    'absolute top-0 left-0 w-full h-1 rounded-t-lg',
                    getTempColor(rack.inletTemp)
                  )} />
                  
                  <div className="pt-1">
                    <div className="text-xs font-medium text-card-foreground">{rack.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {rack.inletTemp}°C
                    </div>
                    
                    {/* ΔT bar */}
                    <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full', getDeltaTColor(rack.deltaT))}
                        style={{ width: getDeltaTBarWidth(rack.deltaT) }}
                      />
                    </div>
                    
                    {/* GPU indicator */}
                    {rack.hasGpu && (
                      <div className="absolute top-1 right-1">
                        <Cpu className="h-2.5 w-2.5 text-accent" />
                      </div>
                    )}
                  </div>
                  
                  {/* Quick actions on hover */}
                  {hoveredRack === rack.id && (
                    <div className="absolute inset-0 bg-background/90 rounded-lg flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); onInspectRack?.(rack.id); }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); onSimulateRack?.(rack.id); }}
                      >
                        <PlayCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="w-48 p-3">
                <div className="space-y-2">
                  <div className="font-medium">{rack.name}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Inlet Temp:</span>
                    <span className="font-mono">{rack.inletTemp}°C</span>
                    <span className="text-muted-foreground">Outlet Temp:</span>
                    <span className="font-mono">{rack.outletTemp}°C</span>
                    <span className="text-muted-foreground">ΔT:</span>
                    <span className={cn('font-mono', rack.deltaT > 8 && 'text-destructive')}>{rack.deltaT}°C</span>
                    <span className="text-muted-foreground">Hotspot Risk:</span>
                    <span className="font-mono">{rack.hotspotRisk}%</span>
                    <span className="text-muted-foreground">GPU Load:</span>
                    <span className="font-mono">{rack.gpuLoad}%</span>
                    <span className="text-muted-foreground">Cooling Zone:</span>
                    <span>{rack.coolingZone}</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      
      {filteredAndSortedRacks.length > 20 && (
        <div className="mt-3 text-center">
          <Button variant="outline" size="sm" className="text-xs gap-1">
            View All {filteredAndSortedRacks.length} Racks
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </CollapsibleSection>
  );
}
