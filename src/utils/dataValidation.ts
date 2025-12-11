/**
 * Data Validation Utilities for Sovereign Green AI Data Centre Twin
 * Enforces industry-accurate values and detects mock/placeholder data
 */

import { detectMockDataPatterns, validateDataCentreValue } from '@/data/industryAccurateDefaults';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate PUE value against industry standards
 * Valid range: 1.0 - 2.0 (ASHRAE/Uptime Institute)
 */
export function validatePUE(value: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (value < 1.0) {
    errors.push(`PUE cannot be less than 1.0 (got ${value}). PUE = 1.0 represents theoretical perfect efficiency.`);
  }
  if (value > 2.0) {
    errors.push(`PUE value ${value} exceeds realistic range. Modern data centres typically achieve 1.1-1.7.`);
  }
  if (value > 1.5 && value <= 2.0) {
    warnings.push(`PUE of ${value} indicates inefficient cooling. Target: 1.2-1.3 for green facilities.`);
  }
  if (value < 1.1) {
    warnings.push(`PUE of ${value} is exceptional. Verify measurement accuracy.`);
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate carbon intensity against regional benchmarks
 * Quebec: 1-35 g/kWh (hydro), Alberta: 400-700 g/kWh (gas)
 */
export function validateCarbonIntensity(value: number, region: string = 'CA-QC'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const regionalBenchmarks: Record<string, { min: number; max: number; typical: number }> = {
    'CA-QC': { min: 0.5, max: 50, typical: 1.2 },    // Quebec hydro
    'CA-ON': { min: 20, max: 120, typical: 45 },     // Ontario mixed
    'CA-AB': { min: 350, max: 750, typical: 540 },   // Alberta gas
    'CA-BC': { min: 5, max: 40, typical: 12 },       // BC hydro
    'US-WA': { min: 40, max: 150, typical: 85 },     // Washington mixed
    'US-CA': { min: 150, max: 350, typical: 220 },   // California
  };
  
  const benchmark = regionalBenchmarks[region] || { min: 0, max: 1000, typical: 400 };
  
  if (value < 0) {
    errors.push(`Carbon intensity cannot be negative (got ${value}g/kWh).`);
  }
  if (value < benchmark.min * 0.5) {
    warnings.push(`Carbon intensity ${value}g/kWh is unusually low for ${region}. Verify grid data source.`);
  }
  if (value > benchmark.max * 1.2) {
    warnings.push(`Carbon intensity ${value}g/kWh exceeds expected range for ${region}. Consider data accuracy.`);
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate GPU utilization
 * Valid range: 0-100%
 */
export function validateGPUUtilization(value: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (value < 0 || value > 100) {
    errors.push(`GPU utilization must be 0-100% (got ${value}%).`);
  }
  if (value > 95) {
    warnings.push(`GPU utilization at ${value}% indicates saturation risk. Consider capacity planning.`);
  }
  if (value < 40) {
    warnings.push(`GPU utilization at ${value}% suggests underutilization. Review workload scheduling.`);
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate thermal temperature (ASHRAE A1/A2 compliance)
 * A1: 18-27°C allowable, A2: 10-35°C allowable
 */
export function validateTemperature(value: number, ashraeTier: 'A1' | 'A2' = 'A1'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const limits = {
    'A1': { min: 18, max: 27, recommended: { min: 20, max: 25 } },
    'A2': { min: 10, max: 35, recommended: { min: 18, max: 27 } },
  };
  
  const limit = limits[ashraeTier];
  
  if (value < limit.min || value > limit.max) {
    errors.push(`Temperature ${value}°C outside ASHRAE ${ashraeTier} allowable range (${limit.min}-${limit.max}°C).`);
  }
  if (value < limit.recommended.min || value > limit.recommended.max) {
    warnings.push(`Temperature ${value}°C outside ASHRAE ${ashraeTier} recommended range (${limit.recommended.min}-${limit.recommended.max}°C).`);
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate financial values
 */
export function validateFinancialValue(value: number, type: 'cost' | 'savings' | 'roi'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (type === 'roi') {
    if (value < -50 || value > 100) {
      warnings.push(`ROI of ${value}% is outside typical range (-50% to 100%). Verify assumptions.`);
    }
  }
  
  if (type === 'cost' && value < 0) {
    errors.push(`Cost cannot be negative (got ${value}).`);
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Detect and reject mock/placeholder data patterns
 */
export function validateNoMockData(text: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (detectMockDataPatterns(text)) {
    errors.push(`Detected mock/placeholder data pattern in: "${text.substring(0, 50)}...". Replace with industry-accurate values.`);
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Comprehensive validation for DC twin configuration
 */
export function validateDCTwinConfig(config: Record<string, any>): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  
  // Validate PUE if present
  if (config.pue !== undefined) {
    const pueResult = validatePUE(config.pue);
    allErrors.push(...pueResult.errors);
    allWarnings.push(...pueResult.warnings);
  }
  
  // Validate carbon intensity if present
  if (config.carbonIntensity !== undefined) {
    const carbonResult = validateCarbonIntensity(config.carbonIntensity, config.region);
    allErrors.push(...carbonResult.errors);
    allWarnings.push(...carbonResult.warnings);
  }
  
  // Validate GPU utilization if present
  if (config.gpuUtilization !== undefined) {
    const gpuResult = validateGPUUtilization(config.gpuUtilization);
    allErrors.push(...gpuResult.errors);
    allWarnings.push(...gpuResult.warnings);
  }
  
  // Check for mock data in string fields
  Object.values(config).forEach((value) => {
    if (typeof value === 'string') {
      const mockResult = validateNoMockData(value);
      allErrors.push(...mockResult.errors);
      allWarnings.push(...mockResult.warnings);
    }
  });
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Industry-standard value ranges for quick reference
 */
export const INDUSTRY_VALUE_RANGES = {
  pue: { min: 1.0, max: 2.0, greenTarget: 1.25, excellent: 1.15 },
  gpuUtilization: { min: 0, max: 100, target: 75, warning: 90 },
  thermalInlet: { min: 18, max: 27, target: 22, warning: 25 },
  thermalDeltaT: { min: 8, max: 18, target: 12, warning: 15 },
  carbonIntensity: { // g/kWh by region
    quebecHydro: 1.2,
    ontarioMixed: 45,
    albertaGas: 540,
    usAverage: 400,
  },
  financials: { // Per MW for 5MW facility
    capexPerMw: { min: 9_000_000, max: 14_000_000 },
    opexPerYear: { min: 1_600_000, max: 2_400_000 },
    paybackYears: { min: 3, max: 7 },
  },
} as const;
