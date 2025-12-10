/**
 * Financial Engine Types
 * Defines schema for cost modeling, ROI, NPV, and financial metrics
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

// Default assumptions for Canadian sovereign DC
export const DEFAULT_FINANCIAL_ASSUMPTIONS: FinancialAssumptions = {
  electricityCostPerKwh: 0.065,     // Quebec rate
  coolingCostPct: 0.25,             // 25% of power goes to cooling
  carbonPricePerTon: 65,            // Current Canadian carbon price
  gpuCostPerHour: 0.50,             // Hardware amortization
  amortizationYears: 5,
  interestRatePct: 6.5,
  maintenanceCostPct: 3,
  laborCostMonthly: 150000,
};

// Baseline values for scoring
export const BASELINE_COST_PER_GPU_HOUR = 4.00;
export const TARGET_ROI_YEARS = 5;
export const NPV_POSITIVE_THRESHOLD = 0;
