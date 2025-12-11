/**
 * Carbon Engine Types
 * Defines schema for carbon intensity, emissions, and sustainability metrics
 * 
 * Industry Sources & References:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CARBON INTENSITY DATA:
 * - Canada National Inventory Report (NIR) 2024, Environment & Climate Change Canada
 *   https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions.html
 * - Hydro-Québec 2023 Annual Report: 99.8% renewable, 1.2 gCO₂eq/kWh
 *   https://www.hydroquebec.com/publications/en/annual-report/
 * - IESO Ontario Power System Report 2024: Nuclear-hydro mix, 28 gCO₂eq/kWh
 *   https://www.ieso.ca/en/Power-Data
 * - BC Hydro Integrated Resource Plan: 98% renewable, 10.5 gCO₂eq/kWh
 *   https://www.bchydro.com/energy-in-bc/planning-for-our-future.html
 * - AESO Alberta Electricity System Operator: Gas-dominant grid, 470 gCO₂eq/kWh
 *   https://www.aeso.ca/market/market-and-system-reporting/
 * 
 * US GRID DATA:
 * - EPA eGRID 2023: Regional emission factors for US power grids
 *   https://www.epa.gov/egrid
 * - EIA Electric Power Monthly: Regional generation and emissions
 *   https://www.eia.gov/electricity/monthly/
 * 
 * EUROPEAN DATA:
 * - European Environment Agency (EEA) 2024 Greenhouse Gas Data Viewer
 *   https://www.eea.europa.eu/data-and-maps/dashboards/greenhouse-gases-viewer
 * - EU Emissions Trading System (EU ETS) Pricing Dashboard
 *   https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en
 * 
 * REAL-TIME CARBON DATA PROVIDERS:
 * - Electricity Maps API: Real-time carbon intensity by region
 *   https://app.electricitymaps.com/
 * - WattTime API: Marginal emissions data for grid optimization
 *   https://www.watttime.org/
 * 
 * GPU EFFICIENCY BENCHMARKS:
 * - MLPerf Power Benchmarks: Standardized AI workload power measurements
 *   https://mlcommons.org/en/training-normal-21/
 * - NVIDIA Data Center GPU Specifications (H100, A100, L40S)
 *   https://www.nvidia.com/en-us/data-center/
 * - NVIDIA Sustainability Reports: Carbon per GPU-hour metrics
 *   https://www.nvidia.com/en-us/about-nvidia/sustainability/
 * 
 * CARBON PRICING:
 * - World Bank Carbon Pricing Dashboard 2024
 *   https://carbonpricingdashboard.worldbank.org/
 * - Canada Federal Carbon Pricing: $80/tonne (2024) → $170/tonne (2030)
 *   https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html
 * - California Air Resources Board Cap-and-Trade Program
 *   https://ww2.arb.ca.gov/our-work/programs/cap-and-trade-program
 * 
 * GHG PROTOCOL STANDARDS:
 * - GHG Protocol Corporate Standard: Scope 1, 2, 3 emissions accounting
 *   https://ghgprotocol.org/corporate-standard
 * - GHG Protocol Scope 2 Guidance: Location-based vs market-based emissions
 *   https://ghgprotocol.org/scope_2_guidance
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
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
