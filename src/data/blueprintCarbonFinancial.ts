/**
 * Blueprint Carbon & Financial Schema
 * Extends the Data Centre Blueprint with carbon and financial model sections
 */

import { REGIONAL_CARBON_INTENSITY, type RegionCode } from '@/engines/carbon';
import { DEFAULT_FINANCIAL_ASSUMPTIONS, type FinancialAssumptions } from '@/engines/financial';

// Carbon Model Blueprint Schema
export interface BlueprintCarbonModel {
  region: RegionCode;
  carbonIntensityGPerKwh: number;
  renewablePercentage: number;
  gridType: string;
  carbonPricePerTon: number;
  offsetStrategy?: 'none' | 'partial' | 'full';
  certifications?: string[];
}

// Financial Model Blueprint Schema
export interface BlueprintFinancialModel {
  assumptions: FinancialAssumptions;
  capexTotal: number;
  expectedRevenuePerYear: number;
  costThresholds: {
    maxCostPerGpuHour: number;
    targetRoiYears: number;
    minNpv: number;
  };
  budgetAllocations?: {
    electricity: number;
    cooling: number;
    maintenance: number;
    carbon: number;
  };
}

// Energy Profile Blueprint Schema
export interface BlueprintEnergyProfile {
  totalCapacityMw: number;
  currentDrawMw: number;
  pueTarget: number;
  pueActual: number;
  coolingType: 'air' | 'liquid' | 'hybrid' | 'immersion';
  upsCapacityKva: number;
  generatorCapacityKw: number;
  redundancyLevel: 'N' | 'N+1' | '2N' | '2N+1';
}

// Complete Carbon & Financial Blueprint Extension
export interface BlueprintCarbonFinancialExtension {
  carbonModel: BlueprintCarbonModel;
  financialModel: BlueprintFinancialModel;
  energyProfile: BlueprintEnergyProfile;
}

/**
 * Generate default carbon model for a region
 */
/**
 * Generate default carbon model for a region
 * Carbon pricing sources:
 * - Canada: Federal carbon price $80/tonne (2024), rising to $170/tonne by 2030
 * - BC: Carbon tax $80/tonne (2024) - first jurisdiction in North America
 * - Quebec: Cap-and-trade linked with California, ~$45 CAD/tonne
 * - EU ETS: ~€85-100/tonne
 */
export function generateDefaultCarbonModel(region: RegionCode = 'CA-QC'): BlueprintCarbonModel {
  const regionalData = REGIONAL_CARBON_INTENSITY[region];
  
  // Regional carbon pricing based on jurisdiction
  const carbonPriceByRegion: Record<string, number> = {
    'CA-QC': 80,    // Federal backstop + provincial mechanisms
    'CA-ON': 80,    // Federal carbon pricing
    'CA-BC': 80,    // BC Carbon Tax (first in North America, 2008)
    'CA-AB': 80,    // TIER system (Technology Innovation and Emissions Reduction)
    'US-WEST': 32,  // California Cap-and-Trade
    'US-EAST': 15,  // RGGI (Regional Greenhouse Gas Initiative)
    'EU': 95,       // EU ETS average 2024
    'EU-NORDIC': 95,
  };
  
  return {
    region,
    carbonIntensityGPerKwh: regionalData.carbonIntensityGPerKwh,
    renewablePercentage: regionalData.renewablePercentage,
    gridType: regionalData.gridType,
    carbonPricePerTon: carbonPriceByRegion[region] || 80, // Default to Canadian federal rate
    offsetStrategy: 'partial',
    certifications: ['ISO 14001', 'ISO 50001', 'Carbon Trust Standard'],
  };
}

/**
 * Generate default financial model
 */
export function generateDefaultFinancialModel(): BlueprintFinancialModel {
  return {
    assumptions: { ...DEFAULT_FINANCIAL_ASSUMPTIONS },
    capexTotal: 500_000_000,
    expectedRevenuePerYear: 150_000_000,
    costThresholds: {
      maxCostPerGpuHour: 3.0,
      targetRoiYears: 5,
      minNpv: 0,
    },
    budgetAllocations: {
      electricity: 0.45,
      cooling: 0.20,
      maintenance: 0.15,
      carbon: 0.05,
    },
  };
}

/**
 * Generate default energy profile
 */
export function generateDefaultEnergyProfile(): BlueprintEnergyProfile {
  return {
    totalCapacityMw: 12,
    currentDrawMw: 8.5,
    pueTarget: 1.15,
    pueActual: 1.2,
    coolingType: 'hybrid',
    upsCapacityKva: 15000,
    generatorCapacityKw: 20000,
    redundancyLevel: '2N',
  };
}

/**
 * Generate complete carbon & financial blueprint extension
 */
export function generateCarbonFinancialBlueprint(
  region: RegionCode = 'CA-QC'
): BlueprintCarbonFinancialExtension {
  return {
    carbonModel: generateDefaultCarbonModel(region),
    financialModel: generateDefaultFinancialModel(),
    energyProfile: generateDefaultEnergyProfile(),
  };
}

/**
 * Serialize carbon & financial blueprint to JSON
 */
export function serializeCarbonFinancialBlueprint(
  extension: BlueprintCarbonFinancialExtension
): string {
  return JSON.stringify(extension, null, 2);
}

/**
 * Validate carbon & financial blueprint
 */
export function validateCarbonFinancialBlueprint(
  extension: BlueprintCarbonFinancialExtension
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Carbon model validation
  if (!extension.carbonModel.region) {
    errors.push('Carbon model missing region');
  }
  if (extension.carbonModel.carbonIntensityGPerKwh < 0) {
    errors.push('Carbon intensity cannot be negative');
  }
  if (extension.carbonModel.renewablePercentage < 0 || extension.carbonModel.renewablePercentage > 100) {
    errors.push('Renewable percentage must be 0-100');
  }
  
  // Financial model validation
  if (extension.financialModel.capexTotal < 0) {
    errors.push('CAPEX cannot be negative');
  }
  if (extension.financialModel.assumptions.electricityCostPerKwh < 0) {
    errors.push('Electricity cost cannot be negative');
  }
  if (extension.financialModel.costThresholds.targetRoiYears < 1) {
    errors.push('Target ROI must be at least 1 year');
  }
  
  // Energy profile validation
  if (extension.energyProfile.pueActual < 1.0) {
    errors.push('PUE cannot be less than 1.0');
  }
  if (extension.energyProfile.currentDrawMw > extension.energyProfile.totalCapacityMw) {
    errors.push('Current draw exceeds total capacity');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get blueprint section for display in Blueprint UI
 */
export function getCarbonFinancialBlueprintSections(
  extension: BlueprintCarbonFinancialExtension
): Array<{ title: string; items: Array<{ label: string; value: string }> }> {
  return [
    {
      title: 'Carbon Model',
      items: [
        { label: 'Region', value: extension.carbonModel.region },
        { label: 'Carbon Intensity', value: `${extension.carbonModel.carbonIntensityGPerKwh} gCO₂/kWh` },
        { label: 'Renewable Mix', value: `${extension.carbonModel.renewablePercentage}%` },
        { label: 'Grid Type', value: extension.carbonModel.gridType },
        { label: 'Carbon Price', value: `$${extension.carbonModel.carbonPricePerTon}/ton` },
        { label: 'Offset Strategy', value: extension.carbonModel.offsetStrategy || 'None' },
      ],
    },
    {
      title: 'Financial Model',
      items: [
        { label: 'CAPEX', value: `$${extension.financialModel.capexTotal.toLocaleString()}` },
        { label: 'Expected Revenue', value: `$${extension.financialModel.expectedRevenuePerYear.toLocaleString()}/yr` },
        { label: 'Electricity Rate', value: `$${extension.financialModel.assumptions.electricityCostPerKwh}/kWh` },
        { label: 'Target ROI', value: `${extension.financialModel.costThresholds.targetRoiYears} years` },
        { label: 'Max GPU-hour Cost', value: `$${extension.financialModel.costThresholds.maxCostPerGpuHour}` },
        { label: 'Amortization', value: `${extension.financialModel.assumptions.amortizationYears} years` },
      ],
    },
    {
      title: 'Energy & Cost Assumptions',
      items: [
        { label: 'Total Capacity', value: `${extension.energyProfile.totalCapacityMw} MW` },
        { label: 'Current Draw', value: `${extension.energyProfile.currentDrawMw} MW` },
        { label: 'PUE Target', value: extension.energyProfile.pueTarget.toString() },
        { label: 'PUE Actual', value: extension.energyProfile.pueActual.toString() },
        { label: 'Cooling Type', value: extension.energyProfile.coolingType },
        { label: 'Redundancy', value: extension.energyProfile.redundancyLevel },
      ],
    },
  ];
}
