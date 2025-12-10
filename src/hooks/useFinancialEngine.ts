/**
 * React Hook for Financial Engine
 * Provides reactive financial metrics from facility data
 */

import { useMemo } from 'react';
import { 
  FinancialEngine, 
  type FinancialEngineInput, 
  type FinancialMetricsOutput,
  type FinancialAssumptions,
  DEFAULT_FINANCIAL_ASSUMPTIONS 
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

export function useFinancialEngine(
  facility: DataCentreFacility,
  customAssumptions?: Partial<FinancialAssumptions>
): UseFinancialEngineResult {
  // Get carbon metrics for emissions data
  const { metrics: carbonMetrics } = useCarbonEngine(facility);

  const result = useMemo(() => {
    // Merge custom assumptions with defaults
    const assumptions: FinancialAssumptions = {
      ...DEFAULT_FINANCIAL_ASSUMPTIONS,
      electricityCostPerKwh: facility.costPerKwh,
      ...customAssumptions,
    };

    // Build input from facility data
    const input: FinancialEngineInput = {
      powerKwh: facility.currentPowerDrawKw,
      pue: facility.pue,
      activeGpuCount: facility.workloadGpu.kpis.activeGpuCount,
      gpuHoursPerDay: facility.workloadGpu.kpis.activeGpuCount * 24 * 
        (facility.workloadGpu.kpis.avgGpuUtilization / 100),
      hourlyEmissionsKg: carbonMetrics.hourlyEmissionsKg,
      assumptions,
      capexTotal: facility.financialCarbon.financialMetrics.capexTotal,
      expectedRevenuePerYear: facility.financialCarbon.financialMetrics.revenueMonthly * 12,
    };

    // Evaluate metrics
    const metrics = FinancialEngine.evaluate(input);

    // Helper functions
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
