/**
 * Thermal Domain View - Enhanced with enterprise-grade DCIM features
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, Eye, Camera } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { DomainProvenanceHeader } from '@/components/provenance/DomainProvenanceHeader';

// Thermal components
import { ThermalKPIs } from '../thermal/ThermalKPIs';
import { ThermalHeatmapTile } from '../thermal/ThermalHeatmapTile';
import { CoolingCorrelationPanel } from '../thermal/CoolingCorrelationPanel';
import { CoolingUnitsPanel } from '../thermal/CoolingUnitsPanel';
import { ThermalPlayback } from '../thermal/ThermalPlayback';
import { ThermalForecastPanel } from '../thermal/ThermalForecastPanel';
import { ThermalInsightsPanel } from '../thermal/ThermalInsightsPanel';
import { EnhancedRackTable } from '../thermal/EnhancedRackTable';
import { 
  addAisleMetadata, 
  applyThermalFilter, 
  THERMAL_FILTERS,
  type ThermalFilter,
  type RackWithAisle 
} from '../thermal/ThermalHeatmapUtils';

interface ThermalDomainViewProps {
  facility: DataCentreFacility;
}

export function ThermalDomainView({ facility }: ThermalDomainViewProps) {
  const [activeFilter, setActiveFilter] = useState<ThermalFilter>('all');
  // Phase 1A.3.c: renamed from 'live' to 'snapshot' — the underlying
  // facility fixture is demonstration data, not a live source.
  const [viewMode, setViewMode] = useState<'snapshot' | 'simulation'>('snapshot');
  const [showAirflow, setShowAirflow] = useState(true);
  
  // Process racks with aisle metadata
  const racksWithAisle = useMemo(() => 
    addAisleMetadata(facility.thermalHardware.racks), 
    [facility.thermalHardware.racks]
  );
  
  // Apply active filter
  const filteredRacks = useMemo(() => 
    applyThermalFilter(racksWithAisle, activeFilter),
    [racksWithAisle, activeFilter]
  );
  
  return (
    <div className="space-y-6" data-provenance="demo" data-testid="thermal-domain-view">
      {/* Mode Switch + provenance header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={viewMode === 'snapshot' ? 'default' : 'outline'}
            className="cursor-pointer" onClick={() => setViewMode('snapshot')}>
            <Camera className="h-3 w-3 mr-1" /> Snapshot
          </Badge>
          <Badge variant={viewMode === 'simulation' ? 'default' : 'outline'}
            className="cursor-pointer" onClick={() => setViewMode('simulation')}>
            <Eye className="h-3 w-3 mr-1" /> Simulation
          </Badge>
          <DomainProvenanceHeader
            provenance="demo"
            sourceName="sovereignDataCenter/mockData"
            ariaContext="Thermal domain data provenance"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAirflow(!showAirflow)}>
          {showAirflow ? 'Hide' : 'Show'} Airflow
        </Button>
      </div>

      {/* KPI Strip with sparklines */}
      <ThermalKPIs facility={facility} />

      {/* Thermal Heatmap */}
      <CollapsibleSection title="Rack Thermal Map" badge={`${filteredRacks.length} racks`}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/50">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {THERMAL_FILTERS.map(f => (
            <Button key={f.key} size="sm" variant={activeFilter === f.key ? 'default' : 'outline'}
              className={`h-7 text-xs ${activeFilter !== f.key && f.color ? f.color : ''}`}
              onClick={() => setActiveFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
        
        {/* Heatmap Grid */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(10, Math.ceil(Math.sqrt(filteredRacks.length)))}, 1fr)` }}>
          {filteredRacks.map(rack => (
            <ThermalHeatmapTile key={rack.id} rack={rack} showAirflow={showAirflow} />
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-emerald-500" /><span>&lt;22°C</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-yellow-500" /><span>22-26°C</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-orange-500" /><span>26-30°C</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-red-500" /><span>&gt;30°C</span></div>
        </div>
      </CollapsibleSection>

      {/* Playback Timeline */}
      <ThermalPlayback facility={facility} isSimulationMode={viewMode === 'simulation'} />

      {/* Two-column layout for panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <CoolingCorrelationPanel facility={facility} />
          <CoolingUnitsPanel facility={facility} />
          <ThermalInsightsPanel facility={facility} />
        </div>
        <div className="space-y-6">
          <ThermalForecastPanel facility={facility} />
        </div>
      </div>

      {/* Enhanced Rack Table */}
      <CollapsibleSection title="Rack Details" badge={`${racksWithAisle.length} racks`}>
        <EnhancedRackTable racks={racksWithAisle} />
      </CollapsibleSection>
    </div>
  );
}
