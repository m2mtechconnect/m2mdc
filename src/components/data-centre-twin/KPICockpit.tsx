/**
 * KPI Cockpit - Central KPI display for Data Centre Twin
 * Enterprise NOC-style dashboard with drill-down capability
 * Uses DC UI components for consistent DCIM aesthetics
 */

import { Badge } from '@/components/ui/badge';
import { DCCard, DCKPITile } from '@/components/dc-ui';
import { 
  Thermometer, Zap, Wind, Network, Shield, Cpu, 
  Globe, DollarSign, Activity
} from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface KPICockpitProps {
  facility: DataCentreFacility;
}

interface KPIData {
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  delta?: number;
}

export function KPICockpit({ facility }: KPICockpitProps) {
  const kpis = calculateKPIs(facility);
  
  // Generate sparkline data helper
  const generateSparkline = (base: number, variance: number = 5) => {
    return Array.from({ length: 12 }, () => Math.max(0, Math.min(100, base + (Math.random() - 0.5) * variance)));
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-dc-primary/20">
            <Activity className="h-5 w-5 text-dc-primary" />
          </div>
          <h2 className="text-lg font-display font-semibold">KPI Cockpit</h2>
        </div>
        <Badge variant="outline" className="font-mono text-xs border-dc-success/30 text-dc-success animate-status-blink">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dc-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-dc-success"></span>
          </span>
          LIVE • {new Date().toLocaleTimeString()}
        </Badge>
      </div>
      
      {/* Domain KPI Cards - 4 column grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Thermal Domain */}
        <DCCard 
          title="Thermal Stability" 
          icon={<Thermometer className="h-4 w-4" />}
          status={kpis.thermalStability.status === 'normal' ? 'normal' : kpis.thermalStability.status}
          className="hover:border-dc-thermal/50 transition-colors"
        >
          <div className="space-y-3">
            <DCKPITile
              label="Stability Score"
              value={kpis.thermalStability.value}
              unit="%"
              status={kpis.thermalStability.status}
              trend={kpis.thermalStability.trend}
              delta={kpis.thermalStability.delta}
              sparklineData={generateSparkline(kpis.thermalStability.value)}
              thresholdValue={kpis.thermalStability.value}
              size="sm"
              compact
            />
            <DCKPITile
              label="Hotspot Risk"
              value={kpis.hotspotRisk.value}
              unit="%"
              status={kpis.hotspotRisk.status}
              trend={kpis.hotspotRisk.trend}
              sparklineData={generateSparkline(kpis.hotspotRisk.value, 8)}
              size="sm"
              compact
            />
          </div>
        </DCCard>
        
        {/* Power Domain */}
        <DCCard 
          title="Power Reliability" 
          icon={<Zap className="h-4 w-4" />}
          status={kpis.powerReliability.status === 'normal' ? 'normal' : kpis.powerReliability.status}
          className="hover:border-dc-power/50 transition-colors"
        >
          <div className="space-y-3">
            <DCKPITile
              label="Reliability Score"
              value={kpis.powerReliability.value}
              unit="%"
              status={kpis.powerReliability.status}
              trend={kpis.powerReliability.trend}
              sparklineData={generateSparkline(kpis.powerReliability.value, 3)}
              thresholdValue={kpis.powerReliability.value}
              size="sm"
              compact
            />
            <DCKPITile
              label="UPS Health"
              value={kpis.upsHealth.value}
              unit="%"
              status={kpis.upsHealth.status}
              trend={kpis.upsHealth.trend}
              delta={kpis.upsHealth.delta}
              sparklineData={generateSparkline(kpis.upsHealth.value, 5)}
              size="sm"
              compact
            />
          </div>
        </DCCard>
        
        {/* Cooling Domain */}
        <DCCard 
          title="Cooling Efficiency" 
          icon={<Wind className="h-4 w-4" />}
          status={kpis.coolingEfficiency.status === 'normal' ? 'normal' : kpis.coolingEfficiency.status}
          className="hover:border-dc-cooling/50 transition-colors"
        >
          <div className="space-y-3">
            <DCKPITile
              label="Efficiency Index"
              value={kpis.coolingEfficiency.value}
              unit="%"
              status={kpis.coolingEfficiency.status}
              trend={kpis.coolingEfficiency.trend}
              delta={kpis.coolingEfficiency.delta}
              sparklineData={generateSparkline(kpis.coolingEfficiency.value, 4)}
              thresholdValue={kpis.coolingEfficiency.value}
              size="sm"
              compact
            />
            <DCKPITile
              label="PUE"
              value={kpis.pue.value}
              unit=""
              status={kpis.pue.status}
              trend={kpis.pue.trend}
              sparklineData={generateSparkline(kpis.pue.value * 60, 3)}
              size="sm"
              compact
            />
          </div>
        </DCCard>
        
        {/* Network Domain */}
        <DCCard 
          title="Network Health" 
          icon={<Network className="h-4 w-4" />}
          status={kpis.networkIntegrity.status === 'normal' ? 'normal' : kpis.networkIntegrity.status}
          className="hover:border-dc-network/50 transition-colors"
        >
          <div className="space-y-3">
            <DCKPITile
              label="Integrity Score"
              value={kpis.networkIntegrity.value}
              unit="%"
              status={kpis.networkIntegrity.status}
              trend={kpis.networkIntegrity.trend}
              sparklineData={generateSparkline(kpis.networkIntegrity.value, 2)}
              thresholdValue={kpis.networkIntegrity.value}
              size="sm"
              compact
            />
            <DCKPITile
              label="Fabric Saturation"
              value={kpis.fabricSaturation.value}
              unit="%"
              status={kpis.fabricSaturation.status}
              trend={kpis.fabricSaturation.trend}
              delta={kpis.fabricSaturation.delta}
              sparklineData={generateSparkline(kpis.fabricSaturation.value, 6)}
              size="sm"
              compact
            />
          </div>
        </DCCard>
        
        {/* Facility Safety Domain */}
        <DCCard 
          title="Facility Safety" 
          icon={<Shield className="h-4 w-4" />}
          status={kpis.environmentalSafety.status === 'normal' ? 'normal' : kpis.environmentalSafety.status}
          className="hover:border-dc-success/50 transition-colors"
        >
          <div className="space-y-3">
            <DCKPITile
              label="Safety Score"
              value={kpis.environmentalSafety.value}
              unit="%"
              status={kpis.environmentalSafety.status}
              trend={kpis.environmentalSafety.trend}
              sparklineData={generateSparkline(kpis.environmentalSafety.value, 2)}
              thresholdValue={kpis.environmentalSafety.value}
              size="sm"
              compact
            />
            <DCKPITile
              label="Early Warning"
              value={kpis.earlyWarning.value}
              unit="%"
              status={kpis.earlyWarning.status}
              trend={kpis.earlyWarning.trend}
              sparklineData={generateSparkline(kpis.earlyWarning.value, 3)}
              size="sm"
              compact
            />
          </div>
        </DCCard>
        
        {/* Workload/GPU Domain */}
        <DCCard 
          title="Workload Performance" 
          icon={<Cpu className="h-4 w-4" />}
          status={kpis.gpuUtilization.status === 'normal' ? 'normal' : kpis.gpuUtilization.status}
          className="hover:border-dc-gpu/50 transition-colors"
        >
          <div className="space-y-3">
            <DCKPITile
              label="GPU Utilization"
              value={kpis.gpuUtilization.value}
              unit="%"
              status={kpis.gpuUtilization.status}
              trend={kpis.gpuUtilization.trend}
              delta={kpis.gpuUtilization.delta}
              sparklineData={generateSparkline(kpis.gpuUtilization.value, 8)}
              thresholdValue={kpis.gpuUtilization.value}
              size="sm"
              compact
            />
            <DCKPITile
              label="Queue Efficiency"
              value={kpis.queueEfficiency.value}
              unit="%"
              status={kpis.queueEfficiency.status}
              trend={kpis.queueEfficiency.trend}
              sparklineData={generateSparkline(kpis.queueEfficiency.value, 5)}
              size="sm"
              compact
            />
          </div>
        </DCCard>
        
        {/* Sovereignty Domain */}
        <DCCard 
          title="Data Sovereignty" 
          icon={<Globe className="h-4 w-4" />}
          status={kpis.sovereigntyRisk.status === 'normal' ? 'normal' : kpis.sovereigntyRisk.status}
          className="hover:border-dc-sovereignty/50 transition-colors"
        >
          <div className="space-y-3">
            <DCKPITile
              label="Risk Score"
              value={kpis.sovereigntyRisk.value}
              unit="%"
              status={kpis.sovereigntyRisk.status}
              trend={kpis.sovereigntyRisk.trend}
              sparklineData={generateSparkline(kpis.sovereigntyRisk.value, 4)}
              size="sm"
              compact
            />
            <DCKPITile
              label="Compliance"
              value={kpis.complianceScore.value}
              unit="%"
              status={kpis.complianceScore.status}
              trend={kpis.complianceScore.trend}
              sparklineData={generateSparkline(kpis.complianceScore.value, 2)}
              thresholdValue={kpis.complianceScore.value}
              size="sm"
              compact
            />
          </div>
        </DCCard>
        
        {/* Financial/Carbon Domain */}
        <DCCard 
          title="Financial Health" 
          icon={<DollarSign className="h-4 w-4" />}
          status={kpis.costPerGpuHour.status === 'normal' ? 'normal' : kpis.costPerGpuHour.status}
          className="hover:border-dc-carbon/50 transition-colors"
        >
          <div className="space-y-3">
            <DCKPITile
              label="Cost/GPU-hr"
              value={kpis.costPerGpuHour.value}
              unit="$"
              status={kpis.costPerGpuHour.status}
              trend={kpis.costPerGpuHour.trend}
              delta={kpis.costPerGpuHour.delta}
              sparklineData={generateSparkline(kpis.costPerGpuHour.value * 20, 10)}
              size="sm"
              compact
            />
            <DCKPITile
              label="Carbon Efficiency"
              value={kpis.carbonEfficiency.value}
              unit="%"
              status={kpis.carbonEfficiency.status}
              trend={kpis.carbonEfficiency.trend}
              delta={kpis.carbonEfficiency.delta}
              sparklineData={generateSparkline(kpis.carbonEfficiency.value, 4)}
              thresholdValue={kpis.carbonEfficiency.value}
              size="sm"
              compact
            />
          </div>
        </DCCard>
      </div>
    </div>
  );
}

function calculateKPIs(facility: DataCentreFacility): Record<string, KPIData> {
  // Use nested domain twin properties
  const thermalTwin = facility.thermalHardware;
  const powerTwin = facility.powerUps;
  const coolingTwin = facility.cooling;
  const networkTwin = facility.network;
  const workloadTwin = facility.workloadGpu;
  const sovereigntyTwin = facility.sovereignty;
  const facilityTwin = facility.facilitySafety;
  
  // Thermal KPIs
  const thermalStability = thermalTwin.kpis.thermalStabilityScore;
  const hotspotRisk = thermalTwin.kpis.hotspotRiskProbability;
  
  // Power KPIs
  const powerReliability = powerTwin.kpis.powerReliabilityScore;
  const upsHealth = powerTwin.kpis.upsHealthIndex;
  
  // Cooling KPIs
  const coolingEfficiency = coolingTwin.kpis.coolingEfficiencyIndex;
  
  // Network KPIs
  const networkIntegrity = networkTwin.kpis.networkIntegrityScore;
  const fabricSaturation = networkTwin.kpis.fabricSaturationIndex;
  
  // GPU/workload KPIs
  const gpuUtilization = workloadTwin.kpis.avgGpuUtilization;
  const queueEfficiency = 100 - Math.min(workloadTwin.kpis.avgQueueTimeMinutes, 100);
  
  // Sovereignty KPIs
  const sovereigntyRisk = sovereigntyTwin.kpis.sovereigntyRiskScore;
  const complianceScore = sovereigntyTwin.kpis.policyComplianceRate;
  
  // Financial KPIs
  const costPerGpuHour = workloadTwin.kpis.costPerGpuHour;
  const carbonEfficiency = Math.max(0, 100 - (facility.carbonIntensityGCo2Kwh / 5));
  
  // Facility KPIs
  const environmentalSafety = facilityTwin.kpis.environmentalSafetyScore;
  const earlyWarning = facilityTwin.kpis.earlyWarningIndex;
  
  return {
    thermalStability: { 
      value: thermalStability, 
      unit: '%', 
      status: thermalStability > 80 ? 'normal' : thermalStability > 60 ? 'warning' : 'critical', 
      trend: 'stable',
      delta: 1.2
    },
    hotspotRisk: { 
      value: hotspotRisk, 
      unit: '%', 
      status: hotspotRisk < 10 ? 'normal' : hotspotRisk < 25 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    powerReliability: { 
      value: powerReliability, 
      unit: '%', 
      status: powerReliability > 95 ? 'normal' : powerReliability > 85 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    upsHealth: { 
      value: upsHealth, 
      unit: '%', 
      status: upsHealth > 80 ? 'normal' : upsHealth > 60 ? 'warning' : 'critical', 
      trend: 'down',
      delta: -2.1
    },
    coolingEfficiency: { 
      value: coolingEfficiency, 
      unit: '%', 
      status: coolingEfficiency > 70 ? 'normal' : coolingEfficiency > 50 ? 'warning' : 'critical', 
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
      value: networkIntegrity, 
      unit: '%', 
      status: networkIntegrity > 80 ? 'normal' : networkIntegrity > 60 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    fabricSaturation: { 
      value: fabricSaturation, 
      unit: '%', 
      status: fabricSaturation < 60 ? 'normal' : fabricSaturation < 80 ? 'warning' : 'critical', 
      trend: 'up',
      delta: 4.2
    },
    environmentalSafety: { 
      value: environmentalSafety, 
      unit: '%', 
      status: environmentalSafety > 90 ? 'normal' : environmentalSafety > 70 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    earlyWarning: { 
      value: earlyWarning, 
      unit: '%', 
      status: earlyWarning > 90 ? 'normal' : earlyWarning > 70 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    gpuUtilization: { 
      value: gpuUtilization, 
      unit: '%', 
      status: gpuUtilization > 70 ? 'normal' : gpuUtilization > 50 ? 'warning' : 'critical', 
      trend: 'up',
      delta: 5.8
    },
    queueEfficiency: { 
      value: queueEfficiency, 
      unit: '%', 
      status: queueEfficiency > 80 ? 'normal' : queueEfficiency > 60 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    sovereigntyRisk: { 
      value: sovereigntyRisk, 
      unit: '%', 
      status: sovereigntyRisk < 10 ? 'normal' : sovereigntyRisk < 30 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    complianceScore: { 
      value: complianceScore, 
      unit: '%', 
      status: complianceScore > 90 ? 'normal' : complianceScore > 75 ? 'warning' : 'critical', 
      trend: 'stable' 
    },
    costPerGpuHour: { 
      value: costPerGpuHour, 
      unit: '$', 
      status: costPerGpuHour < 3 ? 'normal' : costPerGpuHour < 5 ? 'warning' : 'critical', 
      trend: 'down',
      delta: -0.15
    },
    carbonEfficiency: { 
      value: carbonEfficiency, 
      unit: '%', 
      status: carbonEfficiency > 80 ? 'normal' : carbonEfficiency > 60 ? 'warning' : 'critical', 
      trend: 'up',
      delta: 2.3
    },
  };
}
