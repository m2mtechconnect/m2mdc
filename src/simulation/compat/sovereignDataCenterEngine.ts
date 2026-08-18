/**
 * Phase 1B.6 — canonical Sovereign DC pure-function engine.
 *
 * Moved from `src/twins/sovereignDataCenter/simulationEngine.ts` behind the
 * simulation provider boundary (ADR-0007). Consumers must depend on the
 * simulation facade (`src/simulation/api.ts`) or, transitionally, on this
 * compat module directly.
 */
/**
 * Sovereign Data Center Simulation Engine
 * Deterministic frontend logic for simulating KPI changes
 */

import type { 
  SovereignKpis, 
  SimulationType, 
  SimulationRun,
  SovereignDCFacility,
  EnergyMix 
} from '@/types/sovereignDataCenterTwin';

export interface SimulationParams {
  carbonPricePerTon?: number;
  gpuUtilizationIncrease?: number;
  coolingFailureZone?: string;
  newTenantSovereign?: boolean;
  comparisonFacilityId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SimulationResult {
  kpiDeltas: Partial<SovereignKpis>;
  resultsSummary: string;
  warnings: string[];
  recommendations: string[];
}

/**
 * Calculate the effective carbon impact based on energy mix
 */
function calculateCarbonImpact(energyMix: EnergyMix): number {
  // gCO2/kWh estimates by source
  const carbonFactors = {
    renewable: 20, // wind/solar/hydro
    naturalGas: 450,
    nuclear: 12,
    other: 500, // assume coal/oil
  };
  
  return (
    (energyMix.renewable || 0) * carbonFactors.renewable +
    (energyMix.naturalGas || 0) * carbonFactors.naturalGas +
    (energyMix.nuclear || 0) * carbonFactors.nuclear +
    (energyMix.other || 0) * carbonFactors.other
  );
}

/**
 * Run a simulation and return KPI deltas + summary
 */
export function runSimulation(
  baseKpis: SovereignKpis,
  type: SimulationType,
  params: SimulationParams = {},
  facility?: SovereignDCFacility
): SimulationResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let kpiDeltas: Partial<SovereignKpis> = {};
  let resultsSummary = '';

  switch (type) {
    case 'gpu_overload': {
      const utilizationIncrease = params.gpuUtilizationIncrease || 25;
      
      // GPU overload increases PUE and carbon emissions
      kpiDeltas = {
        effectiveAiPue: baseKpis.effectiveAiPue * 0.03, // +3%
        gco2PerGpuHour: baseKpis.gco2PerGpuHour * (utilizationIncrease / 100),
        sovereignRiskScore: -5, // Slightly lower risk during high utilization
        economicEfficiencyScore: utilizationIncrease > 30 ? -8 : -3,
      };
      
      resultsSummary = `GPU utilization spike of +${utilizationIncrease}% simulated. ` +
        `PUE increased by 3% due to additional cooling load. ` +
        `Carbon emissions rose proportionally. Consider load balancing across regions.`;
      
      if (utilizationIncrease > 40) {
        warnings.push('Critical utilization level - thermal throttling risk');
        recommendations.push('Enable GPU workload migration to secondary clusters');
      }
      break;
    }

    case 'cooling_failure': {
      const severity = params.severity || 'medium';
      const severityMultiplier = { low: 1, medium: 2, high: 3, critical: 4 }[severity];
      
      kpiDeltas = {
        effectiveAiPue: baseKpis.effectiveAiPue * (0.05 * severityMultiplier), // +5-20%
        gco2PerGpuHour: baseKpis.gco2PerGpuHour * (0.1 * severityMultiplier), // +10-40%
        sovereignRiskScore: -3 * severityMultiplier,
        economicEfficiencyScore: -5 * severityMultiplier,
      };
      
      resultsSummary = `Cooling failure (${severity} severity) in ${params.coolingFailureZone || 'Zone B'}. ` +
        `PUE degraded by ${(0.05 * severityMultiplier * 100).toFixed(0)}%. ` +
        `Emergency cooling protocols activated. MTTR estimate: ${severity === 'critical' ? '4-6 hours' : '1-2 hours'}.`;
      
      warnings.push(`Cooling system failure - ${severity} severity`);
      recommendations.push('Activate backup cooling units');
      recommendations.push('Migrate critical workloads to unaffected zones');
      break;
    }

    case 'carbon_price_shock': {
      const newCarbonPrice = params.carbonPricePerTon || 200;
      const isGreenFacility = facility?.energyMix.renewable && facility.energyMix.renewable > 0.8;
      
      const economicImpact = isGreenFacility ? -2 : -15;
      const opexIncrease = isGreenFacility ? 3 : 25;
      
      kpiDeltas = {
        economicEfficiencyScore: economicImpact,
        gco2PerGpuHour: 0, // No change in actual emissions
      };
      
      resultsSummary = `Carbon price shock to $${newCarbonPrice}/tonne modeled. ` +
        `${isGreenFacility ? 'Green facility' : 'Gas-heavy facility'} impact: ` +
        `Economic efficiency ${economicImpact > 0 ? '+' : ''}${economicImpact} points. ` +
        `Projected OPEX increase: ${opexIncrease}%.`;
      
      if (!isGreenFacility) {
        warnings.push('High carbon exposure - significant OPEX risk');
        recommendations.push('Accelerate renewable energy transition');
        recommendations.push('Consider power purchase agreements (PPAs) with green suppliers');
      }
      break;
    }

    case 'new_tenant_onboarding': {
      const isSovereign = params.newTenantSovereign !== false;
      
      kpiDeltas = {
        sovereignComputeRatioPct: isSovereign ? 2 : -1,
        economicEfficiencyScore: 3,
        activeWorkloads: 1,
      };
      
      resultsSummary = `New ${isSovereign ? 'sovereign' : 'non-sovereign'} tenant onboarding simulated. ` +
        `Sovereign compute ratio ${isSovereign ? 'increased' : 'decreased'} by ${Math.abs(kpiDeltas.sovereignComputeRatioPct!)}%. ` +
        `Economic efficiency improved due to better capacity utilization.`;
      
      if (!isSovereign) {
        warnings.push('Non-sovereign tenant may affect data residency compliance');
        recommendations.push('Ensure data isolation policies are enforced');
        recommendations.push('Document data flow jurisdiction mapping');
      }
      break;
    }

    case 'emissions_vs_sovereignty': {
      // Comparison scenario - typically QC (green) vs AB (gas)
      const greenMetrics = {
        gco2PerGpuHour: 25,
        economicEfficiencyScore: 85,
        sovereignComputeRatioPct: 98,
      };
      
      const gasMetrics = {
        gco2PerGpuHour: 180,
        economicEfficiencyScore: 72,
        sovereignComputeRatioPct: 95,
      };
      
      kpiDeltas = {
        gco2PerGpuHour: gasMetrics.gco2PerGpuHour - greenMetrics.gco2PerGpuHour,
        economicEfficiencyScore: gasMetrics.economicEfficiencyScore - greenMetrics.economicEfficiencyScore,
      };
      
      resultsSummary = `QC vs AB facility comparison completed. ` +
        `QC (hydro): ${greenMetrics.gco2PerGpuHour}g CO2/GPU-hr, ${greenMetrics.sovereignComputeRatioPct}% sovereign. ` +
        `AB (gas): ${gasMetrics.gco2PerGpuHour}g CO2/GPU-hr, ${gasMetrics.sovereignComputeRatioPct}% sovereign. ` +
        `Carbon delta: ${kpiDeltas.gco2PerGpuHour}g/GPU-hr (${((kpiDeltas.gco2PerGpuHour! / greenMetrics.gco2PerGpuHour) * 100).toFixed(0)}% higher in AB).`;
      
      recommendations.push('Prioritize QC facility for carbon-sensitive workloads');
      recommendations.push('Consider workload migration during peak carbon pricing');
      break;
    }

    case 'power_grid_outage': {
      const severity = params.severity || 'medium';
      const outageMinutes = { low: 15, medium: 60, high: 180, critical: 480 }[severity];
      
      kpiDeltas = {
        effectiveAiPue: baseKpis.effectiveAiPue * 0.15, // UPS/generator inefficiency
        economicEfficiencyScore: -12,
        sovereignRiskScore: severity === 'critical' ? 15 : 5,
      };
      
      resultsSummary = `Power grid outage (${outageMinutes} minutes) simulated. ` +
        `Backup generators activated. PUE temporarily degraded. ` +
        `${severity === 'critical' ? 'Some workloads migrated to secondary facility.' : 'All workloads maintained.'} ` +
        `Estimated revenue impact: $${(outageMinutes * 1500).toLocaleString()}.`;
      
      warnings.push(`Grid outage - ${severity} severity (${outageMinutes} min)`);
      recommendations.push('Review UPS capacity for critical systems');
      recommendations.push('Test failover procedures');
      break;
    }

    case 'sovereignty_violation': {
      kpiDeltas = {
        sovereignComputeRatioPct: -5,
        sovereignRiskScore: 25,
        economicEfficiencyScore: -10,
      };
      
      resultsSummary = `Data sovereignty violation detected. ` +
        `Workload data crossed to non-sovereign jurisdiction (US-VA). ` +
        `Compliance alert triggered. Sovereign compute ratio dropped 5%. ` +
        `Immediate remediation required per PIPEDA/provincial regulations.`;
      
      warnings.push('CRITICAL: Data sovereignty violation detected');
      warnings.push('Compliance audit may be required');
      recommendations.push('Quarantine affected workloads immediately');
      recommendations.push('Engage legal/compliance team');
      recommendations.push('Document incident for regulatory reporting');
      break;
    }

    case 'mixed_custom':
    default: {
      // Custom scenario - apply generic moderate changes
      kpiDeltas = {
        effectiveAiPue: baseKpis.effectiveAiPue * 0.02,
        gco2PerGpuHour: baseKpis.gco2PerGpuHour * 0.05,
        economicEfficiencyScore: -2,
      };
      
      resultsSummary = `Custom scenario executed with provided parameters. ` +
        `Moderate impact across KPIs observed. Review detailed metrics for specifics.`;
      break;
    }
  }

  return {
    kpiDeltas,
    resultsSummary,
    warnings,
    recommendations,
  };
}

/**
 * Create a SimulationRun record from a result
 */
export function createSimulationRun(
  facilityId: string,
  type: SimulationType,
  params: SimulationParams,
  result: SimulationResult
): SimulationRun {
  const typeNames: Record<SimulationType, string> = {
    gpu_overload: 'GPU Overload Scenario',
    cooling_failure: 'Cooling System Failure',
    carbon_price_shock: 'Carbon Price Shock',
    new_tenant_onboarding: 'New Tenant Onboarding',
    emissions_vs_sovereignty: 'Emissions vs Sovereignty Analysis',
    power_grid_outage: 'Power Grid Outage',
    sovereignty_violation: 'Data Sovereignty Violation',
    mixed_custom: 'Custom Scenario',
  };

  return {
    // Identifier only (not simulation output): UUID-backed, no Math.random.
    id: newIdentifier('sim'),
    facilityId,
    name: typeNames[type] || 'Simulation',
    type,
    inputParams: params,
    resultsSummary: result.resultsSummary,
    kpiDeltas: result.kpiDeltas,
    createdAt: new Date().toISOString(),
    // Wall-clock duration is not known here; report 0 rather than inventing
    // a random elapsed time that would read as a measured figure.
    durationMs: 0,
    status: 'completed',
  };
}

/**
 * Get scenario suggestions based on facility type
 */
export function getScenarioSuggestions(facility?: SovereignDCFacility): {
  type: SimulationType;
  label: string;
  description: string;
}[] {
  const isGreenFacility = facility?.energyMix.renewable && facility.energyMix.renewable > 0.5;
  
  const baseScenarios = [
    {
      type: 'gpu_overload' as SimulationType,
      label: 'GPU Spike',
      description: 'Simulate 25% utilization increase during AI training window',
    },
    {
      type: 'cooling_failure' as SimulationType,
      label: 'Cooling Failure',
      description: 'Model cooling system failure in Zone B',
    },
    {
      type: 'carbon_price_shock' as SimulationType,
      label: 'Carbon @ $200/t',
      description: 'Project impact of carbon price increase to $200/tonne',
    },
    {
      type: 'new_tenant_onboarding' as SimulationType,
      label: 'New Sovereign Tenant',
      description: 'Simulate onboarding a major Canadian bank',
    },
    {
      type: 'power_grid_outage' as SimulationType,
      label: 'Grid Outage',
      description: 'Test backup power and failover procedures',
    },
  ];

  if (isGreenFacility) {
    baseScenarios.push({
      type: 'emissions_vs_sovereignty',
      label: 'QC vs AB Compare',
      description: 'Compare green vs gas facility carbon footprint',
    });
  }

  return baseScenarios;
}
