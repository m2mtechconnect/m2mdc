/**
 * Carbon Engine Types
 * Defines schema for carbon intensity, emissions, and sustainability metrics
 */

export type RegionCode = 'CA-QC' | 'CA-ON' | 'CA-AB' | 'CA-BC' | 'US-WEST' | 'US-EAST' | 'EU' | string;

export interface CarbonIntensityFeed {
  region: RegionCode;
  carbonIntensityGPerKwh: number;
  renewablePercentage: number;
  lastUpdated: string;
}

export interface DataCentreEnergyProfile {
  powerKwh: number;
  pue: number;
  renewableMixPct: number;
  carbonIntensity: number;
}

export interface CarbonMetricsOutput {
  carbonPerGpuHour: number;        // gCO2 per GPU-hour
  hourlyEmissionsKg: number;
  dailyEmissionsKg: number;
  projectedAnnualEmissionsTons: number;
  renewableOffsetPct: number;
  carbonEfficiencyScore: number;   // 0–100
  effectiveCarbonIntensity: number;
  scope2EmissionsKg: number;
}

export interface CarbonEngineInput {
  pue: number;
  powerKwh: number;
  carbonIntensityGPerKwh: number;
  renewableMixPct: number;
  activeGpuCount: number;
  trainingWorkloadPct?: number;    // % of workload that's training vs inference
}

// Regional carbon intensity data (gCO2/kWh)
export const REGIONAL_CARBON_INTENSITY: Record<RegionCode, CarbonIntensityFeed> = {
  'CA-QC': {
    region: 'CA-QC',
    carbonIntensityGPerKwh: 15,      // Quebec: ~95% hydro
    renewablePercentage: 95,
    lastUpdated: new Date().toISOString(),
  },
  'CA-ON': {
    region: 'CA-ON',
    carbonIntensityGPerKwh: 35,      // Ontario: mix of nuclear, hydro
    renewablePercentage: 75,
    lastUpdated: new Date().toISOString(),
  },
  'CA-AB': {
    region: 'CA-AB',
    carbonIntensityGPerKwh: 520,     // Alberta: natural gas heavy
    renewablePercentage: 15,
    lastUpdated: new Date().toISOString(),
  },
  'CA-BC': {
    region: 'CA-BC',
    carbonIntensityGPerKwh: 12,      // BC: ~98% hydro
    renewablePercentage: 98,
    lastUpdated: new Date().toISOString(),
  },
  'US-WEST': {
    region: 'US-WEST',
    carbonIntensityGPerKwh: 300,
    renewablePercentage: 40,
    lastUpdated: new Date().toISOString(),
  },
  'US-EAST': {
    region: 'US-EAST',
    carbonIntensityGPerKwh: 400,
    renewablePercentage: 25,
    lastUpdated: new Date().toISOString(),
  },
  'EU': {
    region: 'EU',
    carbonIntensityGPerKwh: 250,
    renewablePercentage: 45,
    lastUpdated: new Date().toISOString(),
  },
};

// Baseline factor for efficiency score calculation (industry avg gCO2/GPU-hr)
export const BASELINE_CARBON_PER_GPU_HOUR = 150; // gCO2
