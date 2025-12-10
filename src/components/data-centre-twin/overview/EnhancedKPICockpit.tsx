/**
 * Enhanced KPI Cockpit - Interactive, Predictive with AI Insights
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Thermometer, Zap, Wind, Network, Shield, Cpu, 
  Globe, DollarSign, Activity, Leaf
} from 'lucide-react';
import { EnhancedKPICard } from './EnhancedKPICard';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { useCarbonEngine } from '@/hooks/useCarbonEngine';
import { useFinancialEngine } from '@/hooks/useFinancialEngine';
import { generateSparklineData } from './SparklineChart';

interface EnhancedKPICockpitProps {
  facility: DataCentreFacility;
  twinId?: string;
  highlightedKPI?: string | null;
  onSimulateKPI?: (kpiId: string) => void;
}

export function EnhancedKPICockpit({ 
  facility, 
  twinId = 'default',
  highlightedKPI,
  onSimulateKPI 
}: EnhancedKPICockpitProps) {
  const { metrics: carbonMetrics } = useCarbonEngine(facility);
  const { metrics: financialMetrics } = useFinancialEngine(facility);
  
  const kpis = useMemo(() => generateKPIsWithInsights(facility, carbonMetrics, financialMetrics), [facility, carbonMetrics, financialMetrics]);
  
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
          {Object.keys(kpis).length} KPIs tracked
        </Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <EnhancedKPICard
          id="pue"
          label="Power Usage Effectiveness"
          value={facility.pue.toFixed(2)}
          unit=""
          status={facility.pue < 1.4 ? 'normal' : facility.pue < 1.6 ? 'warning' : 'critical'}
          trend={facility.pue < 1.5 ? 'down' : 'up'}
          delta={-2.3}
          icon={<Zap className="h-4 w-4 text-primary" />}
          insight={kpis.pue?.insight}
          sparklineData={generateSparklineData(facility.pue, 0.05)}
          highlighted={highlightedKPI === 'pue'}
          onSimulate={onSimulateKPI}
        />
        
        <EnhancedKPICard
          id="thermalStability"
          label="Thermal Stability"
          value={facility.thermalHardware.kpis.thermalStabilityScore}
          unit="%"
          status={facility.thermalHardware.kpis.thermalStabilityScore > 80 ? 'normal' : facility.thermalHardware.kpis.thermalStabilityScore > 60 ? 'warning' : 'critical'}
          trend="stable"
          delta={1.2}
          icon={<Thermometer className="h-4 w-4 text-primary" />}
          insight={kpis.thermalStability?.insight}
          sparklineData={generateSparklineData(facility.thermalHardware.kpis.thermalStabilityScore, 0.08)}
          highlighted={highlightedKPI === 'thermalStability'}
          onSimulate={onSimulateKPI}
        />
        
        <EnhancedKPICard
          id="coolingEfficiency"
          label="Cooling Efficiency"
          value={facility.cooling.kpis.coolingEfficiencyIndex}
          unit="%"
          status={facility.cooling.kpis.coolingEfficiencyIndex > 70 ? 'normal' : facility.cooling.kpis.coolingEfficiencyIndex > 50 ? 'warning' : 'critical'}
          trend="up"
          delta={3.4}
          icon={<Wind className="h-4 w-4 text-primary" />}
          insight={kpis.coolingEfficiency?.insight}
          sparklineData={generateSparklineData(facility.cooling.kpis.coolingEfficiencyIndex, 0.06)}
          highlighted={highlightedKPI === 'coolingEfficiency'}
          onSimulate={onSimulateKPI}
        />
        
        <EnhancedKPICard
          id="gpuUtilization"
          label="GPU Utilization"
          value={facility.workloadGpu.kpis.avgGpuUtilization}
          unit="%"
          status={facility.workloadGpu.kpis.avgGpuUtilization > 70 ? 'normal' : facility.workloadGpu.kpis.avgGpuUtilization > 50 ? 'warning' : 'critical'}
          trend="up"
          delta={5.8}
          icon={<Cpu className="h-4 w-4 text-primary" />}
          insight={kpis.gpuUtilization?.insight}
          sparklineData={generateSparklineData(facility.workloadGpu.kpis.avgGpuUtilization, 0.1)}
          highlighted={highlightedKPI === 'gpuUtilization'}
          onSimulate={onSimulateKPI}
        />
        
        <EnhancedKPICard
          id="networkIntegrity"
          label="Network Integrity"
          value={facility.network.kpis.networkIntegrityScore}
          unit="%"
          status={facility.network.kpis.networkIntegrityScore > 80 ? 'normal' : 'warning'}
          trend="stable"
          icon={<Network className="h-4 w-4 text-primary" />}
          insight={kpis.networkIntegrity?.insight}
          sparklineData={generateSparklineData(facility.network.kpis.networkIntegrityScore, 0.03)}
          highlighted={highlightedKPI === 'networkIntegrity'}
          onSimulate={onSimulateKPI}
        />
        
        <EnhancedKPICard
          id="facilitySafety"
          label="Facility Safety"
          value={facility.facilitySafety.kpis.environmentalSafetyScore}
          unit="%"
          status={facility.facilitySafety.kpis.environmentalSafetyScore > 90 ? 'normal' : 'warning'}
          trend="stable"
          icon={<Shield className="h-4 w-4 text-primary" />}
          insight={kpis.facilitySafety?.insight}
          sparklineData={generateSparklineData(facility.facilitySafety.kpis.environmentalSafetyScore, 0.02)}
          highlighted={highlightedKPI === 'facilitySafety'}
          onSimulate={onSimulateKPI}
        />
        
        <EnhancedKPICard
          id="sovereignty"
          label="Sovereignty Score"
          value={100 - facility.sovereignty.kpis.sovereigntyRiskScore}
          unit="%"
          status={facility.sovereignty.kpis.sovereigntyRiskScore < 10 ? 'normal' : facility.sovereignty.kpis.sovereigntyRiskScore < 30 ? 'warning' : 'critical'}
          trend="stable"
          icon={<Globe className="h-4 w-4 text-primary" />}
          insight={kpis.sovereignty?.insight}
          sparklineData={generateSparklineData(100 - facility.sovereignty.kpis.sovereigntyRiskScore, 0.04)}
          highlighted={highlightedKPI === 'sovereignty'}
          onSimulate={onSimulateKPI}
        />
        
        <EnhancedKPICard
          id="carbonEfficiency"
          label="Carbon Efficiency"
          value={carbonMetrics.carbonEfficiencyScore.toFixed(0)}
          unit="%"
          status={carbonMetrics.carbonEfficiencyScore > 70 ? 'normal' : carbonMetrics.carbonEfficiencyScore > 50 ? 'warning' : 'critical'}
          trend="up"
          delta={3.2}
          icon={<Leaf className="h-4 w-4 text-primary" />}
          insight={kpis.carbonEfficiency?.insight}
          sparklineData={generateSparklineData(carbonMetrics.carbonEfficiencyScore, 0.05)}
          highlighted={highlightedKPI === 'carbonEfficiency'}
          onSimulate={onSimulateKPI}
        />
        
        <EnhancedKPICard
          id="financialHealth"
          label="Financial Health"
          value={financialMetrics.financialHealthScore.toFixed(0)}
          unit="%"
          status={financialMetrics.financialHealthScore > 70 ? 'normal' : financialMetrics.financialHealthScore > 50 ? 'warning' : 'critical'}
          trend="stable"
          delta={-0.8}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          insight={kpis.financialHealth?.insight}
          sparklineData={generateSparklineData(financialMetrics.financialHealthScore, 0.04)}
          highlighted={highlightedKPI === 'financialHealth'}
          onSimulate={onSimulateKPI}
        />
      </div>
    </CollapsibleSection>
  );
}

interface KPIInsight {
  insight: string;
}

function generateKPIsWithInsights(
  facility: DataCentreFacility,
  carbonMetrics: any,
  financialMetrics: any
): Record<string, KPIInsight> {
  return {
    pue: {
      insight: facility.pue < 1.4 
        ? 'PUE is excellent. Cooling optimization is effective.'
        : 'PUE trending above target. Consider adjusting CRAC setpoints.'
    },
    thermalStability: {
      insight: facility.thermalHardware.kpis.thermalStabilityScore > 80
        ? 'Thermal conditions stable across all zones.'
        : 'Hotspot forming in Zone B. Recommend airflow rebalancing.'
    },
    coolingEfficiency: {
      insight: facility.cooling.kpis.coolingEfficiencyIndex > 70
        ? 'Cooling demand balanced with IT load.'
        : 'Cooling imbalance detected in Hot Aisle 1.'
    },
    gpuUtilization: {
      insight: facility.workloadGpu.kpis.avgGpuUtilization > 70
        ? 'GPU clusters operating at optimal capacity.'
        : 'Training workloads underutilizing cluster B.'
    },
    networkIntegrity: {
      insight: 'Network fabric operating normally. No packet loss detected.'
    },
    facilitySafety: {
      insight: 'All safety systems operational. Environmental sensors nominal.'
    },
    sovereignty: {
      insight: facility.sovereignty.kpis.sovereigntyRiskScore < 10
        ? 'All data flows compliant with sovereignty policies.'
        : `${Math.round(facility.sovereignty.kpis.sovereigntyRiskScore)}% of flows routing through non-compliant paths.`
    },
    carbonEfficiency: {
      insight: carbonMetrics.carbonEfficiencyScore > 70
        ? 'Operating within carbon budget. Renewable mix optimal.'
        : 'Carbon intensity rising. Consider workload migration.'
    },
    financialHealth: {
      insight: financialMetrics.financialHealthScore > 70
        ? 'Cost per GPU-hour within target range.'
        : 'Cooling costs impacting GPU-hour economics.'
    },
  };
}
