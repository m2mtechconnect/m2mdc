/**
 * React Hook for Carbon Engine
 * Provides reactive carbon metrics from facility data
 */

import { useMemo } from 'react';
import { CarbonEngine, type CarbonEngineInput, type CarbonMetricsOutput, type RegionCode, REGIONAL_CARBON_INTENSITY } from '@/engines/carbon';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

export interface UseCarbonEngineResult {
  metrics: CarbonMetricsOutput;
  input: CarbonEngineInput;
  regionalFeed: typeof REGIONAL_CARBON_INTENSITY[keyof typeof REGIONAL_CARBON_INTENSITY];
  
  // Comparison helpers
  compareToRegion: (toRegion: RegionCode) => ReturnType<typeof CarbonEngine.compareRegions>;
  simulatePriceShock: (newPrice: number) => ReturnType<typeof CarbonEngine.simulateCarbonPriceShock>;
  calculateBudget: (annualBudget: number, daysElapsed: number) => ReturnType<typeof CarbonEngine.calculateCarbonBudget>;
}

export function useCarbonEngine(facility: DataCentreFacility): UseCarbonEngineResult {
  const result = useMemo(() => {
    // Map facility region to RegionCode
    const region = facility.region as RegionCode;
    const regionalFeed = CarbonEngine.getRegionalIntensity(region);

    // Build input from facility data
    const input: CarbonEngineInput = {
      pue: facility.pue,
      powerKwh: facility.currentPowerDrawKw,
      carbonIntensityGPerKwh: facility.carbonIntensityGCo2Kwh || regionalFeed.carbonIntensityGPerKwh,
      renewableMixPct: facility.renewablePercent || regionalFeed.renewablePercentage,
      activeGpuCount: facility.workloadGpu.kpis.activeGpuCount,
      trainingWorkloadPct: 60, // Default training/inference split
    };

    // Evaluate metrics
    const metrics = CarbonEngine.evaluate(input);

    // Helper functions with captured context
    const compareToRegion = (toRegion: RegionCode) => 
      CarbonEngine.compareRegions(input, region, toRegion);

    const simulatePriceShock = (newPrice: number) =>
      CarbonEngine.simulateCarbonPriceShock(
        metrics,
        facility.financialCarbon.scenarios[0]?.carbonPricePerTon || 65,
        newPrice
      );

    const calculateBudget = (annualBudget: number, daysElapsed: number) =>
      CarbonEngine.calculateCarbonBudget(
        annualBudget,
        metrics.projectedAnnualEmissionsTons * (daysElapsed / 365),
        daysElapsed
      );

    return {
      metrics,
      input,
      regionalFeed,
      compareToRegion,
      simulatePriceShock,
      calculateBudget,
    };
  }, [facility]);

  return result;
}
