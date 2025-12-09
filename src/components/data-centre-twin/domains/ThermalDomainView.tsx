/**
 * Thermal Domain View - Hardware & thermal monitoring
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Thermometer, Cpu, Fan, AlertTriangle } from 'lucide-react';
import type { DataCentreFacility, RackThermal } from '@/types/dataCenterTwin';

interface ThermalDomainViewProps {
  facility: DataCentreFacility;
}

export function ThermalDomainView({ facility }: ThermalDomainViewProps) {
  const racks = facility.thermalHardware.racks;
  const hotRacks = racks.filter(r => r.outletTempC > 35);
  const avgTemp = racks.length > 0 
    ? racks.reduce((acc, r) => acc + r.inletTempC, 0) / racks.length
    : 0;
  
  // Get GPU temp from clusters
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
  
  // Get cooling delta from zones
  const coolingZones = facility.cooling.zones;
  const avgDeltaT = coolingZones.length > 0
    ? coolingZones.reduce((acc, z) => acc + (z.ambientTempC - z.targetTempC), 0) / coolingZones.length
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Avg Inlet Temp"
          value={`${avgTemp.toFixed(1)}°C`}
          status={avgTemp < 25 ? 'good' : avgTemp < 28 ? 'warning' : 'critical'}
          icon={Thermometer}
        />
        <MetricCard
          title="Hot Racks"
          value={`${hotRacks.length}`}
          subtitle={`of ${racks.length} total`}
          status={hotRacks.length === 0 ? 'good' : hotRacks.length < 3 ? 'warning' : 'critical'}
          icon={AlertTriangle}
        />
        <MetricCard
          title="GPU Temps"
          value={`${avgGpuTemp.toFixed(0)}°C`}
          status={avgGpuTemp < 75 ? 'good' : avgGpuTemp < 85 ? 'warning' : 'critical'}
          icon={Cpu}
        />
        <MetricCard
          title="Cooling Delta"
          value={`${Math.abs(avgDeltaT).toFixed(1)}°C`}
          status="good"
          icon={Fan}
        />
      </div>

      {/* Thermal Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rack Thermal Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(racks.length))}, 1fr)` }}>
            {racks.map((rack) => (
              <RackThermalTile key={rack.id} rack={rack} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>&lt;24°C</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500" />
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
        </CardContent>
      </Card>

      {/* Rack Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rack Details</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
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

interface RackThermalTileProps {
  rack: RackThermal;
}

function RackThermalTile({ rack }: RackThermalTileProps) {
  const getTempColor = (temp: number) => {
    if (temp < 24) return 'bg-green-500';
    if (temp < 27) return 'bg-yellow-500';
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
