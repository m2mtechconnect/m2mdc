/**
 * Centralized KPI Catalog - Single source of truth for all DC KPIs
 * Used across: Blueprint, Simulation, Telemetry, Sovereignty/Safety
 * 
 * Sources:
 * - Uptime Institute PUE Benchmark Survey
 * - ASHRAE TC 9.9 Thermal Guidelines
 * - The Green Grid PUE/DCiE Metrics
 * - Canadian PIPEDA/OSFI Compliance Requirements
 */

// KPI Key enum for type safety
export enum KPIKey {
  // Power & Efficiency
  PUE = 'pue',
  EFFECTIVE_AI_PUE = 'effective-ai-pue',
  DCIE = 'dcie',
  UPS_RUNTIME = 'ups-runtime-remaining',
  REDUNDANCY_LEVEL = 'redundancy-level',
  POWER_RELIABILITY = 'powerReliabilityScore',

  // Thermal
  THERMAL_STABILITY = 'thermalStabilityScore',
  AVG_SERVER_TEMP = 'avg-server-temp',
  HOTSPOT_RISK = 'hotspot-risk',
  THERMAL_INCIDENTS = 'thermal-incidents',

  // Cooling
  COOLING_EFFICIENCY = 'coolingEfficiencyIndex',
  SUPPLY_TEMP = 'supply-temp',
  HUMIDITY = 'humidity',

  // Workload / GPU
  GPU_UTILIZATION = 'gpuUtilization',
  GPU_FAIRNESS = 'gpu-fairness',
  QUEUE_DEPTH = 'queue-depth',
  SLA_BREACH = 'sla-breach',

  // Carbon / Financial
  EMISSIONS_VS_TARGET = 'emissionsVsTarget',
  GCO2_PER_GPU_HOUR = 'gco2-per-gpu-hour',
  RENEWABLE_PCT = 'renewable-pct',
  ENERGY_COST = 'energy-cost',
  ECONOMIC_EFFICIENCY = 'economic-efficiency',
  CARBON_INTENSITY = 'carbon-intensity',

  // Sovereignty / Compliance
  SOVEREIGN_COMPLIANCE = 'sovereignComplianceScore',
  SOVEREIGN_COMPUTE_RATIO = 'sovereign-compute-ratio',
  SOVEREIGN_RISK_SCORE = 'sovereign-risk-score',
  DATA_RESIDENCY = 'data-residency-score',
  COMPLIANCE_SCORE = 'compliance-score',
  HIPAA_COVERED = 'hipaa-covered',
  OSFI_B10_READY = 'osfi-b10-ready',
  PIPEDA_COMPLIANT = 'pipeda-compliant',

  // Network
  NETWORK_INTEGRITY = 'network-integrity',
  FABRIC_SATURATION = 'fabric-saturation',
  AVG_LATENCY = 'avg-latency',
  PACKET_LOSS = 'packet-loss',

  // Safety
  ENV_SAFETY = 'env-safety',
  FIRE_READINESS = 'fire-readiness',
  PHYSICAL_SECURITY = 'physical-security',
  EARLY_WARNING = 'early-warning',

  // Uptime
  UPTIME = 'uptime',

  // Retail-specific
  RETAIL_EDGE_UPTIME = 'retail-edge-uptime',
  RETAIL_LATENCY = 'retail-latency',
  COLD_CHAIN_EFFICIENCY = 'cold-chain-efficiency',
}

// KPI category types
export type KPICategory =
  | 'efficiency'
  | 'carbon'
  | 'sovereignty'
  | 'reliability'
  | 'performance'
  | 'compliance'
  | 'safety';

// KPI domain types
export type KPIDomain =
  | 'power'
  | 'thermal'
  | 'cooling'
  | 'network'
  | 'workload'
  | 'financial'
  | 'sovereignty'
  | 'safety'
  | 'retail';

// Direction for better values
export type KPIDirection = 'lower_is_better' | 'higher_is_better';

// Centralized KPI definition
export interface KPIDefinition {
  key: KPIKey;
  label: string;
  description: string;
  unit: string;
  category: KPICategory;
  domain: KPIDomain;
  direction: KPIDirection;
  // Thresholds
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  // Filtering
  relevantIndustries: string[]; // '*' for all, or specific industry IDs
  relevantRegions?: string[]; // '*' for all, or region codes like 'CA-*', 'US-*'
}

// Master KPI catalog
export const KPI_CATALOG: Record<KPIKey, KPIDefinition> = {
  // Power & Efficiency KPIs
  [KPIKey.PUE]: {
    key: KPIKey.PUE,
    label: 'PUE',
    description: 'Power Usage Effectiveness - ratio of total facility power to IT equipment power',
    unit: '',
    category: 'efficiency',
    domain: 'power',
    direction: 'lower_is_better',
    target: 1.2,
    warningThreshold: 1.4,
    criticalThreshold: 1.6,
    relevantIndustries: ['*'],
  },
  [KPIKey.EFFECTIVE_AI_PUE]: {
    key: KPIKey.EFFECTIVE_AI_PUE,
    label: 'Effective AI PUE',
    description: 'Power Usage Effectiveness for AI/GPU workloads',
    unit: '',
    category: 'efficiency',
    domain: 'power',
    direction: 'lower_is_better',
    target: 1.22,
    warningThreshold: 1.35,
    criticalThreshold: 1.5,
    relevantIndustries: ['*'],
  },
  [KPIKey.DCIE]: {
    key: KPIKey.DCIE,
    label: 'DCIE',
    description: 'Data Center Infrastructure Efficiency (inverse of PUE)',
    unit: '%',
    category: 'efficiency',
    domain: 'power',
    direction: 'higher_is_better',
    target: 82,
    warningThreshold: 74,
    criticalThreshold: 62,
    relevantIndustries: ['*'],
  },
  [KPIKey.UPS_RUNTIME]: {
    key: KPIKey.UPS_RUNTIME,
    label: 'UPS Runtime Remaining',
    description: 'UPS battery backup runtime (Tier III standard)',
    unit: 'min',
    category: 'reliability',
    domain: 'power',
    direction: 'higher_is_better',
    target: 25,
    warningThreshold: 12,
    criticalThreshold: 8,
    relevantIndustries: ['*'],
  },
  [KPIKey.REDUNDANCY_LEVEL]: {
    key: KPIKey.REDUNDANCY_LEVEL,
    label: 'Redundancy Level',
    description: 'Power redundancy configuration (N+1 standard, 2N critical)',
    unit: '',
    category: 'reliability',
    domain: 'power',
    direction: 'higher_is_better',
    target: 2,
    warningThreshold: 1.5,
    criticalThreshold: 1,
    relevantIndustries: ['*'],
  },
  [KPIKey.POWER_RELIABILITY]: {
    key: KPIKey.POWER_RELIABILITY,
    label: 'Power Reliability Score',
    description: 'Overall power system reliability score',
    unit: '%',
    category: 'reliability',
    domain: 'power',
    direction: 'higher_is_better',
    target: 99.9,
    warningThreshold: 99,
    criticalThreshold: 95,
    relevantIndustries: ['*'],
  },

  // Thermal KPIs
  [KPIKey.THERMAL_STABILITY]: {
    key: KPIKey.THERMAL_STABILITY,
    label: 'Thermal Stability',
    description: 'Overall thermal health score across all cooling zones',
    unit: '%',
    category: 'performance',
    domain: 'thermal',
    direction: 'higher_is_better',
    target: 90,
    warningThreshold: 75,
    criticalThreshold: 60,
    relevantIndustries: ['*'],
  },
  [KPIKey.AVG_SERVER_TEMP]: {
    key: KPIKey.AVG_SERVER_TEMP,
    label: 'Average Server Temp',
    description: 'Average inlet temperature across all servers (ASHRAE A1 class: 18-27°C)',
    unit: '°C',
    category: 'performance',
    domain: 'thermal',
    direction: 'lower_is_better',
    target: 22,
    warningThreshold: 27,
    criticalThreshold: 30,
    relevantIndustries: ['*'],
  },
  [KPIKey.HOTSPOT_RISK]: {
    key: KPIKey.HOTSPOT_RISK,
    label: 'Hotspot Risk',
    description: 'Probability of thermal hotspots developing',
    unit: '%',
    category: 'performance',
    domain: 'thermal',
    direction: 'lower_is_better',
    target: 5,
    warningThreshold: 15,
    criticalThreshold: 30,
    relevantIndustries: ['*'],
  },
  [KPIKey.THERMAL_INCIDENTS]: {
    key: KPIKey.THERMAL_INCIDENTS,
    label: 'Thermal Incidents',
    description: 'Number of thermal threshold breaches in last 24h',
    unit: '',
    category: 'performance',
    domain: 'thermal',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 5,
    criticalThreshold: 15,
    relevantIndustries: ['*'],
  },

  // Cooling KPIs
  [KPIKey.COOLING_EFFICIENCY]: {
    key: KPIKey.COOLING_EFFICIENCY,
    label: 'Cooling Efficiency',
    description: 'Efficiency of cooling systems relative to heat load',
    unit: '%',
    category: 'efficiency',
    domain: 'cooling',
    direction: 'higher_is_better',
    target: 85,
    warningThreshold: 70,
    criticalThreshold: 55,
    relevantIndustries: ['*'],
  },
  [KPIKey.SUPPLY_TEMP]: {
    key: KPIKey.SUPPLY_TEMP,
    label: 'Supply Air Temp',
    description: 'Supply air temperature from CRAC/CRAH units',
    unit: '°C',
    category: 'performance',
    domain: 'cooling',
    direction: 'lower_is_better',
    target: 18,
    warningThreshold: 22,
    criticalThreshold: 25,
    relevantIndustries: ['*'],
  },
  [KPIKey.HUMIDITY]: {
    key: KPIKey.HUMIDITY,
    label: 'Relative Humidity',
    description: 'Relative humidity level (ASHRAE recommended: 20-80%)',
    unit: '%',
    category: 'performance',
    domain: 'cooling',
    direction: 'higher_is_better', // For simplicity - real target is range
    target: 45,
    warningThreshold: 30,
    criticalThreshold: 20,
    relevantIndustries: ['*'],
  },

  // Workload / GPU KPIs
  [KPIKey.GPU_UTILIZATION]: {
    key: KPIKey.GPU_UTILIZATION,
    label: 'GPU Utilization',
    description: 'Average GPU compute utilization across all clusters',
    unit: '%',
    category: 'performance',
    domain: 'workload',
    direction: 'higher_is_better',
    target: 75,
    warningThreshold: 50,
    criticalThreshold: 30,
    relevantIndustries: ['*'],
  },
  [KPIKey.GPU_FAIRNESS]: {
    key: KPIKey.GPU_FAIRNESS,
    label: 'GPU Fairness Index',
    description: 'Fair allocation of GPU resources across tenants',
    unit: '%',
    category: 'performance',
    domain: 'workload',
    direction: 'higher_is_better',
    target: 95,
    warningThreshold: 85,
    criticalThreshold: 70,
    relevantIndustries: ['*'],
  },
  [KPIKey.QUEUE_DEPTH]: {
    key: KPIKey.QUEUE_DEPTH,
    label: 'Queue Depth',
    description: 'Number of jobs waiting in queue',
    unit: '',
    category: 'performance',
    domain: 'workload',
    direction: 'lower_is_better',
    target: 10,
    warningThreshold: 50,
    criticalThreshold: 100,
    relevantIndustries: ['*'],
  },
  [KPIKey.SLA_BREACH]: {
    key: KPIKey.SLA_BREACH,
    label: 'SLA Breach Rate',
    description: 'Percentage of SLA violations',
    unit: '%',
    category: 'reliability',
    domain: 'workload',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 2,
    criticalThreshold: 5,
    relevantIndustries: ['*'],
  },

  // Carbon / Financial KPIs
  [KPIKey.EMISSIONS_VS_TARGET]: {
    key: KPIKey.EMISSIONS_VS_TARGET,
    label: 'Carbon vs Target',
    description: 'Current emissions relative to sustainability targets',
    unit: '%',
    category: 'carbon',
    domain: 'financial',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 10,
    criticalThreshold: 25,
    relevantIndustries: ['*'],
  },
  [KPIKey.GCO2_PER_GPU_HOUR]: {
    key: KPIKey.GCO2_PER_GPU_HOUR,
    label: 'gCO₂ per GPU-hour',
    description: 'Carbon intensity per GPU hour (Quebec hydro: ~28g, Alberta gas: ~180g)',
    unit: 'g',
    category: 'carbon',
    domain: 'financial',
    direction: 'lower_is_better',
    target: 28,
    warningThreshold: 85,
    criticalThreshold: 180,
    relevantIndustries: ['*'],
  },
  [KPIKey.RENEWABLE_PCT]: {
    key: KPIKey.RENEWABLE_PCT,
    label: 'Renewable %',
    description: 'Percentage of energy from renewable sources',
    unit: '%',
    category: 'carbon',
    domain: 'financial',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 70,
    criticalThreshold: 50,
    relevantIndustries: ['*'],
  },
  [KPIKey.ENERGY_COST]: {
    key: KPIKey.ENERGY_COST,
    label: 'Energy Cost',
    description: 'Energy cost per kWh',
    unit: '$/kWh',
    category: 'carbon',
    domain: 'financial',
    direction: 'lower_is_better',
    target: 0.05,
    warningThreshold: 0.10,
    criticalThreshold: 0.15,
    relevantIndustries: ['*'],
  },
  [KPIKey.ECONOMIC_EFFICIENCY]: {
    key: KPIKey.ECONOMIC_EFFICIENCY,
    label: 'Economic Efficiency',
    description: 'Overall economic efficiency score (energy + carbon + utilization)',
    unit: '/100',
    category: 'efficiency',
    domain: 'financial',
    direction: 'higher_is_better',
    target: 88,
    warningThreshold: 72,
    criticalThreshold: 55,
    relevantIndustries: ['*'],
  },
  [KPIKey.CARBON_INTENSITY]: {
    key: KPIKey.CARBON_INTENSITY,
    label: 'Carbon Intensity',
    description: 'Grid carbon intensity in grams CO₂ per kWh',
    unit: 'g/kWh',
    category: 'carbon',
    domain: 'financial',
    direction: 'lower_is_better',
    target: 50,
    warningThreshold: 100,
    criticalThreshold: 200,
    relevantIndustries: ['*'],
  },

  // Sovereignty / Compliance KPIs
  [KPIKey.SOVEREIGN_COMPLIANCE]: {
    key: KPIKey.SOVEREIGN_COMPLIANCE,
    label: 'Sovereignty Score',
    description: 'Compliance with data sovereignty requirements',
    unit: '%',
    category: 'sovereignty',
    domain: 'sovereignty',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 95,
    criticalThreshold: 85,
    relevantIndustries: ['*'],
  },
  [KPIKey.SOVEREIGN_COMPUTE_RATIO]: {
    key: KPIKey.SOVEREIGN_COMPUTE_RATIO,
    label: 'Sovereign Compute Ratio',
    description: 'Percentage of compute in sovereign jurisdiction (PIPEDA compliant)',
    unit: '%',
    category: 'sovereignty',
    domain: 'sovereignty',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 95,
    criticalThreshold: 85,
    relevantIndustries: ['*'],
  },
  [KPIKey.SOVEREIGN_RISK_SCORE]: {
    key: KPIKey.SOVEREIGN_RISK_SCORE,
    label: 'Sovereignty Risk Score',
    description: 'Data sovereignty risk assessment (lower is better)',
    unit: '/100',
    category: 'sovereignty',
    domain: 'sovereignty',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 15,
    criticalThreshold: 35,
    relevantIndustries: ['*'],
  },
  [KPIKey.DATA_RESIDENCY]: {
    key: KPIKey.DATA_RESIDENCY,
    label: 'Data Residency Score',
    description: 'Data stored within compliant jurisdictions',
    unit: '%',
    category: 'sovereignty',
    domain: 'sovereignty',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 95,
    criticalThreshold: 80,
    relevantIndustries: ['*'],
  },
  [KPIKey.COMPLIANCE_SCORE]: {
    key: KPIKey.COMPLIANCE_SCORE,
    label: 'Compliance Score',
    description: 'Overall regulatory compliance score',
    unit: '%',
    category: 'compliance',
    domain: 'sovereignty',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 90,
    criticalThreshold: 75,
    relevantIndustries: ['*'],
  },
  [KPIKey.HIPAA_COVERED]: {
    key: KPIKey.HIPAA_COVERED,
    label: 'HIPAA Covered',
    description: 'HIPAA compliance for PHI handling',
    unit: '%',
    category: 'compliance',
    domain: 'sovereignty',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 95,
    criticalThreshold: 80,
    relevantIndustries: ['healthcare_phi_twin'],
    relevantRegions: ['US-*'],
  },
  [KPIKey.OSFI_B10_READY]: {
    key: KPIKey.OSFI_B10_READY,
    label: 'OSFI B-10 Ready',
    description: 'OSFI B-10 readiness for Canadian financial institutions',
    unit: '%',
    category: 'compliance',
    domain: 'sovereignty',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 90,
    criticalThreshold: 70,
    relevantIndustries: ['finance_core_banking_green_twin'],
    relevantRegions: ['CA-*'],
  },
  [KPIKey.PIPEDA_COMPLIANT]: {
    key: KPIKey.PIPEDA_COMPLIANT,
    label: 'PIPEDA Compliant',
    description: 'PIPEDA compliance for Canadian privacy',
    unit: '%',
    category: 'compliance',
    domain: 'sovereignty',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 95,
    criticalThreshold: 80,
    relevantIndustries: ['*'],
    relevantRegions: ['CA-*'],
  },

  // Network KPIs
  [KPIKey.NETWORK_INTEGRITY]: {
    key: KPIKey.NETWORK_INTEGRITY,
    label: 'Network Integrity',
    description: 'Overall network health and stability',
    unit: '%',
    category: 'reliability',
    domain: 'network',
    direction: 'higher_is_better',
    target: 99.9,
    warningThreshold: 99,
    criticalThreshold: 95,
    relevantIndustries: ['*'],
  },
  [KPIKey.FABRIC_SATURATION]: {
    key: KPIKey.FABRIC_SATURATION,
    label: 'Fabric Saturation',
    description: 'Network fabric utilization level',
    unit: '%',
    category: 'performance',
    domain: 'network',
    direction: 'lower_is_better',
    target: 40,
    warningThreshold: 70,
    criticalThreshold: 90,
    relevantIndustries: ['*'],
  },
  [KPIKey.AVG_LATENCY]: {
    key: KPIKey.AVG_LATENCY,
    label: 'Average Latency',
    description: 'Average network latency',
    unit: 'ms',
    category: 'performance',
    domain: 'network',
    direction: 'lower_is_better',
    target: 1,
    warningThreshold: 5,
    criticalThreshold: 20,
    relevantIndustries: ['*'],
  },
  [KPIKey.PACKET_LOSS]: {
    key: KPIKey.PACKET_LOSS,
    label: 'Packet Loss',
    description: 'Network packet loss rate',
    unit: '%',
    category: 'reliability',
    domain: 'network',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 0.1,
    criticalThreshold: 1,
    relevantIndustries: ['*'],
  },

  // Safety KPIs
  [KPIKey.ENV_SAFETY]: {
    key: KPIKey.ENV_SAFETY,
    label: 'Environmental Safety',
    description: 'Overall environmental safety score',
    unit: '%',
    category: 'safety',
    domain: 'safety',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 90,
    criticalThreshold: 75,
    relevantIndustries: ['*'],
  },
  [KPIKey.FIRE_READINESS]: {
    key: KPIKey.FIRE_READINESS,
    label: 'Fire Readiness',
    description: 'Fire suppression system readiness',
    unit: '%',
    category: 'safety',
    domain: 'safety',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 95,
    criticalThreshold: 85,
    relevantIndustries: ['*'],
  },
  [KPIKey.PHYSICAL_SECURITY]: {
    key: KPIKey.PHYSICAL_SECURITY,
    label: 'Physical Security',
    description: 'Physical security compliance score',
    unit: '%',
    category: 'safety',
    domain: 'safety',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 95,
    criticalThreshold: 85,
    relevantIndustries: ['*'],
  },
  [KPIKey.EARLY_WARNING]: {
    key: KPIKey.EARLY_WARNING,
    label: 'Early Warning',
    description: 'Early warning system effectiveness',
    unit: '%',
    category: 'safety',
    domain: 'safety',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 90,
    criticalThreshold: 75,
    relevantIndustries: ['*'],
  },

  // Uptime
  [KPIKey.UPTIME]: {
    key: KPIKey.UPTIME,
    label: 'System Uptime',
    description: 'Overall system availability (Tier III: 99.982%, Tier IV: 99.995%)',
    unit: '%',
    category: 'reliability',
    domain: 'power',
    direction: 'higher_is_better',
    target: 99.99,
    warningThreshold: 99.9,
    criticalThreshold: 99,
    relevantIndustries: ['*'],
  },

  // Retail-specific
  [KPIKey.RETAIL_EDGE_UPTIME]: {
    key: KPIKey.RETAIL_EDGE_UPTIME,
    label: 'Retail Edge Uptime',
    description: 'Edge compute uptime across retail locations',
    unit: '%',
    category: 'reliability',
    domain: 'retail',
    direction: 'higher_is_better',
    target: 99.9,
    warningThreshold: 99,
    criticalThreshold: 98,
    relevantIndustries: ['retail_ecommerce_green_twin', 'retail_hyperscale_green_twin'],
  },
  [KPIKey.RETAIL_LATENCY]: {
    key: KPIKey.RETAIL_LATENCY,
    label: 'Retail Latency',
    description: 'POS and checkout system latency',
    unit: 'ms',
    category: 'performance',
    domain: 'retail',
    direction: 'lower_is_better',
    target: 50,
    warningThreshold: 200,
    criticalThreshold: 500,
    relevantIndustries: ['retail_ecommerce_green_twin', 'retail_hyperscale_green_twin'],
  },
  [KPIKey.COLD_CHAIN_EFFICIENCY]: {
    key: KPIKey.COLD_CHAIN_EFFICIENCY,
    label: 'Cold Chain Efficiency',
    description: 'Refrigeration and cold storage efficiency',
    unit: '%',
    category: 'efficiency',
    domain: 'retail',
    direction: 'higher_is_better',
    target: 90,
    warningThreshold: 80,
    criticalThreshold: 70,
    relevantIndustries: ['retail_hyperscale_green_twin'],
  },
};

// Helper: Get all KPIs as array
export function getAllKPIs(): KPIDefinition[] {
  return Object.values(KPI_CATALOG);
}

// Helper: Get KPIs by domain
export function getKPIsByDomain(domain: KPIDomain): KPIDefinition[] {
  return Object.values(KPI_CATALOG).filter(k => k.domain === domain);
}

// Helper: Get KPIs by category
export function getKPIsByCategory(category: KPICategory): KPIDefinition[] {
  return Object.values(KPI_CATALOG).filter(k => k.category === category);
}

// Helper: Get KPIs relevant to a specific industry
export function getKPIsForIndustry(industryId: string): KPIDefinition[] {
  return Object.values(KPI_CATALOG).filter(k =>
    k.relevantIndustries.includes('*') || k.relevantIndustries.includes(industryId)
  );
}

// Helper: Get KPIs relevant to a specific region
export function getKPIsForRegion(regionCode: string): KPIDefinition[] {
  return Object.values(KPI_CATALOG).filter(k => {
    if (!k.relevantRegions || k.relevantRegions.includes('*')) return true;
    return k.relevantRegions.some(r => {
      if (r.endsWith('*')) {
        return regionCode.startsWith(r.replace('*', ''));
      }
      return r === regionCode;
    });
  });
}

// Helper: Get KPI by key
export function getKPIByKey(key: KPIKey | string): KPIDefinition | undefined {
  return KPI_CATALOG[key as KPIKey];
}

// Helper: Get sovereignty/compliance KPIs for region + industry
export function getSovereigntyKPIsForContext(regionCode: string, industryId: string): KPIDefinition[] {
  return Object.values(KPI_CATALOG).filter(k => {
    if (k.category !== 'sovereignty' && k.category !== 'compliance') return false;
    
    // Check industry
    const industryMatch = k.relevantIndustries.includes('*') || k.relevantIndustries.includes(industryId);
    if (!industryMatch) return false;
    
    // Check region
    if (!k.relevantRegions || k.relevantRegions.includes('*')) return true;
    return k.relevantRegions.some(r => {
      if (r.endsWith('*')) {
        return regionCode.startsWith(r.replace('*', ''));
      }
      return r === regionCode;
    });
  });
}
