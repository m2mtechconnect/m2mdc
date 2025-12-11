/**
 * Carbon Engine Types
 * Defines schema for carbon intensity, emissions, and sustainability metrics
 */

export type RegionCode = 'CA-QC' | 'CA-ON' | 'CA-AB' | 'CA-BC' | 'US-WEST' | 'US-EAST' | 'EU' | string;

export interface CarbonIntensityFeed {
  region: RegionCode;
  carbonIntensityGPerKwh: number;
  renewablePercentage: number;
  gridType: 'hydro' | 'nuclear' | 'natural_gas' | 'coal' | 'mixed' | 'renewable';
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

/**
 * Regional carbon intensity data (gCO₂eq/kWh)
 * Sources: 
 * - Canada: NRCan National Inventory Report 2024, provincial utility reports
 * - US: EPA eGRID 2023, EIA regional data
 * - EU: European Environment Agency 2024
 * - Real-time feeds: ElectricityMap, WattTime API
 */
export const REGIONAL_CARBON_INTENSITY: Record<string, CarbonIntensityFeed> = {
  'CA-QC': {
    region: 'CA-QC',
    carbonIntensityGPerKwh: 1.2,     // Quebec: 99.8% hydro - among lowest in world
    renewablePercentage: 99.8,       // Hydro-Québec 2023 Annual Report
    gridType: 'hydro',
    lastUpdated: new Date().toISOString(),
  },
  'CA-ON': {
    region: 'CA-ON',
    carbonIntensityGPerKwh: 28,      // Ontario: 60% nuclear, 24% hydro, 10% gas
    renewablePercentage: 82,         // IESO 2024 data
    gridType: 'nuclear',
    lastUpdated: new Date().toISOString(),
  },
  'CA-AB': {
    region: 'CA-AB',
    carbonIntensityGPerKwh: 470,     // Alberta: 89% fossil (gas transitioning from coal)
    renewablePercentage: 18,         // AESO 2024 - growing wind/solar
    gridType: 'natural_gas',
    lastUpdated: new Date().toISOString(),
  },
  'CA-BC': {
    region: 'CA-BC',
    carbonIntensityGPerKwh: 10.5,    // BC: 98% hydro
    renewablePercentage: 98,         // BC Hydro Annual Report
    gridType: 'hydro',
    lastUpdated: new Date().toISOString(),
  },
  'CA-MB': {
    region: 'CA-MB',
    carbonIntensityGPerKwh: 1.8,     // Manitoba: 97% hydro
    renewablePercentage: 97,
    gridType: 'hydro',
    lastUpdated: new Date().toISOString(),
  },
  'US-WEST': {
    region: 'US-WEST',
    carbonIntensityGPerKwh: 285,     // WECC region average
    renewablePercentage: 38,
    gridType: 'mixed',
    lastUpdated: new Date().toISOString(),
  },
  'US-EAST': {
    region: 'US-EAST',
    carbonIntensityGPerKwh: 386,     // PJM/SERC region average
    renewablePercentage: 22,
    gridType: 'mixed',
    lastUpdated: new Date().toISOString(),
  },
  'US-TEXAS': {
    region: 'US-TEXAS',
    carbonIntensityGPerKwh: 395,     // ERCOT - high gas, growing wind
    renewablePercentage: 28,
    gridType: 'natural_gas',
    lastUpdated: new Date().toISOString(),
  },
  'EU-WEST': {
    region: 'EU-WEST',
    carbonIntensityGPerKwh: 238,     // Germany, France, Netherlands avg
    renewablePercentage: 48,
    gridType: 'mixed',
    lastUpdated: new Date().toISOString(),
  },
  'EU-NORDIC': {
    region: 'EU-NORDIC',
    carbonIntensityGPerKwh: 18,      // Norway, Sweden, Finland
    renewablePercentage: 92,
    gridType: 'renewable',
    lastUpdated: new Date().toISOString(),
  },
  'APAC-SG': {
    region: 'APAC-SG',
    carbonIntensityGPerKwh: 408,     // Singapore: primarily natural gas
    renewablePercentage: 4,
    gridType: 'natural_gas',
    lastUpdated: new Date().toISOString(),
  },
};

/**
 * Baseline factor for efficiency score calculation
 * Industry average gCO₂eq per GPU-hour for H100 clusters
 * Source: MLPerf Power benchmarks, NVIDIA sustainability reports
 */
export const BASELINE_CARBON_PER_GPU_HOUR = 120; // gCO₂eq (H100 @ 700W, avg grid)

/**
 * Carbon pricing by jurisdiction ($/tonne CO₂eq)
 * Source: World Bank Carbon Pricing Dashboard 2024
 */
export const CARBON_PRICING: Record<string, { current: number; projected2030: number }> = {
  'CA': { current: 80, projected2030: 170 },      // Canada federal backstop
  'CA-BC': { current: 80, projected2030: 170 },   // BC carbon tax
  'US-CA': { current: 32, projected2030: 50 },    // California cap-and-trade
  'US-RGGI': { current: 15, projected2030: 25 },  // Regional GHG Initiative
  'EU-ETS': { current: 85, projected2030: 150 },  // EU Emissions Trading System
};

/**
 * Scope 2 emissions factors for common energy sources
 * Source: GHG Protocol, EPA emission factors
 */
export const EMISSION_FACTORS = {
  grid: 'variable',                 // Use regional intensity
  solarPpa: 0,                      // Zero-carbon PPA
  windPpa: 0,                       // Zero-carbon PPA
  naturalGasOnsite: 181,            // gCO₂/kWh for on-site gas generator
  dieselBackup: 267,                // gCO₂/kWh for diesel generator
};
