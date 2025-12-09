/**
 * KPI Cockpit - Central KPI display for Data Centre Twin
 * Shows all domain KPIs with drill-down capability
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Thermometer, Zap, Wind, Network, Shield, Cpu, 
  Globe, DollarSign, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import type { DataCentreFacility, KPIValue } from '@/types/dataCenterTwin';

interface KPICockpitProps {
  facility: DataCentreFacility;
}

export function KPICockpit({ facility }: KPICockpitProps) {
  // Calculate KPIs from facility data
  const kpis = calculateKPIs(facility);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">KPI Cockpit</h2>
        <Badge variant="outline" className="font-mono">
          Live • Updated {new Date().toLocaleTimeString()}
        </Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Thermal KPIs */}
        <KPICard
          title="Thermal Stability"
          icon={Thermometer}
          iconColor="text-red-500"
          kpis={[
            { name: 'Stability Score', ...kpis.thermalStability },
            { name: 'Hotspot Risk', ...kpis.hotspotRisk },
          ]}
        />
        
        {/* Power KPIs */}
        <KPICard
          title="Power Reliability"
          icon={Zap}
          iconColor="text-yellow-500"
          kpis={[
            { name: 'Reliability Score', ...kpis.powerReliability },
            { name: 'UPS Health', ...kpis.upsHealth },
          ]}
        />
        
        {/* Cooling KPIs */}
        <KPICard
          title="Cooling Efficiency"
          icon={Wind}
          iconColor="text-blue-500"
          kpis={[
            { name: 'Efficiency Index', ...kpis.coolingEfficiency },
            { name: 'PUE', ...kpis.pue },
          ]}
        />
        
        {/* Network KPIs */}
        <KPICard
          title="Network Health"
          icon={Network}
          iconColor="text-purple-500"
          kpis={[
            { name: 'Integrity Score', ...kpis.networkIntegrity },
            { name: 'Fabric Saturation', ...kpis.fabricSaturation },
          ]}
        />
        
        {/* Facility KPIs */}
        <KPICard
          title="Facility Safety"
          icon={Shield}
          iconColor="text-green-500"
          kpis={[
            { name: 'Safety Score', ...kpis.environmentalSafety },
            { name: 'Early Warning', ...kpis.earlyWarning },
          ]}
        />
        
        {/* Workload KPIs */}
        <KPICard
          title="Workload Performance"
          icon={Cpu}
          iconColor="text-orange-500"
          kpis={[
            { name: 'GPU Utilization', ...kpis.gpuUtilization },
            { name: 'Queue Efficiency', ...kpis.queueEfficiency },
          ]}
        />
        
        {/* Sovereignty KPIs */}
        <KPICard
          title="Data Sovereignty"
          icon={Globe}
          iconColor="text-cyan-500"
          kpis={[
            { name: 'Risk Score', ...kpis.sovereigntyRisk },
            { name: 'Compliance', ...kpis.complianceScore },
          ]}
        />
        
        {/* Financial KPIs */}
        <KPICard
          title="Financial Health"
          icon={DollarSign}
          iconColor="text-emerald-500"
          kpis={[
            { name: 'Cost/GPU-hr', ...kpis.costPerGpuHour },
            { name: 'Carbon Efficiency', ...kpis.carbonEfficiency },
          ]}
        />
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  kpis: Array<{ name: string; value: number; unit: string; status: 'good' | 'warning' | 'critical'; trend: 'up' | 'down' | 'stable' }>;
}

function KPICard({ title, icon: Icon, iconColor, kpis }: KPICardProps) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{kpi.name}</span>
              <div className="flex items-center gap-1">
                {kpi.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                {kpi.trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
                {kpi.trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getStatusColor(kpi.status)}`}>
                {kpi.value.toFixed(kpi.unit === '%' ? 0 : 2)}{kpi.unit}
              </span>
            </div>
            <Progress 
              value={Math.min(kpi.value, 100)} 
              className="h-1.5"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: 'good' | 'warning' | 'critical'): string {
  switch (status) {
    case 'good': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'critical': return 'text-destructive';
  }
}

function calculateKPIs(facility: DataCentreFacility): Record<string, KPIValue> {
  // Calculate thermal KPIs
  const avgTemp = facility.racks.reduce((acc, r) => acc + r.avgInletTempC, 0) / facility.racks.length;
  const thermalStability = Math.max(0, 100 - (Math.abs(avgTemp - 22) * 5));
  const hotspotRisk = facility.racks.filter(r => r.avgInletTempC > 27).length / facility.racks.length * 100;
  
  // Calculate power KPIs
  const powerUtilization = (facility.currentPowerDrawKw / facility.totalPowerCapacityKw) * 100;
  const powerReliability = powerUtilization < 80 ? 98 : powerUtilization < 90 ? 85 : 70;
  const upsHealth = facility.upsBanks.reduce((acc, u) => acc + u.batteryHealthPercent, 0) / facility.upsBanks.length;
  
  // Calculate cooling KPIs
  const coolingEfficiency = Math.max(0, 100 - ((facility.pue - 1) * 100));
  
  // Calculate network KPIs
  const networkIntegrity = facility.networkSwitches.reduce((acc, s) => acc + (100 - s.portUtilizationPercent), 0) / facility.networkSwitches.length;
  const fabricSaturation = facility.networkSwitches.reduce((acc, s) => acc + s.portUtilizationPercent, 0) / facility.networkSwitches.length;
  
  // Calculate GPU/workload KPIs
  const gpuUtilization = facility.gpuClusters.reduce((acc, c) => acc + c.utilizationPercent, 0) / facility.gpuClusters.length;
  const queueEfficiency = 100 - (facility.gpuClusters.reduce((acc, c) => acc + c.queueDepth, 0) / facility.gpuClusters.length * 10);
  
  // Calculate sovereignty KPIs (from facility metadata)
  const sovereigntyRisk = facility.jurisdictions?.length > 1 ? 25 : 5;
  const complianceScore = 95;
  
  // Calculate financial KPIs
  const costPerGpuHour = facility.costPerKwh * facility.pue * 0.5; // Simplified calculation
  const carbonEfficiency = Math.max(0, 100 - (facility.carbonIntensityGCo2Kwh / 5));
  
  return {
    thermalStability: { value: thermalStability, unit: '%', status: thermalStability > 80 ? 'good' : thermalStability > 60 ? 'warning' : 'critical', trend: 'stable' },
    hotspotRisk: { value: hotspotRisk, unit: '%', status: hotspotRisk < 10 ? 'good' : hotspotRisk < 25 ? 'warning' : 'critical', trend: 'stable' },
    powerReliability: { value: powerReliability, unit: '%', status: powerReliability > 95 ? 'good' : powerReliability > 85 ? 'warning' : 'critical', trend: 'stable' },
    upsHealth: { value: upsHealth, unit: '%', status: upsHealth > 80 ? 'good' : upsHealth > 60 ? 'warning' : 'critical', trend: 'down' },
    coolingEfficiency: { value: coolingEfficiency, unit: '%', status: coolingEfficiency > 70 ? 'good' : coolingEfficiency > 50 ? 'warning' : 'critical', trend: 'up' },
    pue: { value: facility.pue, unit: '', status: facility.pue < 1.4 ? 'good' : facility.pue < 1.6 ? 'warning' : 'critical', trend: 'stable' },
    networkIntegrity: { value: networkIntegrity, unit: '%', status: networkIntegrity > 80 ? 'good' : networkIntegrity > 60 ? 'warning' : 'critical', trend: 'stable' },
    fabricSaturation: { value: fabricSaturation, unit: '%', status: fabricSaturation < 60 ? 'good' : fabricSaturation < 80 ? 'warning' : 'critical', trend: 'up' },
    environmentalSafety: { value: 96, unit: '%', status: 'good', trend: 'stable' },
    earlyWarning: { value: 98, unit: '%', status: 'good', trend: 'stable' },
    gpuUtilization: { value: gpuUtilization, unit: '%', status: gpuUtilization > 70 ? 'good' : gpuUtilization > 50 ? 'warning' : 'critical', trend: 'up' },
    queueEfficiency: { value: queueEfficiency, unit: '%', status: queueEfficiency > 80 ? 'good' : queueEfficiency > 60 ? 'warning' : 'critical', trend: 'stable' },
    sovereigntyRisk: { value: sovereigntyRisk, unit: '%', status: sovereigntyRisk < 10 ? 'good' : sovereigntyRisk < 30 ? 'warning' : 'critical', trend: 'stable' },
    complianceScore: { value: complianceScore, unit: '%', status: complianceScore > 90 ? 'good' : complianceScore > 75 ? 'warning' : 'critical', trend: 'stable' },
    costPerGpuHour: { value: costPerGpuHour, unit: '$', status: costPerGpuHour < 0.5 ? 'good' : costPerGpuHour < 1 ? 'warning' : 'critical', trend: 'down' },
    carbonEfficiency: { value: carbonEfficiency, unit: '%', status: carbonEfficiency > 80 ? 'good' : carbonEfficiency > 60 ? 'warning' : 'critical', trend: 'up' },
  };
}
