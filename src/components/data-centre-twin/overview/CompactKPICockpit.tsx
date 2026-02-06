/**
 * Compact KPI Cockpit - Shows 4 primary KPIs with expandable full list
 * NOW SIMULATION-AWARE: Reads live KPI values from simulation engine when running
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Thermometer, Zap, Cpu, Globe, Activity, ChevronDown, ChevronUp,
  Wind, Network, Shield, Leaf, DollarSign, PlayCircle
} from 'lucide-react';
import { EnhancedKPICard } from './EnhancedKPICard';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { useCarbonEngine } from '@/hooks/useCarbonEngine';
import { useFinancialEngine } from '@/hooks/useFinancialEngine';
import { generateSparklineData } from './SparklineChart';
import { useSimulation } from '@/simulation/useSimulation';
import { getKpiValue } from '@/lib/kpiKeyMap';

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
  
  // Get simulation state - when running, use simulated KPIs instead of facility values
  const { status, currentKpis, baselineKpis } = useSimulation();
  const isSimulating = status === 'running' || status === 'completed' || status === 'paused';
  
  // Helper to get KPI value - prioritizes simulation when active
  const getSimulatedValue = (kpiId: string, facilityValue: number): number => {
    if (isSimulating) {
      const simValue = getKpiValue(currentKpis, kpiId);
      // Return simulated value if it exists and is different from 0
      if (simValue !== 0) return simValue;
    }
    return facilityValue;
  };
  
  // Calculate delta from baseline when simulating
  const getSimulatedDelta = (kpiId: string, defaultDelta: number): number => {
    if (isSimulating) {
      const current = getKpiValue(currentKpis, kpiId);
      const baseline = getKpiValue(baselineKpis, kpiId);
      if (baseline && baseline !== 0) {
        return ((current - baseline) / baseline) * 100;
      }
    }
    return defaultDelta;
  };
  
  // Memoize sparkline data
  const sparklineData = useMemo(() => ({
    pue: generateSparklineData(getSimulatedValue('pue', facility.pue), 0.05),
    thermalStability: generateSparklineData(getSimulatedValue('thermalStabilityScore', facility.thermalHardware.kpis.thermalStabilityScore), 0.08),
    coolingEfficiency: generateSparklineData(getSimulatedValue('coolingEfficiencyIndex', facility.cooling.kpis.coolingEfficiencyIndex), 0.06),
    gpuUtilization: generateSparklineData(getSimulatedValue('gpuUtilization', facility.workloadGpu.kpis.avgGpuUtilization), 0.1),
    networkIntegrity: generateSparklineData(getSimulatedValue('networkIntegrityScore', facility.network.kpis.networkIntegrityScore), 0.03),
    facilitySafety: generateSparklineData(getSimulatedValue('environmentalSafetyScore', facility.facilitySafety.kpis.environmentalSafetyScore), 0.02),
    sovereignty: generateSparklineData(100 - getSimulatedValue('sovereigntyRiskScore', facility.sovereignty.kpis.sovereigntyRiskScore), 0.04),
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
    currentKpis,
    isSimulating,
  ]);

  type KPIStatus = 'normal' | 'warning' | 'critical';
  type KPITrend = 'up' | 'down' | 'stable';

  const getStatus = (condition: boolean, warnCondition?: boolean): KPIStatus => {
    if (condition) return 'normal';
    if (warnCondition !== undefined && warnCondition) return 'warning';
    return 'critical';
  };

  // Get simulation-aware KPI values
  const pueValue = getSimulatedValue('pue', facility.pue);
  const gpuUtilValue = getSimulatedValue('gpuUtilization', facility.workloadGpu.kpis.avgGpuUtilization);
  const thermalValue = getSimulatedValue('thermalStabilityScore', facility.thermalHardware.kpis.thermalStabilityScore);
  const sovereigntyRisk = getSimulatedValue('sovereigntyRiskScore', facility.sovereignty.kpis.sovereigntyRiskScore);

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
    isSimulated?: boolean;
  }> = [
    {
      id: 'pue',
      label: 'Power Usage Effectiveness',
      value: pueValue.toFixed(2),
      unit: '',
      status: getStatus(pueValue < 1.4, pueValue < 1.6),
      trend: pueValue < 1.5 ? 'down' : 'up',
      delta: getSimulatedDelta('pue', -2.3),
      icon: <Zap className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.pue,
      insight: pueValue < 1.4 ? 'PUE is excellent. Cooling optimization is effective.' : 'PUE trending above target.',
      isSimulated: isSimulating,
    },
    {
      id: 'gpuUtilization',
      label: 'GPU Utilization',
      value: Math.round(gpuUtilValue),
      unit: '%',
      status: getStatus(gpuUtilValue > 70, gpuUtilValue > 50),
      trend: 'up',
      delta: getSimulatedDelta('gpuUtilization', 5.8),
      icon: <Cpu className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.gpuUtilization,
      insight: 'GPU clusters operating at optimal capacity.',
      isSimulated: isSimulating,
    },
    {
      id: 'thermalStability',
      label: 'Thermal Stability',
      value: Math.round(thermalValue),
      unit: '%',
      status: getStatus(thermalValue > 80, thermalValue > 60),
      trend: 'stable',
      delta: getSimulatedDelta('thermalStabilityScore', 1.2),
      icon: <Thermometer className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.thermalStability,
      insight: 'Thermal conditions stable across all zones.',
      isSimulated: isSimulating,
    },
    {
      id: 'sovereignty',
      label: 'Sovereignty Score',
      value: Math.round(100 - sovereigntyRisk),
      unit: '%',
      status: getStatus(sovereigntyRisk < 10, sovereigntyRisk < 30),
      trend: 'stable',
      icon: <Globe className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.sovereignty,
      insight: 'All data flows compliant with sovereignty policies.',
      isSimulated: isSimulating,
    },
  ];

  // Get simulation-aware secondary KPI values
  const coolingValue = getSimulatedValue('coolingEfficiencyIndex', facility.cooling.kpis.coolingEfficiencyIndex);
  const networkValue = getSimulatedValue('networkIntegrityScore', facility.network.kpis.networkIntegrityScore);
  const safetyValue = getSimulatedValue('environmentalSafetyScore', facility.facilitySafety.kpis.environmentalSafetyScore);

  const secondaryKPIs: Array<{
    id: string;
    label: string;
    value: string | number;
    unit: string;
    status: KPIStatus;
    icon: React.ReactNode;
    sparklineData: number[];
    isSimulated?: boolean;
  }> = [
    {
      id: 'coolingEfficiency',
      label: 'Cooling Efficiency',
      value: Math.round(coolingValue),
      unit: '%',
      status: getStatus(coolingValue > 70),
      icon: <Wind className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.coolingEfficiency,
      isSimulated: isSimulating,
    },
    {
      id: 'networkIntegrity',
      label: 'Network Integrity',
      value: Math.round(networkValue),
      unit: '%',
      status: getStatus(networkValue > 80),
      icon: <Network className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.networkIntegrity,
      isSimulated: isSimulating,
    },
    {
      id: 'facilitySafety',
      label: 'Facility Safety',
      value: Math.round(safetyValue),
      unit: '%',
      status: getStatus(safetyValue > 90),
      icon: <Shield className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.facilitySafety,
      isSimulated: isSimulating,
    },
    {
      id: 'carbonEfficiency',
      label: 'Carbon Efficiency',
      value: carbonMetrics.carbonEfficiencyScore.toFixed(0),
      unit: '%',
      status: getStatus(carbonMetrics.carbonEfficiencyScore > 70),
      icon: <Leaf className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.carbonEfficiency,
    },
    {
      id: 'financialHealth',
      label: 'Financial Health',
      value: financialMetrics.financialHealthScore.toFixed(0),
      unit: '%',
      status: getStatus(financialMetrics.financialHealthScore > 70),
      icon: <DollarSign className="h-4 w-4 text-accent" />,
      sparklineData: sparklineData.financialHealth,
    },
  ];

  const showFull = mode === 'full' || expanded;

  return (
    <CollapsibleSection 
      title="KPI Cockpit" 
      badge="Real-time"
      defaultOpen={true}
      icon={<Activity className="h-5 w-5 text-accent" />}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isSimulating ? (
            <Badge variant="default" className="font-mono text-xs bg-primary text-primary-foreground gap-1.5 animate-pulse">
              <PlayCircle className="h-3 w-3" />
              SIMULATION
            </Badge>
          ) : (
            <Badge variant="outline" className="font-mono text-xs text-success border-success/30">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              LIVE
            </Badge>
          )}
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
