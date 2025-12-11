/**
 * Financial Model with Executive Narrative Generator
 * 
 * Generates enhanced financial models with:
 * - Regional carbon data
 * - Executive-grade narrative
 * - Projected savings and payback
 */

import type { DCScanIndustry, DCBlueprintTemplate } from '@/types/dcScan';
import type { EnhancedFinancialModel, REGIONAL_CARBON_DATA } from '@/types/enhancedRecommendation';

// Regional carbon data (also exported from types but defined here for use)
const REGIONAL_CARBON: Record<string, { intensity: number; renewable: number; price: number; name: string }> = {
  'ca-central-1': { intensity: 1.2, renewable: 99.8, price: 80, name: 'Quebec' },
  'ca-east-1': { intensity: 35, renewable: 94, price: 80, name: 'Ontario' },
  'ca-west-1': { intensity: 10, renewable: 98, price: 80, name: 'British Columbia' },
  'ca-west-2': { intensity: 540, renewable: 18, price: 80, name: 'Alberta' },
  'us-east-1': { intensity: 320, renewable: 22, price: 0, name: 'US East' },
  'us-west-2': { intensity: 85, renewable: 65, price: 0, name: 'US West' },
  'eu-west-1': { intensity: 280, renewable: 42, price: 90, name: 'Ireland' },
};

// Industry-specific power cost multipliers ($/kWh avg)
const INDUSTRY_POWER_RATES: Record<DCScanIndustry, number> = {
  finance: 0.12,
  government: 0.10,
  retail: 0.11,
  telecom: 0.09,
  cloud_saas: 0.08,
  manufacturing: 0.085,
  healthcare: 0.11,
  energy: 0.07,
  ai_compute: 0.08,
  other: 0.10,
};

/**
 * Generate enhanced financial model with executive narrative
 */
export function generateFinancialModel(
  template: DCBlueprintTemplate,
  industry: DCScanIndustry,
  companyName: string,
  capacityKw: number,
  regionCode: string = 'ca-central-1'
): EnhancedFinancialModel {
  const region = REGIONAL_CARBON[regionCode] || REGIONAL_CARBON['ca-central-1'];
  const powerRate = INDUSTRY_POWER_RATES[industry];
  
  // Calculate base metrics
  const hoursPerYear = 8760;
  const avgUtilization = 0.65; // 65% average utilization
  const actualPowerKw = capacityKw * avgUtilization;
  const annualPowerKwh = actualPowerKw * hoursPerYear;
  const annualPowerCostUsd = annualPowerKwh * powerRate;
  
  // Carbon calculations
  const carbonIntensityGPerKwh = region.intensity;
  const annualCarbonKg = (annualPowerKwh * carbonIntensityGPerKwh) / 1000;
  const annualCarbonTonnes = annualCarbonKg / 1000;
  
  // Projected improvements (based on template targets)
  const currentPue = 1.6; // Typical baseline
  const targetPue = template.targetPue;
  const pueImprovement = (currentPue - targetPue) / currentPue;
  
  const projectedOpexReductionPct = Math.round(pueImprovement * 100 * 0.8); // 80% of PUE improvement translates to OPEX
  const projectedCarbonReductionPct = Math.round(
    (template.renewableTargetPct - 40) * 0.5 + pueImprovement * 100 * 0.3
  ); // Combination of renewable gains and efficiency
  
  const projectedAnnualSavingsUsd = annualPowerCostUsd * (projectedOpexReductionPct / 100);
  
  // Payback calculation (simplified)
  const estimatedUpgradeCost = capacityKw * 1500; // ~$1500/kW upgrade cost
  const paybackYears = projectedAnnualSavingsUsd > 0 
    ? Math.round((estimatedUpgradeCost / projectedAnnualSavingsUsd) * 10) / 10
    : 8;
  
  // Generate executive narrative
  const executiveNarrative = generateExecutiveNarrative({
    companyName,
    industry,
    regionName: region.name,
    projectedOpexReductionPct,
    projectedCarbonReductionPct,
    paybackYears,
    renewableTarget: template.renewableTargetPct,
    carbonIntensity: carbonIntensityGPerKwh,
    projectedSavings: projectedAnnualSavingsUsd,
  });
  
  return {
    annualPowerCostUsd: Math.round(annualPowerCostUsd),
    annualCarbonTonnes: Math.round(annualCarbonTonnes),
    carbonIntensityGPerKwh,
    paybackYears,
    projectedOpexReductionPct,
    projectedCarbonReductionPct,
    projectedAnnualSavingsUsd: Math.round(projectedAnnualSavingsUsd),
    regionCode,
    gridCarbonIntensity: carbonIntensityGPerKwh,
    carbonPricePerTonne: region.price,
    executiveNarrative,
  };
}

interface NarrativeParams {
  companyName: string;
  industry: DCScanIndustry;
  regionName: string;
  projectedOpexReductionPct: number;
  projectedCarbonReductionPct: number;
  paybackYears: number;
  renewableTarget: number;
  carbonIntensity: number;
  projectedSavings: number;
}

/**
 * Generate executive-grade narrative paragraph
 */
function generateExecutiveNarrative(params: NarrativeParams): string {
  const {
    companyName,
    industry,
    regionName,
    projectedOpexReductionPct,
    projectedCarbonReductionPct,
    paybackYears,
    renewableTarget,
    carbonIntensity,
    projectedSavings,
  } = params;
  
  const savingsFormatted = formatCurrency(projectedSavings);
  const companyRef = companyName !== 'This company' ? companyName : 'The facility';
  
  // Build narrative based on region and improvements
  let narrative = '';
  
  if (carbonIntensity < 50) {
    // Clean grid region (Quebec, BC)
    narrative = `${companyRef}'s data centre in ${regionName} benefits from one of the cleanest grids globally with carbon intensity of just ${carbonIntensity} gCO₂/kWh. `;
    narrative += `Projected to reduce OPEX by ${projectedOpexReductionPct}% through cooling and power optimization, `;
    narrative += `with estimated annual savings of ${savingsFormatted} and a ${paybackYears}-year payback period. `;
    narrative += `Carbon footprint projected to decrease ~${projectedCarbonReductionPct}% through ${renewableTarget}% renewable procurement and workload scheduling optimization.`;
  } else if (carbonIntensity < 200) {
    // Moderate grid (Ontario, US West)
    narrative = `${companyRef}'s ${regionName} facility operates on a moderate-carbon grid (${carbonIntensity} gCO₂/kWh). `;
    narrative += `Implementing the green twin is projected to reduce OPEX by ${projectedOpexReductionPct}% with ${savingsFormatted} annual savings and a ${paybackYears}-year payback. `;
    narrative += `Carbon reduction of ~${projectedCarbonReductionPct}% achievable through renewable PPAs and carbon-aware workload shifting.`;
  } else {
    // High carbon grid (Alberta, high-carbon regions)
    narrative = `${companyRef}'s ${regionName} facility faces higher carbon exposure (${carbonIntensity} gCO₂/kWh grid intensity). `;
    narrative += `The green twin provides significant opportunity: projected ${projectedOpexReductionPct}% OPEX reduction with ${savingsFormatted} annual savings. `;
    narrative += `Critical carbon reduction of ~${projectedCarbonReductionPct}% achievable through aggressive renewable procurement targeting ${renewableTarget}% and efficiency optimization. `;
    narrative += `Payback period estimated at ${paybackYears} years with additional carbon pricing risk mitigation.`;
  }
  
  return narrative;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}
