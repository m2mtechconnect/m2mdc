/**
 * Compact Rack Status Overview - Mini heatmap with legend
 */

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Server, ChevronRight, Filter } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { cn } from '@/lib/utils';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface CompactRackOverviewProps {
  facility: DataCentreFacility;
  onOpenFullView?: () => void;
  onInspectRack?: (rackId: string) => void;
  maxRacks?: number;
}

type SortOption = 'deltaT' | 'inletTemp';

export function CompactRackOverview({ 
  facility, 
  onOpenFullView,
  onInspectRack,
  maxRacks = 20 
}: CompactRackOverviewProps) {
  const [sortBy, setSortBy] = useState<SortOption>('deltaT');
  
  const processedRacks = useMemo(() => {
    return facility.thermalHardware.racks.map(rack => {
      const avgInlet = rack.servers.reduce((acc, s) => acc + s.cpuTempC, 0) / rack.servers.length * 0.35 + 18;
      const avgOutlet = avgInlet + 6 + Math.random() * 4;
      const deltaT = avgOutlet - avgInlet;
      
      return {
        id: rack.id,
        name: rack.name,
        inletTemp: Math.round(avgInlet * 10) / 10,
        deltaT: Math.round(deltaT * 10) / 10,
        status: deltaT > 10 ? 'critical' : deltaT > 7 ? 'warning' : 'normal' as const,
      };
    });
  }, [facility]);
  
  const sortedRacks = useMemo(() => {
    return [...processedRacks]
      .sort((a, b) => sortBy === 'deltaT' ? b.deltaT - a.deltaT : b.inletTemp - a.inletTemp)
      .slice(0, maxRacks);
  }, [processedRacks, sortBy, maxRacks]);
  
  const getTempColor = (temp: number): string => {
    if (temp < 22) return 'bg-success';
    if (temp < 26) return 'bg-yellow-500';
    if (temp < 30) return 'bg-orange-500';
    return 'bg-destructive';
  };

  return (
    <CollapsibleSection
      title="Rack Status Overview"
      badge={`${processedRacks.length} racks`}
      defaultOpen={true}
      icon={<Server className="h-4 w-4 text-primary" />}
    >
      {/* Controls Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[110px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deltaT">Highest ΔT</SelectItem>
              <SelectItem value="inletTemp">Inlet Temp</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Compact Legend */}
        <div className="flex items-center gap-2 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-success" />
            <span className="text-muted-foreground">&lt;22°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-yellow-500" />
            <span className="text-muted-foreground">22-26°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-orange-500" />
            <span className="text-muted-foreground">26-30°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-destructive" />
            <span className="text-muted-foreground">&gt;30°C</span>
          </div>
        </div>
      </div>
      
      {/* Rack Heatmap Grid */}
      <TooltipProvider>
        <div className="grid grid-cols-5 gap-1.5 max-h-[200px] overflow-hidden">
          {sortedRacks.map((rack) => (
            <Tooltip key={rack.id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'relative p-1.5 rounded border transition-all cursor-pointer',
                    rack.status === 'critical' && 'border-destructive/50 bg-destructive/10',
                    rack.status === 'warning' && 'border-warning/50 bg-warning/10',
                    rack.status === 'normal' && 'border-border bg-muted/30 hover:border-primary/30'
                  )}
                  onClick={() => onInspectRack?.(rack.id)}
                >
                  {/* Temp indicator bar at top */}
                  <div className={cn(
                    'absolute top-0 left-0 w-full h-0.5 rounded-t',
                    getTempColor(rack.inletTemp)
                  )} />
                  
                  <div className="text-[9px] font-medium text-card-foreground truncate">
                    {rack.name}
                  </div>
                  <div className="text-[8px] text-muted-foreground font-mono">
                    {rack.inletTemp}°C
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  <div className="font-medium">{rack.name}</div>
                  <div className="text-muted-foreground">
                    Inlet: {rack.inletTemp}°C | ΔT: {rack.deltaT}°C
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      
      {/* View Full Link */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-3 text-xs text-muted-foreground gap-1"
        onClick={onOpenFullView}
      >
        Open full rack view
        <ChevronRight className="h-3 w-3" />
      </Button>
    </CollapsibleSection>
  );
}
