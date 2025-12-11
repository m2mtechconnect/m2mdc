/**
 * React Hook for Financial Engine
 * Provides reactive financial metrics from facility data
 * 
 * Industry Benchmarks Applied:
 * - Hydro-Québec commercial rates: $0.055/kWh
 * - Canada Carbon Pricing Act 2024: $80/tonne
 * - NVIDIA H100 operational benchmarks
 * - Uptime Institute OpEx surveys 2024
 */

import { useMemo } from 'react';
import { 
  FinancialEngine, 
  type FinancialEngineInput, 
  type FinancialMetricsOutput,
  type FinancialAssumptions,
  DEFAULT_FINANCIAL_ASSUMPTIONS,
  REGIONAL_FINANCIAL_ASSUMPTIONS,
} from '@/engines/financial';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { useCarbonEngine } from './useCarbonEngine';

export interface UseFinancialEngineResult {
  metrics: FinancialMetricsOutput;
  input: FinancialEngineInput;
  assumptions: FinancialAssumptions;
  
  // Simulation helpers
  simulateCarbonPriceChange: (newPrice: number) => ReturnType<typeof FinancialEngine.simulateCarbonPriceChange>;
  simulateCoolingChange: (newPue: number) => ReturnType<typeof FinancialEngine.simulateCoolingEfficiencyChange>;
}

/**
 * Get region-specific financial assumptions
 * Falls back to Quebec defaults (lowest-cost Canadian region)
 */
function getRegionalAssumptions(regionCode?: string): Partial<FinancialAssumptions> {
  if (!regionCode) return {};
  const regional = REGIONAL_FINANCIAL_ASSUMPTIONS[regionCode];
  return regional || {};
}

export function useFinancialEngine(
  facility: DataCentreFacility,
  customAssumptions?: Partial<FinancialAssumptions>
): UseFinancialEngineResult {
  // Get carbon metrics for emissions data
  const { metrics: carbonMetrics } = useCarbonEngine(facility);

  const result = useMemo(() => {
    // Get region-specific defaults
    const regionalDefaults = getRegionalAssumptions(facility.region);
    
    // Merge: defaults < regional < facility < custom
    const assumptions: FinancialAssumptions = {
      ...DEFAULT_FINANCIAL_ASSUMPTIONS,
      ...regionalDefaults,
      electricityCostPerKwh: facility.costPerKwh || DEFAULT_FINANCIAL_ASSUMPTIONS.electricityCostPerKwh,
      ...customAssumptions,
    };

    // Calculate realistic GPU hours based on utilization patterns
    // Industry benchmark: 76% average utilization for AI/HPC workloads
    const avgUtilization = facility.workloadGpu.kpis.avgGpuUtilization || 76;
    const effectiveGpuHours = facility.workloadGpu.kpis.activeGpuCount * 24 * (avgUtilization / 100);

    // Build input from facility data with industry-accurate defaults
    const input: FinancialEngineInput = {
      powerKwh: facility.currentPowerDrawKw || 5000, // Default 5MW for mid-size DC
      pue: facility.pue || 1.25, // Industry target for modern green DC
      activeGpuCount: facility.workloadGpu.kpis.activeGpuCount || 800,
      gpuHoursPerDay: effectiveGpuHours,
      hourlyEmissionsKg: carbonMetrics.hourlyEmissionsKg,
      assumptions,
      // CAPEX: $12M/MW for green DC (JLL benchmark)
      capexTotal: facility.financialCarbon.financialMetrics.capexTotal || 
        (facility.currentPowerDrawKw || 5000) / 1000 * 12_000_000,
      // Revenue: Based on GPU rental at $3.50/hr average
      expectedRevenuePerYear: facility.financialCarbon.financialMetrics.revenueMonthly * 12 ||
        effectiveGpuHours * 365 * 3.50,
    };

    // Evaluate metrics
    const metrics = FinancialEngine.evaluate(input);

    // Helper functions for scenario analysis
    const simulateCarbonPriceChange = (newPrice: number) =>
      FinancialEngine.simulateCarbonPriceChange(input, newPrice);

    const simulateCoolingChange = (newPue: number) =>
      FinancialEngine.simulateCoolingEfficiencyChange(input, newPue);

    return {
      metrics,
      input,
      assumptions,
      simulateCarbonPriceChange,
      simulateCoolingChange,
    };
  }, [facility, carbonMetrics, customAssumptions]);

  return result;
}
