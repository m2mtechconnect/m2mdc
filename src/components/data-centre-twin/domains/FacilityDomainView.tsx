/**
 * Facility & Safety Domain View
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Shield, Droplets, Wind, Flame, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { SummaryCard } from '@/components/shared/SummaryCard';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface FacilityDomainViewProps {
  facility: DataCentreFacility;
}

type ZoneType = 'all' | 'server_hall' | 'electrical' | 'mechanical' | 'office' | 'loading';

export function FacilityDomainView({ facility }: FacilityDomainViewProps) {
  const [zoneFilter, setZoneFilter] = useState<ZoneType>('all');
  
  const facilityTwin = facility.facilitySafety;
  const triggeredSensors = facilityTwin.safetySensors.filter(s => s.triggered);
  
  const filteredZones = facilityTwin.environmentalZones.filter(z => {
    if (zoneFilter === 'all') return true;
    return z.type === zoneFilter;
  });
  
  const zoneCounts: Record<ZoneType, number> = {
    all: facilityTwin.environmentalZones.length,
    server_hall: facilityTwin.environmentalZones.filter(z => z.type === 'server_hall').length,
    electrical: facilityTwin.environmentalZones.filter(z => z.type === 'electrical').length,
    mechanical: facilityTwin.environmentalZones.filter(z => z.type === 'mechanical').length,
    office: facilityTwin.environmentalZones.filter(z => z.type === 'office').length,
    loading: facilityTwin.environmentalZones.filter(z => z.type === 'loading').length,
  };
  
  return (
    <div className="space-y-6">
      {/* Safety Score */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Safety Score"
          value={`${facilityTwin.kpis.environmentalSafetyScore.toFixed(0)}%`}
          status={facilityTwin.kpis.environmentalSafetyScore > 90 ? 'good' : 'warning'}
          icon={Shield}
        />
        <SummaryCard
          title="Water Leak Status"
          value={`${triggeredSensors.filter(s => s.type === 'water_leak').length}/${facilityTwin.safetySensors.filter(s => s.type === 'water_leak').length}`}
          subtitle="sensors clear"
          status={triggeredSensors.filter(s => s.type === 'water_leak').length === 0 ? 'good' : 'critical'}
          icon={Droplets}
        />
        <SummaryCard
          title="Air Quality"
          value={`${facilityTwin.kpis.airQualityIndex.toFixed(0)}`}
          status={facilityTwin.kpis.airQualityIndex < 50 ? 'good' : 'warning'}
          icon={Wind}
        />
        <SummaryCard
          title="Fire Suppression"
          value={`${facilityTwin.fireSuppressionSystems.filter(s => s.status === 'armed').length}/${facilityTwin.fireSuppressionSystems.length}`}
          subtitle="systems armed"
          status="good"
          icon={Flame}
        />
      </div>

      {/* Environmental Zones */}
      <CollapsibleSection title="Environmental Zones" badge={`${filteredZones.length} zones`}>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Type:</span>
            <div className="flex gap-1 flex-wrap">
            {[
              { key: 'all' as ZoneType, label: 'All' },
              { key: 'server_hall' as ZoneType, label: 'Server Hall' },
              { key: 'electrical' as ZoneType, label: 'Electrical' },
              { key: 'mechanical' as ZoneType, label: 'Mechanical' },
              { key: 'office' as ZoneType, label: 'Office' },
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={zoneFilter === key ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setZoneFilter(key)}
              >
                {label}
                <span className="ml-1 opacity-70">({zoneCounts[key]})</span>
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
                    {zone.type}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature</span>
                    <span>{zone.tempC.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Humidity</span>
                    <span>{zone.humidityPct.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PM2.5</span>
                    <span>{zone.pm25.toFixed(1)} µg/m³</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Safety Sensors */}
      <div className="grid gap-6 md:grid-cols-2">
        <CollapsibleSection title="Safety Sensors">
          <div className="grid grid-cols-4 gap-2">
            {facilityTwin.safetySensors.slice(0, 16).map((sensor) => (
              <div 
                key={sensor.id}
                className={`aspect-square rounded-lg ${sensor.triggered ? 'bg-destructive/20 border-destructive/40' : 'bg-emerald-500/20 border-emerald-500/40'} border flex items-center justify-center`}
                title={`${sensor.type}: ${sensor.triggered ? 'ALARM' : 'OK'}`}
              >
                {sensor.triggered ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {facilityTwin.safetySensors.length - triggeredSensors.length} sensors operational • {triggeredSensors.length} alarms
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Fire Suppression">
          <div className="space-y-3">
            {facilityTwin.fireSuppressionSystems.map((system) => (
              <div key={system.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{system.zone}</p>
                  <p className="text-xs text-muted-foreground">{system.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(system.tankPressurePsi / system.targetPressurePsi) * 100} className="w-16 h-2" />
                  <Badge variant={system.status === 'armed' ? 'default' : 'secondary'}>
                    {system.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
