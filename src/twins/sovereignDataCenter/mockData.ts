/**
 * Sovereign Data Center Twin - Mock/Synthetic Data
 * Demo facilities and simulation scenarios
 */

import type {
  SovereignDCFacility,
  GpuCluster,
  SovereignDataFlow,
  CoolingZone,
  IncidentScenario,
  CarbonScenario,
  SimulationRun,
} from '@/types/sovereignDataCenterTwin';

/**
 * TELUS Sovereign AI Factory (Synthetic) - QC Green Facility
 */
export const telusSovereignFacility: SovereignDCFacility = {
  id: 'facility-telus-qc-001',
  projectId: 'demo-project',
  name: 'TELUS Sovereign AI Factory (Synthetic)',
  region: 'QC',
  description: 'Quebec-based sovereign AI compute facility powered by 98% renewable hydroelectric energy. Optimized for government and financial services workloads with full PIPEDA compliance.',
  energyMix: {
    renewable: 0.98,
    naturalGas: 0.02,
    nuclear: 0,
    other: 0,
  },
  financialProfile: {
    baselineCapexM: 450,
    baselineOpexMPerYear: 85,
    currentCarbonPricePerTon: 65,
    projectedNPVGreenBuildM: 280,
    projectedNPVGasBuildM: 195,
    paybackYears: 4.2,
    annualSavingsM: 18,
  },
  baseKpis: {
    sovereignComputeRatioPct: 97,
    effectiveAiPue: 1.18,
    gco2PerGpuHour: 22,
    sovereignRiskScore: 8,
    economicEfficiencyScore: 88,
    renewableRatioPct: 98,
    carbonIntensityKgPerMwh: 15,
    totalGpuCount: 8200,
    activeWorkloads: 145,
  },
  coolingZones: [
    { id: 'cz-a', name: 'Zone A - Primary', currentTempC: 21.5, targetTempC: 22, pueContribution: 0.08, status: 'normal' },
    { id: 'cz-b', name: 'Zone B - HPC', currentTempC: 23.8, targetTempC: 22, pueContribution: 0.12, status: 'warning' },
    { id: 'cz-c', name: 'Zone C - Inference', currentTempC: 20.2, targetTempC: 22, pueContribution: 0.06, status: 'normal' },
    { id: 'cz-d', name: 'Zone D - Storage', currentTempC: 18.5, targetTempC: 20, pueContribution: 0.04, status: 'normal' },
  ],
  gpuClusters: [],
  dataFlows: [],
  incidentScenarios: [],
  carbonScenarios: [],
  createdAt: new Date().toISOString(),
};

// Populate GPU clusters
telusSovereignFacility.gpuClusters = [
  {
    id: 'gpu-telus-001',
    name: 'Sovereign Training Cluster Alpha',
    region: 'QC',
    gpuCount: 2048,
    gpuType: 'H100',
    avgUtilizationPct: 78,
    tenantCount: 12,
    isSovereign: true,
    powerDrawKw: 1450,
  },
  {
    id: 'gpu-telus-002',
    name: 'Government Workloads Cluster',
    region: 'QC',
    gpuCount: 1024,
    gpuType: 'H100',
    avgUtilizationPct: 65,
    tenantCount: 3,
    isSovereign: true,
    powerDrawKw: 720,
  },
  {
    id: 'gpu-telus-003',
    name: 'Inference Pool',
    region: 'QC',
    gpuCount: 4096,
    gpuType: 'L40S',
    avgUtilizationPct: 82,
    tenantCount: 45,
    isSovereign: true,
    powerDrawKw: 890,
  },
];

// Populate data flows
telusSovereignFacility.dataFlows = [
  { id: 'df-001', stage: 'training', jurisdiction: 'QC', sovereign: true, workloadName: 'FinServ LLM Training', dataVolumeGb: 2500 },
  { id: 'df-002', stage: 'fine_tuning', jurisdiction: 'QC', sovereign: true, workloadName: 'Healthcare NLP', dataVolumeGb: 450 },
  { id: 'df-003', stage: 'inference', jurisdiction: 'QC', sovereign: true, workloadName: 'Gov Document Processing', dataVolumeGb: 120 },
  { id: 'df-004', stage: 'inference', jurisdiction: 'QC', sovereign: true, workloadName: 'Banking Fraud Detection', dataVolumeGb: 85 },
  { id: 'df-005', stage: 'backup', jurisdiction: 'ON', sovereign: true, workloadName: 'DR Replication', dataVolumeGb: 3200 },
  { id: 'df-006', stage: 'logging', jurisdiction: 'QC', sovereign: true, workloadName: 'Audit Trail', dataVolumeGb: 45 },
  { id: 'df-007', stage: 'training', jurisdiction: 'QC', sovereign: true, workloadName: 'Telecom Analytics', dataVolumeGb: 890 },
  { id: 'df-008', stage: 'inference', jurisdiction: 'QC', sovereign: true, workloadName: 'Real-time Translation', dataVolumeGb: 25 },
];

// Populate incident scenarios
telusSovereignFacility.incidentScenarios = [
  {
    id: 'inc-001',
    name: 'Cooling System Failure - Zone B',
    category: 'cooling',
    description: 'Partial failure of liquid cooling system in HPC zone',
    probabilityPerYear: 0.15,
    mttrMinutes: 120,
    impactDescription: 'GPU throttling, 15% performance degradation',
    recommendedActions: ['Activate backup cooling', 'Migrate critical workloads', 'Notify affected tenants'],
    severity: 'high',
  },
  {
    id: 'inc-002',
    name: 'Grid Power Fluctuation',
    category: 'power',
    description: 'Hydro-Quebec grid voltage fluctuation',
    probabilityPerYear: 0.08,
    mttrMinutes: 30,
    impactDescription: 'Brief UPS activation, no workload impact',
    recommendedActions: ['Monitor UPS capacity', 'Log event for HQ reporting'],
    severity: 'low',
  },
  {
    id: 'inc-003',
    name: 'Sovereignty Alert - US Mirror',
    category: 'compliance',
    description: 'Attempted data replication to US region detected',
    probabilityPerYear: 0.02,
    mttrMinutes: 15,
    impactDescription: 'Compliance violation if not blocked',
    recommendedActions: ['Block replication', 'Audit data flow rules', 'Report to compliance'],
    severity: 'critical',
  },
  {
    id: 'inc-004',
    name: 'GPU Cluster Overload',
    category: 'workload',
    description: 'Training cluster exceeds 95% utilization',
    probabilityPerYear: 0.35,
    mttrMinutes: 60,
    impactDescription: 'Queue delays, potential SLA breach',
    recommendedActions: ['Activate overflow capacity', 'Prioritize critical workloads', 'Notify waiting tenants'],
    severity: 'medium',
  },
  {
    id: 'inc-005',
    name: 'Network Fabric Degradation',
    category: 'network',
    description: 'InfiniBand fabric showing increased latency',
    probabilityPerYear: 0.12,
    mttrMinutes: 180,
    impactDescription: 'Training job slowdowns, checkpoint delays',
    recommendedActions: ['Identify faulty switches', 'Reroute traffic', 'Schedule maintenance window'],
    severity: 'medium',
  },
];

// Populate carbon scenarios
telusSovereignFacility.carbonScenarios = [
  {
    id: 'carbon-001',
    name: 'Current Policy',
    carbonPricePerTon: 65,
    projectedOpexDeltaPct: 0,
    description: 'Current federal carbon pricing at $65/tonne',
  },
  {
    id: 'carbon-002',
    name: 'Accelerated Policy',
    carbonPricePerTon: 170,
    projectedOpexDeltaPct: 2,
    description: '2030 projected carbon price under accelerated climate policy',
  },
  {
    id: 'carbon-003',
    name: 'Carbon Shock',
    carbonPricePerTon: 250,
    projectedOpexDeltaPct: 4,
    description: 'Stress test scenario with aggressive carbon pricing',
  },
];

/**
 * Prairie Mega AI Facility (Synthetic Gas Proposal) - AB Gas-Heavy
 */
export const prairieMegaFacility: SovereignDCFacility = {
  id: 'facility-prairie-ab-001',
  projectId: 'demo-project',
  name: 'Prairie Mega AI Facility (Synthetic Gas Proposal)',
  region: 'AB',
  description: 'Alberta-based high-capacity AI compute facility. Cost-optimized with natural gas power but higher carbon footprint. Proposed for budget-sensitive workloads.',
  energyMix: {
    renewable: 0.12,
    naturalGas: 0.85,
    nuclear: 0,
    other: 0.03,
  },
  financialProfile: {
    baselineCapexM: 320,
    baselineOpexMPerYear: 65,
    currentCarbonPricePerTon: 65,
    projectedNPVGreenBuildM: 145,
    projectedNPVGasBuildM: 210,
    paybackYears: 3.1,
    annualSavingsM: 12,
  },
  baseKpis: {
    sovereignComputeRatioPct: 94,
    effectiveAiPue: 1.35,
    gco2PerGpuHour: 185,
    sovereignRiskScore: 15,
    economicEfficiencyScore: 75,
    renewableRatioPct: 12,
    carbonIntensityKgPerMwh: 420,
    totalGpuCount: 6400,
    activeWorkloads: 98,
  },
  coolingZones: [
    { id: 'cz-prairie-a', name: 'Zone A - Main Hall', currentTempC: 24.2, targetTempC: 23, pueContribution: 0.18, status: 'warning' },
    { id: 'cz-prairie-b', name: 'Zone B - Expansion', currentTempC: 22.5, targetTempC: 23, pueContribution: 0.12, status: 'normal' },
    { id: 'cz-prairie-c', name: 'Zone C - Cold Aisle', currentTempC: 19.8, targetTempC: 20, pueContribution: 0.08, status: 'normal' },
  ],
  gpuClusters: [
    {
      id: 'gpu-prairie-001',
      name: 'Training Cluster Main',
      region: 'AB',
      gpuCount: 3072,
      gpuType: 'A100',
      avgUtilizationPct: 71,
      tenantCount: 28,
      isSovereign: true,
      powerDrawKw: 1850,
    },
    {
      id: 'gpu-prairie-002',
      name: 'Inference Fleet',
      region: 'AB',
      gpuCount: 2560,
      gpuType: 'L40S',
      avgUtilizationPct: 68,
      tenantCount: 55,
      isSovereign: true,
      powerDrawKw: 580,
    },
    {
      id: 'gpu-prairie-003',
      name: 'US Overflow (Non-Sovereign)',
      region: 'US-MT',
      gpuCount: 768,
      gpuType: 'A100',
      avgUtilizationPct: 45,
      tenantCount: 8,
      isSovereign: false,
      powerDrawKw: 480,
    },
  ],
  dataFlows: [
    { id: 'df-prairie-001', stage: 'training', jurisdiction: 'AB', sovereign: true, workloadName: 'Energy Sector ML', dataVolumeGb: 1800 },
    { id: 'df-prairie-002', stage: 'inference', jurisdiction: 'AB', sovereign: true, workloadName: 'Oilfield Analytics', dataVolumeGb: 320 },
    { id: 'df-prairie-003', stage: 'training', jurisdiction: 'US-MT', sovereign: false, workloadName: 'Cross-Border Research', dataVolumeGb: 450 },
    { id: 'df-prairie-004', stage: 'backup', jurisdiction: 'AB', sovereign: true, workloadName: 'Primary Backup', dataVolumeGb: 2100 },
    { id: 'df-prairie-005', stage: 'logging', jurisdiction: 'AB', sovereign: true, workloadName: 'Operations Log', dataVolumeGb: 35 },
  ],
  incidentScenarios: [
    {
      id: 'inc-prairie-001',
      name: 'Natural Gas Price Spike',
      category: 'power',
      description: 'Winter gas price increase affecting operational costs',
      probabilityPerYear: 0.4,
      mttrMinutes: 0,
      impactDescription: '25% increase in power costs for 2-3 months',
      recommendedActions: ['Activate cost pass-through clauses', 'Consider workload migration to QC'],
      severity: 'medium',
    },
    {
      id: 'inc-prairie-002',
      name: 'Carbon Policy Update',
      category: 'compliance',
      description: 'Federal carbon price increase announcement',
      probabilityPerYear: 0.8,
      mttrMinutes: 0,
      impactDescription: 'Projected OPEX increase of 8-15%',
      recommendedActions: ['Update financial models', 'Accelerate renewable transition planning'],
      severity: 'high',
    },
  ],
  carbonScenarios: [
    {
      id: 'carbon-prairie-001',
      name: 'Current Policy',
      carbonPricePerTon: 65,
      projectedOpexDeltaPct: 0,
      description: 'Current carbon pricing',
    },
    {
      id: 'carbon-prairie-002',
      name: 'Carbon Shock',
      carbonPricePerTon: 200,
      projectedOpexDeltaPct: 25,
      description: 'Major OPEX impact due to gas-heavy energy mix',
    },
  ],
  createdAt: new Date().toISOString(),
};

/**
 * Get demo simulation runs for a facility
 */
export function getDemoSimulationRuns(facilityId: string): SimulationRun[] {
  // Return empty array for unknown facilities
  const knownFacility = getAllDemoFacilities().find(f => f.id === facilityId);
  if (!knownFacility) {
    return [];
  }
  
  const isTelusFacility = facilityId === telusSovereignFacility.id;
  
  const baseRuns: SimulationRun[] = [
    {
      id: `sim-demo-001-${facilityId}`,
      facilityId,
      name: 'GPU Overload - Training Window',
      type: 'gpu_overload',
      inputParams: { gpuUtilizationIncrease: 30 },
      resultsSummary: 'Simulated 30% GPU spike. PUE increased 4%. Cooling held within limits. Recommended: enable auto-scaling.',
      kpiDeltas: { effectiveAiPue: 0.04, gco2PerGpuHour: 8 },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      durationMs: 2450,
      status: 'completed',
    },
    {
      id: `sim-demo-002-${facilityId}`,
      facilityId,
      name: 'Cooling Failure - Zone B',
      type: 'cooling_failure',
      inputParams: { coolingFailureZone: 'Zone B', severity: 'medium' },
      resultsSummary: 'Zone B cooling degraded. Emergency protocols activated. MTTR: 90 minutes. No workload loss.',
      kpiDeltas: { effectiveAiPue: 0.08, sovereignRiskScore: -5 },
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      durationMs: 1890,
      status: 'completed',
    },
    {
      id: `sim-demo-003-${facilityId}`,
      facilityId,
      name: 'Carbon @ $200/tonne',
      type: 'carbon_price_shock',
      inputParams: { carbonPricePerTon: 200 },
      resultsSummary: isTelusFacility 
        ? 'Green facility resilient. OPEX impact: +3%. Competitive advantage vs gas facilities.' 
        : 'High carbon exposure. OPEX impact: +22%. Urgent transition planning recommended.',
      kpiDeltas: { economicEfficiencyScore: isTelusFacility ? -2 : -15 },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      durationMs: 3200,
      status: 'completed',
    },
    {
      id: `sim-demo-004-${facilityId}`,
      facilityId,
      name: 'New Sovereign Bank Tenant',
      type: 'new_tenant_onboarding',
      inputParams: { newTenantSovereign: true },
      resultsSummary: 'Major Canadian bank onboarded. Sovereign ratio +2%. Capacity utilization improved.',
      kpiDeltas: { sovereignComputeRatioPct: 2, economicEfficiencyScore: 4 },
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      durationMs: 1650,
      status: 'completed',
    },
    {
      id: `sim-demo-005-${facilityId}`,
      facilityId,
      name: 'QC vs AB Emissions Comparison',
      type: 'emissions_vs_sovereignty',
      inputParams: {},
      resultsSummary: 'QC (hydro): 22g CO2/GPU-hr. AB (gas): 185g CO2/GPU-hr. Delta: 163g/GPU-hr (740% higher in AB).',
      kpiDeltas: { gco2PerGpuHour: 163 },
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      durationMs: 4100,
      status: 'completed',
    },
  ];

  if (!isTelusFacility) {
    baseRuns.push({
      id: `sim-demo-006-${facilityId}`,
      facilityId,
      name: 'Sovereignty Violation Alert',
      type: 'sovereignty_violation',
      inputParams: {},
      resultsSummary: 'Detected data flow to US-MT cluster. Compliance alert triggered. Immediate remediation required.',
      kpiDeltas: { sovereignComputeRatioPct: -5, sovereignRiskScore: 25 },
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      durationMs: 980,
      status: 'completed',
    });
  }

  return baseRuns;
}

/**
 * Get all demo facilities
 */
export function getAllDemoFacilities(): SovereignDCFacility[] {
  return [telusSovereignFacility, prairieMegaFacility];
}

/**
 * Get facility by ID
 */
export function getDemoFacilityById(id: string): SovereignDCFacility | undefined {
  return getAllDemoFacilities().find(f => f.id === id);
}

// ============================================================================
// TIME-SERIES MOCK DATA GENERATORS
// ============================================================================

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
}

/**
 * Generate 24-hour GPU usage curve with realistic daily pattern
 */
export function generateGpuUsageCurve(hours: number = 24): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();
  
  for (let i = 0; i < hours; i++) {
    const hour = (now.getHours() - hours + i + 24) % 24;
    const timestamp = new Date(now.getTime() - (hours - i) * 60 * 60 * 1000);
    
    // Simulate daily pattern: low at night, peak during business hours
    let baseUsage = 65;
    if (hour >= 9 && hour <= 17) {
      baseUsage = 82; // Business hours peak
    } else if (hour >= 18 && hour <= 22) {
      baseUsage = 75; // Evening training jobs
    } else if (hour >= 0 && hour <= 5) {
      baseUsage = 55; // Night batch processing
    }
    
    // Add realistic noise
    const noise = (Math.random() - 0.5) * 10;
    data.push({ timestamp, value: Math.min(98, Math.max(40, baseUsage + noise)) });
  }
  
  return data;
}

/**
 * Generate cooling temperature cycles (oscillating around target)
 */
export function generateCoolingTemperatureCycles(hours: number = 24): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();
  const targetTemp = 22;
  
  for (let i = 0; i < hours * 4; i++) { // 15-min intervals
    const timestamp = new Date(now.getTime() - (hours * 4 - i) * 15 * 60 * 1000);
    
    // Simulate cooling cycle oscillation with some drift
    const cyclePhase = (i % 8) / 8 * Math.PI * 2;
    const oscillation = Math.sin(cyclePhase) * 1.5;
    const drift = Math.sin(i / 20) * 0.8;
    const noise = (Math.random() - 0.5) * 0.5;
    
    data.push({ timestamp, value: targetTemp + oscillation + drift + noise });
  }
  
  return data;
}

/**
 * Generate UPS battery degradation over time
 */
export function generateUpsBatteryDegradation(months: number = 12): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();
  const startCapacity = 100;
  const degradationRate = 0.5; // % per month
  
  for (let i = 0; i < months; i++) {
    const timestamp = new Date(now.getTime() - (months - i) * 30 * 24 * 60 * 60 * 1000);
    const baseCapacity = startCapacity - (i * degradationRate);
    const noise = (Math.random() - 0.5) * 2;
    
    data.push({ timestamp, value: Math.max(70, baseCapacity + noise) });
  }
  
  return data;
}

/**
 * Generate rack-level power spikes
 */
export function generateRackPowerSpikes(hours: number = 24): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();
  const basePower = 12.4; // MW
  
  for (let i = 0; i < hours * 12; i++) { // 5-min intervals
    const timestamp = new Date(now.getTime() - (hours * 12 - i) * 5 * 60 * 1000);
    
    // Base load with small fluctuations
    let power = basePower + (Math.random() - 0.5) * 0.4;
    
    // Occasional spikes (training jobs starting)
    if (Math.random() < 0.05) {
      power += Math.random() * 2;
    }
    
    data.push({ timestamp, value: Math.min(16, power) });
  }
  
  return data;
}

/**
 * Generate carbon intensity fluctuations (grid-dependent)
 */
export function generateCarbonIntensityFluctuations(hours: number = 24): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();
  
  for (let i = 0; i < hours; i++) {
    const hour = (now.getHours() - hours + i + 24) % 24;
    const timestamp = new Date(now.getTime() - (hours - i) * 60 * 60 * 1000);
    
    // Grid carbon intensity varies by time of day (higher during peak demand)
    let baseIntensity = 25; // gCO2/kWh for hydro-heavy grid
    if (hour >= 17 && hour <= 21) {
      baseIntensity = 45; // Evening peak when natural gas kicks in
    } else if (hour >= 7 && hour <= 9) {
      baseIntensity = 35; // Morning peak
    }
    
    const noise = (Math.random() - 0.5) * 10;
    data.push({ timestamp, value: Math.max(10, baseIntensity + noise) });
  }
  
  return data;
}

/**
 * Generate network congestion events
 */
export interface NetworkEvent {
  timestamp: Date;
  type: 'link_flap' | 'crc_error' | 'congestion' | 'latency_spike';
  severity: 'low' | 'medium' | 'high';
  interface: string;
  value: number;
  description: string;
}

export function generateNetworkCongestionEvents(hours: number = 24): NetworkEvent[] {
  const events: NetworkEvent[] = [];
  const now = new Date();
  const interfaces = ['IB-sw01-p1', 'IB-sw01-p2', 'IB-sw02-p1', 'eth-mgmt-01', 'eth-stor-01'];
  const eventTypes: Array<{ type: NetworkEvent['type']; severity: NetworkEvent['severity']; desc: string }> = [
    { type: 'link_flap', severity: 'high', desc: 'Link flap detected' },
    { type: 'crc_error', severity: 'medium', desc: 'CRC errors above threshold' },
    { type: 'congestion', severity: 'low', desc: 'Congestion detected' },
    { type: 'latency_spike', severity: 'medium', desc: 'Latency spike observed' },
  ];
  
  // Generate random events over the time period
  const eventCount = Math.floor(Math.random() * 8) + 3; // 3-10 events
  
  for (let i = 0; i < eventCount; i++) {
    const hoursAgo = Math.random() * hours;
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const eventDef = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const iface = interfaces[Math.floor(Math.random() * interfaces.length)];
    
    events.push({
      timestamp,
      type: eventDef.type,
      severity: eventDef.severity,
      interface: iface,
      value: Math.floor(Math.random() * 100),
      description: `${eventDef.desc} on ${iface}`,
    });
  }
  
  // Sort by timestamp
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Get comprehensive mock telemetry bundle
 */
export function getMockTelemetryBundle() {
  return {
    gpuUsage: generateGpuUsageCurve(24),
    coolingTemps: generateCoolingTemperatureCycles(24),
    upsBattery: generateUpsBatteryDegradation(12),
    rackPower: generateRackPowerSpikes(24),
    carbonIntensity: generateCarbonIntensityFluctuations(24),
    networkEvents: generateNetworkCongestionEvents(24),
    compute: generateComputeHardwareTelemetry(24),
    power: generatePowerEnergyTelemetry(24),
    hvac: generateHVACTelemetry(24),
    sovereignty: generateSovereigntyTelemetry(24),
    esg: generateESGMetrics(24),
    incidents: generateIncidentPatterns(24),
  };
}

// ============================================================================
// COMPREHENSIVE DOMAIN TELEMETRY GENERATORS
// ============================================================================

/**
 * A. Compute & Hardware Telemetry
 */
export interface ComputeHardwareTelemetry {
  timestamp: Date;
  gpuUtilization: number;
  cpuLoad: number;
  memoryUsage: number;
  gpuTemperature: number;
  eccCorrectableErrors: number;
  eccUncorrectableErrors: number;
  thermalThrottling: boolean;
  diskIOPS: number;
  smartHealthScore: number;
}

export function generateComputeHardwareTelemetry(hours: number = 24): ComputeHardwareTelemetry[] {
  const data: ComputeHardwareTelemetry[] = [];
  const now = new Date();
  
  for (let i = 0; i < hours * 4; i++) { // 15-min intervals
    const timestamp = new Date(now.getTime() - (hours * 4 - i) * 15 * 60 * 1000);
    const hour = timestamp.getHours();
    
    // Daily pattern: higher during business hours
    const isPeak = hour >= 9 && hour <= 18;
    const isNight = hour >= 0 && hour <= 6;
    
    const baseGpu = isPeak ? 82 : isNight ? 55 : 68;
    const baseCpu = isPeak ? 65 : isNight ? 35 : 48;
    const baseTemp = isPeak ? 72 : isNight ? 58 : 65;
    
    data.push({
      timestamp,
      gpuUtilization: Math.min(98, Math.max(30, baseGpu + (Math.random() - 0.5) * 15)),
      cpuLoad: Math.min(95, Math.max(20, baseCpu + (Math.random() - 0.5) * 12)),
      memoryUsage: Math.min(92, Math.max(45, 72 + (Math.random() - 0.5) * 10)),
      gpuTemperature: Math.min(85, Math.max(50, baseTemp + (Math.random() - 0.5) * 8)),
      eccCorrectableErrors: Math.random() < 0.05 ? Math.floor(Math.random() * 3) : 0,
      eccUncorrectableErrors: Math.random() < 0.01 ? 1 : 0,
      thermalThrottling: Math.random() < 0.02,
      diskIOPS: Math.floor(15000 + (Math.random() - 0.5) * 8000),
      smartHealthScore: Math.min(100, Math.max(85, 95 + (Math.random() - 0.5) * 6)),
    });
  }
  
  return data;
}

/**
 * B. Power & Energy Telemetry
 */
export interface PowerEnergyTelemetry {
  timestamp: Date;
  rackPduPower: number[];  // Per-outlet power (kW)
  totalItLoad: number;      // Total IT load (MW)
  coolingPower: number;     // Cooling system draw (MW)
  upsChargeLevel: number;   // UPS battery %
  upsDischarging: boolean;
  powerFactor: number;
  gridCarbonIntensity: number;
  renewableMix: { wind: number; hydro: number; solar: number };
}

export function generatePowerEnergyTelemetry(hours: number = 24): PowerEnergyTelemetry[] {
  const data: PowerEnergyTelemetry[] = [];
  const now = new Date();
  
  for (let i = 0; i < hours * 6; i++) { // 10-min intervals
    const timestamp = new Date(now.getTime() - (hours * 6 - i) * 10 * 60 * 1000);
    const hour = timestamp.getHours();
    
    const isPeak = hour >= 9 && hour <= 18;
    const isEvening = hour >= 18 && hour <= 22;
    
    // Generate 8 rack PDU outlet readings
    const rackPduPower = Array.from({ length: 8 }, () => 
      Math.max(2, 12 + (Math.random() - 0.5) * 4 + (isPeak ? 2 : 0))
    );
    
    const totalItLoad = isPeak ? 12.8 + Math.random() * 1.5 : 10.2 + Math.random() * 1.2;
    const coolingPower = totalItLoad * (0.15 + Math.random() * 0.05);
    
    data.push({
      timestamp,
      rackPduPower,
      totalItLoad,
      coolingPower,
      upsChargeLevel: Math.min(100, Math.max(75, 95 + (Math.random() - 0.5) * 8)),
      upsDischarging: Math.random() < 0.01,
      powerFactor: 0.92 + Math.random() * 0.06,
      gridCarbonIntensity: isEvening ? 42 + Math.random() * 15 : 22 + Math.random() * 12,
      renewableMix: {
        wind: Math.max(5, 18 + (Math.random() - 0.5) * 10),
        hydro: Math.max(50, 72 + (Math.random() - 0.5) * 8),
        solar: hour >= 7 && hour <= 19 ? Math.max(0, 8 + (Math.random() - 0.5) * 6) : 0,
      },
    });
  }
  
  return data;
}

/**
 * C. Cooling & HVAC Telemetry
 */
export interface HVACTelemetry {
  timestamp: Date;
  coilTempDelta: number;
  refrigerantPressure: number;
  fanRPM: number;
  motorCurrent: number;
  ambientTemp: { zone: string; temp: number }[];
  hotAisleTemp: number;
  coldAisleTemp: number;
  differentialPressure: number;
}

export function generateHVACTelemetry(hours: number = 24): HVACTelemetry[] {
  const data: HVACTelemetry[] = [];
  const now = new Date();
  const zones = ['Zone A - Primary', 'Zone B - HPC', 'Zone C - Inference', 'Zone D - Storage'];
  
  for (let i = 0; i < hours * 4; i++) { // 15-min intervals
    const timestamp = new Date(now.getTime() - (hours * 4 - i) * 15 * 60 * 1000);
    const hour = timestamp.getHours();
    const isPeak = hour >= 9 && hour <= 18;
    
    // Simulate cooling cycle oscillation
    const cyclePhase = (i % 12) / 12 * Math.PI * 2;
    
    data.push({
      timestamp,
      coilTempDelta: 8 + Math.sin(cyclePhase) * 1.5 + (Math.random() - 0.5) * 0.8,
      refrigerantPressure: 285 + Math.sin(cyclePhase * 0.5) * 15 + (Math.random() - 0.5) * 8,
      fanRPM: isPeak ? 2800 + Math.random() * 400 : 2200 + Math.random() * 300,
      motorCurrent: isPeak ? 18.5 + Math.random() * 2 : 14.2 + Math.random() * 1.5,
      ambientTemp: zones.map(zone => ({
        zone,
        temp: zone.includes('HPC') 
          ? 23.5 + (Math.random() - 0.5) * 2 + (isPeak ? 1.5 : 0)
          : 21.5 + (Math.random() - 0.5) * 1.5,
      })),
      hotAisleTemp: isPeak ? 35 + Math.random() * 4 : 32 + Math.random() * 3,
      coldAisleTemp: 18 + (Math.random() - 0.5) * 2,
      differentialPressure: 0.05 + (Math.random() - 0.5) * 0.02,
    });
  }
  
  return data;
}

/**
 * D. Network & Sovereignty Telemetry
 */
export interface SovereigntyTelemetry {
  timestamp: Date;
  packetLoss: number;
  crcErrors: number;
  linkFlaps: number;
  crossBorderFlags: { destination: string; blocked: boolean; reason: string }[];
  dataFlowVolume: number;
  sovereignCompliance: number;
}

export function generateSovereigntyTelemetry(hours: number = 24): SovereigntyTelemetry[] {
  const data: SovereigntyTelemetry[] = [];
  const now = new Date();
  
  for (let i = 0; i < hours * 2; i++) { // 30-min intervals
    const timestamp = new Date(now.getTime() - (hours * 2 - i) * 30 * 60 * 1000);
    
    // Occasionally generate cross-border flags (rare events)
    const crossBorderFlags: { destination: string; blocked: boolean; reason: string }[] = [];
    if (Math.random() < 0.05) {
      crossBorderFlags.push({
        destination: Math.random() < 0.7 ? 'US-East' : 'US-West',
        blocked: true,
        reason: 'Sovereignty policy violation - data replication to non-Canadian jurisdiction',
      });
    }
    
    data.push({
      timestamp,
      packetLoss: Math.random() < 0.1 ? Math.random() * 0.5 : Math.random() * 0.05,
      crcErrors: Math.random() < 0.15 ? Math.floor(Math.random() * 12) : 0,
      linkFlaps: Math.random() < 0.08 ? Math.floor(Math.random() * 3) + 1 : 0,
      crossBorderFlags,
      dataFlowVolume: 850 + (Math.random() - 0.5) * 200, // GB/hour
      sovereignCompliance: Math.min(100, Math.max(94, 98.5 + (Math.random() - 0.5) * 4)),
    });
  }
  
  return data;
}

/**
 * E. Carbon & ESG Metrics
 */
export interface ESGMetrics {
  timestamp: Date;
  gco2ePerGpuHour: number;
  pue24h: number;
  dciePct: number;
  carbonCostBaseline: number;
  carbonCostShock: number;
  scope2Emissions: number;
  carbonCreditsAvailable: number;
}

export function generateESGMetrics(hours: number = 24): ESGMetrics[] {
  const data: ESGMetrics[] = [];
  const now = new Date();
  
  for (let i = 0; i < hours; i++) {
    const timestamp = new Date(now.getTime() - (hours - i) * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    const isEvening = hour >= 17 && hour <= 21;
    
    // Evening hours have higher carbon intensity (natural gas peaking)
    const baseCarbon = isEvening ? 32 : 22;
    
    data.push({
      timestamp,
      gco2ePerGpuHour: Math.max(15, baseCarbon + (Math.random() - 0.5) * 12),
      pue24h: 1.18 + (Math.random() - 0.5) * 0.08 + (isEvening ? 0.04 : 0),
      dciePct: Math.min(85, Math.max(72, 78 + (Math.random() - 0.5) * 8)),
      carbonCostBaseline: 65, // $/tonne baseline
      carbonCostShock: 200 + Math.random() * 50, // Stress test price
      scope2Emissions: 6.5 + (Math.random() - 0.5) * 1.5, // tonnes CO2e/day
      carbonCreditsAvailable: Math.floor(120 + (Math.random() - 0.5) * 30),
    });
  }
  
  return data;
}

/**
 * F. Incident & Fault Patterns
 */
export interface IncidentPattern {
  id: string;
  timestamp: Date;
  type: 'cooling_degradation' | 'ups_failover' | 'gpu_saturation' | 'sovereignty_violation' | 'thermal_runaway' | 'power_surge';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_systems: string[];
  timeline: { time: number; event: string; status: string }[];
  resolution_status: 'active' | 'mitigating' | 'resolved';
  mttr_minutes: number;
}

export function generateIncidentPatterns(hours: number = 24): IncidentPattern[] {
  const incidents: IncidentPattern[] = [];
  const now = new Date();
  
  const incidentTypes: Array<{
    type: IncidentPattern['type'];
    severity: IncidentPattern['severity'];
    systems: string[];
    timeline: { time: number; event: string; status: string }[];
    mttr: number;
  }> = [
    {
      type: 'cooling_degradation',
      severity: 'high',
      systems: ['CRAC-B1', 'CRAC-B2', 'Liquid Cooling Loop 2'],
      timeline: [
        { time: 0, event: 'Temperature rise detected in Zone B', status: 'alert' },
        { time: 5, event: 'Backup cooling activated', status: 'mitigating' },
        { time: 15, event: 'Workloads migrated from Zone B', status: 'mitigating' },
        { time: 45, event: 'Primary cooling restored', status: 'resolved' },
      ],
      mttr: 45,
    },
    {
      type: 'ups_failover',
      severity: 'medium',
      systems: ['UPS-A1', 'PDU-Rack-12', 'Generator-1'],
      timeline: [
        { time: 0, event: 'Grid voltage fluctuation detected', status: 'alert' },
        { time: 0.5, event: 'UPS transfer initiated', status: 'mitigating' },
        { time: 2, event: 'All loads on battery', status: 'mitigating' },
        { time: 8, event: 'Grid power stabilized', status: 'resolved' },
      ],
      mttr: 8,
    },
    {
      type: 'gpu_saturation',
      severity: 'medium',
      systems: ['H100-Cluster-Alpha', 'Job Queue', 'Tenant-FinServ-001'],
      timeline: [
        { time: 0, event: 'GPU utilization exceeds 92%', status: 'alert' },
        { time: 5, event: 'Job priority rebalancing initiated', status: 'mitigating' },
        { time: 12, event: 'Low-priority jobs paused', status: 'mitigating' },
        { time: 25, event: 'Training batch completed, utilization normalized', status: 'resolved' },
      ],
      mttr: 25,
    },
    {
      type: 'sovereignty_violation',
      severity: 'critical',
      systems: ['Data-Replication-Service', 'Firewall-Edge-01', 'Compliance-Monitor'],
      timeline: [
        { time: 0, event: 'Cross-border data flow detected to US-East', status: 'alert' },
        { time: 1, event: 'Replication blocked automatically', status: 'mitigating' },
        { time: 5, event: 'Compliance team notified', status: 'mitigating' },
        { time: 15, event: 'Audit trail generated, policy updated', status: 'resolved' },
      ],
      mttr: 15,
    },
  ];
  
  // Generate 3-6 incidents over the time period
  const incidentCount = Math.floor(Math.random() * 4) + 3;
  
  for (let i = 0; i < incidentCount; i++) {
    const hoursAgo = Math.random() * hours;
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const template = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    
    incidents.push({
      id: `inc-${Date.now()}-${i}`,
      timestamp,
      type: template.type,
      severity: template.severity,
      affected_systems: template.systems,
      timeline: template.timeline,
      resolution_status: hoursAgo > 2 ? 'resolved' : hoursAgo > 0.5 ? 'mitigating' : 'active',
      mttr_minutes: template.mttr,
    });
  }
  
  return incidents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Preview Section Mock Data - Sample Queries and Outputs
 */
export interface PreviewSampleQuery {
  query: string;
  context: string;
  output: string;
  recommendedActions: string[];
  relatedMetrics: { name: string; value: string; trend: 'up' | 'down' | 'stable' }[];
}

export function getPreviewSampleQueries(): PreviewSampleQuery[] {
  return [
    {
      query: 'GPU Cluster 2 is showing sustained high utilization. What should I do?',
      context: 'H100-Cluster-Alpha has been running at 92% utilization for 18 minutes. Current queue depth: 34 jobs. Temperature: 74°C.',
      output: 'GPU Cluster Alpha is experiencing sustained high load from FinServ LLM training jobs. Current utilization (92%) exceeds the 85% threshold. Temperature is elevated but within safe limits (74°C < 83°C critical). Queue depth suggests 2-3 hours of pending work.',
      recommendedActions: [
        'Enable overflow to Inference Pool for lower-priority jobs',
        'Notify tenant FinServ-001 of potential SLA impact',
        'Pre-position cooling resources for Zone B',
        'Monitor memory utilization (currently 78%)',
      ],
      relatedMetrics: [
        { name: 'GPU Utilization', value: '92%', trend: 'up' },
        { name: 'Queue Depth', value: '34 jobs', trend: 'up' },
        { name: 'Zone B Temp', value: '74°C', trend: 'up' },
        { name: 'PUE', value: '1.22', trend: 'up' },
      ],
    },
    {
      query: 'Cooling system in Zone B is showing anomalies. Assess the risk.',
      context: 'CRAC-B1 coil temperature delta dropped from 8°C to 5.2°C. Refrigerant pressure: 265 PSI (normal: 280-300). Fan RPM: 2400 (expected: 2800).',
      output: 'Cooling degradation detected in Zone B (HPC area). The reduced coil delta and low refrigerant pressure indicate potential compressor efficiency loss or refrigerant leak. Current cooling capacity is ~65% of nominal. If unaddressed, Zone B may reach thermal limits within 45 minutes under current GPU load.',
      recommendedActions: [
        'Activate backup CRAC-B2 immediately',
        'Reduce GPU load in Zone B by 20%',
        'Schedule emergency HVAC inspection',
        'Prepare workload migration to Zone C',
      ],
      relatedMetrics: [
        { name: 'Coil Temp Delta', value: '5.2°C', trend: 'down' },
        { name: 'Refrigerant PSI', value: '265', trend: 'down' },
        { name: 'Cooling Capacity', value: '65%', trend: 'down' },
        { name: 'Time to Critical', value: '~45 min', trend: 'down' },
      ],
    },
    {
      query: 'What happens if carbon prices spike to $200/tonne?',
      context: 'Current facility: TELUS QC (98% renewable). Comparison facility: Prairie AB (85% natural gas). Current carbon price: $65/tonne.',
      output: 'Carbon price shock analysis at $200/tonne: TELUS QC (hydro-heavy) shows minimal impact (+3% OPEX) due to 98% renewable mix. Prairie AB (gas-heavy) would face +22% OPEX increase. At $200/tonne, the QC facility gains $2.8M annual cost advantage. Break-even for green investment accelerates from 4.2 to 2.8 years.',
      recommendedActions: [
        'Lock in current renewable energy contracts',
        'Accelerate Prairie AB renewable transition plan',
        'Update financial models with $200/tonne scenario',
        'Brief board on competitive positioning',
      ],
      relatedMetrics: [
        { name: 'QC OPEX Impact', value: '+3%', trend: 'stable' },
        { name: 'AB OPEX Impact', value: '+22%', trend: 'up' },
        { name: 'Cost Advantage', value: '$2.8M/year', trend: 'up' },
        { name: 'Green ROI', value: '2.8 years', trend: 'down' },
      ],
    },
    {
      query: 'UPS just transferred to battery. What is our runway?',
      context: 'Grid voltage drop detected. UPS-A1 transferred to battery at 94% charge. Current IT load: 12.4 MW. Generator startup sequence initiated.',
      output: 'UPS transfer successful. Current battery capacity supports 12.4 MW load for approximately 8-10 minutes at full load. Generator startup typically completes in 30-45 seconds. No workload impact expected. All critical systems on protected power. Recommend monitoring PDU load distribution.',
      recommendedActions: [
        'Verify generator startup sequence progressing',
        'Monitor UPS battery discharge rate',
        'Prepare non-critical load shedding if needed',
        'Log event for utility incident report',
      ],
      relatedMetrics: [
        { name: 'UPS Charge', value: '94%', trend: 'down' },
        { name: 'Battery Runtime', value: '~9 min', trend: 'down' },
        { name: 'Generator Status', value: 'Starting', trend: 'stable' },
        { name: 'Critical Load', value: 'Protected', trend: 'stable' },
      ],
    },
  ];
}

/**
 * Deploy Section Mock Data - Cost Estimates and Recommendations
 */
export interface DeployEstimates {
  recommendedProvider: string;
  reason: string;
  gpuHoursPerWeek: number;
  renewableMix: number;
  estimatedCosts: {
    compute: number;
    storage: number;
    network: number;
    carbon: number;
    total: number;
  };
  infrastructureSizing: {
    gpuNodes: number;
    cpuNodes: number;
    storageGB: number;
    networkGbps: number;
  };
  carbonFootprint: {
    monthlyEmissions: number;
    offsetCost: number;
    netZeroDate: string;
  };
}

export function getDeployEstimates(): DeployEstimates {
  return {
    recommendedProvider: 'GCP',
    reason: 'Best efficiency for 12k GPU-hrs/week with 80% renewable mix. Montreal region (northamerica-northeast1) ensures Canadian data sovereignty.',
    gpuHoursPerWeek: 12000,
    renewableMix: 80,
    estimatedCosts: {
      compute: 8500,
      storage: 1200,
      network: 450,
      carbon: 380,
      total: 10530,
    },
    infrastructureSizing: {
      gpuNodes: 24,
      cpuNodes: 48,
      storageGB: 250000,
      networkGbps: 100,
    },
    carbonFootprint: {
      monthlyEmissions: 4.2, // tonnes CO2e
      offsetCost: 273, // $65/tonne
      netZeroDate: 'Q4 2025',
    },
  };
}

/**
 * Complete Mock Data Bundle for All Sections
 */
export function getCompleteMockDataBundle() {
  const telemetry = getMockTelemetryBundle();
  const previewQueries = getPreviewSampleQueries();
  const deployEstimates = getDeployEstimates();
  const facilities = getAllDemoFacilities();
  
  return {
    // Overview data
    overview: {
      kpiSnapshot: {
        sovereignComputeRatio: 97,
        effectiveAiPue: 1.18,
        gco2PerGpuHour: 22,
        sovereignRiskScore: 8,
        economicEfficiency: 88,
        dcie: 78,
        upsRuntimeRemaining: 45,
        redundancyLevel: 2,
      },
      recentIncidents: telemetry.incidents.slice(0, 3),
      facilityStatus: {
        name: 'TELUS Sovereign AI Factory',
        region: 'Quebec, Canada',
        gpuCount: 8200,
        renewableMix: 98,
        status: 'operational',
      },
    },
    
    // Blueprint data
    blueprint: {
      dataSourceSamples: {
        dcim: { pueReading: 1.18, rackPowerKw: 12.4, coolingLoadMw: 1.86 },
        gpu: { totalUtilization: 78, activeJobs: 142, queueDepth: 28 },
        carbon: { gridIntensity: 22, renewablePct: 98, dailyEmissions: 8.2 },
      },
      workflowTriggerSamples: telemetry.incidents.slice(0, 2),
      simulationInputs: {
        gpuOverload: { utilizationTarget: 95, duration: 30 },
        coolingFailure: { affectedZone: 'Zone B', severity: 'medium' },
        carbonShock: { pricePerTonne: 200 },
      },
    },
    
    // Preview data
    preview: {
      sampleQueries: previewQueries,
      contextualData: {
        currentLoad: telemetry.compute[telemetry.compute.length - 1],
        currentPower: telemetry.power[telemetry.power.length - 1],
        currentHvac: telemetry.hvac[telemetry.hvac.length - 1],
      },
    },
    
    // Simulation data (full telemetry)
    simulation: {
      telemetry,
      scenarios: getDemoSimulationRuns(facilities[0].id),
      kpiTimeSeries: {
        gpuUtilization: telemetry.compute.map(c => ({ timestamp: c.timestamp, value: c.gpuUtilization })),
        pue: telemetry.esg.map(e => ({ timestamp: e.timestamp, value: e.pue24h })),
        carbonIntensity: telemetry.esg.map(e => ({ timestamp: e.timestamp, value: e.gco2ePerGpuHour })),
        coolingEfficiency: telemetry.hvac.map(h => ({ timestamp: h.timestamp, value: 100 - (h.coilTempDelta - 8) * 5 })),
        rackPower: telemetry.power.map(p => ({ timestamp: p.timestamp, value: p.totalItLoad })),
      },
    },
    
    // Deploy data
    deploy: {
      estimates: deployEstimates,
      comparisonData: {
        providers: [
          { name: 'AWS', region: 'ca-central-1', cost: 10200, sovereigntyCertified: true },
          { name: 'Azure', region: 'canadacentral', cost: 9800, sovereigntyCertified: true },
          { name: 'GCP', region: 'northamerica-northeast1', cost: 10530, sovereigntyCertified: true },
        ],
        recommendedConfig: deployEstimates.infrastructureSizing,
      },
    },
  };
}
