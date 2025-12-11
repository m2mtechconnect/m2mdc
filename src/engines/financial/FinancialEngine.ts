/**
 * Financial & Cost Modelling Engine
 * Calculates OPEX, cost per GPU-hour, ROI, NPV, IRR, and financial health
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * DATA CENTER COST MODELING:
 * - Uptime Institute Data Center Survey (Annual OpEx/CapEx benchmarks)
 *   https://uptimeinstitute.com/resources/research-and-reports
 * - Gartner Data Center Total Cost of Ownership Model
 *   https://www.gartner.com/en/information-technology/glossary/total-cost-of-ownership-tco
 * - JLL Data Center Outlook (Construction & operational costs)
 *   https://www.us.jll.com/en/trends-and-insights/research/data-center-outlook
 * - Cushman & Wakefield Global Data Center Market Comparison
 *   https://www.cushmanwakefield.com/en/insights/global-data-center-market-comparison
 * 
 * ELECTRICITY PRICING (CANADIAN):
 * - Hydro-Québec Large Power Rate L (2024): $0.0519-$0.0589/kWh
 *   https://www.hydroquebec.com/business/customer-space/rates/rate-l-industrial-rate-large-power-customers.html
 * - Ontario Energy Board Class A Industrial Rates
 *   https://www.oeb.ca/consumer-information-and-protection/electricity-rates
 * - BC Hydro Large General Service Rate Schedule 1823
 *   https://www.bchydro.com/accounts-billing/rates-energy-use/electricity-rates/business-rates.html
 * 
 * CARBON PRICING:
 * - Environment and Climate Change Canada - Federal Carbon Pricing
 *   https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html
 *   Trajectory: $80/tonne (2024) → $170/tonne (2030)
 * - Government of Canada Greenhouse Gas Pollution Pricing Act
 *   https://laws-lois.justice.gc.ca/eng/acts/G-11.55/
 * 
 * GPU ECONOMICS:
 * - NVIDIA Data Center GPU Pricing & Specifications
 *   https://www.nvidia.com/en-us/data-center/products/
 *   H100 SXM: ~$30k/GPU, A100: ~$15k/GPU, H200: ~$35k/GPU
 * - NVIDIA DGX Cloud Pricing Models
 *   https://www.nvidia.com/en-us/data-center/dgx-cloud/
 * - MLCommons Training Cost Benchmarks
 *   https://mlcommons.org/en/
 * 
 * FINANCIAL CALCULATIONS:
 * - Discounted Cash Flow Analysis (Investopedia)
 *   https://www.investopedia.com/terms/d/dcf.asp
 * - Internal Rate of Return (IRR) - Newton-Raphson Method
 *   https://www.investopedia.com/terms/i/irr.asp
 * - Net Present Value (NPV) Calculation Standards
 *   https://www.investopedia.com/terms/n/npv.asp
 * 
 * LABOR & MAINTENANCE COSTS:
 * - Bank of Canada Prime Rate (Interest rate baseline)
 *   https://www.bankofcanada.ca/rates/daily-digest/
 * - Uptime Institute Staffing Benchmarks
 *   https://uptimeinstitute.com/resources
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { 
  FinancialEngineInput, 
  FinancialMetricsOutput,
  FinancialAssumptions 
} from './types';
import { 
  DEFAULT_FINANCIAL_ASSUMPTIONS, 
  BASELINE_COST_PER_GPU_HOUR,
  TARGET_ROI_YEARS,
  NPV_POSITIVE_THRESHOLD 
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class FinancialEngine {
  /**
   * Evaluate financial metrics from facility data
   */
  static evaluate(input: FinancialEngineInput): FinancialMetricsOutput {
    const {
      powerKwh,
      pue,
      activeGpuCount,
      gpuHoursPerDay,
      hourlyEmissionsKg,
      assumptions,
      capexTotal = 500_000_000, // Default $500M CAPEX
      expectedRevenuePerYear = 150_000_000, // Default $150M revenue
    } = input;

    const {
      electricityCostPerKwh,
      coolingCostPct,
      carbonPricePerTon,
      gpuCostPerHour,
      amortizationYears,
      interestRatePct,
      maintenanceCostPct = 3,
      laborCostMonthly = 150000,
    } = assumptions;

    // 3.1 Electricity Cost (hourly)
    const totalPowerKwh = powerKwh * pue;
    const electricityCostPerHour = totalPowerKwh * electricityCostPerKwh;

    // 3.2 Cooling Cost (included in PUE, but can add overhead)
    const coolingCostPerHour = electricityCostPerHour * coolingCostPct;

    // 3.3 Carbon Cost (hourly)
    const hourlyEmissionsKgToTons = hourlyEmissionsKg / 1000;
    const carbonCostPerHour = hourlyEmissionsKgToTons * carbonPricePerTon;

    // Hardware amortization per hour (simplified)
    const hardwareCostPerHour = activeGpuCount * gpuCostPerHour;

    // Total hourly OPEX (excluding labor which is monthly)
    const totalOpexPerHour = electricityCostPerHour + coolingCostPerHour + 
                              carbonCostPerHour + hardwareCostPerHour;

    // Daily OPEX
    const opexPerDay = totalOpexPerHour * 24 + (laborCostMonthly / 30);

    // Monthly OPEX
    const opexPerMonth = totalOpexPerHour * 24 * 30 + laborCostMonthly;

    // Annual OPEX
    const opexPerYear = opexPerMonth * 12;

    // Cost per GPU-hour
    const activeGpuHours = gpuHoursPerDay > 0 ? gpuHoursPerDay : activeGpuCount * 24;
    const costPerGpuHour = activeGpuHours > 0 
      ? (totalOpexPerHour * 24) / activeGpuHours 
      : 0;

    // Cost per MWh
    const costPerMwh = (electricityCostPerHour * 1000) / powerKwh;

    // 3.3 Carbon cost impact
    const carbonCostImpactPerDay = carbonCostPerHour * 24;
    const carbonCostImpactPerYear = carbonCostImpactPerDay * 365;
    const carbonCostPctOfOpex = (carbonCostImpactPerYear / opexPerYear) * 100;

    // 3.5 ROI & NPV calculation
    const annualNetCashFlow = expectedRevenuePerYear - opexPerYear;
    const roiYears = annualNetCashFlow > 0 
      ? capexTotal / annualNetCashFlow 
      : 999; // Very long payback if not profitable

    // Simple NPV calculation (10-year horizon)
    const discountRate = interestRatePct / 100;
    let npv = -capexTotal;
    for (let year = 1; year <= 10; year++) {
      npv += annualNetCashFlow / Math.pow(1 + discountRate, year);
    }

    // IRR approximation (simplified Newton-Raphson)
    const irr = this.calculateIRR(capexTotal, annualNetCashFlow, 10);

    // 3.6 Financial Health Score (0-100)
    let healthScore = 50; // Start at neutral

    // ROI factor (shorter payback = better)
    if (roiYears < TARGET_ROI_YEARS) {
      healthScore += 20;
    } else if (roiYears < TARGET_ROI_YEARS * 1.5) {
      healthScore += 10;
    } else if (roiYears > TARGET_ROI_YEARS * 2) {
      healthScore -= 15;
    }

    // NPV factor (positive = good)
    if (npv > capexTotal * 0.5) {
      healthScore += 20;
    } else if (npv > NPV_POSITIVE_THRESHOLD) {
      healthScore += 10;
    } else {
      healthScore -= 20;
    }

    // Cost efficiency factor (lower cost/GPU-hr = better)
    if (costPerGpuHour < BASELINE_COST_PER_GPU_HOUR * 0.7) {
      healthScore += 15;
    } else if (costPerGpuHour < BASELINE_COST_PER_GPU_HOUR) {
      healthScore += 5;
    } else {
      healthScore -= 10;
    }

    // Carbon exposure factor
    if (carbonCostPctOfOpex < 5) {
      healthScore += 5;
    } else if (carbonCostPctOfOpex > 15) {
      healthScore -= 10;
    }

    const financialHealthScore = clamp(healthScore, 0, 100);

    return {
      electricityCostPerHour: Math.round(electricityCostPerHour * 100) / 100,
      coolingCostPerHour: Math.round(coolingCostPerHour * 100) / 100,
      carbonCostPerHour: Math.round(carbonCostPerHour * 100) / 100,
      totalOpexPerHour: Math.round(totalOpexPerHour * 100) / 100,
      opexPerDay: Math.round(opexPerDay),
      opexPerMonth: Math.round(opexPerMonth),
      opexPerYear: Math.round(opexPerYear),
      costPerGpuHour: Math.round(costPerGpuHour * 1000) / 1000,
      costPerMwh: Math.round(costPerMwh * 100) / 100,
      carbonCostImpactPerDay: Math.round(carbonCostImpactPerDay * 100) / 100,
      carbonCostImpactPerYear: Math.round(carbonCostImpactPerYear),
      carbonCostPctOfOpex: Math.round(carbonCostPctOfOpex * 10) / 10,
      roiYears: Math.round(roiYears * 10) / 10,
      npv: Math.round(npv),
      irr: Math.round(irr * 10) / 10,
      financialHealthScore: Math.round(financialHealthScore),
    };
  }

  /**
   * Calculate IRR using iterative approximation
   */
  private static calculateIRR(
    initialInvestment: number, 
    annualCashFlow: number, 
    years: number
  ): number {
    let irr = 0.1; // Start with 10%
    const tolerance = 0.0001;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      let npv = -initialInvestment;
      let npvDerivative = 0;

      for (let year = 1; year <= years; year++) {
        const discountFactor = Math.pow(1 + irr, year);
        npv += annualCashFlow / discountFactor;
        npvDerivative -= (year * annualCashFlow) / Math.pow(1 + irr, year + 1);
      }

      if (Math.abs(npv) < tolerance) break;
      if (npvDerivative === 0) break;

      irr = irr - npv / npvDerivative;
    }

    return irr * 100; // Return as percentage
  }

  /**
   * Simulate carbon price change impact on financials
   */
  static simulateCarbonPriceChange(
    baseInput: FinancialEngineInput,
    newCarbonPrice: number
  ): {
    baseline: FinancialMetricsOutput;
    simulated: FinancialMetricsOutput;
    deltas: Record<string, number>;
  } {
    const baseline = this.evaluate(baseInput);
    const simulated = this.evaluate({
      ...baseInput,
      assumptions: {
        ...baseInput.assumptions,
        carbonPricePerTon: newCarbonPrice,
      },
    });

    return {
      baseline,
      simulated,
      deltas: {
        opexPerYear: simulated.opexPerYear - baseline.opexPerYear,
        costPerGpuHour: simulated.costPerGpuHour - baseline.costPerGpuHour,
        carbonCostImpactPerYear: simulated.carbonCostImpactPerYear - baseline.carbonCostImpactPerYear,
        financialHealthScore: simulated.financialHealthScore - baseline.financialHealthScore,
        roiYears: simulated.roiYears - baseline.roiYears,
      },
    };
  }

  /**
   * Simulate cooling efficiency change
   */
  static simulateCoolingEfficiencyChange(
    baseInput: FinancialEngineInput,
    newPue: number
  ): {
    baseline: FinancialMetricsOutput;
    simulated: FinancialMetricsOutput;
    deltas: Record<string, number>;
  } {
    const baseline = this.evaluate(baseInput);
    
    // Adjust emissions proportionally with PUE
    const emissionsRatio = newPue / baseInput.pue;
    const simulated = this.evaluate({
      ...baseInput,
      pue: newPue,
      hourlyEmissionsKg: baseInput.hourlyEmissionsKg * emissionsRatio,
    });

    return {
      baseline,
      simulated,
      deltas: {
        opexPerYear: simulated.opexPerYear - baseline.opexPerYear,
        costPerGpuHour: simulated.costPerGpuHour - baseline.costPerGpuHour,
        electricityCostPerHour: simulated.electricityCostPerHour - baseline.electricityCostPerHour,
        financialHealthScore: simulated.financialHealthScore - baseline.financialHealthScore,
      },
    };
  }

  /**
   * Get default assumptions
   */
  static getDefaultAssumptions(): typeof DEFAULT_FINANCIAL_ASSUMPTIONS {
    return { ...DEFAULT_FINANCIAL_ASSUMPTIONS };
  }
}

// Singleton instance for convenience
let financialEngineInstance: typeof FinancialEngine | null = null;

export function getFinancialEngine(): typeof FinancialEngine {
  if (!financialEngineInstance) {
    financialEngineInstance = FinancialEngine;
  }
  return financialEngineInstance;
}
