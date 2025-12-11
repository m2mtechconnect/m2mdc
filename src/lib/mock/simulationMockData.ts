/**
 * Simulation Scenario Data for Agent Operations Center
 * Industry-accurate scenarios for Data Centre Twin operations
 * Sources: Uptime Institute, ASHRAE TC 9.9, NVIDIA DGX, Green Grid
 */

interface SimulationScenario {
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
}

/**
 * DATA CENTRE THERMAL SCENARIOS
 * Based on Uptime Institute Outage Analysis and ASHRAE TC 9.9 guidelines
 */
const dcThermalScenarios: Omit<SimulationScenario, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'CRAH Unit Failure - Hot Aisle B',
    input_query: 'Simulate a CRAH-B-02 failure in Hot Aisle B and show thermal propagation and mitigation response.',
    output_summary: 'CRAH-B-02 failure simulated. Thermal propagation: inlet temps rose from 22°C to 28.5°C in 4 minutes across 6 racks. Mitigation: increased CRAH-B-01 and CRAH-B-03 airflow by 25%, migrated 3 GPU workloads to Zone C. Temps stabilized at 25°C within 8 minutes. No ASHRAE A1 violations.',
    status: 'completed',
    duration_ms: 5200,
    industry: 'data_centre',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'H100 GPU Thermal Throttling Event',
    input_query: 'Simulate an H100 GPU cluster reaching thermal throttling limits during LLM training burst.',
    output_summary: 'H100 cluster thermal event simulated. GPU temps reached 83°C (throttle threshold) on 4 of 8 GPUs in DGX node DGX-A-03. Training throughput dropped 18%. Response: increased rear-door heat exchanger flow, reduced batch size temporarily. Temps stabilized at 76°C. Training resumed at 95% throughput.',
    status: 'completed',
    duration_ms: 6100,
    industry: 'data_centre',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Hot Aisle Containment Breach',
    input_query: 'Simulate a hot aisle containment door left open and show thermal mixing impact.',
    output_summary: 'Containment breach simulated in Zone A. Hot air recirculation detected: cold aisle temps rose 4°C in 90 seconds. DCIM triggered door status alert. PUE degraded from 1.32 to 1.48. Auto-response: increased supply air volume by 30%. Recommended action: seal containment breach immediately.',
    status: 'completed',
    duration_ms: 4800,
    industry: 'data_centre',
    error: null,
  },
];

/**
 * DATA CENTRE POWER SCENARIOS
 * Based on Uptime Institute reliability data and IEEE 493 Gold Book
 */
const dcPowerScenarios: Omit<SimulationScenario, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Grid Frequency Deviation (Hydro-Québec)',
    input_query: 'Simulate a Hydro-Québec grid frequency deviation and show UPS transfer response.',
    output_summary: 'Grid frequency deviation simulated: dropped from 60.0Hz to 59.2Hz (below 59.5Hz threshold). UPS-A switched to battery backup within 4ms. Load transfer successful for 850kW IT load. Battery autonomy: 12 minutes at current load. Generator start signal sent. Grid restored after 45 seconds.',
    status: 'completed',
    duration_ms: 7200,
    industry: 'data_centre',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'PDU Branch Circuit Overload',
    input_query: 'Simulate a PDU branch circuit approaching overload during GPU training spike.',
    output_summary: 'PDU-R-B-08-A2 branch circuit simulation: load reached 92% of 30A rating (27.6A). Thermal protection triggered at 95%. Response: identified 2 servers for load shedding, migrated 1 GPU workload to underutilized PDU. Peak load reduced to 78%. No circuit trip occurred.',
    status: 'completed',
    duration_ms: 3400,
    industry: 'data_centre',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'UPS Battery Capacity Degradation',
    input_query: 'Simulate UPS battery capacity degradation and show runtime impact analysis.',
    output_summary: 'UPS-A battery simulation: capacity degraded from 100% to 82% over 3 years. Runtime reduced from 15 min to 11.5 min at 850kW load. Risk assessment: still exceeds Tier III minimum (10 min). Recommendation: schedule battery replacement within 6 months. Cost estimate: $45,000.',
    status: 'completed',
    duration_ms: 5800,
    industry: 'data_centre',
    error: null,
  },
];

/**
 * DATA CENTRE GPU/WORKLOAD SCENARIOS
 * Based on NVIDIA DGX operational data and MLPerf benchmarks
 */
const dcWorkloadScenarios: Omit<SimulationScenario, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'GPU Cluster Utilization Spike',
    input_query: 'Simulate a sudden 40% increase in GPU workload and show resource allocation response.',
    output_summary: 'GPU workload spike simulated: cluster utilization jumped from 65% to 94%. Power draw increased from 520kW to 680kW. Cooling load increased 28%. Response: activated standby CRAH unit, enabled economizer mode (OAT: 12°C). PUE maintained at 1.35. No thermal throttling.',
    status: 'completed',
    duration_ms: 8500,
    industry: 'data_centre',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Training Job Queue Backlog',
    input_query: 'Simulate a training job queue backlog and show scheduling optimization.',
    output_summary: 'Job queue backlog simulated: 45 pending jobs, estimated wait time 6.2 hours. Analysis: 3 low-priority jobs consuming 24 GPUs. Response: preempted low-priority jobs, freed 24 GPUs. Queue wait time reduced to 2.1 hours. SLA breach risk reduced from 78% to 12%.',
    status: 'completed',
    duration_ms: 4200,
    industry: 'data_centre',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Multi-tenant GPU Fairness Violation',
    input_query: 'Simulate a GPU fairness violation where one tenant exceeds allocated resources.',
    output_summary: 'Fairness violation detected: Tenant A consuming 85% of cluster (allocated: 60%). Tenant B starved at 8% (allocated: 25%). Response: applied weighted fair queuing, migrated 6 Tenant A jobs to lower priority. Allocation normalized within 15 minutes. Generated compliance report.',
    status: 'completed',
    duration_ms: 3800,
    industry: 'data_centre',
    error: null,
  },
];

/**
 * DATA CENTRE SOVEREIGNTY/COMPLIANCE SCENARIOS
 * Based on Canadian PIPEDA, Quebec Bill 64, and data residency requirements
 */
const dcSovereigntyScenarios: Omit<SimulationScenario, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Cross-border Data Routing Violation',
    input_query: 'Simulate a workload attempting to route through US infrastructure and show sovereignty enforcement.',
    output_summary: 'Sovereignty violation detected: Training job TRN-8934 attempted to use US-East-1 overflow capacity. PIPEDA/Bill 64 violation flagged. Response: blocked cross-border routing, rescheduled to CA-Central-1 queue. Added 45-minute wait time. Compliance maintained. Audit log generated.',
    status: 'completed',
    duration_ms: 2800,
    industry: 'data_centre',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Data Residency Audit Trail',
    input_query: 'Generate a data residency audit trail for the past 30 days.',
    output_summary: 'Audit trail generated: 12,456 jobs processed. 100% remained within Canadian jurisdiction. 3 routing attempts blocked (all to US regions). Data touched: 2.4PB. All storage confirmed in ca-central-1, ca-montreal-1 regions. Compliance score: 100%. Report exported for regulatory review.',
    status: 'completed',
    duration_ms: 6500,
    industry: 'data_centre',
    error: null,
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
 * Get simulation scenarios for a given agent
 * Returns DC-specific scenarios based on agent type
 */
export function getMockSimulations(agentId: string, templateId?: string): SimulationScenario[] {
  // For Transport Canada twin, use transport-specific scenarios
  if (templateId === 'TRANSPORT_CANADA_TWIN' || templateId?.toLowerCase().includes('transport_canada')) {
    try {
      const { getTransportCanadaSimulations } = require('@/lib/mock/transportCanadaMockData');
      return getTransportCanadaSimulations(agentId);
    } catch {
      // Fall through to DC scenarios if transport data not available
    }
  }

  // Thermal Guardian agent
  if (agentId.includes('thermal') || agentId.includes('cooling')) {
    return dcThermalScenarios.map((sim, idx) => ({
      ...sim,
      id: `sim-thermal-${idx}`,
      agent_id: agentId,
      user_id: 'system',
      ...generateTimestamps((idx + 1) * 2, sim.duration_ms),
    }));
  }

  // Power Monitor agent
  if (agentId.includes('power') || agentId.includes('ups') || agentId.includes('pdu')) {
    return dcPowerScenarios.map((sim, idx) => ({
      ...sim,
      id: `sim-power-${idx}`,
      agent_id: agentId,
      user_id: 'system',
      ...generateTimestamps((idx + 1) * 3, sim.duration_ms),
    }));
  }

  // Workload Orchestrator / GPU agent
  if (agentId.includes('workload') || agentId.includes('gpu') || agentId.includes('scheduler')) {
    return dcWorkloadScenarios.map((sim, idx) => ({
      ...sim,
      id: `sim-workload-${idx}`,
      agent_id: agentId,
      user_id: 'system',
      ...generateTimestamps((idx + 1) * 4, sim.duration_ms),
    }));
  }

  // Sovereignty Sentinel agent
  if (agentId.includes('sovereign') || agentId.includes('compliance') || agentId.includes('residency')) {
    return dcSovereigntyScenarios.map((sim, idx) => ({
      ...sim,
      id: `sim-sovereignty-${idx}`,
      agent_id: agentId,
      user_id: 'system',
      ...generateTimestamps((idx + 1) * 5, sim.duration_ms),
    }));
  }

  // Default: return mixed DC scenarios
  const allScenarios = [
    ...dcThermalScenarios.slice(0, 2),
    ...dcPowerScenarios.slice(0, 1),
    ...dcWorkloadScenarios.slice(0, 1),
  ];
  
  return allScenarios.map((sim, idx) => ({
    ...sim,
    id: `sim-dc-${idx}`,
    agent_id: agentId,
    user_id: 'system',
    ...generateTimestamps((idx + 1) * 3, sim.duration_ms),
  }));
}
