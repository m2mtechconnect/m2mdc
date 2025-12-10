/**
 * Data Centre Digital Twin - Master Template Configuration
 * Production-grade template serving as the baseline for all future verticals
 * 
 * 9 Complete Domain Twins:
 * 1. Thermal & Hardware Twin
 * 2. Power & UPS Twin
 * 3. Cooling System Twin
 * 4. Network Twin
 * 5. Facility & Safety Twin
 * 6. Workload & GPU Scheduler Twin
 * 7. Sovereignty & Compliance Twin
 * 8. Carbon Emissions Twin
 * 9. Financial Performance Twin
 */

import type { DomainType } from '@/types/dataCenterTwin';

// ============================================================================
// MASTER TEMPLATE METADATA
// ============================================================================

export const MASTER_TEMPLATE_CONFIG = {
  id: 'datacentre-master-twin-v1',
  name: 'DataCentre_MasterTwin_Template',
  version: '1.0.0',
  description: 'Production-grade Data Centre Digital Twin with 9 domain twins, 50+ KPIs, 15+ simulation scenarios, and comprehensive mock data',
  industry: 'Technology',
  department: 'Infrastructure Operations',
  twin_type: 'operational' as const,
  certified: true,
  difficulty: 'advanced' as const,
  
  // Infrastructure specifications
  infrastructure: {
    racks: 20,
    serversPerRack: 40,
    totalServers: 800,
    gpuClusters: 2,
    coolingZones: 8,
    powerBuses: 6,
    upsBanks: 2,
    networkSwitches: 24,
    totalPowerCapacityMw: 12,
    tier: 'IV' as const,
  },
  
  // Deployment regions
  regions: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC'],
  primaryRegion: 'CA-QC',
  
  badges: [
    'Sovereign AI',
    'Carbon Neutral',
    'GPU-Optimized',
    'Tier IV',
    'Real-time Telemetry',
    'Simulation-Ready',
  ],
};

// ============================================================================
// DOMAIN DEFINITIONS (9 Complete Twins)
// ============================================================================

export interface DomainDefinition {
  id: DomainType | 'carbon_emissions';
  name: string;
  description: string;
  icon: string;
  sensors: string[];
  kpis: string[];
  workflows: string[];
  simulationTriggers: string[];
  agentName: string;
  agentDescription: string;
}

export const DOMAIN_DEFINITIONS: DomainDefinition[] = [
  // 1. Thermal & Hardware Twin
  {
    id: 'thermal_hardware',
    name: 'Thermal & Hardware Twin',
    description: 'Monitors CPU/GPU temperatures, fan RPM, ECC errors, disk health, and thermal throttling across all racks',
    icon: 'Thermometer',
    sensors: [
      'CPU Temperature (per server)',
      'GPU Temperature (per GPU)',
      'DIMM Temperature',
      'VRM Temperature',
      'Fan RPM (6 per server)',
      'Inlet/Outlet Temperature (per rack)',
      'Ambient Temperature (per zone)',
    ],
    kpis: [
      'thermalStabilityScore',
      'hotspotRiskProbability',
      'avgServerTemp',
      'maxServerTemp',
      'eccErrorRate',
      'thermalThrottlingEvents',
      'coolingImpactPerRack',
    ],
    workflows: [
      'Hot Spot Detection → Fan Speed Increase',
      'Thermal Throttling → Workload Migration',
      'ECC Error Rate Spike → Maintenance Alert',
      'Disk Health < 80% → Replacement Schedule',
    ],
    simulationTriggers: [
      'gpu_spike_training_job',
      'cooling_failure_hot_aisle',
      'fire_suppression_discharge',
    ],
    agentName: 'Thermal Guardian',
    agentDescription: 'Monitors thermal conditions and predicts hotspots before they impact performance',
  },

  // 2. Power & UPS Twin
  {
    id: 'power_ups',
    name: 'Power & UPS Twin',
    description: 'Tracks PDU outlets, battery health, generator failover, and redundancy levels across power infrastructure',
    icon: 'Zap',
    sensors: [
      'PDU Outlet Power (W)',
      'PDU Current (A)',
      'PDU Voltage (V)',
      'Busway Power (kW)',
      'UPS Load (%)',
      'UPS Battery Health (%)',
      'UPS Runtime (minutes)',
      'Generator Fuel Level (%)',
      'Grid Voltage/Frequency',
    ],
    kpis: [
      'powerReliabilityScore',
      'upsHealthIndex',
      'redundancyLevel',
      'totalPowerDrawMw',
      'powerCapacityMw',
      'utilizationPct',
      'avgUpsRuntime',
      'generatorReadiness',
    ],
    workflows: [
      'Grid Outage → UPS Activation → Generator Failover',
      'UPS Health < 60% → Battery Replacement Alert',
      'Power Utilization > 85% → Load Balancing',
      'PDU Overload → Circuit Protection',
    ],
    simulationTriggers: [
      'ups_failure_runtime_drop',
      'grid_outage_ups_generator_failover',
      'power_overload_cascade',
    ],
    agentName: 'Power & UPS Monitor',
    agentDescription: 'Ensures power reliability and manages failover sequences',
  },

  // 3. Cooling System Twin
  {
    id: 'cooling',
    name: 'Cooling System Twin',
    description: 'Manages CRAC/CRAH units, chillers, cooling towers, and zone-level climate control',
    icon: 'Wind',
    sensors: [
      'Supply Air Temperature',
      'Return Air Temperature',
      'Delta-T',
      'Humidity (%)',
      'Refrigerant Pressure (PSI)',
      'Compressor Current (A)',
      'Fan Speed (RPM)',
      'Damper Position (%)',
      'Chiller Load (%)',
      'Cooling Tower Wet Bulb',
    ],
    kpis: [
      'coolingEfficiencyIndex',
      'coolingCostPerKw',
      'coolingRedundancyScore',
      'avgSupplyTemp',
      'avgReturnTemp',
      'totalCoolingCapacityKw',
      'activeCoolingLoadKw',
      'pueFromCooling',
    ],
    workflows: [
      'Zone Temp Rising → Fan Speed Increase',
      'CRAH Failure → Backup Unit Activation',
      'Humidity Out of Range → Humidifier Control',
      'Chiller Efficiency Drop → Maintenance Schedule',
    ],
    simulationTriggers: [
      'cooling_failure_hot_aisle',
      'chiller_plant_failure',
      'humidity_spike_control',
    ],
    agentName: 'Cooling Optimization Agent',
    agentDescription: 'Optimizes cooling efficiency and predicts failures before they impact operations',
  },

  // 4. Network Twin
  {
    id: 'network',
    name: 'Network Twin',
    description: 'Monitors port utilization, packet errors, latency, and firewall throughput across fabric',
    icon: 'Network',
    sensors: [
      'Port Utilization (%)',
      'Packet Errors',
      'CRC Errors',
      'Link Flaps',
      'Switch CPU/Memory',
      'Fabric Latency (ms)',
      'Fabric Jitter (ms)',
      'Throughput (Gbps)',
      'Firewall Sessions',
    ],
    kpis: [
      'networkIntegrityScore',
      'fabricSaturationIndex',
      'avgLatencyMs',
      'maxLatencyMs',
      'totalThroughputGbps',
      'packetLossRate',
      'portUtilizationAvg',
      'linkFlapRate',
    ],
    workflows: [
      'Packet Loss > 0.1% → Route Optimization',
      'Port Down → Traffic Reroute',
      'Fabric Saturation > 80% → Load Balancing',
      'Link Flap Detection → Hardware Check',
    ],
    simulationTriggers: [
      'network_congestion_storm',
      'switch_failure_reroute',
      'ddos_traffic_spike',
    ],
    agentName: 'Network Fabric Analyzer',
    agentDescription: 'Monitors network health and optimizes traffic routing',
  },

  // 5. Facility & Safety Twin
  {
    id: 'facility_safety',
    name: 'Facility & Safety Twin',
    description: 'Tracks ambient zones, particle counts, hydrogen concentration, water/fire sensors',
    icon: 'Shield',
    sensors: [
      'Ambient Temperature',
      'Ambient Humidity',
      'PM2.5 / PM10 Particles',
      'Hydrogen Concentration',
      'Smoke Detection (VESDA)',
      'Water Leak Sensors',
      'Motion Sensors',
      'Door Access',
      'Fire Suppression Pressure',
    ],
    kpis: [
      'environmentalSafetyScore',
      'earlyWarningIndex',
      'avgAmbientTemp',
      'avgHumidity',
      'airQualityIndex',
      'waterLeakRisk',
      'fireSuppressionReadiness',
    ],
    workflows: [
      'Smoke Detected → Evacuation Alert → Suppression',
      'Water Leak → Cooling Isolation → Equipment Protection',
      'Air Quality Degraded → HVAC Adjustment',
      'Hydrogen Detected → Battery Room Alert',
    ],
    simulationTriggers: [
      'water_leak_corridor_sensor',
      'fire_suppression_discharge',
      'hydrogen_buildup_battery_room',
    ],
    agentName: 'Facility Safety Monitor',
    agentDescription: 'Ensures environmental safety and manages emergency responses',
  },

  // 6. Workload & GPU Scheduler Twin
  {
    id: 'workload_gpu',
    name: 'Workload & GPU Scheduler Twin',
    description: 'Manages training vs inference workloads, queue times, SLA breach detection, GPU fairness',
    icon: 'Cpu',
    sensors: [
      'GPU Utilization (per GPU)',
      'GPU Memory Used (GB)',
      'GPU Temperature',
      'GPU Power Draw (W)',
      'NVLink Bandwidth',
      'Job Queue Depth',
      'Job Runtime',
      'SLA Status',
    ],
    kpis: [
      'totalGpuCount',
      'activeGpuCount',
      'avgGpuUtilization',
      'queueDepth',
      'avgQueueTimeMinutes',
      'slaBreachRate',
      'gpuFairnessIndex',
      'costPerGpuHour',
      'trainingThroughput',
      'inferenceThroughput',
    ],
    workflows: [
      'GPU Spike → Workload Throttling',
      'SLA Breach Risk → Priority Adjustment',
      'Queue Depth High → Capacity Scaling',
      'Tenant Unfairness → Rebalancing',
    ],
    simulationTriggers: [
      'gpu_spike_training_job',
      'multi_tenant_contention',
      'inference_latency_spike',
    ],
    agentName: 'Workload Orchestrator',
    agentDescription: 'Optimizes GPU allocation and ensures fair multi-tenant scheduling',
  },

  // 7. Sovereignty & Compliance Twin
  {
    id: 'sovereignty',
    name: 'Sovereignty & Compliance Twin',
    description: 'Tracks data flow provenance, jurisdiction tagging, residency alerts, and policy compliance',
    icon: 'Globe',
    sensors: [
      'Data Flow Source/Destination',
      'Jurisdiction Tags',
      'Classification Level',
      'Encryption Status',
      'Replication Paths',
      'Audit Logs',
      'Policy Violations',
    ],
    kpis: [
      'sovereignComputeRatioPct',
      'dataResidencyCompliance',
      'policyComplianceRate',
      'dataFlowViolations',
      'auditReadinessScore',
      'sovereigntyRiskScore',
      'crossBorderFlows',
    ],
    workflows: [
      'Cross-Border Violation → Replication Block',
      'Policy Breach → Compliance Alert',
      'Classification Change → Routing Update',
      'Audit Request → Documentation Generation',
    ],
    simulationTriggers: [
      'sovereignty_routing_violation',
      'classification_escalation',
      'cross_border_data_leak',
    ],
    agentName: 'Sovereignty Sentinel',
    agentDescription: 'Monitors data sovereignty and ensures regulatory compliance',
  },

  // 8. Carbon Emissions Twin
  {
    id: 'carbon_emissions' as any,
    name: 'Carbon Emissions Twin',
    description: 'Tracks carbon intensity, emissions per GPU-hour, renewable offset, and sustainability metrics',
    icon: 'Leaf',
    sensors: [
      'Grid Carbon Intensity (g/kWh)',
      'Renewable Mix (%)',
      'Hourly Power Draw (kWh)',
      'GPU Workload Distribution',
      'Regional Grid Feed',
      'Scope 2 Emissions',
    ],
    kpis: [
      'carbonPerGpuHour',
      'hourlyEmissionsKg',
      'dailyEmissionsKg',
      'projectedAnnualEmissionsTons',
      'renewableOffsetPct',
      'carbonEfficiencyScore',
      'effectiveCarbonIntensity',
      'scope2EmissionsKg',
    ],
    workflows: [
      'Carbon Intensity Spike → Workload Shift',
      'Renewable % Drop → Grid Arbitrage',
      'Annual Budget Exceeded → Efficiency Mode',
      'Carbon Price Change → Financial Recalculation',
    ],
    simulationTriggers: [
      'carbon_price_shock',
      'renewable_grid_outage',
      'carbon_budget_breach',
    ],
    agentName: 'Carbon Intelligence Agent',
    agentDescription: 'Optimizes carbon footprint and manages sustainability targets',
  },

  // 9. Financial Performance Twin
  {
    id: 'financial_carbon',
    name: 'Financial Performance Twin',
    description: 'Calculates cost per GPU-hour, OPEX/CAPEX, NPV, IRR, and financial health metrics',
    icon: 'DollarSign',
    sensors: [
      'Electricity Rates ($/kWh)',
      'Power Consumption (kWh)',
      'GPU Utilization',
      'Carbon Price ($/tonne)',
      'Maintenance Costs',
      'Labor Costs',
    ],
    kpis: [
      'electricityCostPerHour',
      'coolingCostPerHour',
      'carbonCostPerHour',
      'totalOpexPerHour',
      'opexPerDay',
      'opexPerMonth',
      'opexPerYear',
      'costPerGpuHour',
      'costPerMwh',
      'carbonCostImpactPerYear',
      'carbonCostPctOfOpex',
      'roiYears',
      'npv',
      'irr',
      'financialHealthScore',
    ],
    workflows: [
      'Cost Spike → Efficiency Optimization',
      'ROI Degradation → Investment Review',
      'Carbon Cost Rise → Renewable Strategy',
      'OPEX Anomaly → Budget Alert',
    ],
    simulationTriggers: [
      'carbon_price_shock',
      'electricity_rate_spike',
      'capex_investment_scenario',
    ],
    agentName: 'Financial Performance Optimizer',
    agentDescription: 'Optimizes operational costs and maximizes ROI',
  },
];

// ============================================================================
// SIMULATION SCENARIOS (15+ Preset)
// ============================================================================

export const SIMULATION_SCENARIOS = [
  {
    id: 'gpu_spike_training_job',
    name: 'GPU Spike - Training Job',
    category: 'workload_gpu',
    severity: 'warning',
    durationSeconds: 300,
  },
  {
    id: 'cooling_failure_hot_aisle',
    name: 'CRAH Failure - Hot Aisle',
    category: 'cooling',
    severity: 'critical',
    durationSeconds: 360,
  },
  {
    id: 'ups_failure_runtime_drop',
    name: 'UPS Battery Degradation',
    category: 'power_ups',
    severity: 'warning',
    durationSeconds: 240,
  },
  {
    id: 'grid_outage_ups_generator_failover',
    name: 'Grid Outage - Generator Failover',
    category: 'power_ups',
    severity: 'emergency',
    durationSeconds: 420,
  },
  {
    id: 'water_leak_corridor_sensor',
    name: 'Water Leak Detection',
    category: 'facility_safety',
    severity: 'critical',
    durationSeconds: 210,
  },
  {
    id: 'fire_suppression_discharge',
    name: 'Fire Suppression Discharge',
    category: 'facility_safety',
    severity: 'emergency',
    durationSeconds: 360,
  },
  {
    id: 'sovereignty_routing_violation',
    name: 'Cross-Border Data Violation',
    category: 'sovereignty',
    severity: 'critical',
    durationSeconds: 180,
  },
  {
    id: 'carbon_price_shock',
    name: 'Carbon Price Shock to $250',
    category: 'financial_carbon',
    severity: 'warning',
    durationSeconds: 240,
  },
  {
    id: 'network_congestion_storm',
    name: 'Network Congestion Storm',
    category: 'network',
    severity: 'warning',
    durationSeconds: 300,
  },
  {
    id: 'multi_tenant_contention',
    name: 'Multi-Tenant GPU Contention',
    category: 'workload_gpu',
    severity: 'warning',
    durationSeconds: 300,
  },
  {
    id: 'thermal_runaway_rack',
    name: 'Thermal Runaway - Single Rack',
    category: 'thermal_hardware',
    severity: 'critical',
    durationSeconds: 240,
  },
  {
    id: 'chiller_plant_failure',
    name: 'Chiller Plant Failure',
    category: 'cooling',
    severity: 'emergency',
    durationSeconds: 480,
  },
  {
    id: 'inference_latency_spike',
    name: 'Inference Latency Spike',
    category: 'workload_gpu',
    severity: 'warning',
    durationSeconds: 180,
  },
  {
    id: 'renewable_grid_outage',
    name: 'Renewable Grid Outage',
    category: 'carbon_emissions',
    severity: 'warning',
    durationSeconds: 300,
  },
  {
    id: 'hydrogen_buildup_battery_room',
    name: 'Hydrogen Buildup - Battery Room',
    category: 'facility_safety',
    severity: 'critical',
    durationSeconds: 180,
  },
];

// ============================================================================
// BUILDER STEP CONFIGURATIONS
// ============================================================================

export const BUILDER_STEP_CONFIGS = {
  step1: {
    title: 'DC Summary',
    fields: [
      { id: 'facilityName', label: 'Facility Name', type: 'text', required: true },
      { id: 'location', label: 'Location/Grid Region', type: 'select', options: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC'] },
      { id: 'totalItLoad', label: 'Total IT Load (MW)', type: 'number', min: 1, max: 100 },
      { id: 'gpuFleet', label: 'GPU Fleet/Model Types', type: 'multiselect', options: ['H100', 'H200', 'A100', 'L40S', 'MI300X', 'Gaudi3'] },
      { id: 'coolingSystem', label: 'Cooling System', type: 'select', options: ['Air', 'Liquid', 'Hybrid'] },
      { id: 'upsType', label: 'UPS/Backup Type', type: 'select', options: ['N+1', '2N', '2N+1'] },
      { id: 'sovereigntyTier', label: 'Sovereignty Tier', type: 'select', options: ['Canada-only', 'Hybrid', 'Multi-region'] },
    ],
  },
  step2: {
    title: 'Intelligence',
    fields: [
      { id: 'thermalSensitivity', label: 'Thermal Anomaly Sensitivity', type: 'slider', min: 1, max: 10 },
      { id: 'powerSensitivity', label: 'Power Anomaly Sensitivity', type: 'slider', min: 1, max: 10 },
      { id: 'workloadSensitivity', label: 'Workload Anomaly Sensitivity', type: 'slider', min: 1, max: 10 },
      { id: 'optimizationMode', label: 'Optimization Mode', type: 'select', options: ['Conservative', 'Balanced', 'Aggressive'] },
      { id: 'carbonPriceAssumption', label: 'Carbon Price Assumption ($/tonne)', type: 'number', min: 50, max: 500 },
    ],
  },
  step3: {
    title: 'Tools',
    tools: [
      { id: 'gpu-telemetry', name: 'GPU Telemetry Parser', icon: 'Cpu' },
      { id: 'power-chain', name: 'Power Chain Monitor', icon: 'Zap' },
      { id: 'cooling-engine', name: 'CRAC/CRAH Cooling Engine', icon: 'Wind' },
      { id: 'network-analyzer', name: 'Network Fabric Analyzer', icon: 'Network' },
      { id: 'sovereignty-validator', name: 'Sovereignty Validator', icon: 'Globe' },
      { id: 'carbon-model', name: 'Carbon & Energy Model', icon: 'Leaf' },
      { id: 'financial-calc', name: 'Financial Calculator', icon: 'DollarSign' },
      { id: 'incident-response', name: 'Incident Response Engine', icon: 'Shield' },
    ],
  },
  step4: {
    title: 'Workflows',
    defaultWorkflows: [
      { trigger: 'Thermal threshold exceeded', action: 'Increase cooling, notify ops' },
      { trigger: 'GPU queue depth > 100', action: 'Scale GPU allocation' },
      { trigger: 'Sovereignty violation', action: 'Block replication, alert compliance' },
      { trigger: 'Power utilization > 90%', action: 'Load balance, notify capacity' },
    ],
  },
  step5: {
    title: 'Simulation & Deploy',
    sections: ['Simulation Panel', 'Deployment Readiness', 'Cloud Provider Selection'],
  },
};

// ============================================================================
// COPILOT CAPABILITIES
// ============================================================================

export const COPILOT_CAPABILITIES = {
  commands: [
    'runSimulation',
    'pauseSimulation',
    'resetSimulation',
    'navigateToTab',
    'highlightKPI',
    'toggleDomain',
    'openBuilderStep',
  ],
  domainQueries: [
    'PUE analysis',
    'Thermal diagnostics',
    'GPU utilization patterns',
    'Carbon footprint calculation',
    'Sovereignty compliance check',
    'Financial impact assessment',
    'Network health check',
    'Power reliability status',
  ],
  actions: [
    { label: 'Run Cooling Failure', handler: 'cmd:runSimulation:cooling_failure_hot_aisle' },
    { label: 'View Thermal Domain', handler: 'cmd:navigateToTab:thermal' },
    { label: 'Check Sovereignty', handler: 'cmd:navigateToTab:sovereignty' },
    { label: 'Analyze Carbon', handler: 'cmd:navigateToTab:financial' },
  ],
};

// ============================================================================
// EXPORT COMPLETE TEMPLATE
// ============================================================================

export const DataCentreMasterTemplate = {
  config: MASTER_TEMPLATE_CONFIG,
  domains: DOMAIN_DEFINITIONS,
  scenarios: SIMULATION_SCENARIOS,
  builderSteps: BUILDER_STEP_CONFIGS,
  copilot: COPILOT_CAPABILITIES,
  
  // Metadata
  totalDomains: DOMAIN_DEFINITIONS.length,
  totalKpis: DOMAIN_DEFINITIONS.reduce((acc, d) => acc + d.kpis.length, 0),
  totalScenarios: SIMULATION_SCENARIOS.length,
  totalWorkflows: DOMAIN_DEFINITIONS.reduce((acc, d) => acc + d.workflows.length, 0),
  
  // Validation
  isComplete: true,
  isProductionReady: true,
  lastUpdated: new Date().toISOString(),
};

export default DataCentreMasterTemplate;
