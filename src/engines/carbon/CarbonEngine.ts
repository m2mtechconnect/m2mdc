/**
 * Carbon Intelligence Engine
 * Calculates carbon emissions, efficiency scores, and sustainability metrics
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * GHG PROTOCOL & CARBON ACCOUNTING:
 * - GHG Protocol Corporate Standard (Scope 1, 2, 3 Emissions)
 *   https://ghgprotocol.org/corporate-standard
 * - GHG Protocol Scope 2 Guidance (Purchased Electricity)
 *   https://ghgprotocol.org/scope_2_guidance
 * - ISO 14064-1:2018 Quantification and Reporting of GHG Emissions
 *   https://www.iso.org/standard/66453.html
 * 
 * REGIONAL CARBON INTENSITY DATA:
 * - Environment and Climate Change Canada - National Inventory Report
 *   https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html
 * - Canada Energy Regulator - Provincial Grid Emission Factors
 *   https://www.cer-rec.gc.ca/en/data-analysis/energy-commodities/electricity/
 * - Quebec Hydro-Quebec (98% renewable hydro): ~15-20 gCO2e/kWh
 * - Alberta AESO (coal/gas heavy): ~450-550 gCO2e/kWh
 * - Ontario IESO (nuclear/hydro mix): ~35-50 gCO2e/kWh
 * 
 * US REGIONAL EMISSIONS:
 * - US EPA eGRID (Emissions & Generation Resource Integrated Database)
 *   https://www.epa.gov/egrid
 * - EIA (Energy Information Administration) State Electricity Profiles
 *   https://www.eia.gov/electricity/state/
 * 
 * EUROPEAN CARBON INTENSITY:
 * - European Environment Agency - CO2 Intensity of Electricity Generation
 *   https://www.eea.europa.eu/data-and-maps/daviz/co2-emission-intensity-12
 * - Electricity Maps Real-Time Carbon Intensity API
 *   https://www.electricitymaps.com/
 * 
 * CARBON PRICING:
 * - Environment and Climate Change Canada - Federal Carbon Pricing
 *   https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html
 *   Trajectory: $80/tonne (2024) → $170/tonne (2030)
 * - EU Emissions Trading System (EU ETS) Pricing
 *   https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en
 * - World Bank Carbon Pricing Dashboard
 *   https://carbonpricingdashboard.worldbank.org/
 * 
 * DATA CENTER CARBON METRICS:
 * - The Green Grid - Carbon Usage Effectiveness (CUE) Metric
 *   https://www.thegreengrid.org/en/resources/library-and-tools
 * - Google Carbon-Free Energy Percentage Methodology
 *   https://cloud.google.com/sustainability/region-carbon
 * - Microsoft Sustainability Calculator
 *   https://azure.microsoft.com/en-us/blog/microsoft-sustainability-calculator-helps-enterprises-analyze-the-carbon-emissions-of-their-it-infrastructure/
 * 
 * GPU-SPECIFIC CARBON CALCULATIONS:
 * - NVIDIA Data Center GPU Power Specifications
 *   https://www.nvidia.com/en-us/data-center/products/
 *   H100 SXM: 700W TDP, A100: 400W TDP, H200: 700W TDP
 * - MLCommons Carbon Footprint of AI Training
 *   https://mlcommons.org/en/
 * - Google AI Training Carbon Footprint Studies
 *   https://arxiv.org/abs/2104.10350
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { 
  CarbonEngineInput, 
  CarbonMetricsOutput, 
  RegionCode 
} from './types';
import { REGIONAL_CARBON_INTENSITY, BASELINE_CARBON_PER_GPU_HOUR } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class CarbonEngine {
  /**
   * Evaluate carbon metrics from facility data
   */
  static evaluate(input: CarbonEngineInput): CarbonMetricsOutput {
    const {
      pue,
      powerKwh,
      carbonIntensityGPerKwh,
      renewableMixPct,
      activeGpuCount,
      trainingWorkloadPct = 60,
    } = input;

    // Effective carbon intensity after renewable offset
    const effectiveCarbonIntensity = carbonIntensityGPerKwh * (1 - renewableMixPct / 100);

    // 2.1 Baseline Carbon Load (hourly, in grams)
    const hourlyCarbon = pue * powerKwh * effectiveCarbonIntensity;
    const hourlyEmissionsKg = hourlyCarbon / 1000;

    // Daily emissions
    const dailyEmissionsKg = hourlyEmissionsKg * 24;

    // 2.2 Per-GPU-hour carbon
    const carbonPerGpuHour = activeGpuCount > 0 
      ? hourlyCarbon / activeGpuCount 
      : 0;

    // 2.3 Annual Projection (in tonnes)
    const projectedAnnualEmissionsTons = (hourlyCarbon * 24 * 365) / 1_000_000;

    // 2.4 Renewable Offset
    const renewableOffsetPct = renewableMixPct;

    // 2.5 Carbon Efficiency Score (0-100)
    // Lower carbon per GPU-hour = higher score
    const carbonEfficiencyScore = clamp(
      100 - (carbonPerGpuHour / BASELINE_CARBON_PER_GPU_HOUR) * 50,
      0,
      100
    );

    // Scope 2 emissions (purchased electricity)
    const scope2EmissionsKg = (pue * powerKwh * carbonIntensityGPerKwh) / 1000;

    return {
      carbonPerGpuHour: Math.round(carbonPerGpuHour * 10) / 10,
      hourlyEmissionsKg: Math.round(hourlyEmissionsKg * 10) / 10,
      dailyEmissionsKg: Math.round(dailyEmissionsKg),
      projectedAnnualEmissionsTons: Math.round(projectedAnnualEmissionsTons * 10) / 10,
      renewableOffsetPct,
      carbonEfficiencyScore: Math.round(carbonEfficiencyScore),
      effectiveCarbonIntensity: Math.round(effectiveCarbonIntensity * 10) / 10,
      scope2EmissionsKg: Math.round(scope2EmissionsKg * 10) / 10,
    };
  }

  /**
   * Get regional carbon intensity feed
   */
  static getRegionalIntensity(region: RegionCode) {
    return REGIONAL_CARBON_INTENSITY[region] || REGIONAL_CARBON_INTENSITY['CA-QC'];
  }

  /**
   * Compare carbon metrics between two regions
   */
  static compareRegions(
    baseInput: CarbonEngineInput, 
    fromRegion: RegionCode, 
    toRegion: RegionCode
  ) {
    const fromFeed = this.getRegionalIntensity(fromRegion);
    const toFeed = this.getRegionalIntensity(toRegion);

    const fromMetrics = this.evaluate({
      ...baseInput,
      carbonIntensityGPerKwh: fromFeed.carbonIntensityGPerKwh,
      renewableMixPct: fromFeed.renewablePercentage,
    });

    const toMetrics = this.evaluate({
      ...baseInput,
      carbonIntensityGPerKwh: toFeed.carbonIntensityGPerKwh,
      renewableMixPct: toFeed.renewablePercentage,
    });

    return {
      from: { region: fromRegion, metrics: fromMetrics },
      to: { region: toRegion, metrics: toMetrics },
      emissionsDelta: toMetrics.projectedAnnualEmissionsTons - fromMetrics.projectedAnnualEmissionsTons,
      efficiencyDelta: toMetrics.carbonEfficiencyScore - fromMetrics.carbonEfficiencyScore,
      savings: fromMetrics.projectedAnnualEmissionsTons - toMetrics.projectedAnnualEmissionsTons,
    };
  }

  /**
   * Simulate carbon price shock
   */
  static simulateCarbonPriceShock(
    metrics: CarbonMetricsOutput,
    currentPricePerTon: number,
    newPricePerTon: number
  ) {
    const currentAnnualCost = metrics.projectedAnnualEmissionsTons * currentPricePerTon;
    const newAnnualCost = metrics.projectedAnnualEmissionsTons * newPricePerTon;
    const costIncrease = newAnnualCost - currentAnnualCost;
    const percentIncrease = (costIncrease / currentAnnualCost) * 100;

    return {
      currentPricePerTon,
      newPricePerTon,
      priceIncreasePct: ((newPricePerTon - currentPricePerTon) / currentPricePerTon) * 100,
      currentAnnualCost: Math.round(currentAnnualCost),
      newAnnualCost: Math.round(newAnnualCost),
      costIncrease: Math.round(costIncrease),
      percentIncrease: Math.round(percentIncrease),
    };
  }

  /**
   * Calculate carbon budget remaining
   */
  static calculateCarbonBudget(
    annualBudgetTons: number,
    currentEmissionsTons: number,
    daysElapsed: number
  ) {
    const proratedBudget = (annualBudgetTons / 365) * daysElapsed;
    const remaining = annualBudgetTons - currentEmissionsTons;
    const runRate = currentEmissionsTons / daysElapsed;
    const projectedTotal = runRate * 365;
    const onTrack = projectedTotal <= annualBudgetTons;

    return {
      annualBudgetTons,
      usedTons: currentEmissionsTons,
      remainingTons: remaining,
      proratedBudget: Math.round(proratedBudget * 10) / 10,
      runRateTonsPerDay: Math.round(runRate * 100) / 100,
      projectedTotalTons: Math.round(projectedTotal),
      onTrack,
      variance: Math.round(projectedTotal - annualBudgetTons),
    };
  }
}

// Singleton instance for convenience
let carbonEngineInstance: typeof CarbonEngine | null = null;

export function getCarbonEngine(): typeof CarbonEngine {
  if (!carbonEngineInstance) {
    carbonEngineInstance = CarbonEngine;
  }
  return carbonEngineInstance;
}
