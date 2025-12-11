/**
 * Financial Engine Types
 * Defines schema for cost modeling, ROI, NPV, and financial metrics
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ELECTRICITY PRICING (BY REGION):
 * - Hydro-Québec Large Power Rate L: $0.0519-$0.0589/kWh (lowest in North America)
 *   https://www.hydroquebec.com/business/customer-space/rates/rate-l-industrial-rate-large-power-customers.html
 * - Ontario Class A Industrial: ~$0.128/kWh (ICI rate + GA + delivery)
 *   https://www.oeb.ca/consumer-information-and-protection/electricity-rates
 * - Alberta AESO Pool Price + Distribution: ~$0.089/kWh
 *   https://www.aeso.ca/market/market-and-system-reporting/
 * - BC Hydro Large General Service: ~$0.062/kWh
 *   https://www.bchydro.com/accounts-billing/rates-energy-use/electricity-rates.html
 * - US PJM Region Average: ~$0.085/kWh
 *   https://www.pjm.com/markets-and-operations/energy.aspx
 * - California (PG&E/SCE): ~$0.095/kWh industrial
 *   https://www.cpuc.ca.gov/industries-and-topics/electrical-energy
 * 
 * CARBON PRICING PROGRAMS:
 * - Canada Federal Backstop: $80/tonne (2024) → $170/tonne (2030)
 *   https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html
 * - California Cap-and-Trade: ~$30 USD/tonne
 *   https://ww2.arb.ca.gov/our-work/programs/cap-and-trade-program
 * - RGGI (Regional Greenhouse Gas Initiative): ~$15 USD/tonne
 *   https://www.rggi.org/
 * 
 * GPU HARDWARE COSTS:
 * - NVIDIA H100 SXM: ~$30,000 MSRP, 5-year amortization @ 80% util = $0.42/GPU-hr
 *   https://www.nvidia.com/en-us/data-center/h100/
 * - NVIDIA A100 80GB: ~$15,000 MSRP
 * - NVIDIA H200: ~$35,000 estimated
 * - Cloud GPU pricing comparison (AWS, GCP, Azure): $1.50-$4.50/GPU-hr
 *   https://cloud.google.com/compute/gpus-pricing
 * 
 * CAPEX BENCHMARKS:
 * - JLL Data Center Outlook 2024: $12-15M/MW greenfield construction
 *   https://www.us.jll.com/en/trends-and-insights/research/data-center-outlook
 * - Cushman & Wakefield: $8M/MW brownfield retrofit
 *   https://www.cushmanwakefield.com/en/insights
 * - AI-optimized liquid-cooled: $15-18M/MW premium
 * 
 * OPERATIONAL BENCHMARKS:
 * - Uptime Institute: 2-3% of CAPEX annually for maintenance
 *   https://uptimeinstitute.com/resources/research-and-reports
 * - Staffing: 15 FTE per 5MW facility (NOC, facilities, security)
 * - Bank of Canada Prime Rate: 5.75% (December 2024)
 *   https://www.bankofcanada.ca/rates/daily-digest/
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface FinancialAssumptions {
  electricityCostPerKwh: number;
  coolingCostPct: number;           // % of electricity cost
  carbonPricePerTon: number;
  gpuCostPerHour: number;           // hardware amortization per GPU-hour
  amortizationYears: number;
  interestRatePct: number;
  maintenanceCostPct?: number;      // % of CAPEX annually
  laborCostMonthly?: number;
}

export interface FinancialMetricsOutput {
  // Operational costs
  electricityCostPerHour: number;
  coolingCostPerHour: number;
  carbonCostPerHour: number;
  totalOpexPerHour: number;
  opexPerDay: number;
  opexPerMonth: number;
  opexPerYear: number;
  
  // Per-unit costs
  costPerGpuHour: number;
  costPerMwh: number;
  
  // Carbon impact
  carbonCostImpactPerDay: number;
  carbonCostImpactPerYear: number;
  carbonCostPctOfOpex: number;
  
  // Investment metrics
  roiYears: number;
  npv: number;
  irr: number;
  
  // Score
  financialHealthScore: number;     // 0–100
}

export interface FinancialEngineInput {
  // Power & infrastructure
  powerKwh: number;                 // real-time power draw
  pue: number;
  
  // Workload
  activeGpuCount: number;
  gpuHoursPerDay: number;
  
  // Carbon
  hourlyEmissionsKg: number;
  
  // Financial assumptions
  assumptions: FinancialAssumptions;
  
  // Optional: CAPEX for ROI calculation
  capexTotal?: number;
  expectedRevenuePerYear?: number;
}

/**
 * Default assumptions for Canadian Sovereign Green AI Data Centre
 * Based on: Hydro-Québec commercial rates, Canada Carbon Pricing Act 2024,
 * NVIDIA DGX operational benchmarks, Uptime Institute OpEx surveys
 */
export const DEFAULT_FINANCIAL_ASSUMPTIONS: FinancialAssumptions = {
  electricityCostPerKwh: 0.055,     // Hydro-Québec Large Power Rate L (2024): $0.0519-0.0589/kWh
  coolingCostPct: 0.22,             // Modern liquid-cooled DC: 18-25% of IT load for cooling overhead
  carbonPricePerTon: 80,            // Canada Carbon Pricing: $80/tonne (2024), rising to $170 by 2030
  gpuCostPerHour: 0.42,             // NVIDIA H100 amortization: ~$30k/GPU over 5yr @ 80% util = $0.42/hr
  amortizationYears: 5,             // Industry standard GPU refresh cycle
  interestRatePct: 5.75,            // Bank of Canada prime + 100bps (Dec 2024)
  maintenanceCostPct: 2.5,          // Uptime Institute benchmark: 2-3% of CAPEX annually
  laborCostMonthly: 185000,         // 5MW facility: ~15 FTE @ avg $148k CAD/yr = $185k/month
};

/**
 * Regional Financial Assumptions
 * Source: Provincial utility rate schedules, NRCan energy statistics
 */
export const REGIONAL_FINANCIAL_ASSUMPTIONS: Record<string, Partial<FinancialAssumptions>> = {
  'CA-QC': {
    electricityCostPerKwh: 0.055,   // Hydro-Québec: lowest in North America
    carbonPricePerTon: 80,
  },
  'CA-ON': {
    electricityCostPerKwh: 0.128,   // Ontario: Class A industrial rate
    carbonPricePerTon: 80,
  },
  'CA-AB': {
    electricityCostPerKwh: 0.089,   // Alberta: market rate + distribution
    carbonPricePerTon: 80,
  },
  'CA-BC': {
    electricityCostPerKwh: 0.062,   // BC Hydro: Large General Service
    carbonPricePerTon: 80,
  },
  'US-WEST': {
    electricityCostPerKwh: 0.095,   // PG&E/SCE industrial average
    carbonPricePerTon: 30,          // California cap-and-trade
  },
  'US-EAST': {
    electricityCostPerKwh: 0.085,   // PJM region average
    carbonPricePerTon: 15,          // RGGI carbon price
  },
};

/**
 * Baseline values for financial health scoring
 * Source: Uptime Institute 2024 Data Center Survey, Gartner TCO models
 */
export const BASELINE_COST_PER_GPU_HOUR = 3.50;     // Industry average for H100 cloud pricing
export const TARGET_ROI_YEARS = 4.5;                // Green DC payback target with incentives
export const NPV_POSITIVE_THRESHOLD = 0;

/**
 * CAPEX benchmarks by facility type
 * Source: JLL Data Center Outlook 2024, Cushman & Wakefield
 */
export const CAPEX_BENCHMARKS = {
  perMwBuildCost: {
    greenfield: 12_000_000,         // $12M/MW for new green DC construction
    retrofit: 8_000_000,            // $8M/MW for brownfield retrofit
    aiOptimized: 15_000_000,        // $15M/MW for liquid-cooled AI clusters
  },
  perRackCost: {
    standard: 25_000,               // Standard 10kW rack
    highDensity: 45_000,            // 30kW+ GPU rack with liquid cooling
    aiCompute: 85_000,              // 80kW+ DGX-style rack
  },
};
