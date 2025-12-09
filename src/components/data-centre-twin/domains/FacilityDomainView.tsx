/**
 * Facility & Safety Domain View
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Droplets, Wind, Flame, AlertTriangle, CheckCircle } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface FacilityDomainViewProps {
  facility: DataCentreFacility;
}

export function FacilityDomainView({ facility }: FacilityDomainViewProps) {
  const facilityTwin = facility.facilitySafety;
  const triggeredSensors = facilityTwin.safetySensors.filter(s => s.triggered);
  
  return (
    <div className="space-y-6">
      {/* Safety Score */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Safety Score"
          value={`${facilityTwin.kpis.environmentalSafetyScore.toFixed(0)}%`}
          status={facilityTwin.kpis.environmentalSafetyScore > 90 ? 'good' : 'warning'}
          icon={Shield}
        />
        <MetricCard
          title="Water Leak Status"
          value={`${triggeredSensors.filter(s => s.type === 'water_leak').length}/${facilityTwin.safetySensors.filter(s => s.type === 'water_leak').length}`}
          subtitle="sensors clear"
          status={triggeredSensors.filter(s => s.type === 'water_leak').length === 0 ? 'good' : 'critical'}
          icon={Droplets}
        />
        <MetricCard
          title="Air Quality"
          value={`${facilityTwin.kpis.airQualityIndex.toFixed(0)}`}
          status={facilityTwin.kpis.airQualityIndex < 50 ? 'good' : 'warning'}
          icon={Wind}
        />
        <MetricCard
          title="Fire Suppression"
          value={`${facilityTwin.fireSuppressionSystems.filter(s => s.status === 'armed').length}/${facilityTwin.fireSuppressionSystems.length}`}
          subtitle="systems armed"
          status="good"
          icon={Flame}
        />
      </div>

      {/* Environmental Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environmental Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {facilityTwin.environmentalZones.map((zone) => (
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
        </CardContent>
      </Card>

      {/* Safety Sensors */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Safety Sensors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {facilityTwin.safetySensors.slice(0, 16).map((sensor) => (
                <div 
                  key={sensor.id}
                  className={`aspect-square rounded-lg ${sensor.triggered ? 'bg-destructive/20 border-destructive/40' : 'bg-green-500/20 border-green-500/40'} border flex items-center justify-center`}
                  title={`${sensor.type}: ${sensor.triggered ? 'ALARM' : 'OK'}`}
                >
                  {sensor.triggered ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {facilityTwin.safetySensors.length - triggeredSensors.length} sensors operational • {triggeredSensors.length} alarms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Fire Suppression
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

function MetricCard({ title, value, subtitle, status, icon: Icon }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-destructive';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${getStatusColor()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold ${getStatusColor()}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
