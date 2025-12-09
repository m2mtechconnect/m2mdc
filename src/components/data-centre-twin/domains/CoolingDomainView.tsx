/**
 * Cooling Domain View - CRAC/CRAH monitoring
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wind, Thermometer, Droplets, Gauge } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface CoolingDomainViewProps {
  facility: DataCentreFacility;
}

export function CoolingDomainView({ facility }: CoolingDomainViewProps) {
  const avgSupplyTemp = facility.coolingZones.reduce((acc, z) => acc + z.supplyAirTempC, 0) / facility.coolingZones.length;
  const avgReturnTemp = facility.coolingZones.reduce((acc, z) => acc + z.returnAirTempC, 0) / facility.coolingZones.length;
  const avgHumidity = facility.coolingZones.reduce((acc, z) => acc + z.humidityPercent, 0) / facility.coolingZones.length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="PUE"
          value={facility.pue.toFixed(2)}
          status={facility.pue < 1.4 ? 'good' : facility.pue < 1.6 ? 'warning' : 'critical'}
          icon={Gauge}
        />
        <MetricCard
          title="Supply Air"
          value={`${avgSupplyTemp.toFixed(1)}°C`}
          status={avgSupplyTemp < 18 ? 'good' : avgSupplyTemp < 22 ? 'warning' : 'critical'}
          icon={Thermometer}
        />
        <MetricCard
          title="Return Air"
          value={`${avgReturnTemp.toFixed(1)}°C`}
          status="good"
          icon={Thermometer}
        />
        <MetricCard
          title="Humidity"
          value={`${avgHumidity.toFixed(0)}%`}
          status={avgHumidity > 40 && avgHumidity < 60 ? 'good' : 'warning'}
          icon={Droplets}
        />
      </div>

      {/* Cooling Zones Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cooling Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {facility.coolingZones.map((zone) => (
              <div key={zone.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{zone.id}</span>
                  <Badge variant={zone.status === 'operational' ? 'default' : 'secondary'}>
                    {zone.cracUnits} CRACs
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-500" />
                      <span className="text-xs">Supply</span>
                    </div>
                    <span className="text-sm font-medium">{zone.supplyAirTempC.toFixed(1)}°C</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span className="text-xs">Return</span>
                    </div>
                    <span className="text-sm font-medium">{zone.returnAirTempC.toFixed(1)}°C</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-cyan-500" />
                      <span className="text-xs">Humidity</span>
                    </div>
                    <span className="text-sm font-medium">{zone.humidityPercent.toFixed(0)}%</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>ΔT</span>
                      <span>{(zone.returnAirTempC - zone.supplyAirTempC).toFixed(1)}°C</span>
                    </div>
                    <Progress 
                      value={Math.min(((zone.returnAirTempC - zone.supplyAirTempC) / 15) * 100, 100)} 
                      className="h-1.5" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cooling Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Cooling Efficiency</span>
                  <span className="font-medium">{Math.round((1 - (facility.pue - 1)) * 100)}%</span>
                </div>
                <Progress value={Math.round((1 - (facility.pue - 1)) * 100)} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Cooling Cost/kW IT</p>
                  <p className="text-lg font-bold">${((facility.pue - 1) * facility.costPerKwh).toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cooling Load</p>
                  <p className="text-lg font-bold">{Math.round(facility.currentPowerDrawKw * (facility.pue - 1))} kW</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environmental Targets</CardTitle>
          </CardHeader>
          <CardContent>
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
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Free Cooling Hours</p>
                  <p className="text-xs text-muted-foreground">Last 24h</p>
                </div>
                <span className="text-lg font-bold">8.5h</span>
              </div>
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
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

function MetricCard({ title, value, status, icon: Icon }: MetricCardProps) {
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
