/**
 * DC Twin Builder Types - Single Source of Truth
 * Complete schema for Sovereign Green AI Data Centre Twin builder configuration
 * All tabs (Overview, Blueprint, Preview, Simulation, Deploy) read from this schema
 */

import type { DCScanIndustry, DCBlueprintProfile, DCTier, DCTrafficScale } from './dcScan';
import type { DomainType, AlertSeverity } from './dataCenterTwin';

// ============================================================================
// OVERVIEW TAB FIELDS (Builder Step 1)
// ============================================================================

export interface DCTwinOverview {
  // Core identity
  twinName: string;
  twinSlug: string;
  twinSummary: string;
  description: string;
  
  // Classification
  industries: string[];
  primaryUseCases: string[];
  targetAudience: string[]; // "Who Is This For"
  
  // Display metrics
  displayRoi: string;
  displayTimeSaved: string;
  displayDownloads: number;
  
  // Business context
  businessImpactSummary: string;
  keyBenefits: string[];
  exampleImpact: string;
  howItWorks: string[];
  keyCapabilities: string[];
  kpisImproved: string[];
  
  // Facility metadata
  facilityLocation: string;
  regionCode: string;
  gpuFleet: string;
  coolingType: 'air' | 'liquid' | 'hybrid' | 'chilled_water';
  powerTopology: 'N' | 'N+1' | '2N' | '2N+1';
  capacityKw: number;
  tier: DCTier;
  renewablePercent: number;
  sovereignCompliance: boolean;
}

// ============================================================================
// AGENT CONFIGURATION (Builder Step 2 & 3)
// ============================================================================

export type DCAgentDomain = 
  | 'thermal'
  | 'power'
  | 'cooling'
  | 'network'
  | 'workload'
  | 'financial'
  | 'incidents'
  | 'sovereignty';

export interface DCAgentConfig {
  id: string;
  name: string;
  description: string;
  domain: DCAgentDomain;
  enabled: boolean;
  inputSignals: string[];
  outputActions: string[];
  kpisImpacted: string[];
  workflowIds: string[];
  icon?: string;
}

// Required agents per spec (9 agents total)
export const REQUIRED_DC_AGENTS: DCAgentConfig[] = [
  {
    id: 'thermal-guardian',
    name: 'Thermal Guardian',
    description: 'Monitors server temperatures, detects hotspots, prevents thermal throttling',
    domain: 'thermal',
    enabled: true,
    inputSignals: ['CPU temps', 'GPU temps', 'Ambient sensors', 'Fan RPM', 'Airflow velocity'],
    outputActions: ['Thermal alerts', 'Cooling recommendations', 'Throttle warnings'],
    kpisImpacted: ['thermal-stability', 'hotspot-risk', 'avg-server-temp'],
    workflowIds: ['wf-thermal-runaway', 'wf-hotspot-detection'],
  },
  {
    id: 'power-ups-monitor',
    name: 'Power & UPS Monitor',
    description: 'Manages power distribution, monitors UPS health, coordinates generator failover',
    domain: 'power',
    enabled: true,
    inputSignals: ['PDU readings', 'UPS status', 'Generator fuel', 'Grid voltage', 'Power factor'],
    outputActions: ['Power alerts', 'Failover commands', 'Load balancing actions'],
    kpisImpacted: ['power-reliability', 'ups-health', 'ups-runtime', 'redundancy-level'],
    workflowIds: ['wf-ups-failure', 'wf-grid-outage', 'wf-pdu-overload'],
  },
  {
    id: 'cooling-optimization',
    name: 'Cooling Optimization Agent',
    description: 'Optimizes CRAC/CRAH units, manages chiller plant, monitors refrigerant levels',
    domain: 'cooling',
    enabled: true,
    inputSignals: ['Supply/return temps', 'Humidity', 'Refrigerant pressure', 'Chiller load'],
    outputActions: ['Setpoint adjustments', 'Unit failover', 'Efficiency recommendations'],
    kpisImpacted: ['cooling-efficiency', 'pue-cooling', 'supply-temp', 'humidity'],
    workflowIds: ['wf-crac-failure', 'wf-refrigerant-leak', 'wf-humidity-excursion'],
  },
  {
    id: 'network-fabric',
    name: 'Network Fabric Agent',
    description: 'Monitors network fabric health, detects congestion, manages traffic routing',
    domain: 'network',
    enabled: true,
    inputSignals: ['Port utilization', 'Packet errors', 'Latency metrics', 'BGP status'],
    outputActions: ['Network alerts', 'Route recommendations', 'Congestion warnings'],
    kpisImpacted: ['network-integrity', 'fabric-saturation', 'avg-latency', 'packet-loss'],
    workflowIds: ['wf-network-congestion', 'wf-switch-failure'],
  },
  {
    id: 'facility-safety',
    name: 'Facility & Safety Agent',
    description: 'Monitors physical security, fire suppression, water detection, and environmental safety',
    domain: 'incidents',
    enabled: true,
    inputSignals: ['Fire sensors', 'Water leak detectors', 'Security cameras', 'Access logs', 'Air quality'],
    outputActions: ['Safety alerts', 'Evacuation triggers', 'Security notifications'],
    kpisImpacted: ['env-safety', 'fire-readiness', 'physical-security'],
    workflowIds: ['wf-fire-suppression', 'wf-water-leak', 'wf-security-breach'],
  },
  {
    id: 'workload-orchestrator',
    name: 'Workload Orchestrator',
    description: 'Optimizes GPU workload scheduling, manages queues, ensures SLA compliance',
    domain: 'workload',
    enabled: true,
    inputSignals: ['GPU utilization', 'Queue depth', 'Job priorities', 'Tenant quotas', 'SLA targets'],
    outputActions: ['Scheduling decisions', 'Queue priorities', 'SLA breach alerts'],
    kpisImpacted: ['gpu-utilization', 'gpu-fairness', 'queue-depth', 'sla-breach'],
    workflowIds: ['wf-gpu-saturation', 'wf-sla-breach', 'wf-tenant-overload'],
  },
  {
    id: 'sovereignty-sentinel',
    name: 'Sovereignty Sentinel',
    description: 'Monitors data residency, ensures compliance with PIPEDA and jurisdictional requirements',
    domain: 'sovereignty',
    enabled: true,
    inputSignals: ['Data flow logs', 'Geo-routing paths', 'Jurisdiction tags', 'Compliance rules'],
    outputActions: ['Sovereignty alerts', 'Route blocking', 'Compliance reports'],
    kpisImpacted: ['sovereign-compute-ratio', 'sovereign-risk-score', 'compliance-score'],
    workflowIds: ['wf-sovereignty-violation', 'wf-data-residency'],
  },
  {
    id: 'carbon-cost-agent',
    name: 'Carbon & Cost Agent',
    description: 'Tracks costs, carbon pricing, energy mix optimization, financial forecasting',
    domain: 'financial',
    enabled: true,
    inputSignals: ['Energy consumption', 'Carbon intensity', 'Spot prices', 'PPA rates'],
    outputActions: ['Cost forecasts', 'Carbon reports', 'Optimization recommendations'],
    kpisImpacted: ['effective-pue', 'carbon-per-gpu', 'renewable-pct', 'energy-cost'],
    workflowIds: ['wf-carbon-price-shock', 'wf-renewable-outage', 'wf-cost-optimization'],
  },
  {
    id: 'incident-response',
    name: 'Incident Response Agent',
    description: 'Coordinates emergency response across all domains, manages escalation',
    domain: 'incidents',
    enabled: true,
    inputSignals: ['All domain alerts', 'Severity levels', 'Personnel status'],
    outputActions: ['Incident tickets', 'Escalations', 'Coordination commands'],
    kpisImpacted: ['env-safety', 'early-warning', 'fire-readiness'],
    workflowIds: ['wf-major-incident', 'wf-escalation', 'wf-post-mortem'],
  },
];

// Map archetype agent IDs (underscores) to builder agent IDs (hyphens)
export const ARCHETYPE_TO_BUILDER_AGENT_MAP: Record<string, string> = {
  thermal_agent: 'thermal-guardian',
  power_agent: 'power-ups-monitor',
  cooling_agent: 'cooling-optimization',
  network_agent: 'network-fabric',
  facility_safety_agent: 'facility-safety',
  workload_gpu_agent: 'workload-orchestrator',
  sovereignty_agent: 'sovereignty-sentinel',
  carbon_cost_agent: 'carbon-cost-agent',
  incident_response_agent: 'incident-response',
};

// ============================================================================
// DATA SOURCE CONFIGURATION (Builder Step 2)
// ============================================================================

export type DCDataSourceType = 'sensor' | 'api' | 'database' | 'stream' | 'file';
export type DCDataSourceProtocol = 'SNMP' | 'Modbus' | 'BACnet' | 'REST' | 'gRPC' | 'MQTT' | 'Prometheus' | 'OPC-UA';

export interface DCDataSourceConfig {
  id: string;
  name: string;
  description: string;
  sourceType: DCDataSourceType;
  protocol: DCDataSourceProtocol;
  domain: DCAgentDomain;
  enabled: boolean;
  updateFrequency: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  endpoint?: string;
}

// Required data sources per spec
export const REQUIRED_DC_DATA_SOURCES: DCDataSourceConfig[] = [
  { id: 'gpu-telemetry', name: 'GPU Telemetry', description: 'HPC/GPU utilization, queues, tenants', sourceType: 'api', protocol: 'gRPC', domain: 'workload', enabled: true, updateFrequency: '5s', criticality: 'high' },
  { id: 'dcim-telemetry', name: 'DCIM Telemetry', description: 'Power, cooling, PUE, temps, UPS', sourceType: 'api', protocol: 'REST', domain: 'power', enabled: true, updateFrequency: '10s', criticality: 'critical' },
  { id: 'energy-feeds', name: 'Energy Feeds', description: 'kWh consumption, tariffs', sourceType: 'sensor', protocol: 'Modbus', domain: 'financial', enabled: true, updateFrequency: '60s', criticality: 'medium' },
  { id: 'carbon-intensity', name: 'Carbon Intensity', description: 'Grid gCO₂/kWh, renewable %', sourceType: 'api', protocol: 'REST', domain: 'financial', enabled: true, updateFrequency: '300s', criticality: 'medium' },
  { id: 'compliance-policies', name: 'Compliance Policies', description: 'PIPEDA, internal policies, SLAs', sourceType: 'database', protocol: 'REST', domain: 'sovereignty', enabled: true, updateFrequency: '3600s', criticality: 'high' },
];

// ============================================================================
// KPI CONFIGURATION (Builder Step 2)
// ============================================================================

export type KPIDirection = 'lower_is_better' | 'higher_is_better';

export interface DCKPIConfig {
  id: string;
  name: string;
  unit: string;
  description: string;
  direction: KPIDirection;
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  dataSourceId: string;
  domain: DCAgentDomain;
  enabled: boolean;
}

// Required KPIs per spec (9 KPIs including uptime)
export const REQUIRED_DC_KPIS: DCKPIConfig[] = [
  { id: 'sovereign-compute-ratio', name: 'Sovereign Compute Ratio', unit: '%', description: 'Percentage of compute in sovereign jurisdiction', direction: 'higher_is_better', target: 100, warningThreshold: 90, criticalThreshold: 80, dataSourceId: 'compliance-policies', domain: 'sovereignty', enabled: true },
  { id: 'effective-ai-pue', name: 'Effective AI PUE', unit: '', description: 'Power Usage Effectiveness for AI workloads', direction: 'lower_is_better', target: 1.2, warningThreshold: 1.4, criticalThreshold: 1.6, dataSourceId: 'dcim-telemetry', domain: 'power', enabled: true },
  { id: 'gco2-per-gpu-hour', name: 'gCO₂ per GPU-hour', unit: 'g', description: 'Carbon intensity per GPU hour', direction: 'lower_is_better', target: 20, warningThreshold: 100, criticalThreshold: 200, dataSourceId: 'carbon-intensity', domain: 'financial', enabled: true },
  { id: 'sovereign-risk-score', name: 'Sovereignty Risk Score', unit: '/100', description: 'Data sovereignty risk (lower is better)', direction: 'lower_is_better', target: 0, warningThreshold: 20, criticalThreshold: 40, dataSourceId: 'compliance-policies', domain: 'sovereignty', enabled: true },
  { id: 'economic-efficiency', name: 'Economic Efficiency', unit: '/100', description: 'Overall economic efficiency score', direction: 'higher_is_better', target: 90, warningThreshold: 70, criticalThreshold: 50, dataSourceId: 'energy-feeds', domain: 'financial', enabled: true },
  { id: 'dcie', name: 'DCIE', unit: '%', description: 'Data Center Infrastructure Efficiency', direction: 'higher_is_better', target: 85, warningThreshold: 70, criticalThreshold: 55, dataSourceId: 'dcim-telemetry', domain: 'power', enabled: true },
  { id: 'ups-runtime-remaining', name: 'UPS Runtime Remaining', unit: 'min', description: 'UPS battery backup runtime', direction: 'higher_is_better', target: 30, warningThreshold: 15, criticalThreshold: 10, dataSourceId: 'dcim-telemetry', domain: 'power', enabled: true },
  { id: 'redundancy-level', name: 'Redundancy Level', unit: '', description: 'Power redundancy (N, N+1, 2N)', direction: 'higher_is_better', target: 2, warningThreshold: 1, criticalThreshold: 0, dataSourceId: 'dcim-telemetry', domain: 'power', enabled: true },
  { id: 'uptime', name: 'Uptime', unit: '%', description: 'System availability percentage', direction: 'higher_is_better', target: 99.99, warningThreshold: 99.9, criticalThreshold: 99.5, dataSourceId: 'dcim-telemetry', domain: 'power', enabled: true },
];

// ============================================================================
// WORKFLOW CONFIGURATION (Builder Step 4)
// ============================================================================

export interface DCWorkflowConfig {
  id: string;
  name: string;
  description: string;
  trigger: {
    signal: string;
    condition: string;
  };
  agentId: string;
  rootCauseLogic: string[];
  recommendedMitigation: string[];
  autoActions: string[];
  enabled: boolean;
  severity: AlertSeverity;
}

// Required workflows per spec
export const REQUIRED_DC_WORKFLOWS: DCWorkflowConfig[] = [
  {
    id: 'wf-gpu-saturation',
    name: 'GPU Saturation Response',
    description: 'Handle GPU cluster saturation events',
    trigger: { signal: 'GPU utilization', condition: '> 95% for 5 minutes' },
    agentId: 'workload-orchestrator',
    rootCauseLogic: ['Check queue depth', 'Identify top consumers', 'Analyze SLA impact'],
    recommendedMitigation: ['Redistribute workloads', 'Scale horizontally', 'Notify tenants'],
    autoActions: ['Alert NOC', 'Rebalance queues'],
    enabled: true,
    severity: 'warning',
  },
  {
    id: 'wf-cooling-failure',
    name: 'Cooling Failure / PUE Spike',
    description: 'Respond to cooling system failures affecting PUE',
    trigger: { signal: 'PUE', condition: '> 1.5 OR CRAC offline' },
    agentId: 'cooling-optimization',
    rootCauseLogic: ['Check CRAC status', 'Monitor refrigerant', 'Verify airflow'],
    recommendedMitigation: ['Failover to standby', 'Reduce IT load', 'Dispatch technician'],
    autoActions: ['Alert facility', 'Switch standby units'],
    enabled: true,
    severity: 'critical',
  },
  {
    id: 'wf-sovereignty-violation',
    name: 'Sovereignty Violation',
    description: 'Detect and respond to data residency violations',
    trigger: { signal: 'Cross-border transfer', condition: 'Detected' },
    agentId: 'incident-response',
    rootCauseLogic: ['Identify data flow', 'Check policy rules', 'Trace workload origin'],
    recommendedMitigation: ['Block transfer', 'Route to sovereign region', 'Notify compliance'],
    autoActions: ['Alert compliance', 'Log violation'],
    enabled: true,
    severity: 'critical',
  },
  {
    id: 'wf-carbon-price-shock',
    name: 'Carbon Price Shock',
    description: 'Respond to significant carbon pricing changes',
    trigger: { signal: 'Carbon price', condition: 'Change > 20%' },
    agentId: 'carbon-cost-agent',
    rootCauseLogic: ['Analyze price impact', 'Model cost scenarios', 'Identify optimization'],
    recommendedMitigation: ['Shift to renewables', 'Reduce non-critical load', 'Update forecasts'],
    autoActions: ['Generate cost report', 'Alert finance'],
    enabled: true,
    severity: 'warning',
  },
];

// ============================================================================
// SIMULATION SCENARIO CONFIGURATION (Builder Step 4)
// ============================================================================

export type DCScenarioCategory = 'capacity' | 'incident' | 'emissions' | 'compliance' | 'optimization';

export interface DCScenarioConfig {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  category: DCScenarioCategory;
  durationSeconds: number;
  eventsCount: number;
  linkedWorkflows: string[];
  kpisImpacted: string[];
  defaultRunCount: number;
  enabled: boolean;
}

// Required scenarios per spec (minimum 8)
export const REQUIRED_DC_SCENARIOS: DCScenarioConfig[] = [
  { id: 'scenario-gpu-overload', name: 'GPU Overload', description: 'Simulate GPU cluster reaching capacity', severity: 'warning', category: 'capacity', durationSeconds: 300, eventsCount: 15, linkedWorkflows: ['wf-gpu-saturation'], kpisImpacted: ['gpu-utilization', 'queue-depth', 'sla-breach'], defaultRunCount: 1, enabled: true },
  { id: 'scenario-cooling-stress', name: 'Cooling Stress', description: 'Simulate CRAC failure and PUE spike', severity: 'critical', category: 'incident', durationSeconds: 600, eventsCount: 25, linkedWorkflows: ['wf-cooling-failure'], kpisImpacted: ['effective-ai-pue', 'supply-temp', 'cooling-efficiency'], defaultRunCount: 1, enabled: true },
  { id: 'scenario-carbon-shock', name: 'Carbon Price Shock', description: 'Simulate sudden carbon price increase', severity: 'warning', category: 'emissions', durationSeconds: 180, eventsCount: 8, linkedWorkflows: ['wf-carbon-price-shock'], kpisImpacted: ['gco2-per-gpu-hour', 'energy-cost', 'economic-efficiency'], defaultRunCount: 1, enabled: true },
  { id: 'scenario-sovereignty-violation', name: 'Sovereignty Violation', description: 'Simulate cross-border data flow detection', severity: 'critical', category: 'compliance', durationSeconds: 120, eventsCount: 5, linkedWorkflows: ['wf-sovereignty-violation'], kpisImpacted: ['sovereign-compute-ratio', 'sovereign-risk-score'], defaultRunCount: 1, enabled: true },
  { id: 'scenario-grid-instability', name: 'Grid Instability', description: 'Simulate power grid fluctuations', severity: 'critical', category: 'incident', durationSeconds: 240, eventsCount: 20, linkedWorkflows: ['wf-ups-failure', 'wf-grid-outage'], kpisImpacted: ['ups-runtime-remaining', 'redundancy-level'], defaultRunCount: 1, enabled: true },
  { id: 'scenario-tenant-expansion', name: 'Tenant Expansion', description: 'Simulate new large tenant onboarding', severity: 'info', category: 'capacity', durationSeconds: 600, eventsCount: 30, linkedWorkflows: ['wf-gpu-saturation'], kpisImpacted: ['gpu-utilization', 'economic-efficiency'], defaultRunCount: 1, enabled: true },
  { id: 'scenario-renewable-drop', name: 'Renewable Drop', description: 'Simulate renewable energy availability drop', severity: 'warning', category: 'emissions', durationSeconds: 300, eventsCount: 12, linkedWorkflows: ['wf-carbon-price-shock'], kpisImpacted: ['renewable-pct', 'gco2-per-gpu-hour'], defaultRunCount: 1, enabled: true },
  { id: 'scenario-optimization-run', name: 'Optimization Run', description: 'Run full optimization pass across all systems', severity: 'info', category: 'optimization', durationSeconds: 900, eventsCount: 50, linkedWorkflows: [], kpisImpacted: ['effective-ai-pue', 'economic-efficiency', 'cooling-efficiency'], defaultRunCount: 1, enabled: true },
];

// ============================================================================
// INTELLIGENCE CONFIGURATION (Builder Preview Tab)
// ============================================================================

export interface DCIntelligenceConfig {
  llmProvider: string;
  llmModel: string;
  temperature: number;
  ragEnabled: boolean;
  ragSources: string[];
  sampleQueries: string[];
  systemPrompt: string;
}

// Default intelligence config
export const DEFAULT_DC_INTELLIGENCE: DCIntelligenceConfig = {
  llmProvider: 'google',
  llmModel: 'google/gemini-2.5-flash',
  temperature: 0.3,
  ragEnabled: false,
  ragSources: [],
  sampleQueries: [
    'Explain sovereign compute ratio and why it matters',
    'Compare emissions between AWS CA-Central and Azure Canada',
    'How can we optimize cooling efficiency in Hot Aisle B?',
    'Assess carbon price risk for next quarter',
    'Generate incident playbook for CRAC failure',
  ],
  systemPrompt: `You are the Sovereign Green AI Data Centre Digital Twin assistant. You help operations teams monitor and optimize:
- Energy efficiency (PUE) and carbon footprint
- GPU capacity and workload management
- Data sovereignty and compliance
- Financial optimization and cost forecasting
- Incident response and safety procedures`,
};

// ============================================================================
// DEPLOYMENT CONFIGURATION (Builder Step 5)
// ============================================================================

export interface DCCloudRegion {
  provider: 'aws' | 'azure' | 'gcp';
  regionCode: string;
  city: string;
  sovereigntyNotes: string;
  recommendedServices: string[];
}

export interface DCDeploymentCheck {
  id: string;
  name: string;
  category: 'sovereignty' | 'telemetry' | 'workflows' | 'kpis' | 'security';
  status: 'pass' | 'fail' | 'pending';
  requiresConfigAction: boolean;
  message?: string;
}

export interface DCDeploymentConfig {
  cloudRegions: DCCloudRegion[];
  deploymentChecks: DCDeploymentCheck[];
  targetDeploymentRegion: string;
  orchestratorSteps: {
    step: number;
    name: string;
    description: string;
    tasks: string[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }[];
}

// Canadian cloud regions per spec
export const CANADIAN_CLOUD_REGIONS: DCCloudRegion[] = [
  {
    provider: 'aws',
    regionCode: 'ca-central-1',
    city: 'Montreal',
    sovereigntyNotes: 'Data residency in Canada, PIPEDA compliant',
    recommendedServices: ['Kinesis', 'SageMaker', 'Lambda', 'S3', 'QuickSight'],
  },
  {
    provider: 'azure',
    regionCode: 'canadacentral',
    city: 'Toronto',
    sovereigntyNotes: 'Azure Canada Central, meets Canadian data residency',
    recommendedServices: ['Event Hubs', 'Azure ML', 'Functions', 'Blob Storage', 'Power BI'],
  },
  {
    provider: 'gcp',
    regionCode: 'northamerica-northeast1',
    city: 'Montreal',
    sovereigntyNotes: 'GCP Montreal region, Canadian data sovereignty',
    recommendedServices: ['Pub/Sub', 'Vertex AI', 'Cloud Functions', 'Cloud Storage', 'Looker'],
  },
];

// Default deployment orchestrator steps
export const DEFAULT_DEPLOYMENT_STEPS: DCDeploymentConfig['orchestratorSteps'] = [
  { step: 1, name: 'Validate Sovereignty', description: 'Verify data residency and compliance configuration', tasks: ['Check region selection', 'Validate PIPEDA compliance', 'Review data flow policies'], status: 'pending' },
  { step: 2, name: 'Connect Telemetry', description: 'Connect all data sources and validate connectivity', tasks: ['Configure DCIM connection', 'Setup GPU telemetry', 'Connect carbon API'], status: 'pending' },
  { step: 3, name: 'Deploy Models', description: 'Deploy AI models and agents to target environment', tasks: ['Deploy LLM', 'Initialize agents', 'Configure RAG if enabled'], status: 'pending' },
  { step: 4, name: 'Enable Workflows', description: 'Activate automated workflows and alerts', tasks: ['Enable thermal workflows', 'Activate power workflows', 'Setup incident response'], status: 'pending' },
  { step: 5, name: 'Select Region', description: 'Finalize cloud region and service configuration', tasks: ['Confirm target region', 'Provision cloud services', 'Configure networking'], status: 'pending' },
  { step: 6, name: 'Deploy & Validate', description: 'Final deployment and end-to-end validation', tasks: ['Deploy twin', 'Run validation tests', 'Verify KPI collection'], status: 'pending' },
];

// ============================================================================
// FINANCIAL MODEL (Builder Step 5)
// ============================================================================

export interface DCFinancialModel {
  annualPowerCostUsd: number;
  annualCarbonTonnes: number;
  upgradeSavingsPercent: number;
  carbonSavingsPercent: number;
  paybackYears: number;
}

export const DEFAULT_DC_FINANCIAL_MODEL: DCFinancialModel = {
  annualPowerCostUsd: 2900000,
  annualCarbonTonnes: 800,
  upgradeSavingsPercent: 18,
  carbonSavingsPercent: 27,
  paybackYears: 5,
};

// ============================================================================
// SCENARIO ID MAPPING (Archetype → Builder)
// ============================================================================

export const ARCHETYPE_TO_BUILDER_SCENARIO_MAP: Record<string, string> = {
  // Generic mappings
  gpu_spike_training_cluster: 'scenario-gpu-overload',
  cooling_unit_degradation: 'scenario-cooling-stress',
  ups_failure_generator_failover: 'scenario-grid-instability',
  carbon_price_spike: 'scenario-carbon-shock',
  grid_outage_battery_transition: 'scenario-grid-instability',
  sovereignty_routing_violation: 'scenario-sovereignty-violation',
  // Finance mappings
  trading_peak_surge: 'scenario-gpu-overload',
  // Retail mappings  
  black_friday_peak_load: 'scenario-tenant-expansion',
  flash_sale_gpu_spike: 'scenario-gpu-overload',
  cooling_cascade_failure: 'scenario-cooling-stress',
  cdn_origin_overload: 'scenario-gpu-overload',
  // Government mappings
  sovereignty_breach_attempt: 'scenario-sovereignty-violation',
  classified_workload_spillover: 'scenario-sovereignty-violation',
  grid_outage_critical_services: 'scenario-grid-instability',
  thermal_excursion_secure_zone: 'scenario-cooling-stress',
  emergency_evacuation_protocol: 'scenario-cooling-stress',
  // SaaS mappings
  training_job_surge: 'scenario-gpu-overload',
  gpu_thermal_throttling: 'scenario-cooling-stress',
  tenant_noisy_neighbor: 'scenario-tenant-expansion',
  model_serving_spike: 'scenario-gpu-overload',
  renewable_availability_drop: 'scenario-renewable-drop',
  // Healthcare mappings
  ehr_access_surge: 'scenario-gpu-overload',
  imaging_storage_spike: 'scenario-tenant-expansion',
  hipaa_audit_simulation: 'scenario-sovereignty-violation',
  emergency_generator_test: 'scenario-grid-instability',
  phi_sovereignty_violation: 'scenario-sovereignty-violation',
  // Telco mappings
  edge_site_overload: 'scenario-gpu-overload',
  backhaul_congestion: 'scenario-gpu-overload',
  distributed_cooling_failure: 'scenario-cooling-stress',
  '5g_traffic_surge': 'scenario-gpu-overload',
  renewable_grid_fluctuation: 'scenario-renewable-drop',
  // Manufacturing mappings
  production_line_surge: 'scenario-gpu-overload',
  ot_network_isolation: 'scenario-sovereignty-violation',
  scada_integration_failure: 'scenario-cooling-stress',
  predictive_model_update: 'scenario-optimization-run',
  shift_change_load_spike: 'scenario-tenant-expansion',
  // Energy mappings
  grid_frequency_deviation: 'scenario-grid-instability',
  renewable_intermittency: 'scenario-renewable-drop',
  demand_response_event: 'scenario-optimization-run',
  battery_storage_cycle: 'scenario-optimization-run',
  carbon_credit_optimization: 'scenario-carbon-shock',
  // Education mappings
  semester_end_compute_rush: 'scenario-gpu-overload',
  research_grant_deadline: 'scenario-gpu-overload',
  shared_cluster_contention: 'scenario-tenant-expansion',
  data_intensive_experiment: 'scenario-gpu-overload',
  conference_demo_preparation: 'scenario-optimization-run',
};

// ============================================================================
// COMPLETE DC TWIN BUILDER STATE
// ============================================================================

export interface DCTwinBuilderState {
  // Builder identity
  builderId: string | null;
  sessionId: string | null;
  
  // Step 1: Overview
  overview: DCTwinOverview;
  
  // Step 2 & 3: Blueprint (Agents, Data Sources, KPIs)
  agents: DCAgentConfig[];
  dataSources: DCDataSourceConfig[];
  kpis: DCKPIConfig[];
  integrations: {
    id: string;
    name: string;
    type: string;
    connected: boolean;
    config: Record<string, any>;
  }[];
  
  // Step 3: Preview (Intelligence)
  intelligence: DCIntelligenceConfig;
  
  // Step 4: Simulation (Workflows & Scenarios)
  workflows: DCWorkflowConfig[];
  scenarios: DCScenarioConfig[];
  
  // Step 5: Deployment & Financial
  deployment: DCDeploymentConfig;
  financial: DCFinancialModel;
  
  // Meta
  currentStep: number;
  completedSteps: number[];
  isDirty: boolean;
  lastSaved: Date | null;
  isLoading: boolean;
  error: string | null;
  
  // Source tracking
  sourceRecommendation: {
    url?: string;
    detectedIndustry?: DCScanIndustry;
    blueprintProfile?: DCBlueprintProfile;
  } | null;
}

// ============================================================================
// DEFAULT STATE FACTORY
// ============================================================================

export function createDefaultDCTwinBuilderState(): DCTwinBuilderState {
  return {
    builderId: null,
    sessionId: null,
    
    overview: {
      twinName: 'Sovereign Green AI Data Centre Twin',
      twinSlug: 'sovereign-green-ai-dc-twin',
      twinSummary: '',
      description: 'AI-powered digital twin for sovereign, sustainable data centre operations',
      industries: ['Government', 'Technology', 'IT Operations', 'Sustainability'],
      primaryUseCases: ['PUE Optimization', 'Carbon Tracking', 'Sovereignty Compliance', 'Capacity Planning'],
      targetAudience: ['Data Centre Operations Teams', 'Sustainability Officers', 'IT Directors', 'Compliance Teams'],
      displayRoi: '35-50%',
      displayTimeSaved: '20+ hrs/week',
      displayDownloads: 0,
      businessImpactSummary: 'Reduce energy costs, minimize carbon footprint, ensure data sovereignty, and optimize GPU utilization',
      keyBenefits: [
        'Achieve PUE targets below 1.3',
        'Ensure 100% Canadian data sovereignty',
        'Reduce carbon emissions by 40%',
        'Optimize GPU utilization to 85%+',
      ],
      exampleImpact: 'A government organization reduced annual energy costs by $2.1M and achieved carbon neutrality ahead of schedule.',
      howItWorks: [
        'Ingest telemetry from DCIM, GPU schedulers, and energy systems',
        'Run AI agents to analyze patterns and predict issues',
        'Execute automated workflows for incident response',
        'Generate optimization recommendations',
      ],
      keyCapabilities: ['Real-time PUE Monitoring', 'GPU Workload Optimization', 'Carbon Forecasting', 'Sovereignty Validation'],
      kpisImproved: ['PUE', 'gCO₂/GPU-hour', 'Sovereign Compute %', 'GPU Utilization'],
      facilityLocation: 'CA-ON (Toronto)',
      regionCode: 'CA-ON',
      gpuFleet: 'NVIDIA H100 x 256, A100 x 128',
      coolingType: 'hybrid',
      powerTopology: 'N+1',
      capacityKw: 5000,
      tier: 'Tier III',
      renewablePercent: 85,
      sovereignCompliance: true,
    },
    
    agents: [...REQUIRED_DC_AGENTS],
    dataSources: [...REQUIRED_DC_DATA_SOURCES],
    kpis: [...REQUIRED_DC_KPIS],
    integrations: [],
    
    intelligence: { ...DEFAULT_DC_INTELLIGENCE },
    
    workflows: [...REQUIRED_DC_WORKFLOWS],
    scenarios: [...REQUIRED_DC_SCENARIOS],
    
    deployment: {
      cloudRegions: [...CANADIAN_CLOUD_REGIONS],
      deploymentChecks: [],
      targetDeploymentRegion: 'ca-central-1',
      orchestratorSteps: [...DEFAULT_DEPLOYMENT_STEPS],
    },
    
    financial: { ...DEFAULT_DC_FINANCIAL_MODEL },
    
    currentStep: 1,
    completedSteps: [],
    isDirty: false,
    lastSaved: null,
    isLoading: false,
    error: null,
    sourceRecommendation: null,
  };
}
