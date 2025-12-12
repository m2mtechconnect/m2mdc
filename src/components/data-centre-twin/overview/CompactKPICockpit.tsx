/**
 * Compact KPI Cockpit - Shows 4 primary KPIs with expandable full list
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Thermometer, Zap, Cpu, Globe, Activity, ChevronDown, ChevronUp,
  Wind, Network, Shield, Leaf, DollarSign
} from 'lucide-react';
import { EnhancedKPICard } from './EnhancedKPICard';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { useCarbonEngine } from '@/hooks/useCarbonEngine';
import { useFinancialEngine } from '@/hooks/useFinancialEngine';
import { generateSparklineData } from './SparklineChart';

interface CompactKPICockpitProps {
  facility: DataCentreFacility;
  twinId?: string;
  highlightedKPI?: string | null;
  onSimulateKPI?: (kpiId: string) => void;
  mode?: 'overview' | 'full';
}

export function CompactKPICockpit({ 
  facility, 
  twinId = 'default',
  highlightedKPI,
  onSimulateKPI,
  mode = 'overview'
}: CompactKPICockpitProps) {
  const [expanded, setExpanded] = useState(false);
  const { metrics: carbonMetrics } = useCarbonEngine(facility);
  const { metrics: financialMetrics } = useFinancialEngine(facility);
  
  // Memoize sparkline data
  const sparklineData = useMemo(() => ({
    pue: generateSparklineData(facility.pue, 0.05),
    thermalStability: generateSparklineData(facility.thermalHardware.kpis.thermalStabilityScore, 0.08),
    coolingEfficiency: generateSparklineData(facility.cooling.kpis.coolingEfficiencyIndex, 0.06),
    gpuUtilization: generateSparklineData(facility.workloadGpu.kpis.avgGpuUtilization, 0.1),
    networkIntegrity: generateSparklineData(facility.network.kpis.networkIntegrityScore, 0.03),
    facilitySafety: generateSparklineData(facility.facilitySafety.kpis.environmentalSafetyScore, 0.02),
    sovereignty: generateSparklineData(100 - facility.sovereignty.kpis.sovereigntyRiskScore, 0.04),
    carbonEfficiency: generateSparklineData(carbonMetrics.carbonEfficiencyScore, 0.05),
    financialHealth: generateSparklineData(financialMetrics.financialHealthScore, 0.04),
  }), [
    facility.pue,
    facility.thermalHardware.kpis.thermalStabilityScore,
    facility.cooling.kpis.coolingEfficiencyIndex,
    facility.workloadGpu.kpis.avgGpuUtilization,
    facility.network.kpis.networkIntegrityScore,
    facility.facilitySafety.kpis.environmentalSafetyScore,
    facility.sovereignty.kpis.sovereigntyRiskScore,
    carbonMetrics.carbonEfficiencyScore,
    financialMetrics.financialHealthScore,
  ]);

  type KPIStatus = 'normal' | 'warning' | 'critical';
  type KPITrend = 'up' | 'down' | 'stable';

  const getStatus = (condition: boolean, warnCondition?: boolean): KPIStatus => {
    if (condition) return 'normal';
    if (warnCondition !== undefined && warnCondition) return 'warning';
    return 'critical';
  };

  const primaryKPIs: Array<{
    id: string;
    label: string;
    value: string | number;
    unit: string;
    status: KPIStatus;
    trend: KPITrend;
    delta?: number;
    icon: React.ReactNode;
    sparklineData: number[];
    insight: string;
  }> = [
    {
      id: 'pue',
      label: 'Power Usage Effectiveness',
      value: facility.pue.toFixed(2),
      unit: '',
      status: getStatus(facility.pue < 1.4, facility.pue < 1.6),
      trend: facility.pue < 1.5 ? 'down' : 'up',
      delta: -2.3,
      icon: <Zap className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.pue,
      insight: facility.pue < 1.4 ? 'PUE is excellent. Cooling optimization is effective.' : 'PUE trending above target.',
    },
    {
      id: 'gpuUtilization',
      label: 'GPU Utilization',
      value: facility.workloadGpu.kpis.avgGpuUtilization,
      unit: '%',
      status: getStatus(facility.workloadGpu.kpis.avgGpuUtilization > 70, facility.workloadGpu.kpis.avgGpuUtilization > 50),
      trend: 'up',
      delta: 5.8,
      icon: <Cpu className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.gpuUtilization,
      insight: 'GPU clusters operating at optimal capacity.',
    },
    {
      id: 'thermalStability',
      label: 'Thermal Stability',
      value: facility.thermalHardware.kpis.thermalStabilityScore,
      unit: '%',
      status: getStatus(facility.thermalHardware.kpis.thermalStabilityScore > 80, facility.thermalHardware.kpis.thermalStabilityScore > 60),
      trend: 'stable',
      delta: 1.2,
      icon: <Thermometer className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.thermalStability,
      insight: 'Thermal conditions stable across all zones.',
    },
    {
      id: 'sovereignty',
      label: 'Sovereignty Score',
      value: 100 - facility.sovereignty.kpis.sovereigntyRiskScore,
      unit: '%',
      status: getStatus(facility.sovereignty.kpis.sovereigntyRiskScore < 10, facility.sovereignty.kpis.sovereigntyRiskScore < 30),
      trend: 'stable',
      icon: <Globe className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.sovereignty,
      insight: 'All data flows compliant with sovereignty policies.',
    },
  ];

  const secondaryKPIs: Array<{
    id: string;
    label: string;
    value: string | number;
    unit: string;
    status: KPIStatus;
    icon: React.ReactNode;
    sparklineData: number[];
  }> = [
    {
      id: 'coolingEfficiency',
      label: 'Cooling Efficiency',
      value: facility.cooling.kpis.coolingEfficiencyIndex,
      unit: '%',
      status: getStatus(facility.cooling.kpis.coolingEfficiencyIndex > 70),
      icon: <Wind className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.coolingEfficiency,
    },
    {
      id: 'networkIntegrity',
      label: 'Network Integrity',
      value: facility.network.kpis.networkIntegrityScore,
      unit: '%',
      status: getStatus(facility.network.kpis.networkIntegrityScore > 80),
      icon: <Network className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.networkIntegrity,
    },
    {
      id: 'facilitySafety',
      label: 'Facility Safety',
      value: facility.facilitySafety.kpis.environmentalSafetyScore,
      unit: '%',
      status: getStatus(facility.facilitySafety.kpis.environmentalSafetyScore > 90),
      icon: <Shield className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.facilitySafety,
    },
    {
      id: 'carbonEfficiency',
      label: 'Carbon Efficiency',
      value: carbonMetrics.carbonEfficiencyScore.toFixed(0),
      unit: '%',
      status: getStatus(carbonMetrics.carbonEfficiencyScore > 70),
      icon: <Leaf className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.carbonEfficiency,
    },
    {
      id: 'financialHealth',
      label: 'Financial Health',
      value: financialMetrics.financialHealthScore.toFixed(0),
      unit: '%',
      status: getStatus(financialMetrics.financialHealthScore > 70),
      icon: <DollarSign className="h-4 w-4 text-primary" />,
      sparklineData: sparklineData.financialHealth,
    },
  ];

  const showFull = mode === 'full' || expanded;

  return (
    <CollapsibleSection 
      title="KPI Cockpit" 
      badge="Real-time"
      defaultOpen={true}
      icon={<Activity className="h-5 w-5 text-primary" />}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs text-success border-success/30">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            LIVE
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          {primaryKPIs.length + secondaryKPIs.length} KPIs tracked
        </Badge>
      </div>
      
      {/* Primary 4 KPIs - 2x2 grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {primaryKPIs.map((kpi) => (
          <EnhancedKPICard
            key={kpi.id}
            {...kpi}
            highlighted={highlightedKPI === kpi.id}
            onSimulate={onSimulateKPI}
          />
        ))}
      </div>
      
      {/* Expand/Collapse Toggle */}
      {mode === 'overview' && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide detailed KPIs
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              View all {primaryKPIs.length + secondaryKPIs.length} KPIs
            </>
          )}
        </Button>
      )}
      
      {/* Secondary KPIs (expanded or full mode) */}
      {showFull && (
        <div className="mt-4 pt-4 border-t border-border grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {secondaryKPIs.map((kpi) => (
            <EnhancedKPICard
              key={kpi.id}
              id={kpi.id}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              status={kpi.status}
              icon={kpi.icon}
              sparklineData={kpi.sparklineData}
              highlighted={highlightedKPI === kpi.id}
              onSimulate={onSimulateKPI}
              compact
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
