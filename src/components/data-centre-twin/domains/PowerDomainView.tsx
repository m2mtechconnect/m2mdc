/**
 * Power Domain View - Power & UPS monitoring
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Zap, Battery, Activity, Filter } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { SummaryCard } from '@/components/shared/SummaryCard';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

import { DomainProvenanceHeader } from '@/components/provenance/DomainProvenanceHeader';
import { MetricProvenanceManifest } from '@/components/provenance/MetricProvenanceManifest';
import { POWER_METRICS } from './metricCatalogs';

interface PowerDomainViewProps {
  facility: DataCentreFacility;
}

type HealthFilter = 'all' | 'healthy' | 'degraded';

export function PowerDomainView({ facility }: PowerDomainViewProps) {
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  
  const totalPowerDraw = facility.currentPowerDrawKw;
  const powerCapacity = facility.totalPowerCapacityKw;
  const utilizationPercent = (totalPowerDraw / powerCapacity) * 100;
  
  const upsBanks = facility.powerUps.upsBanks;
  const filteredBanks = upsBanks.filter(u => {
    if (healthFilter === 'all') return true;
    if (healthFilter === 'healthy') return u.batteryHealthPct > 80;
    if (healthFilter === 'degraded') return u.batteryHealthPct <= 80;
    return true;
  });
  
  const avgUpsHealth = upsBanks.length > 0
    ? upsBanks.reduce((acc, u) => acc + u.batteryHealthPct, 0) / upsBanks.length
    : 0;
  
  const healthCounts = {
    all: upsBanks.length,
    healthy: upsBanks.filter(u => u.batteryHealthPct > 80).length,
    degraded: upsBanks.filter(u => u.batteryHealthPct <= 80).length,
  };
  
  return (
    <div className="space-y-6" data-provenance="demo" data-testid="power-domain-view">
      <DomainProvenanceHeader provenance="demo" sourceName="sovereignDataCenter/mockData" ariaContext="Power domain data provenance" />
      <MetricProvenanceManifest domain="power" metrics={POWER_METRICS} />
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Power Draw"
          value={`${totalPowerDraw.toLocaleString()} kW`}
          subtitle={`${utilizationPercent.toFixed(1)}% of capacity`}
          status={utilizationPercent < 70 ? 'good' : utilizationPercent < 85 ? 'warning' : 'critical'}
          icon={Zap}
        />
        <SummaryCard
          title="UPS Health"
          value={`${avgUpsHealth.toFixed(0)}%`}
          status={avgUpsHealth > 80 ? 'good' : avgUpsHealth > 60 ? 'warning' : 'critical'}
          icon={Battery}
        />
        <SummaryCard
          title="Redundancy"
          value={facility.powerUps.kpis.redundancyLevel}
          status={facility.powerUps.kpis.redundancyLevel === '2N' ? 'good' : 'warning'}
          icon={Activity}
        />
        <SummaryCard
          title="Power Buses"
          value={`${facility.powerUps.busways.length}`}
          subtitle="Active feeds"
          status="good"
          icon={Zap}
        />
      </div>

      {/* Power Chain Diagram */}
      <CollapsibleSection title="Power Distribution Chain">
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
          {/* Grid Input */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-2">
              <Zap className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-xs font-medium">Grid</p>
            <p className="text-xs text-muted-foreground">{powerCapacity} kW</p>
          </div>
          
          <div className="flex-1 h-1 bg-emerald-500 rounded" />
          
          {/* UPS Banks */}
          <div className="text-center">
            <div className="flex gap-2">
              {upsBanks.slice(0, 4).map((ups) => (
                <div 
                  key={ups.id}
                  className={`w-12 h-16 rounded-lg ${ups.batteryHealthPct > 80 ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-amber-500/20 border-amber-500/40'} border flex items-center justify-center`}
                >
                  <Battery className={`h-6 w-6 ${ups.batteryHealthPct > 80 ? 'text-emerald-500' : 'text-amber-500'}`} />
                </div>
              ))}
            </div>
            <p className="text-xs font-medium mt-2">UPS Banks</p>
            <p className="text-xs text-muted-foreground">{upsBanks.length} units</p>
          </div>
          
          <div className="flex-1 h-1 bg-blue-500 rounded" />
          
          {/* Racks */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mb-2">
              <span className="text-lg font-bold text-purple-500">{facility.totalRacks}</span>
            </div>
            <p className="text-xs font-medium">Racks</p>
            <p className="text-xs text-muted-foreground">{totalPowerDraw.toLocaleString()} kW</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* UPS Details */}
      <CollapsibleSection title="UPS Bank Status" badge={`${filteredBanks.length} banks`}>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Health:</span>
            <div className="flex gap-1">
            {[
              { key: 'all' as const, label: 'All', color: '' },
              { key: 'healthy' as const, label: 'Healthy (>80%)', color: 'border-emerald-500/30 text-emerald-500' },
              { key: 'degraded' as const, label: 'Degraded (≤80%)', color: 'border-amber-500/30 text-amber-500' },
            ].map(({ key, label, color }) => (
              <Button
                key={key}
                variant={healthFilter === key ? 'default' : 'outline'}
                size="sm"
                className={`h-7 text-xs ${healthFilter !== key && color ? color : ''}`}
                onClick={() => setHealthFilter(key)}
              >
                {label}
                <span className="ml-1 opacity-70">({healthCounts[key]})</span>
              </Button>
            ))}
            </div>
          </div>
        </div>
        
        {filteredBanks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No UPS banks match the current filter
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredBanks.map((ups) => (
              <div key={ups.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{ups.name}</span>
                  <Badge variant={ups.batteryHealthPct > 80 ? 'default' : 'secondary'}>
                    {ups.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Battery Health</span>
                      <span>{ups.batteryHealthPct}%</span>
                    </div>
                    <Progress value={ups.batteryHealthPct} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Load</span>
                      <span>{ups.loadPct}%</span>
                    </div>
                    <Progress value={ups.loadPct} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-3">
                    <div>Runtime: {ups.runtimeMinutes} min</div>
                    <div>Cycles: {ups.batteryCycles}</div>
                    <div>Capacity: {ups.capacityKva} kVA</div>
                    <div>Efficiency: {(ups.efficiency * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
