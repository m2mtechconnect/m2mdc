/**
 * Canadian Data Centre Regions
 * Contains all major cloud provider regions and custom sites
 */

export interface RegionProfile {
  id: string;
  name: string;
  city: string;
  province: string;
  country: string;
  provider: 'aws' | 'azure' | 'gcp' | 'custom';
  region_code: string;
  carbon_intensity: number; // gCO2/kWh
  default_pue: number;
  energy_mix: {
    renewable: number;
    hydro: number;
    nuclear: number;
    natural_gas: number;
    coal: number;
    other: number;
  };
  cooling_baseline: {
    type: 'air' | 'liquid' | 'hybrid';
    efficiency: number;
    free_cooling_hours: number;
  };
  cost_per_kwh: number; // CAD
  sovereignty_profile: {
    level: 'federal' | 'provincial' | 'standard';
    data_residency: boolean;
    government_certified: boolean;
    compliance_frameworks: string[];
  };
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const CANADIAN_REGIONS: RegionProfile[] = [
  // AWS Regions
  {
    id: 'aws-ca-central-1',
    name: 'AWS Montreal',
    city: 'Montreal',
    province: 'Quebec',
    country: 'Canada',
    provider: 'aws',
    region_code: 'ca-central-1',
    carbon_intensity: 20,
    default_pue: 1.25,
    energy_mix: {
      renewable: 95,
      hydro: 94,
      nuclear: 0,
      natural_gas: 1,
      coal: 0,
      other: 5,
    },
    cooling_baseline: {
      type: 'hybrid',
      efficiency: 0.92,
      free_cooling_hours: 6200,
    },
    cost_per_kwh: 0.065,
    sovereignty_profile: {
      level: 'federal',
      data_residency: true,
      government_certified: true,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA', 'CCCS'],
    },
    coordinates: { lat: 45.5017, lng: -73.5673 },
  },
  {
    id: 'aws-ca-west-1',
    name: 'AWS Calgary',
    city: 'Calgary',
    province: 'Alberta',
    country: 'Canada',
    provider: 'aws',
    region_code: 'ca-west-1',
    carbon_intensity: 450,
    default_pue: 1.35,
    energy_mix: {
      renewable: 25,
      hydro: 5,
      nuclear: 0,
      natural_gas: 55,
      coal: 10,
      other: 5,
    },
    cooling_baseline: {
      type: 'air',
      efficiency: 0.88,
      free_cooling_hours: 5800,
    },
    cost_per_kwh: 0.085,
    sovereignty_profile: {
      level: 'provincial',
      data_residency: true,
      government_certified: false,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA'],
    },
    coordinates: { lat: 51.0447, lng: -114.0719 },
  },

  // Azure Regions
  {
    id: 'azure-canada-central',
    name: 'Azure Toronto',
    city: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    provider: 'azure',
    region_code: 'canada-central',
    carbon_intensity: 40,
    default_pue: 1.28,
    energy_mix: {
      renewable: 35,
      hydro: 25,
      nuclear: 55,
      natural_gas: 10,
      coal: 0,
      other: 10,
    },
    cooling_baseline: {
      type: 'hybrid',
      efficiency: 0.90,
      free_cooling_hours: 5500,
    },
    cost_per_kwh: 0.095,
    sovereignty_profile: {
      level: 'federal',
      data_residency: true,
      government_certified: true,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA', 'PHIPA', 'CCCS'],
    },
    coordinates: { lat: 43.6532, lng: -79.3832 },
  },
  {
    id: 'azure-canada-east',
    name: 'Azure Quebec City',
    city: 'Quebec City',
    province: 'Quebec',
    country: 'Canada',
    provider: 'azure',
    region_code: 'canada-east',
    carbon_intensity: 15,
    default_pue: 1.22,
    energy_mix: {
      renewable: 98,
      hydro: 97,
      nuclear: 0,
      natural_gas: 1,
      coal: 0,
      other: 2,
    },
    cooling_baseline: {
      type: 'liquid',
      efficiency: 0.94,
      free_cooling_hours: 6500,
    },
    cost_per_kwh: 0.058,
    sovereignty_profile: {
      level: 'federal',
      data_residency: true,
      government_certified: true,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA', 'CCCS', 'Loi 25'],
    },
    coordinates: { lat: 46.8139, lng: -71.2080 },
  },

  // GCP Regions
  {
    id: 'gcp-northamerica-northeast1',
    name: 'GCP Montreal',
    city: 'Montreal',
    province: 'Quebec',
    country: 'Canada',
    provider: 'gcp',
    region_code: 'northamerica-northeast1',
    carbon_intensity: 18,
    default_pue: 1.20,
    energy_mix: {
      renewable: 96,
      hydro: 95,
      nuclear: 0,
      natural_gas: 1,
      coal: 0,
      other: 4,
    },
    cooling_baseline: {
      type: 'liquid',
      efficiency: 0.95,
      free_cooling_hours: 6300,
    },
    cost_per_kwh: 0.062,
    sovereignty_profile: {
      level: 'federal',
      data_residency: true,
      government_certified: true,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA', 'CCCS'],
    },
    coordinates: { lat: 45.5088, lng: -73.5878 },
  },
  {
    id: 'gcp-northamerica-northeast2',
    name: 'GCP Toronto',
    city: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    provider: 'gcp',
    region_code: 'northamerica-northeast2',
    carbon_intensity: 35,
    default_pue: 1.25,
    energy_mix: {
      renewable: 40,
      hydro: 28,
      nuclear: 50,
      natural_gas: 12,
      coal: 0,
      other: 10,
    },
    cooling_baseline: {
      type: 'hybrid',
      efficiency: 0.91,
      free_cooling_hours: 5400,
    },
    cost_per_kwh: 0.092,
    sovereignty_profile: {
      level: 'federal',
      data_residency: true,
      government_certified: true,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA', 'PHIPA'],
    },
    coordinates: { lat: 43.6426, lng: -79.3871 },
  },

  // Custom Canadian Sites
  {
    id: 'custom-vancouver',
    name: 'Vancouver Edge AI',
    city: 'Vancouver',
    province: 'British Columbia',
    country: 'Canada',
    provider: 'custom',
    region_code: 'ca-bc-vancouver',
    carbon_intensity: 12,
    default_pue: 1.18,
    energy_mix: {
      renewable: 98,
      hydro: 95,
      nuclear: 0,
      natural_gas: 2,
      coal: 0,
      other: 3,
    },
    cooling_baseline: {
      type: 'liquid',
      efficiency: 0.96,
      free_cooling_hours: 5800,
    },
    cost_per_kwh: 0.072,
    sovereignty_profile: {
      level: 'provincial',
      data_residency: true,
      government_certified: false,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA'],
    },
    coordinates: { lat: 49.2827, lng: -123.1207 },
  },
  {
    id: 'custom-ottawa',
    name: 'Ottawa Federal Compute',
    city: 'Ottawa',
    province: 'Ontario',
    country: 'Canada',
    provider: 'custom',
    region_code: 'ca-on-ottawa',
    carbon_intensity: 38,
    default_pue: 1.30,
    energy_mix: {
      renewable: 38,
      hydro: 26,
      nuclear: 52,
      natural_gas: 12,
      coal: 0,
      other: 10,
    },
    cooling_baseline: {
      type: 'hybrid',
      efficiency: 0.89,
      free_cooling_hours: 5600,
    },
    cost_per_kwh: 0.088,
    sovereignty_profile: {
      level: 'federal',
      data_residency: true,
      government_certified: true,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA', 'CCCS', 'Protected B'],
    },
    coordinates: { lat: 45.4215, lng: -75.6972 },
  },
  {
    id: 'custom-halifax',
    name: 'Halifax Atlantic Edge',
    city: 'Halifax',
    province: 'Nova Scotia',
    country: 'Canada',
    provider: 'custom',
    region_code: 'ca-ns-halifax',
    carbon_intensity: 280,
    default_pue: 1.38,
    energy_mix: {
      renewable: 35,
      hydro: 12,
      nuclear: 0,
      natural_gas: 40,
      coal: 8,
      other: 5,
    },
    cooling_baseline: {
      type: 'air',
      efficiency: 0.87,
      free_cooling_hours: 5200,
    },
    cost_per_kwh: 0.145,
    sovereignty_profile: {
      level: 'provincial',
      data_residency: true,
      government_certified: false,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA'],
    },
    coordinates: { lat: 44.6488, lng: -63.5752 },
  },
  {
    id: 'custom-winnipeg',
    name: 'Winnipeg Distributed Node',
    city: 'Winnipeg',
    province: 'Manitoba',
    country: 'Canada',
    provider: 'custom',
    region_code: 'ca-mb-winnipeg',
    carbon_intensity: 5,
    default_pue: 1.22,
    energy_mix: {
      renewable: 99,
      hydro: 98,
      nuclear: 0,
      natural_gas: 1,
      coal: 0,
      other: 1,
    },
    cooling_baseline: {
      type: 'hybrid',
      efficiency: 0.93,
      free_cooling_hours: 6800,
    },
    cost_per_kwh: 0.045,
    sovereignty_profile: {
      level: 'provincial',
      data_residency: true,
      government_certified: false,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA'],
    },
    coordinates: { lat: 49.8951, lng: -97.1384 },
  },
  {
    id: 'custom-edmonton',
    name: 'Edmonton AI Research Node',
    city: 'Edmonton',
    province: 'Alberta',
    country: 'Canada',
    provider: 'custom',
    region_code: 'ca-ab-edmonton',
    carbon_intensity: 420,
    default_pue: 1.32,
    energy_mix: {
      renewable: 28,
      hydro: 6,
      nuclear: 0,
      natural_gas: 52,
      coal: 8,
      other: 6,
    },
    cooling_baseline: {
      type: 'air',
      efficiency: 0.88,
      free_cooling_hours: 6000,
    },
    cost_per_kwh: 0.078,
    sovereignty_profile: {
      level: 'provincial',
      data_residency: true,
      government_certified: false,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA'],
    },
    coordinates: { lat: 53.5461, lng: -113.4938 },
  },
  {
    id: 'custom-victoria',
    name: 'Victoria Pacific Edge',
    city: 'Victoria',
    province: 'British Columbia',
    country: 'Canada',
    provider: 'custom',
    region_code: 'ca-bc-victoria',
    carbon_intensity: 10,
    default_pue: 1.20,
    energy_mix: {
      renewable: 99,
      hydro: 96,
      nuclear: 0,
      natural_gas: 1,
      coal: 0,
      other: 3,
    },
    cooling_baseline: {
      type: 'liquid',
      efficiency: 0.95,
      free_cooling_hours: 5500,
    },
    cost_per_kwh: 0.075,
    sovereignty_profile: {
      level: 'provincial',
      data_residency: true,
      government_certified: false,
      compliance_frameworks: ['SOC2', 'ISO27001', 'PIPEDA'],
    },
    coordinates: { lat: 48.4284, lng: -123.3656 },
  },
];

// Default preset twins for new users
export const DEFAULT_PRESET_TWINS = [
  {
    name: 'Montreal Sovereign AI DC',
    city: 'Montreal',
    region_code: 'ca-central-1',
    tier: 'Tier IV',
    capacity_kw: 10000,
    industry: 'ai_compute',
    pue_target: 1.2,
    renewable_target_pct: 95,
    sovereignty_level: 'federal',
  },
  {
    name: 'Toronto Green Compute',
    city: 'Toronto',
    region_code: 'canada-central',
    tier: 'Tier III',
    capacity_kw: 8000,
    industry: 'cloud_saas',
    pue_target: 1.28,
    renewable_target_pct: 80,
    sovereignty_level: 'federal',
  },
  {
    name: 'Vancouver Edge AI',
    city: 'Vancouver',
    region_code: 'ca-bc-vancouver',
    tier: 'Tier III',
    capacity_kw: 5000,
    industry: 'ai_compute',
    pue_target: 1.18,
    renewable_target_pct: 98,
    sovereignty_level: 'provincial',
  },
  {
    name: 'Calgary Energy Compute',
    city: 'Calgary',
    region_code: 'ca-west-1',
    tier: 'Tier III',
    capacity_kw: 6000,
    industry: 'energy',
    pue_target: 1.35,
    renewable_target_pct: 25,
    sovereignty_level: 'provincial',
  },
  {
    name: 'Quebec City Azure Government',
    city: 'Quebec City',
    region_code: 'canada-east',
    tier: 'Tier IV',
    capacity_kw: 7000,
    industry: 'government',
    pue_target: 1.22,
    renewable_target_pct: 98,
    sovereignty_level: 'federal',
  },
  {
    name: 'Ottawa Federal Compute',
    city: 'Ottawa',
    region_code: 'ca-on-ottawa',
    tier: 'Tier IV',
    capacity_kw: 5000,
    industry: 'government',
    pue_target: 1.30,
    renewable_target_pct: 85,
    sovereignty_level: 'federal',
  },
  {
    name: 'Halifax Atlantic Edge',
    city: 'Halifax',
    region_code: 'ca-ns-halifax',
    tier: 'Tier II',
    capacity_kw: 2000,
    industry: 'telecom',
    pue_target: 1.38,
    renewable_target_pct: 35,
    sovereignty_level: 'provincial',
  },
  {
    name: 'Winnipeg Distributed Node',
    city: 'Winnipeg',
    region_code: 'ca-mb-winnipeg',
    tier: 'Tier III',
    capacity_kw: 4000,
    industry: 'cloud_saas',
    pue_target: 1.22,
    renewable_target_pct: 99,
    sovereignty_level: 'provincial',
  },
  {
    name: 'Edmonton AI Research Node',
    city: 'Edmonton',
    region_code: 'ca-ab-edmonton',
    tier: 'Tier III',
    capacity_kw: 5000,
    industry: 'ai_compute',
    pue_target: 1.32,
    renewable_target_pct: 28,
    sovereignty_level: 'provincial',
  },
];

// Utility functions
export function getRegionByCode(code: string): RegionProfile | undefined {
  return CANADIAN_REGIONS.find(r => r.region_code === code);
}

export function getRegionsByProvider(provider: RegionProfile['provider']): RegionProfile[] {
  return CANADIAN_REGIONS.filter(r => r.provider === provider);
}

export function getLowestCarbonRegions(limit = 5): RegionProfile[] {
  return [...CANADIAN_REGIONS]
    .sort((a, b) => a.carbon_intensity - b.carbon_intensity)
    .slice(0, limit);
}

export function getGovernmentCertifiedRegions(): RegionProfile[] {
  return CANADIAN_REGIONS.filter(r => r.sovereignty_profile.government_certified);
}

export function getRegionCarbonClass(intensity: number): 'ultra-low' | 'low' | 'medium' | 'high' {
  if (intensity < 30) return 'ultra-low';
  if (intensity < 100) return 'low';
  if (intensity < 300) return 'medium';
  return 'high';
}
