/**
 * Data Centre Simulation Data
 * 
 * Industry-accurate simulation scenarios for Sovereign Green AI Data Centre Twins
 * All values based on real operational data and industry benchmarks
 */

import { 
  generateIndustryBaselineKpis, 
  generateRealisticTimeSeries,
  REALISTIC_SCENARIO_IMPACTS,
  AGENT_PERFORMANCE_BENCHMARKS,
  REGIONAL_ENERGY_PROFILES,
  type KPIBaselineValues,
  type TimeSeriesPoint,
} from '@/data/industryAccurateDefaults';

interface DCSimulation {
  id: string;
  agent_id: string;
  user_id: string;
  run_type: string;
  input_query: string;
  output_summary: string;
  status: string;
  duration_ms: number;
  industry: string;
  scenario_label: string;
  created_at: string;
  completed_at: string;
  error: string | null;
  kpi_impacts?: Record<string, { before: number; after: number; delta: number }>;
}

// ============================================================================
// DATA CENTRE SPECIFIC SIMULATIONS
// ============================================================================

const dcThermalSimulations: Omit<DCSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'GPU Cluster Thermal Spike',
    input_query: 'Simulate a 38% GPU load surge across the H100 cluster and model thermal propagation through the hot aisle.',
    output_summary: 'Thermal simulation complete. Initial inlet temp 22.4°C rose to 27.8°C (+5.4°C). Hot aisle reached 34.2°C. CRAH units C-01 and C-02 increased fan speed to 85%. GPU throttling probability: 11%. Recommended action: Activate supplemental cooling in zone B-3. Estimated recovery: 18 minutes with intervention, 45 minutes passive.',
    status: 'completed',
    duration_ms: 4200,
    industry: 'ai_hpc',
    error: null,
    kpi_impacts: {
      'kpi-thermal-stability': { before: 94, after: 78, delta: -16 },
      'kpi-avg-server-temp': { before: 24.3, after: 27.8, delta: 3.5 },
      'kpi-gpu-utilization': { before: 72, after: 94, delta: 22 },
    },
  },
  {
    run_type: 'simulation',
    scenario_label: 'CRAC Unit Failure',
    input_query: 'Simulate CRAC-04 complete failure during peak load and assess containment breach risk.',
    output_summary: 'Critical scenario simulated. CRAC-04 offline causes 28% airflow reduction in row 7-12. Temperature rise rate: 0.42°C/min. Time to thermal threshold (30°C): 9 minutes. N+1 redundancy engaged via CRAC-05/06. GPU throttling began at T+6 min affecting 18% of workloads. Carbon impact: +7.2% from reduced efficiency. Immediate failover successful; facility remained within ASHRAE A2 envelope.',
    status: 'completed',
    duration_ms: 6800,
    industry: 'ai_hpc',
    error: null,
    kpi_impacts: {
      'kpi-cooling-efficiency': { before: 82, after: 54, delta: -28 },
      'kpi-thermal-stability': { before: 94, after: 62, delta: -32 },
      'kpi-pue-cooling': { before: 0.25, after: 0.38, delta: 0.13 },
    },
  },
  {
    run_type: 'simulation',
    scenario_label: 'Liquid Cooling Loop Pressure Drop',
    input_query: 'Model a 15% pressure drop in the rear-door heat exchanger coolant loop for rack row 3.',
    output_summary: 'Hydraulic simulation indicates reduced heat transfer coefficient of 22%. Server exhaust temps in row 3 increased from 32°C to 38°C. Compensatory action: Increased chilled water flow rate by 18% to maintain deltaT. Energy penalty: +4.2 kW for pump operation. Recommend inspection of CDU-03 expansion vessel and air bleed valves. No workload impact with compensation active.',
    status: 'completed',
    duration_ms: 3900,
    industry: 'ai_hpc',
    error: null,
  },
];

const dcPowerSimulations: Omit<DCSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Grid Voltage Fluctuation',
    input_query: 'Simulate a 4.2% grid voltage sag during evening peak demand and assess UPS response.',
    output_summary: 'Power quality event simulated. Voltage dip from 480V to 460V detected. UPS units A and B entered active voltage regulation mode. Battery discharge: 0% (correction within UPS capacity). PDU secondary regulation engaged for sensitive GPU loads. Total ride-through: 2.3 seconds. Facility maintained N+1 throughout. Generator transfer not required. Recommend utility coordination for recurring events.',
    status: 'completed',
    duration_ms: 2100,
    industry: 'ai_hpc',
    error: null,
    kpi_impacts: {
      'kpi-power-reliability': { before: 99.2, after: 98.8, delta: -0.4 },
      'kpi-ups-runtime': { before: 18, after: 17.8, delta: -0.2 },
    },
  },
  {
    run_type: 'simulation',
    scenario_label: 'Generator Start Sequence',
    input_query: 'Simulate complete grid failure and generator start sequence for the 2MW facility.',
    output_summary: 'Emergency power simulation complete. Grid loss detected at T+0. UPS assumed full load (1.8MW). Generator G-01 received start signal at T+0.5s. Engine cranking initiated T+2s. Generator at rated speed T+8s. Synchronization and load transfer complete T+15s. Total UPS runtime consumed: 15 seconds (83% remaining). All critical loads maintained. Non-critical loads shed per protocol (245kW). Fuel consumption rate: 380L/hr at 90% load.',
    status: 'completed',
    duration_ms: 5400,
    industry: 'ai_hpc',
    error: null,
    kpi_impacts: {
      'kpi-generator-ready': { before: 100, after: 85, delta: -15 },
      'kpi-carbon-per-gpu': { before: 0.42, after: 185, delta: 184.58 },
    },
  },
];

const dcSovereigntySimulations: Omit<DCSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Cross-Border Data Flow Detection',
    input_query: 'Simulate detection of an attempted data egress to US-based CDN edge node from Canadian sovereign workload.',
    output_summary: 'Sovereignty violation detected and blocked. Workload ID: wkld-ml-training-7834 attempted routing through us-east-1 CDN node for checkpoint sync. Policy engine intercepted at network layer. Traffic rerouted to ca-central-1 compliant endpoint. Audit log generated with full packet trace. No data left Canadian jurisdiction. Tenant notification sent. Compliance score maintained at 100%. PIPEDA Article 4.7 preserved.',
    status: 'completed',
    duration_ms: 1850,
    industry: 'government',
    error: null,
    kpi_impacts: {
      'kpi-sovereign-compute': { before: 100, after: 100, delta: 0 },
      'kpi-cross-border': { before: 0, after: 0, delta: 0 },
      'kpi-policy-compliance': { before: 100, after: 100, delta: 0 },
    },
  },
  {
    run_type: 'simulation',
    scenario_label: 'PIPEDA Compliance Audit Simulation',
    input_query: 'Run a simulated privacy commissioner audit covering data residency, access controls, and retention policies.',
    output_summary: 'Audit simulation complete. 1,247 data assets scanned. Classification breakdown: Protected B (34%), Protected A (48%), Unclassified (18%). Residency compliance: 100% within CA jurisdiction. Access control audit: 99.8% compliant (2 stale service accounts flagged for review). Retention policy: 97.2% compliant (45 datasets approaching retention limit). Encryption at rest: 100%. Encryption in transit: 100%. Audit readiness score: 94.2/100. 3 remediation items logged.',
    status: 'completed',
    duration_ms: 12400,
    industry: 'government',
    error: null,
    kpi_impacts: {
      'kpi-audit-readiness': { before: 92, after: 94.2, delta: 2.2 },
      'kpi-policy-compliance': { before: 99.2, after: 97.2, delta: -2 },
    },
  },
];

const dcFinancialSimulations: Omit<DCSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Carbon Price Shock',
    input_query: 'Model the impact of carbon price increasing from $80/tonne to $170/tonne on operating costs.',
    output_summary: 'Financial impact analysis complete. Current annual carbon emissions: 42 tonnes CO2e (Quebec hydro baseline). Carbon cost increase: +$3,780/year (+112.5%). Minimal impact due to 99.8% renewable grid. Comparative analysis: Alberta facility would see +$382,500/year increase. Recommendation: Maintain Quebec location advantage in investor communications. Consider carbon credit monetization program.',
    status: 'completed',
    duration_ms: 3200,
    industry: 'ai_hpc',
    error: null,
    kpi_impacts: {
      'kpi-carbon-cost': { before: 3360, after: 7140, delta: 3780 },
      'kpi-cost-gpu-hour': { before: 2.15, after: 2.18, delta: 0.03 },
    },
  },
  {
    run_type: 'simulation',
    scenario_label: 'Electricity Rate Increase',
    input_query: 'Model 15% Hydro-Québec rate increase impact on facility economics.',
    output_summary: 'Rate impact simulation complete. Current consumption: 5MW avg load × 8,760 hrs = 43,800 MWh/year. Current cost: $2.41M/year at $0.055/kWh. New cost: $2.77M/year at $0.0633/kWh. Annual increase: +$361,000. GPU-hour cost impact: +$0.12 (from $2.15 to $2.27). ROI impact: Payback extends by 4.2 months. Mitigation: PUE improvement from 1.20 to 1.15 would offset 60% of increase through 2.2GWh savings.',
    status: 'completed',
    duration_ms: 4100,
    industry: 'ai_hpc',
    error: null,
    kpi_impacts: {
      'kpi-energy-cost': { before: 55, after: 63.3, delta: 8.3 },
      'kpi-cost-gpu-hour': { before: 2.15, after: 2.27, delta: 0.12 },
      'kpi-irr': { before: 18.5, after: 16.8, delta: -1.7 },
    },
  },
];

const dcWorkloadSimulations: Omit<DCSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Multi-Tenant GPU Contention',
    input_query: 'Simulate 3 priority tenants submitting large training jobs simultaneously and model queue fairness.',
    output_summary: 'Workload scheduling simulation complete. Tenant A (Gold SLA): 128 GPUs requested, 128 allocated, queue time 0s. Tenant B (Silver SLA): 64 GPUs requested, 48 allocated immediately, remaining 16 queued for 8min. Tenant C (Bronze SLA): 32 GPUs requested, queued 22min due to capacity. Fairness index (Jain): 0.89. SLA compliance: Tenant A 100%, Tenant B 94%, Tenant C 78%. Recommendation: Consider capacity expansion or burst-to-cloud policy for Bronze tier during peak.',
    status: 'completed',
    duration_ms: 2800,
    industry: 'ai_hpc',
    error: null,
    kpi_impacts: {
      'kpi-gpu-fairness': { before: 92, after: 89, delta: -3 },
      'kpi-avg-queue-time': { before: 8.5, after: 15.2, delta: 6.7 },
      'kpi-sla-breach': { before: 0.8, after: 3.2, delta: 2.4 },
    },
  },
  {
    run_type: 'simulation',
    scenario_label: 'GPU Cluster Failover',
    input_query: 'Simulate complete failure of GPU cluster C (48× H100) and model job redistribution.',
    output_summary: 'Cluster failure simulation complete. 23 active jobs affected (18 training, 5 inference). Checkpoint recovery: 21/23 jobs had checkpoints <15min old. Job migration: 18 jobs redistributed to clusters A/B within 4.2 minutes. 2 jobs exceeded memory requirements for available nodes—queued for cluster C recovery. Inference workloads failed over to A/B with 12ms latency increase (within SLA). Estimated cluster C RTO: 45 minutes. Total training time lost: 340 GPU-hours ($730 value).',
    status: 'completed',
    duration_ms: 5600,
    industry: 'ai_hpc',
    error: null,
    kpi_impacts: {
      'kpi-gpu-utilization': { before: 78, after: 52, delta: -26 },
      'kpi-queue-depth': { before: 24, after: 89, delta: 65 },
      'kpi-sla-breach': { before: 0.8, after: 8.5, delta: 7.7 },
    },
  },
];

function generateTimestamps(hoursAgo: number, durationMs: number) {
  const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const completedAt = new Date(createdAt.getTime() + durationMs);
  return {
    created_at: createdAt.toISOString(),
    completed_at: completedAt.toISOString(),
  };
}

/**
 * Get Data Centre specific simulations based on agent domain
 */
export function getDCSimulations(agentId: string, domain?: string): DCSimulation[] {
  let simulations: Omit<DCSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[];
  
  // Match simulations to agent domain
  if (domain?.includes('thermal') || agentId.includes('thermal') || agentId.includes('cooling')) {
    simulations = dcThermalSimulations;
  } else if (domain?.includes('power') || agentId.includes('power')) {
    simulations = dcPowerSimulations;
  } else if (domain?.includes('sovereignty') || agentId.includes('sovereignty')) {
    simulations = dcSovereigntySimulations;
  } else if (domain?.includes('financial') || agentId.includes('financial') || agentId.includes('carbon')) {
    simulations = dcFinancialSimulations;
  } else if (domain?.includes('workload') || agentId.includes('workload') || agentId.includes('gpu')) {
    simulations = dcWorkloadSimulations;
  } else {
    // Default to mixed scenarios
    simulations = [
      ...dcThermalSimulations.slice(0, 1),
      ...dcPowerSimulations.slice(0, 1),
      ...dcSovereigntySimulations.slice(0, 1),
      ...dcFinancialSimulations.slice(0, 1),
      ...dcWorkloadSimulations.slice(0, 1),
    ];
  }
  
  return simulations.map((sim, idx) => ({
    ...sim,
    id: `dc-sim-${domain || 'mixed'}-${idx}`,
    agent_id: agentId,
    user_id: 'system',
    ...generateTimestamps((idx + 1) * 2, sim.duration_ms),
  }));
}

/**
 * Generate realistic KPI time series for simulation visualization
 */
export function generateSimulationTimeSeries(
  scenarioId: string,
  points: number = 60,
  region: string = 'CA-QC'
): TimeSeriesPoint[] {
  const baselineKpis = generateIndustryBaselineKpis('ai_hpc', region);
  const baseline = generateRealisticTimeSeries(points, baselineKpis, region);
  
  const impact = REALISTIC_SCENARIO_IMPACTS[scenarioId];
  if (!impact) return baseline;
  
  // Apply scenario impacts to relevant portion of timeline
  const impactStart = Math.floor(points * 0.3);
  const impactPeak = Math.floor(points * 0.5);
  const recoveryEnd = Math.floor(points * 0.8);
  
  return baseline.map((point, idx) => {
    if (idx < impactStart) return point;
    
    // Calculate impact intensity (ramps up then recovers)
    let intensity: number;
    if (idx <= impactPeak) {
      intensity = (idx - impactStart) / (impactPeak - impactStart);
    } else if (idx <= recoveryEnd) {
      intensity = 1 - ((idx - impactPeak) / (recoveryEnd - impactPeak));
    } else {
      intensity = 0;
    }
    
    return {
      ...point,
      thermal: point.thermal + (impact.thermalRise * intensity),
      gpuUtil: Math.max(0, Math.min(100, point.gpuUtil + (impact.loadSurge * intensity))),
      pue: point.pue * (1 + (impact.carbonImpact / 100 * intensity * 0.5)),
      carbonIntensity: point.carbonIntensity * (1 + (impact.carbonImpact / 100 * intensity)),
    };
  });
}

/**
 * Get agent performance metrics
 */
export function getAgentMetrics(agentId: string): typeof AGENT_PERFORMANCE_BENCHMARKS[string] {
  // Match agent ID to benchmarks
  for (const [key, metrics] of Object.entries(AGENT_PERFORMANCE_BENCHMARKS)) {
    if (agentId.includes(key.replace('-agent', ''))) {
      return metrics;
    }
  }
  // Default to thermal agent metrics
  return AGENT_PERFORMANCE_BENCHMARKS['thermal-agent'];
}
