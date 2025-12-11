/**
 * Centralized Agent Catalog - Single source of truth for all DC subsystem agents
 * Used across: Builder, ManageAgents, DataCentreTwin, Simulation, Telemetry
 */

// Agent ID enum for type safety
export enum AgentId {
  THERMAL_GUARDIAN = 'thermal-guardian',
  POWER_UPS_MONITOR = 'power-ups-monitor',
  COOLING_OPTIMIZER = 'cooling-optimization',
  NETWORK_FABRIC = 'network-fabric',
  FACILITY_SAFETY = 'facility-safety',
  WORKLOAD_ORCHESTRATOR = 'workload-orchestrator',
  SOVEREIGNTY_SENTINEL = 'sovereignty-sentinel',
  CARBON_COST = 'carbon-cost-agent',
  INCIDENT_RESPONSE = 'incident-response',
  // Retail-specific agents
  RETAIL_EDGE_RESILIENCE = 'retail-edge-resilience',
  COLD_CHAIN_OPTIMIZER = 'cold-chain-optimizer',
  SUPPLY_CHAIN_SOVEREIGNTY = 'supply-chain-sovereignty',
}

// Agent domains matching builder types
export type AgentDomain =
  | 'thermal'
  | 'power'
  | 'cooling'
  | 'network'
  | 'workload'
  | 'financial'
  | 'incidents'
  | 'sovereignty'
  | 'retail';

// Centralized agent definition
export interface AgentDefinitionCatalog {
  id: AgentId;
  label: string;
  description: string;
  domain: AgentDomain;
  icon: string;
  defaultEnabled: boolean;
  kpiKeys: string[]; // KPIs this agent monitors/impacts
  inputSignals: string[];
  outputActions: string[];
  workflowIds: string[];
  relevantIndustries: string[]; // '*' for all industries
}

// Map from archetype agent IDs (underscores) to catalog IDs
export const ARCHETYPE_AGENT_ID_MAP: Record<string, AgentId> = {
  thermal_agent: AgentId.THERMAL_GUARDIAN,
  power_agent: AgentId.POWER_UPS_MONITOR,
  cooling_agent: AgentId.COOLING_OPTIMIZER,
  network_agent: AgentId.NETWORK_FABRIC,
  facility_safety_agent: AgentId.FACILITY_SAFETY,
  workload_gpu_agent: AgentId.WORKLOAD_ORCHESTRATOR,
  sovereignty_agent: AgentId.SOVEREIGNTY_SENTINEL,
  carbon_cost_agent: AgentId.CARBON_COST,
  incident_response_agent: AgentId.INCIDENT_RESPONSE,
  retail_edge_resilience_agent: AgentId.RETAIL_EDGE_RESILIENCE,
  cold_chain_optimizer_agent: AgentId.COLD_CHAIN_OPTIMIZER,
  supply_chain_sovereignty_agent: AgentId.SUPPLY_CHAIN_SOVEREIGNTY,
};

// Master agent catalog
export const AGENT_CATALOG: Record<AgentId, AgentDefinitionCatalog> = {
  [AgentId.THERMAL_GUARDIAN]: {
    id: AgentId.THERMAL_GUARDIAN,
    label: 'Thermal Guardian',
    description: 'Monitors server temperatures, detects hotspots, prevents thermal throttling',
    domain: 'thermal',
    icon: 'Thermometer',
    defaultEnabled: true,
    kpiKeys: ['thermalStabilityScore', 'avg-server-temp', 'hotspot-risk'],
    inputSignals: ['CPU temps', 'GPU temps', 'Ambient sensors', 'Fan RPM', 'Airflow velocity'],
    outputActions: ['Thermal alerts', 'Cooling recommendations', 'Throttle warnings'],
    workflowIds: ['wf-thermal-runaway', 'wf-hotspot-detection'],
    relevantIndustries: ['*'],
  },
  [AgentId.POWER_UPS_MONITOR]: {
    id: AgentId.POWER_UPS_MONITOR,
    label: 'Power & UPS Monitor',
    description: 'Manages power distribution, monitors UPS health, coordinates generator failover',
    domain: 'power',
    icon: 'Zap',
    defaultEnabled: true,
    kpiKeys: ['pue', 'effective-ai-pue', 'ups-runtime-remaining', 'redundancy-level', 'powerReliabilityScore'],
    inputSignals: ['PDU readings', 'UPS status', 'Generator fuel', 'Grid voltage', 'Power factor'],
    outputActions: ['Power alerts', 'Failover commands', 'Load balancing actions'],
    workflowIds: ['wf-ups-failure', 'wf-grid-outage', 'wf-pdu-overload'],
    relevantIndustries: ['*'],
  },
  [AgentId.COOLING_OPTIMIZER]: {
    id: AgentId.COOLING_OPTIMIZER,
    label: 'Cooling Optimization Agent',
    description: 'Optimizes CRAC/CRAH units, manages chiller plant, monitors refrigerant levels',
    domain: 'cooling',
    icon: 'Wind',
    defaultEnabled: true,
    kpiKeys: ['coolingEfficiencyIndex', 'pue', 'supply-temp', 'humidity'],
    inputSignals: ['Supply/return temps', 'Humidity', 'Refrigerant pressure', 'Chiller load'],
    outputActions: ['Setpoint adjustments', 'Unit failover', 'Efficiency recommendations'],
    workflowIds: ['wf-crac-failure', 'wf-refrigerant-leak', 'wf-humidity-excursion'],
    relevantIndustries: ['*'],
  },
  [AgentId.NETWORK_FABRIC]: {
    id: AgentId.NETWORK_FABRIC,
    label: 'Network Fabric Agent',
    description: 'Monitors network fabric health, detects congestion, manages traffic routing',
    domain: 'network',
    icon: 'Network',
    defaultEnabled: true,
    kpiKeys: ['network-integrity', 'fabric-saturation', 'avg-latency', 'packet-loss'],
    inputSignals: ['Port utilization', 'Packet errors', 'Latency metrics', 'BGP status'],
    outputActions: ['Network alerts', 'Route recommendations', 'Congestion warnings'],
    workflowIds: ['wf-network-congestion', 'wf-switch-failure'],
    relevantIndustries: ['*'],
  },
  [AgentId.FACILITY_SAFETY]: {
    id: AgentId.FACILITY_SAFETY,
    label: 'Facility & Safety Agent',
    description: 'Monitors physical security, fire suppression, water detection, and environmental safety',
    domain: 'incidents',
    icon: 'Shield',
    defaultEnabled: true,
    kpiKeys: ['env-safety', 'fire-readiness', 'physical-security'],
    inputSignals: ['Fire sensors', 'Water leak detectors', 'Security cameras', 'Access logs', 'Air quality'],
    outputActions: ['Safety alerts', 'Evacuation triggers', 'Security notifications'],
    workflowIds: ['wf-fire-suppression', 'wf-water-leak', 'wf-security-breach'],
    relevantIndustries: ['*'],
  },
  [AgentId.WORKLOAD_ORCHESTRATOR]: {
    id: AgentId.WORKLOAD_ORCHESTRATOR,
    label: 'Workload Orchestrator',
    description: 'Optimizes GPU workload scheduling, manages queues, ensures SLA compliance',
    domain: 'workload',
    icon: 'Cpu',
    defaultEnabled: true,
    kpiKeys: ['gpuUtilization', 'gpu-fairness', 'queue-depth', 'sla-breach'],
    inputSignals: ['GPU utilization', 'Queue depth', 'Job priorities', 'Tenant quotas', 'SLA targets'],
    outputActions: ['Scheduling decisions', 'Queue priorities', 'SLA breach alerts'],
    workflowIds: ['wf-gpu-saturation', 'wf-sla-breach', 'wf-tenant-overload'],
    relevantIndustries: ['*'],
  },
  [AgentId.SOVEREIGNTY_SENTINEL]: {
    id: AgentId.SOVEREIGNTY_SENTINEL,
    label: 'Sovereignty Sentinel',
    description: 'Monitors data residency, ensures compliance with PIPEDA and jurisdictional requirements',
    domain: 'sovereignty',
    icon: 'Globe',
    defaultEnabled: true,
    kpiKeys: ['sovereignComplianceScore', 'sovereign-compute-ratio', 'sovereign-risk-score', 'data-residency-score'],
    inputSignals: ['Data flow logs', 'Geo-routing paths', 'Jurisdiction tags', 'Compliance rules'],
    outputActions: ['Sovereignty alerts', 'Route blocking', 'Compliance reports'],
    workflowIds: ['wf-sovereignty-violation', 'wf-data-residency'],
    relevantIndustries: ['*'],
  },
  [AgentId.CARBON_COST]: {
    id: AgentId.CARBON_COST,
    label: 'Carbon & Cost Agent',
    description: 'Tracks costs, carbon pricing, energy mix optimization, financial forecasting',
    domain: 'financial',
    icon: 'Leaf',
    defaultEnabled: true,
    kpiKeys: ['emissionsVsTarget', 'gco2-per-gpu-hour', 'renewable-pct', 'energy-cost', 'economic-efficiency'],
    inputSignals: ['Energy consumption', 'Carbon intensity', 'Spot prices', 'PPA rates'],
    outputActions: ['Cost forecasts', 'Carbon reports', 'Optimization recommendations'],
    workflowIds: ['wf-carbon-price-shock', 'wf-renewable-outage', 'wf-cost-optimization'],
    relevantIndustries: ['*'],
  },
  [AgentId.INCIDENT_RESPONSE]: {
    id: AgentId.INCIDENT_RESPONSE,
    label: 'Incident Response Agent',
    description: 'Coordinates emergency response across all domains, manages escalation',
    domain: 'incidents',
    icon: 'AlertTriangle',
    defaultEnabled: true,
    kpiKeys: ['env-safety', 'early-warning', 'fire-readiness'],
    inputSignals: ['All domain alerts', 'Severity levels', 'Personnel status'],
    outputActions: ['Incident tickets', 'Escalations', 'Coordination commands'],
    workflowIds: ['wf-major-incident', 'wf-escalation', 'wf-post-mortem'],
    relevantIndustries: ['*'],
  },
  // Retail-specific agents
  [AgentId.RETAIL_EDGE_RESILIENCE]: {
    id: AgentId.RETAIL_EDGE_RESILIENCE,
    label: 'Retail Edge Resilience Agent',
    description: 'Monitors POS uptime, IoT devices, and store compute infrastructure across 4,000+ sites',
    domain: 'retail',
    icon: 'Store',
    defaultEnabled: false,
    kpiKeys: ['retail-edge-uptime', 'retail-latency', 'uptime'],
    inputSignals: ['POS status', 'IoT heartbeats', 'Store network', 'Edge compute utilization'],
    outputActions: ['Failover triggers', 'Edge alerts', 'Store notifications'],
    workflowIds: ['wf-retail-edge-failure', 'wf-pos-degradation'],
    relevantIndustries: ['retail_ecommerce_green_twin', 'retail_hyperscale_green_twin'],
  },
  [AgentId.COLD_CHAIN_OPTIMIZER]: {
    id: AgentId.COLD_CHAIN_OPTIMIZER,
    label: 'Cold Chain Optimization Agent',
    description: 'Optimizes refrigerated logistics and cooling cycles for warehouses and stores',
    domain: 'retail',
    icon: 'Snowflake',
    defaultEnabled: false,
    kpiKeys: ['cold-chain-efficiency', 'effective-ai-pue', 'gco2-per-gpu-hour'],
    inputSignals: ['Refrigeration temps', 'Compressor loads', 'Defrost cycles', 'Ambient conditions'],
    outputActions: ['Cooling adjustments', 'Defrost scheduling', 'Energy optimization'],
    workflowIds: ['wf-cold-chain-failure', 'wf-refrigeration-optimization'],
    relevantIndustries: ['retail_hyperscale_green_twin'],
  },
  [AgentId.SUPPLY_CHAIN_SOVEREIGNTY]: {
    id: AgentId.SUPPLY_CHAIN_SOVEREIGNTY,
    label: 'Supply Chain Sovereignty Agent',
    description: 'Ensures global compliance routing for supply chain data across PIPEDA, PCI, and regional regulations',
    domain: 'retail',
    icon: 'Truck',
    defaultEnabled: false,
    kpiKeys: ['sovereign-compute-ratio', 'sovereign-risk-score'],
    inputSignals: ['Supply chain data flows', 'Geo-routing', 'Compliance rules', 'PCI scopes'],
    outputActions: ['Route blocking', 'Compliance alerts', 'Audit reports'],
    workflowIds: ['wf-supply-chain-sovereignty', 'wf-pci-violation'],
    relevantIndustries: ['retail_hyperscale_green_twin'],
  },
};

// Helper: Get all agents as array
export function getAllAgents(): AgentDefinitionCatalog[] {
  return Object.values(AGENT_CATALOG);
}

// Helper: Get agents by domain
export function getAgentsByDomain(domain: AgentDomain): AgentDefinitionCatalog[] {
  return Object.values(AGENT_CATALOG).filter(a => a.domain === domain);
}

// Helper: Get agents relevant to a specific industry
export function getAgentsForIndustry(industryId: string): AgentDefinitionCatalog[] {
  return Object.values(AGENT_CATALOG).filter(a => 
    a.relevantIndustries.includes('*') || a.relevantIndustries.includes(industryId)
  );
}

// Helper: Get default enabled agents
export function getDefaultEnabledAgents(): AgentDefinitionCatalog[] {
  return Object.values(AGENT_CATALOG).filter(a => a.defaultEnabled);
}

// Helper: Map archetype agent ID to catalog AgentId
export function mapArchetypeAgentId(archetypeId: string): AgentId | null {
  return ARCHETYPE_AGENT_ID_MAP[archetypeId] || null;
}

// Helper: Map array of archetype agent IDs to AgentId[]
export function mapArchetypeAgentIds(archetypeIds: string[]): AgentId[] {
  return archetypeIds
    .map(id => ARCHETYPE_AGENT_ID_MAP[id])
    .filter((id): id is AgentId => id !== undefined);
}

// Helper: Get agent by ID
export function getAgentById(id: AgentId | string): AgentDefinitionCatalog | undefined {
  return AGENT_CATALOG[id as AgentId];
}
