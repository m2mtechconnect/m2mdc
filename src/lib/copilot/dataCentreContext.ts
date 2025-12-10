/**
 * Data Centre Digital Twin - Co-Pilot Context Enhancement
 * Provides domain-specific context and prompts for the Co-Pilot
 */

import type { CoPilotContext } from './contextBuilder';

/**
 * Data Centre domain knowledge for Co-Pilot
 */
export const DATA_CENTRE_DOMAIN_KNOWLEDGE = {
  kpis: {
    pue: {
      name: 'Power Usage Effectiveness (PUE)',
      description: 'Ratio of total facility power to IT equipment power. Lower is better (1.0 is theoretical perfect).',
      goodRange: '< 1.4',
      warningRange: '1.4 - 1.6',
      criticalRange: '> 1.6',
    },
    sovereignComputeRatio: {
      name: 'Sovereign Compute Ratio',
      description: 'Percentage of compute workloads running on Canadian-jurisdictional infrastructure.',
      goodRange: '> 90%',
      warningRange: '70% - 90%',
      criticalRange: '< 70%',
    },
    gCo2PerGpuHour: {
      name: 'Carbon per GPU-Hour',
      description: 'Grams of CO₂ equivalent emitted per GPU compute hour.',
      goodRange: '< 50 g',
      warningRange: '50 - 150 g',
      criticalRange: '> 150 g',
    },
    thermalStabilityIndex: {
      name: 'Thermal Stability Index',
      description: 'Score from 0-100 indicating temperature variance across facility. Higher is more stable.',
      goodRange: '> 85',
      warningRange: '60 - 85',
      criticalRange: '< 60',
    },
    coolingEfficiency: {
      name: 'Cooling Efficiency Index',
      description: 'Measure of cooling system effectiveness. Higher indicates better heat removal per kW.',
      goodRange: '> 80%',
      warningRange: '60% - 80%',
      criticalRange: '< 60%',
    },
  },
  
  scenarios: [
    'GPU Utilization Spike - Model impact of 30% utilization increase',
    'Cooling Failure - Simulate CRAH unit failure and thermal cascade',
    'Grid Outage - Test UPS to generator failover sequence',
    'Carbon Price Shock - Stress test at $250/tonne carbon pricing',
    'Sovereignty Violation - Cross-border data flow detection',
    'Thermal Runaway - GPU server overheating cascade',
    'Network Congestion - InfiniBand fabric saturation',
    'Refrigerant Leak - Chiller system degradation',
  ],
  
  agents: [
    { name: 'Thermal Optimization Agent', purpose: 'Monitors hotspots and adjusts cooling zones' },
    { name: 'Power Management Agent', purpose: 'Optimizes power distribution and UPS health' },
    { name: 'Workload Scheduler Agent', purpose: 'Balances GPU jobs for efficiency and SLA compliance' },
    { name: 'Sovereignty Compliance Agent', purpose: 'Monitors data flows and blocks policy violations' },
    { name: 'Carbon Tracking Agent', purpose: 'Forecasts emissions and optimizes for green energy' },
    { name: 'Incident Response Agent', purpose: 'Coordinates automated responses to alerts' },
  ],
  
  integrations: [
    { name: 'DCIM', description: 'Data Centre Infrastructure Management' },
    { name: 'Prometheus/Grafana', description: 'Metrics collection and visualization' },
    { name: 'Kubernetes/Slurm', description: 'Container and HPC job orchestration' },
    { name: 'Energy Grid API', description: 'Real-time carbon intensity data' },
    { name: 'SNMP/Modbus', description: 'Power and cooling equipment protocols' },
  ],
};

/**
 * Build data centre-specific system prompt
 */
export function buildDataCentreSystemPrompt(context: CoPilotContext): string {
  const isDataCentreTwin = 
    context.templateId?.includes('data-cent') ||
    context.industry?.toLowerCase().includes('data cent') ||
    context.activePage === 'simulation' ||
    context.twinContext?.templateId?.includes('data-cent');

  if (!isDataCentreTwin) {
    return '';
  }

  return `
## Data Centre Digital Twin Domain Context

You are assisting with a **Sovereign Green AI Data Centre Digital Twin**. This twin simulates and optimizes:

### Key Performance Indicators (KPIs)
${Object.entries(DATA_CENTRE_DOMAIN_KNOWLEDGE.kpis)
  .map(([key, kpi]) => `- **${kpi.name}**: ${kpi.description} (Good: ${kpi.goodRange})`)
  .join('\n')}

### Available Simulation Scenarios
${DATA_CENTRE_DOMAIN_KNOWLEDGE.scenarios.map(s => `- ${s}`).join('\n')}

### Configured Agents
${DATA_CENTRE_DOMAIN_KNOWLEDGE.agents.map(a => `- **${a.name}**: ${a.purpose}`).join('\n')}

### Integrations
${DATA_CENTRE_DOMAIN_KNOWLEDGE.integrations.map(i => `- **${i.name}**: ${i.description}`).join('\n')}

### Guidance
- When discussing PUE, explain that values below 1.4 are excellent, 1.4-1.6 is average, above 1.6 needs improvement.
- For sovereignty questions, emphasize Canadian data residency requirements and cross-border flow risks.
- When analyzing carbon, consider grid carbon intensity (gCO₂/kWh) and renewable energy mix.
- For thermal issues, consider rack-level hotspots, cooling zone coverage, and airflow patterns.
- GPU workload optimization should balance utilization, thermal limits, and SLA requirements.

You can help the user:
1. Explain any KPI and how to improve it
2. Compare scenarios and their impact
3. Diagnose alerts and suggest mitigations
4. Optimize cooling, power, or workload distribution
5. Navigate blueprint, simulation, and deployment
`;
}

/**
 * Get sample questions for Data Centre domain
 */
export function getDataCentreSampleQuestions(): string[] {
  return [
    'What is our current PUE and how can we improve it?',
    'Explain the sovereign compute ratio and why it matters',
    'Compare the impact of a cooling failure vs grid outage',
    'How much carbon are we emitting per GPU-hour?',
    'Show me the thermal hotspot risks in the facility',
    'What would happen if carbon prices jumped to $250/tonne?',
    'How can I optimize GPU utilization without overheating?',
    'Explain the sovereignty compliance workflow',
    'What integrations do I need for real-time monitoring?',
    'Run a simulation of the cooling failure scenario',
  ];
}

/**
 * Check if current context is data centre related
 */
export function isDataCentreContext(context: CoPilotContext): boolean {
  return (
    context.activePage === 'data_centre_twin' ||
    context.templateId?.includes('data-cent') ||
    context.templateId?.includes('sovereign') ||
    context.industry?.toLowerCase().includes('data cent') ||
    context.twinContext?.templateId?.includes('data-cent') ||
    context.twinContext?.templateId?.includes('sovereign') ||
    false
  );
}
