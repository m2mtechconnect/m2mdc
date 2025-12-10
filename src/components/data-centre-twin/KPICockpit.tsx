/**
 * KPI Cockpit - Central KPI display for Data Centre Twin
 * Uses Studio design system (light theme)
 * Now Blueprint-aware for KPI labels/units
 * Integrates Carbon and Financial engines for real-time metrics
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Thermometer, Zap, Wind, Network, Shield, Cpu, 
  Globe, DollarSign, Activity, TrendingUp, TrendingDown, Leaf
} from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { useBlueprintKPIs } from '@/hooks/useBlueprintKPIs';
import { useCarbonEngine } from '@/hooks/useCarbonEngine';
import { useFinancialEngine } from '@/hooks/useFinancialEngine';

interface KPICockpitProps {
  facility: DataCentreFacility;
  twinId?: string;
}

interface KPIData {
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  delta?: number;
}

// Studio-themed KPI Tile
function KPITile({ 
  label, 
  value, 
  unit, 
  status = 'normal',
  trend,
  delta,
  compact = false,
}: { 
  label: string;
  value: number | string;
  unit: string;
  status?: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  delta?: number;
  compact?: boolean;
}) {
  const statusColors = {
    normal: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono font-medium ${statusColors[status]}`}>
            {value}{unit}
          </span>
          {delta !== undefined && (
            <Badge variant="outline" className={`text-[10px] ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
              {delta >= 0 ? '+' : ''}{delta}%
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {TrendIcon && <TrendIcon className={`h-3 w-3 ${trend === 'up' ? 'text-success' : 'text-destructive'}`} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-bold font-mono ${statusColors[status]}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

// Studio-themed Domain Card
function DomainCard({ 
  title, 
  icon, 
  status,
  children 
}: { 
  title: string; 
  icon: React.ReactNode; 
  status: 'normal' | 'warning' | 'critical';
  children: React.ReactNode;
}) {
  const statusBorder = {
    normal: 'border-border hover:border-success/50',
    warning: 'border-warning/30 hover:border-warning/50',
    critical: 'border-destructive/30 hover:border-destructive/50',
  };

  return (
    <Card className={`bg-card transition-colors ${statusBorder[status]}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

export function KPICockpit({ facility, twinId = 'default' }: KPICockpitProps) {
  const kpis = calculateKPIs(facility);
  const { getKpiById, totalKpis } = useBlueprintKPIs(twinId);
  
  // Use real engine calculations
  const { metrics: carbonMetrics, regionalFeed } = useCarbonEngine(facility);
  const { metrics: financialMetrics } = useFinancialEngine(facility);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">KPI Cockpit</h2>
            {totalKpis > 0 && (
              <span className="text-xs text-muted-foreground">{totalKpis} KPIs from Blueprint</span>
            )}
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-xs text-success border-success/30">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          LIVE • {new Date().toLocaleTimeString()}
        </Badge>
      </div>
      
      {/* Domain KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DomainCard 
          title="Thermal Stability" 
          icon={<Thermometer className="h-4 w-4 text-primary" />}
          status={kpis.thermalStability.status}
        >
          <KPITile label="Stability Score" value={kpis.thermalStability.value} unit="%" status={kpis.thermalStability.status} delta={kpis.thermalStability.delta} compact />
          <KPITile label="Hotspot Risk" value={kpis.hotspotRisk.value} unit="%" status={kpis.hotspotRisk.status} compact />
        </DomainCard>
        
        <DomainCard 
          title="Power Reliability" 
          icon={<Zap className="h-4 w-4 text-primary" />}
          status={kpis.powerReliability.status}
        >
          <KPITile label="Reliability Score" value={kpis.powerReliability.value} unit="%" status={kpis.powerReliability.status} compact />
          <KPITile label="UPS Health" value={kpis.upsHealth.value} unit="%" status={kpis.upsHealth.status} delta={kpis.upsHealth.delta} compact />
        </DomainCard>
        
        <DomainCard 
          title="Cooling Efficiency" 
          icon={<Wind className="h-4 w-4 text-primary" />}
          status={kpis.coolingEfficiency.status}
        >
          <KPITile label="Efficiency Index" value={kpis.coolingEfficiency.value} unit="%" status={kpis.coolingEfficiency.status} delta={kpis.coolingEfficiency.delta} compact />
          <KPITile label="PUE" value={kpis.pue.value.toFixed(2)} unit="" status={kpis.pue.status} compact />
        </DomainCard>
        
        <DomainCard 
          title="Network Health" 
          icon={<Network className="h-4 w-4 text-primary" />}
          status={kpis.networkIntegrity.status}
        >
          <KPITile label="Integrity Score" value={kpis.networkIntegrity.value} unit="%" status={kpis.networkIntegrity.status} compact />
          <KPITile label="Fabric Saturation" value={kpis.fabricSaturation.value} unit="%" status={kpis.fabricSaturation.status} delta={kpis.fabricSaturation.delta} compact />
        </DomainCard>
        
        <DomainCard 
          title="Facility Safety" 
          icon={<Shield className="h-4 w-4 text-primary" />}
          status={kpis.environmentalSafety.status}
        >
          <KPITile label="Safety Score" value={kpis.environmentalSafety.value} unit="%" status={kpis.environmentalSafety.status} compact />
          <KPITile label="Early Warning" value={kpis.earlyWarning.value} unit="%" status={kpis.earlyWarning.status} compact />
        </DomainCard>
        
        <DomainCard 
          title="Workload Performance" 
          icon={<Cpu className="h-4 w-4 text-primary" />}
          status={kpis.gpuUtilization.status}
        >
          <KPITile label="GPU Utilization" value={kpis.gpuUtilization.value} unit="%" status={kpis.gpuUtilization.status} delta={kpis.gpuUtilization.delta} compact />
          <KPITile label="Queue Efficiency" value={kpis.queueEfficiency.value} unit="%" status={kpis.queueEfficiency.status} compact />
        </DomainCard>
        
        <DomainCard 
          title="Data Sovereignty" 
          icon={<Globe className="h-4 w-4 text-primary" />}
          status={kpis.sovereigntyRisk.status}
        >
          <KPITile label="Risk Score" value={kpis.sovereigntyRisk.value} unit="%" status={kpis.sovereigntyRisk.status} compact />
          <KPITile label="Compliance" value={kpis.complianceScore.value} unit="%" status={kpis.complianceScore.status} compact />
        </DomainCard>
        
        <DomainCard 
          title="Financial Health" 
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          status={financialMetrics.financialHealthScore > 70 ? 'normal' : financialMetrics.financialHealthScore > 50 ? 'warning' : 'critical'}
        >
          <KPITile 
            label="Cost/GPU-hr" 
            value={`$${financialMetrics.costPerGpuHour.toFixed(2)}`} 
            unit="" 
            status={financialMetrics.costPerGpuHour < 3 ? 'normal' : financialMetrics.costPerGpuHour < 5 ? 'warning' : 'critical'} 
            delta={-2.1} 
            compact 
          />
          <KPITile 
            label="Financial Health" 
            value={financialMetrics.financialHealthScore.toFixed(0)} 
            unit="%" 
            status={financialMetrics.financialHealthScore > 70 ? 'normal' : financialMetrics.financialHealthScore > 50 ? 'warning' : 'critical'} 
            compact 
          />
        </DomainCard>
        
        <DomainCard 
          title="Carbon & Sustainability" 
          icon={<Leaf className="h-4 w-4 text-primary" />}
          status={carbonMetrics.carbonEfficiencyScore > 70 ? 'normal' : carbonMetrics.carbonEfficiencyScore > 50 ? 'warning' : 'critical'}
        >
          <KPITile 
            label="Carbon Efficiency" 
            value={carbonMetrics.carbonEfficiencyScore.toFixed(0)} 
            unit="%" 
            status={carbonMetrics.carbonEfficiencyScore > 70 ? 'normal' : carbonMetrics.carbonEfficiencyScore > 50 ? 'warning' : 'critical'} 
            delta={3.2} 
            compact 
          />
          <KPITile 
            label="Emissions/Day" 
            value={carbonMetrics.dailyEmissionsKg.toFixed(0)} 
            unit=" kg" 
            status={carbonMetrics.dailyEmissionsKg < 5000 ? 'normal' : carbonMetrics.dailyEmissionsKg < 15000 ? 'warning' : 'critical'} 
            compact 
          />
        </DomainCard>
      </div>
    </div>
  );
}

function calculateKPIs(facility: DataCentreFacility): Record<string, KPIData> {
  const thermalTwin = facility.thermalHardware;
  const powerTwin = facility.powerUps;
  const coolingTwin = facility.cooling;
  const networkTwin = facility.network;
  const workloadTwin = facility.workloadGpu;
  const sovereigntyTwin = facility.sovereignty;
  const facilityTwin = facility.facilitySafety;
  
  return {
    thermalStability: { 
      value: thermalTwin.kpis.thermalStabilityScore, 
      unit: '%', 
      status: thermalTwin.kpis.thermalStabilityScore > 80 ? 'normal' : thermalTwin.kpis.thermalStabilityScore > 60 ? 'warning' : 'critical', 
      trend: 'stable',
      delta: 1.2
    },
    hotspotRisk: { 
      value: thermalTwin.kpis.hotspotRiskProbability, 
      unit: '%', 
      status: thermalTwin.kpis.hotspotRiskProbability < 10 ? 'normal' : thermalTwin.kpis.hotspotRiskProbability < 25 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    powerReliability: { 
      value: powerTwin.kpis.powerReliabilityScore, 
      unit: '%', 
      status: powerTwin.kpis.powerReliabilityScore > 95 ? 'normal' : powerTwin.kpis.powerReliabilityScore > 85 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    upsHealth: { 
      value: powerTwin.kpis.upsHealthIndex, 
      unit: '%', 
      status: powerTwin.kpis.upsHealthIndex > 80 ? 'normal' : powerTwin.kpis.upsHealthIndex > 60 ? 'warning' : 'critical', 
      trend: 'down',
      delta: -2.1
    },
    coolingEfficiency: { 
      value: coolingTwin.kpis.coolingEfficiencyIndex, 
      unit: '%', 
      status: coolingTwin.kpis.coolingEfficiencyIndex > 70 ? 'normal' : coolingTwin.kpis.coolingEfficiencyIndex > 50 ? 'warning' : 'critical', 
      trend: 'up',
      delta: 3.4
    },
    pue: { 
      value: facility.pue, 
      unit: '', 
      status: facility.pue < 1.4 ? 'normal' : facility.pue < 1.6 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    networkIntegrity: { 
      value: networkTwin.kpis.networkIntegrityScore, 
      unit: '%', 
      status: networkTwin.kpis.networkIntegrityScore > 80 ? 'normal' : networkTwin.kpis.networkIntegrityScore > 60 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    fabricSaturation: { 
      value: networkTwin.kpis.fabricSaturationIndex, 
      unit: '%', 
      status: networkTwin.kpis.fabricSaturationIndex < 60 ? 'normal' : networkTwin.kpis.fabricSaturationIndex < 80 ? 'warning' : 'critical', 
      trend: 'up',
      delta: 4.2
    },
    environmentalSafety: { 
      value: facilityTwin.kpis.environmentalSafetyScore, 
      unit: '%', 
      status: facilityTwin.kpis.environmentalSafetyScore > 90 ? 'normal' : facilityTwin.kpis.environmentalSafetyScore > 70 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    earlyWarning: { 
      value: facilityTwin.kpis.earlyWarningIndex, 
      unit: '%', 
      status: facilityTwin.kpis.earlyWarningIndex > 90 ? 'normal' : facilityTwin.kpis.earlyWarningIndex > 70 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    gpuUtilization: { 
      value: workloadTwin.kpis.avgGpuUtilization, 
      unit: '%', 
      status: workloadTwin.kpis.avgGpuUtilization > 70 ? 'normal' : workloadTwin.kpis.avgGpuUtilization > 50 ? 'warning' : 'critical', 
      trend: 'up',
      delta: 5.8
    },
    queueEfficiency: { 
      value: 100 - Math.min(workloadTwin.kpis.avgQueueTimeMinutes, 100), 
      unit: '%', 
      status: (100 - Math.min(workloadTwin.kpis.avgQueueTimeMinutes, 100)) > 80 ? 'normal' : 'warning', 
      trend: 'stable' 
    },
    sovereigntyRisk: { 
      value: sovereigntyTwin.kpis.sovereigntyRiskScore, 
      unit: '%', 
      status: sovereigntyTwin.kpis.sovereigntyRiskScore < 10 ? 'normal' : sovereigntyTwin.kpis.sovereigntyRiskScore < 30 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    complianceScore: { 
      value: sovereigntyTwin.kpis.policyComplianceRate, 
      unit: '%', 
      status: sovereigntyTwin.kpis.policyComplianceRate > 90 ? 'normal' : sovereigntyTwin.kpis.policyComplianceRate > 75 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    costPerGpuHour: { 
      value: workloadTwin.kpis.costPerGpuHour, 
      unit: '$', 
      status: workloadTwin.kpis.costPerGpuHour < 3 ? 'normal' : workloadTwin.kpis.costPerGpuHour < 5 ? 'warning' : 'critical', 
      trend: 'down',
      delta: -0.15
    },
    carbonEfficiency: { 
      value: Math.max(0, 100 - (facility.carbonIntensityGCo2Kwh / 5)), 
      unit: '%', 
      status: Math.max(0, 100 - (facility.carbonIntensityGCo2Kwh / 5)) > 80 ? 'normal' : 'warning', 
      trend: 'up',
      delta: 2.3
    },
  };
}
