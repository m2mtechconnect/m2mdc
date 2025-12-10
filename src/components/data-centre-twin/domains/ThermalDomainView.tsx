/**
 * Thermal Domain View - Hardware & thermal monitoring
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Thermometer, Cpu, Fan, AlertTriangle, Filter } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { SummaryCard } from '@/components/shared/SummaryCard';
import type { DataCentreFacility, RackThermal } from '@/types/dataCenterTwin';

interface ThermalDomainViewProps {
  facility: DataCentreFacility;
}

type TempFilter = 'all' | 'cool' | 'warm' | 'hot';

export function ThermalDomainView({ facility }: ThermalDomainViewProps) {
  const [tempFilter, setTempFilter] = useState<TempFilter>('all');
  
  const racks = facility.thermalHardware.racks;
  
  // Apply filter
  const filteredRacks = racks.filter(r => {
    if (tempFilter === 'all') return true;
    if (tempFilter === 'cool') return r.inletTempC < 24;
    if (tempFilter === 'warm') return r.inletTempC >= 24 && r.inletTempC < 28;
    if (tempFilter === 'hot') return r.inletTempC >= 28;
    return true;
  });
  
  const hotRacks = racks.filter(r => r.outletTempC > 35);
  const avgTemp = racks.length > 0 
    ? racks.reduce((acc, r) => acc + r.inletTempC, 0) / racks.length
    : 0;
  
  const gpuClusters = facility.workloadGpu.clusters;
  const avgGpuTemp = gpuClusters.length > 0
    ? gpuClusters.reduce((acc, c) => {
        const clusterAvgTemp = c.nodes.reduce((sum, n) => {
          const nodeAvgTemp = n.gpuTempC.reduce((s, t) => s + t, 0) / n.gpuTempC.length;
          return sum + nodeAvgTemp;
        }, 0) / c.nodes.length;
        return acc + clusterAvgTemp;
      }, 0) / gpuClusters.length
    : 0;
  
  const coolingZones = facility.cooling.zones;
  const avgDeltaT = coolingZones.length > 0
    ? coolingZones.reduce((acc, z) => acc + (z.ambientTempC - z.targetTempC), 0) / coolingZones.length
    : 0;
  
  const filterCounts = {
    all: racks.length,
    cool: racks.filter(r => r.inletTempC < 24).length,
    warm: racks.filter(r => r.inletTempC >= 24 && r.inletTempC < 28).length,
    hot: racks.filter(r => r.inletTempC >= 28).length,
  };
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Avg Inlet Temp"
          value={`${avgTemp.toFixed(1)}°C`}
          status={avgTemp < 25 ? 'good' : avgTemp < 28 ? 'warning' : 'critical'}
          icon={Thermometer}
        />
        <SummaryCard
          title="Hot Racks"
          value={`${hotRacks.length}`}
          subtitle={`of ${racks.length} total`}
          status={hotRacks.length === 0 ? 'good' : hotRacks.length < 3 ? 'warning' : 'critical'}
          icon={AlertTriangle}
        />
        <SummaryCard
          title="GPU Temps"
          value={`${avgGpuTemp.toFixed(0)}°C`}
          status={avgGpuTemp < 75 ? 'good' : avgGpuTemp < 85 ? 'warning' : 'critical'}
          icon={Cpu}
        />
        <SummaryCard
          title="Cooling Delta"
          value={`${Math.abs(avgDeltaT).toFixed(1)}°C`}
          status="good"
          icon={Fan}
        />
      </div>

      {/* Thermal Heatmap */}
      <CollapsibleSection title="Rack Thermal Map" badge={`${filteredRacks.length} racks`}>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Temperature:</span>
            <div className="flex gap-1">
            {[
              { key: 'all' as const, label: 'All', color: '' },
              { key: 'cool' as const, label: 'Cool (<24°C)', color: 'border-emerald-500/30 text-emerald-500' },
              { key: 'warm' as const, label: 'Warm (24-28°C)', color: 'border-amber-500/30 text-amber-500' },
              { key: 'hot' as const, label: 'Hot (>28°C)', color: 'border-red-500/30 text-red-500' },
            ].map(({ key, label, color }) => (
              <Button
                key={key}
                variant={tempFilter === key ? 'default' : 'outline'}
                size="sm"
                className={`h-7 text-xs ${tempFilter !== key && color ? color : ''}`}
                onClick={() => setTempFilter(key)}
              >
                {label}
                <span className="ml-1 opacity-70">({filterCounts[key]})</span>
              </Button>
            ))}
            </div>
          </div>
        </div>
        
        {filteredRacks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No racks match the current filter
          </div>
        ) : (
          <>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(filteredRacks.length))}, 1fr)` }}>
              {filteredRacks.map((rack) => (
                <RackThermalTile key={rack.id} rack={rack} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                <span>&lt;24°C</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-amber-500" />
                <span>24-27°C</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-orange-500" />
                <span>27-30°C</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span>&gt;30°C</span>
              </div>
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* Rack Details */}
      <CollapsibleSection title="Rack Details" badge={`${racks.length} racks`}>
        <div className="space-y-3">
          {racks.slice(0, 10).map((rack) => (
            <div key={rack.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
              <div className="w-24 font-mono text-sm">{rack.name}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{rack.inletTempC.toFixed(1)}°C inlet</span>
                  <span className="text-sm text-muted-foreground">{rack.powerDrawKw.toFixed(1)} kW</span>
                </div>
                <Progress value={(rack.inletTempC / 35) * 100} className="h-2" />
              </div>
              <Badge variant={rack.inletTempC < 25 ? 'default' : rack.inletTempC < 28 ? 'secondary' : 'destructive'}>
                {rack.servers.length} servers
              </Badge>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

interface RackThermalTileProps {
  rack: RackThermal;
}

function RackThermalTile({ rack }: RackThermalTileProps) {
  const getTempColor = (temp: number) => {
    if (temp < 24) return 'bg-emerald-500';
    if (temp < 27) return 'bg-amber-500';
    if (temp < 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div 
      className={`aspect-square rounded-lg ${getTempColor(rack.inletTempC)} flex items-center justify-center text-white text-xs font-mono hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
      title={`${rack.name}: ${rack.inletTempC.toFixed(1)}°C`}
    >
      {rack.inletTempC.toFixed(0)}°
    </div>
  );
}
