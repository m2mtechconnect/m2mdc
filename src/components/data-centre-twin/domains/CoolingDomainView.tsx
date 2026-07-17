/**
 * Cooling Domain View - CRAC/CRAH monitoring
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Wind, Thermometer, Droplets, Gauge, Filter } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { SummaryCard } from '@/components/shared/SummaryCard';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

import { DomainProvenanceHeader } from '@/components/provenance/DomainProvenanceHeader';

interface CoolingDomainViewProps {
  facility: DataCentreFacility;
}

type ZoneStatus = 'all' | 'normal' | 'warning';

export function CoolingDomainView({ facility }: CoolingDomainViewProps) {
  const [statusFilter, setStatusFilter] = useState<ZoneStatus>('all');
  
  const coolingZones = facility.cooling.zones;
  const filteredZones = coolingZones.filter(z => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'normal') return z.status === 'normal';
    if (statusFilter === 'warning') return z.status !== 'normal';
    return true;
  });
  
  const avgSupplyTemp = coolingZones.length > 0 
    ? coolingZones.reduce((acc, z) => acc + z.ambientTempC, 0) / coolingZones.length
    : 0;
  const avgReturnTemp = coolingZones.length > 0
    ? coolingZones.reduce((acc, z) => acc + z.ambientTempC + 10, 0) / coolingZones.length
    : 0;
  const avgHumidity = coolingZones.length > 0
    ? coolingZones.reduce((acc, z) => acc + z.humidityPct, 0) / coolingZones.length
    : 0;
  
  const statusCounts = {
    all: coolingZones.length,
    normal: coolingZones.filter(z => z.status === 'normal').length,
    warning: coolingZones.filter(z => z.status !== 'normal').length,
  };
  
  return (
    <div className="space-y-6" data-provenance="demo" data-testid="cooling-domain-view">
      <DomainProvenanceHeader provenance="demo" sourceName="sovereignDataCenter/mockData" ariaContext="Cooling domain data provenance" />
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="PUE"
          value={facility.pue.toFixed(2)}
          status={facility.pue < 1.4 ? 'good' : facility.pue < 1.6 ? 'warning' : 'critical'}
          icon={Gauge}
        />
        <SummaryCard
          title="Supply Air"
          value={`${avgSupplyTemp.toFixed(1)}°C`}
          status={avgSupplyTemp < 18 ? 'good' : avgSupplyTemp < 22 ? 'warning' : 'critical'}
          icon={Thermometer}
        />
        <SummaryCard
          title="Return Air"
          value={`${avgReturnTemp.toFixed(1)}°C`}
          status="good"
          icon={Thermometer}
        />
        <SummaryCard
          title="Humidity"
          value={`${avgHumidity.toFixed(0)}%`}
          status={avgHumidity > 40 && avgHumidity < 60 ? 'good' : 'warning'}
          icon={Droplets}
        />
      </div>

      {/* Cooling Zones Grid */}
      <CollapsibleSection title="Cooling Zones" badge={`${filteredZones.length} zones`}>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="flex gap-1">
            {[
              { key: 'all' as const, label: 'All', color: '' },
              { key: 'normal' as const, label: 'Normal', color: 'border-emerald-500/30 text-emerald-500' },
              { key: 'warning' as const, label: 'Warning', color: 'border-amber-500/30 text-amber-500' },
            ].map(({ key, label, color }) => (
              <Button
                key={key}
                variant={statusFilter === key ? 'default' : 'outline'}
                size="sm"
                className={`h-7 text-xs ${statusFilter !== key && color ? color : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {label}
                <span className="ml-1 opacity-70">({statusCounts[key]})</span>
              </Button>
            ))}
            </div>
          </div>
        </div>
        
        {filteredZones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No zones match the current filter
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {filteredZones.map((zone) => (
              <div key={zone.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{zone.name}</span>
                  <Badge variant={zone.status === 'normal' ? 'default' : 'secondary'}>
                    {zone.units.length} Units
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-500" />
                      <span className="text-xs">Ambient</span>
                    </div>
                    <span className="text-sm font-medium">{zone.ambientTempC.toFixed(1)}°C</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span className="text-xs">Target</span>
                    </div>
                    <span className="text-sm font-medium">{zone.targetTempC.toFixed(1)}°C</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-cyan-500" />
                      <span className="text-xs">Humidity</span>
                    </div>
                    <span className="text-sm font-medium">{zone.humidityPct.toFixed(0)}%</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Airflow</span>
                      <span>{zone.airflowCfm.toFixed(0)} CFM</span>
                    </div>
                    <Progress value={Math.min((zone.airflowCfm / 5000) * 100, 100)} className="h-1.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Efficiency Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <CollapsibleSection title="Cooling Efficiency">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Cooling Efficiency</span>
                <span className="font-medium">{facility.cooling.kpis.coolingEfficiencyIndex.toFixed(0)}%</span>
              </div>
              <Progress value={facility.cooling.kpis.coolingEfficiencyIndex} className="h-3" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Cooling Cost/kW</p>
                <p className="text-lg font-bold">${facility.cooling.kpis.coolingCostPerKw.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Cooling Load</p>
                <p className="text-lg font-bold">{facility.cooling.kpis.activeCoolingLoadKw.toFixed(0)} kW</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Environmental Targets">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">ASHRAE A1 Compliance</p>
                <p className="text-xs text-muted-foreground">18-27°C, 20-80% RH</p>
              </div>
              <Badge variant="default">Compliant</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">Hot Aisle Containment</p>
                <p className="text-xs text-muted-foreground">Isolated return air</p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
