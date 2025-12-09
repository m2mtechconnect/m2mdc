/**
 * Default Data Centre Blueprint Generator
 * Creates a complete blueprint with all agents, KPIs, workflows, roles, and scenarios
 */

import type { 
  DataCentreBlueprint, 
  AgentBlueprint, 
  DataSourceBlueprint, 
  IntegrationBlueprint,
  KpiBlueprint,
  WorkflowBlueprint,
  HumanRoleBlueprint,
  SimulationScenarioBlueprint,
  DomainSection
} from '@/types/dataCentreBlueprint';

// ============================================================================
// DEFAULT AGENTS
// ============================================================================

const defaultAgents: AgentBlueprint[] = [
  {
    id: 'thermal-agent',
    name: 'Thermal Agent',
    domain: 'thermal_hardware',
    description: 'Monitors server temperatures, detects hotspots, prevents thermal throttling across all racks',
    type: 'monitoring',
    inputs: ['CPU temps', 'GPU temps', 'Ambient sensors', 'Fan RPM', 'Airflow velocity'],
    outputs: ['Thermal alerts', 'Cooling recommendations', 'Throttle warnings'],
    toolsUsed: ['Prometheus', 'IPMI', 'Redfish API', 'SNMP'],
    status: 'active',
    workflowIds: ['wf-thermal-runaway', 'wf-hotspot-detection', 'wf-throttle-prevention'],
  },
  {
    id: 'power-agent',
    name: 'Power Agent',
    domain: 'power_ups',
    description: 'Manages power distribution, monitors UPS health, coordinates generator failover',
    type: 'control',
    inputs: ['PDU readings', 'UPS status', 'Generator fuel', 'Grid voltage', 'Power factor'],
    outputs: ['Power alerts', 'Failover commands', 'Load balancing actions'],
    toolsUsed: ['DCIM API', 'Modbus', 'SNMP', 'BMS integration'],
    status: 'active',
    workflowIds: ['wf-ups-failure', 'wf-grid-outage', 'wf-pdu-overload'],
  },
  {
    id: 'cooling-agent',
    name: 'Cooling Agent',
    domain: 'cooling',
    description: 'Optimizes CRAC/CRAH units, manages chiller plant, monitors refrigerant levels',
    type: 'control',
    inputs: ['Supply/return temps', 'Humidity', 'Refrigerant pressure', 'Chiller load', 'Cooling tower status'],
    outputs: ['Setpoint adjustments', 'Unit failover', 'Efficiency recommendations'],
    toolsUsed: ['BACnet', 'Modbus', 'DCIM API', 'Weather API'],
    status: 'active',
    workflowIds: ['wf-crac-failure', 'wf-refrigerant-leak', 'wf-humidity-excursion'],
  },
  {
    id: 'network-agent',
    name: 'Network Agent',
    domain: 'network',
    description: 'Monitors network fabric health, detects congestion, manages traffic routing',
    type: 'monitoring',
    inputs: ['Port utilization', 'Packet errors', 'Latency metrics', 'BGP status', 'Link flaps'],
    outputs: ['Network alerts', 'Route recommendations', 'Congestion warnings'],
    toolsUsed: ['SNMP', 'NetFlow', 'sFlow', 'Prometheus', 'Grafana'],
    status: 'active',
    workflowIds: ['wf-network-congestion', 'wf-switch-failure', 'wf-link-saturation'],
  },
  {
    id: 'facility-agent',
    name: 'Facility Safety Agent',
    domain: 'facility_safety',
    description: 'Monitors environmental sensors, manages fire suppression, coordinates safety responses',
    type: 'incident',
    inputs: ['Smoke detectors', 'Water sensors', 'Hydrogen sensors', 'Door status', 'Motion sensors'],
    outputs: ['Safety alerts', 'Evacuation triggers', 'Suppression commands'],
    toolsUsed: ['BMS', 'Fire panel API', 'Access control', 'VESDA'],
    status: 'active',
    workflowIds: ['wf-water-leak', 'wf-fire-detection', 'wf-hydrogen-incident'],
  },
  {
    id: 'workload-agent',
    name: 'GPU Scheduler Agent',
    domain: 'workload_gpu',
    description: 'Optimizes GPU workload scheduling, manages queues, ensures SLA compliance and fair allocation',
    type: 'analytics',
    inputs: ['GPU utilization', 'Queue depth', 'Job priorities', 'Tenant quotas', 'SLA targets'],
    outputs: ['Scheduling decisions', 'Queue priorities', 'SLA breach alerts'],
    toolsUsed: ['Kubernetes', 'Slurm', 'NVIDIA DCGM', 'Custom scheduler'],
    status: 'active',
    workflowIds: ['wf-gpu-saturation', 'wf-sla-breach', 'wf-tenant-overload'],
  },
  {
    id: 'sovereignty-agent',
    name: 'Sovereignty Agent',
    domain: 'sovereignty',
    description: 'Monitors data flows, enforces residency policies, detects cross-border violations',
    type: 'monitoring',
    inputs: ['Data flow logs', 'Workload metadata', 'Policy rules', 'Jurisdiction tags'],
    outputs: ['Violation alerts', 'Compliance reports', 'Routing recommendations'],
    toolsUsed: ['Data lineage tools', 'Policy engine', 'Audit logs', 'Classification API'],
    status: 'active',
    workflowIds: ['wf-sovereignty-violation', 'wf-policy-breach', 'wf-cross-border-transfer'],
  },
  {
    id: 'financial-agent',
    name: 'Financial & Carbon Agent',
    domain: 'financial_carbon',
    description: 'Tracks costs, carbon pricing, energy mix optimization, financial forecasting',
    type: 'analytics',
    inputs: ['Energy consumption', 'Carbon intensity', 'Spot prices', 'PPA rates', 'Weather forecasts'],
    outputs: ['Cost forecasts', 'Carbon reports', 'Optimization recommendations'],
    toolsUsed: ['Energy API', 'Carbon registry', 'Financial models', 'Weather API'],
    status: 'active',
    workflowIds: ['wf-carbon-price-shock', 'wf-renewable-outage', 'wf-cost-optimization'],
  },
  {
    id: 'incident-agent',
    name: 'Incident Response Agent',
    domain: 'facility_safety',
    description: 'Coordinates emergency response across all domains, manages escalation and communication',
    type: 'incident',
    inputs: ['All domain alerts', 'Severity levels', 'Personnel status', 'Procedure database'],
    outputs: ['Incident tickets', 'Escalations', 'Coordination commands'],
    toolsUsed: ['ServiceNow', 'PagerDuty', 'Slack', 'Email gateway'],
    status: 'active',
    workflowIds: ['wf-major-incident', 'wf-escalation', 'wf-post-mortem'],
  },
];

// ============================================================================
// DEFAULT DATA SOURCES
// ============================================================================

const defaultDataSources: DataSourceBlueprint[] = [
  // Thermal
  { id: 'ds-ipmi', name: 'IPMI Sensors', sourceType: 'sensor', protocol: 'REST', domain: 'thermal_hardware', updateFrequency: '10s', criticality: 'high', description: 'Server BMC temperature readings' },
  { id: 'ds-redfish', name: 'Redfish API', sourceType: 'api', protocol: 'REST', domain: 'thermal_hardware', updateFrequency: '30s', criticality: 'high', description: 'Server hardware telemetry' },
  { id: 'ds-ambient', name: 'Ambient Sensors', sourceType: 'sensor', protocol: 'Modbus', domain: 'thermal_hardware', updateFrequency: '5s', criticality: 'medium', description: 'Room ambient temperature sensors' },
  
  // Power
  { id: 'ds-pdu', name: 'PDU Meters', sourceType: 'sensor', protocol: 'SNMP', domain: 'power_ups', updateFrequency: '5s', criticality: 'critical', description: 'Power distribution unit readings' },
  { id: 'ds-ups', name: 'UPS Controllers', sourceType: 'api', protocol: 'Modbus', domain: 'power_ups', updateFrequency: '1s', criticality: 'critical', description: 'UPS status and battery health' },
  { id: 'ds-generator', name: 'Generator SCADA', sourceType: 'sensor', protocol: 'Modbus', domain: 'power_ups', updateFrequency: '10s', criticality: 'high', description: 'Backup generator telemetry' },
  
  // Cooling
  { id: 'ds-crac', name: 'CRAC/CRAH Units', sourceType: 'sensor', protocol: 'BACnet', domain: 'cooling', updateFrequency: '10s', criticality: 'high', description: 'Cooling unit operational data' },
  { id: 'ds-chiller', name: 'Chiller Plant', sourceType: 'api', protocol: 'BACnet', domain: 'cooling', updateFrequency: '30s', criticality: 'high', description: 'Central chiller plant metrics' },
  { id: 'ds-refrigerant', name: 'Refrigerant Sensors', sourceType: 'sensor', protocol: 'Modbus', domain: 'cooling', updateFrequency: '60s', criticality: 'medium', description: 'Refrigerant pressure and leak detection' },
  
  // Network
  { id: 'ds-switch', name: 'Network Switches', sourceType: 'api', protocol: 'SNMP', domain: 'network', updateFrequency: '30s', criticality: 'high', description: 'Switch port statistics and health' },
  { id: 'ds-netflow', name: 'NetFlow Collector', sourceType: 'stream', protocol: 'gRPC', domain: 'network', updateFrequency: '1s', criticality: 'medium', description: 'Network flow analytics' },
  { id: 'ds-firewall', name: 'Firewall Logs', sourceType: 'stream', protocol: 'REST', domain: 'network', updateFrequency: '5s', criticality: 'high', description: 'Firewall throughput and sessions' },
  
  // Facility
  { id: 'ds-bms', name: 'Building Management', sourceType: 'api', protocol: 'BACnet', domain: 'facility_safety', updateFrequency: '30s', criticality: 'high', description: 'BMS environmental sensors' },
  { id: 'ds-fire', name: 'Fire Panel', sourceType: 'sensor', protocol: 'Modbus', domain: 'facility_safety', updateFrequency: '1s', criticality: 'critical', description: 'Fire detection and suppression status' },
  { id: 'ds-access', name: 'Access Control', sourceType: 'api', protocol: 'REST', domain: 'facility_safety', updateFrequency: '1s', criticality: 'medium', description: 'Door access and personnel tracking' },
  
  // Workload
  { id: 'ds-k8s', name: 'Kubernetes API', sourceType: 'api', protocol: 'gRPC', domain: 'workload_gpu', updateFrequency: '5s', criticality: 'high', description: 'Container orchestration metrics' },
  { id: 'ds-slurm', name: 'Slurm Scheduler', sourceType: 'api', protocol: 'REST', domain: 'workload_gpu', updateFrequency: '10s', criticality: 'high', description: 'HPC job scheduler data' },
  { id: 'ds-dcgm', name: 'NVIDIA DCGM', sourceType: 'api', protocol: 'gRPC', domain: 'workload_gpu', updateFrequency: '5s', criticality: 'high', description: 'GPU telemetry and health' },
  
  // Sovereignty
  { id: 'ds-lineage', name: 'Data Lineage', sourceType: 'database', protocol: 'REST', domain: 'sovereignty', updateFrequency: '60s', criticality: 'high', description: 'Data flow tracking and provenance' },
  { id: 'ds-audit', name: 'Audit Logs', sourceType: 'stream', protocol: 'REST', domain: 'sovereignty', updateFrequency: '1s', criticality: 'critical', description: 'Compliance audit trail' },
  
  // Financial
  { id: 'ds-energy', name: 'Energy Meters', sourceType: 'sensor', protocol: 'Modbus', domain: 'financial_carbon', updateFrequency: '60s', criticality: 'medium', description: 'Main energy consumption meters' },
  { id: 'ds-carbon', name: 'Carbon API', sourceType: 'api', protocol: 'REST', domain: 'financial_carbon', updateFrequency: '300s', criticality: 'medium', description: 'Grid carbon intensity data' },
  { id: 'ds-weather', name: 'Weather Service', sourceType: 'api', protocol: 'REST', domain: 'financial_carbon', updateFrequency: '600s', criticality: 'low', description: 'Weather forecasts for cooling optimization' },
];

// ============================================================================
// DEFAULT INTEGRATIONS
// ============================================================================

const defaultIntegrations: IntegrationBlueprint[] = [
  { id: 'int-prometheus', name: 'Prometheus', type: 'Metrics Backend', status: 'connected', authMethod: 'api_key', domainsUsedBy: ['thermal_hardware', 'power_ups', 'cooling', 'network', 'workload_gpu'], description: 'Time-series metrics collection and storage' },
  { id: 'int-grafana', name: 'Grafana', type: 'Visualization', status: 'connected', authMethod: 'oauth2', domainsUsedBy: ['thermal_hardware', 'power_ups', 'cooling', 'network', 'workload_gpu', 'financial_carbon'], description: 'Dashboard and visualization platform' },
  { id: 'int-dcim', name: 'DCIM Platform', type: 'Infrastructure Management', status: 'connected', authMethod: 'api_key', domainsUsedBy: ['thermal_hardware', 'power_ups', 'cooling', 'facility_safety'], description: 'Data center infrastructure management' },
  { id: 'int-servicenow', name: 'ServiceNow', type: 'ITSM', status: 'connected', authMethod: 'oauth2', domainsUsedBy: ['facility_safety'], description: 'IT service management and ticketing' },
  { id: 'int-pagerduty', name: 'PagerDuty', type: 'Alerting', status: 'connected', authMethod: 'api_key', domainsUsedBy: ['thermal_hardware', 'power_ups', 'cooling', 'network', 'facility_safety'], description: 'Incident alerting and on-call management' },
  { id: 'int-kubernetes', name: 'Kubernetes', type: 'Orchestration', status: 'connected', authMethod: 'certificate', domainsUsedBy: ['workload_gpu'], description: 'Container orchestration platform' },
  { id: 'int-slurm', name: 'Slurm', type: 'HPC Scheduler', status: 'connected', authMethod: 'api_key', domainsUsedBy: ['workload_gpu'], description: 'HPC workload scheduler' },
  { id: 'int-carbon-api', name: 'Electricity Maps', type: 'Carbon Data', status: 'connected', authMethod: 'api_key', domainsUsedBy: ['financial_carbon'], description: 'Real-time carbon intensity data' },
  { id: 'int-weather', name: 'Weather API', type: 'Environmental', status: 'connected', authMethod: 'api_key', domainsUsedBy: ['cooling', 'financial_carbon'], description: 'Weather forecasting for optimization' },
  { id: 'int-compliance', name: 'Compliance Engine', type: 'Policy', status: 'connected', authMethod: 'oauth2', domainsUsedBy: ['sovereignty'], description: 'Data sovereignty policy enforcement' },
];

// ============================================================================
// DEFAULT KPIS (50+)
// ============================================================================

const defaultKpis: KpiBlueprint[] = [
  // Thermal & Hardware (10)
  { id: 'kpi-thermal-stability', name: 'Thermal Stability Score', domain: 'thermal_hardware', unit: 'pts', description: 'Overall thermal management effectiveness (0-100)', formula: 'weighted_avg(zone_temps, zone_thresholds)', inputs: ['zone temps', 'thresholds'], targetRange: { min: 80, ideal: 95 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 70, criticalThreshold: 50 },
  { id: 'kpi-hotspot-risk', name: 'Hotspot Risk Probability', domain: 'thermal_hardware', unit: '%', description: 'Probability of thermal hotspot occurrence', formula: 'max(rack_delta_t) / threshold', inputs: ['rack temps', 'airflow'], targetRange: { max: 10, ideal: 5 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 15, criticalThreshold: 30 },
  { id: 'kpi-avg-server-temp', name: 'Avg Server Temperature', domain: 'thermal_hardware', unit: '°C', description: 'Average temperature across all servers', formula: 'avg(server_temps)', inputs: ['CPU temps', 'GPU temps'], targetRange: { max: 65, ideal: 55 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 70, criticalThreshold: 80 },
  { id: 'kpi-max-server-temp', name: 'Max Server Temperature', domain: 'thermal_hardware', unit: '°C', description: 'Maximum server temperature in facility', formula: 'max(server_temps)', inputs: ['CPU temps', 'GPU temps'], targetRange: { max: 75, ideal: 65 }, direction: 'lower', ownerRole: 'facility-engineer', warningThreshold: 80, criticalThreshold: 90 },
  { id: 'kpi-ecc-error-rate', name: 'ECC Error Rate', domain: 'thermal_hardware', unit: '/hr', description: 'Memory error correction rate per hour', formula: 'sum(ecc_errors) / hours', inputs: ['ECC counters'], targetRange: { max: 5, ideal: 0 }, direction: 'lower', ownerRole: 'facility-engineer', warningThreshold: 5, criticalThreshold: 20 },
  { id: 'kpi-throttle-events', name: 'Thermal Throttle Events', domain: 'thermal_hardware', unit: 'count', description: 'Number of thermal throttling events', formula: 'count(throttle_events)', inputs: ['throttle flags'], targetRange: { max: 0, ideal: 0 }, direction: 'lower', ownerRole: 'facility-engineer', warningThreshold: 1, criticalThreshold: 5 },
  { id: 'kpi-disk-health', name: 'Disk Health Index', domain: 'thermal_hardware', unit: '%', description: 'Average disk health across servers', formula: 'avg(disk_health)', inputs: ['SMART data'], targetRange: { min: 90, ideal: 98 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 85, criticalThreshold: 70 },
  { id: 'kpi-fan-efficiency', name: 'Fan Efficiency', domain: 'thermal_hardware', unit: '%', description: 'Cooling fan operational efficiency', formula: 'airflow_actual / airflow_design', inputs: ['fan RPM', 'airflow'], targetRange: { min: 85, ideal: 95 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 80, criticalThreshold: 65 },
  { id: 'kpi-airflow-balance', name: 'Airflow Balance', domain: 'thermal_hardware', unit: '%', description: 'Hot/cold aisle airflow balance', formula: 'cold_aisle / hot_aisle * 100', inputs: ['airflow sensors'], targetRange: { min: 90, ideal: 100 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 85, criticalThreshold: 70 },
  { id: 'kpi-rack-density', name: 'Rack Power Density', domain: 'thermal_hardware', unit: 'kW/rack', description: 'Average power density per rack', formula: 'total_power / rack_count', inputs: ['PDU readings'], targetRange: { max: 25, ideal: 15 }, direction: 'lower', ownerRole: 'facility-engineer', warningThreshold: 30, criticalThreshold: 40 },

  // Power & UPS (8)
  { id: 'kpi-power-reliability', name: 'Power Reliability Score', domain: 'power_ups', unit: 'pts', description: 'Overall power system reliability', formula: 'weighted_avg(ups_health, redundancy, grid_stability)', inputs: ['UPS status', 'grid status'], targetRange: { min: 95, ideal: 99 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 95, criticalThreshold: 90 },
  { id: 'kpi-ups-health', name: 'UPS Health Index', domain: 'power_ups', unit: 'pts', description: 'UPS battery and system health', formula: 'avg(battery_health, capacity)', inputs: ['battery metrics'], targetRange: { min: 80, ideal: 95 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 80, criticalThreshold: 60 },
  { id: 'kpi-ups-runtime', name: 'UPS Runtime', domain: 'power_ups', unit: 'min', description: 'Average UPS backup runtime', formula: 'avg(runtime_minutes)', inputs: ['UPS capacity', 'load'], targetRange: { min: 20, ideal: 30 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 15, criticalThreshold: 10 },
  { id: 'kpi-total-power', name: 'Total Power Draw', domain: 'power_ups', unit: 'MW', description: 'Facility total power consumption', formula: 'sum(pdu_power)', inputs: ['PDU readings'], targetRange: { max: 10, ideal: 5 }, direction: 'lower', ownerRole: 'facility-engineer', warningThreshold: 8, criticalThreshold: 9.5 },
  { id: 'kpi-power-utilization', name: 'Power Utilization', domain: 'power_ups', unit: '%', description: 'Power capacity utilization', formula: 'current_load / capacity * 100', inputs: ['power readings'], targetRange: { max: 80, ideal: 60 }, direction: 'lower', ownerRole: 'facility-engineer', warningThreshold: 85, criticalThreshold: 95 },
  { id: 'kpi-redundancy-level', name: 'Redundancy Level', domain: 'power_ups', unit: '', description: 'Power redundancy configuration (N+1, 2N)', formula: 'config_check()', inputs: ['topology'], targetRange: { min: 2, ideal: 3 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 1, criticalThreshold: 0 },
  { id: 'kpi-generator-ready', name: 'Generator Readiness', domain: 'power_ups', unit: '%', description: 'Backup generator readiness percentage', formula: 'fuel_level * health_score', inputs: ['fuel', 'status'], targetRange: { min: 90, ideal: 100 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 80, criticalThreshold: 60 },
  { id: 'kpi-power-factor', name: 'Power Factor', domain: 'power_ups', unit: '', description: 'Facility power factor', formula: 'real_power / apparent_power', inputs: ['power readings'], targetRange: { min: 0.95, ideal: 0.99 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 0.9, criticalThreshold: 0.85 },

  // Cooling (7)
  { id: 'kpi-cooling-efficiency', name: 'Cooling Efficiency Index', domain: 'cooling', unit: 'pts', description: 'CRAC/CRAH system efficiency', formula: 'cooling_output / cooling_input', inputs: ['temps', 'power'], targetRange: { min: 70, ideal: 85 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 70, criticalThreshold: 55 },
  { id: 'kpi-cooling-cost', name: 'Cooling Cost per kW', domain: 'cooling', unit: '$/kW', description: 'Operating cost per kW of cooling', formula: 'cooling_energy_cost / cooling_kw', inputs: ['energy', 'capacity'], targetRange: { max: 0.08, ideal: 0.05 }, direction: 'lower', ownerRole: 'sustainability-team', warningThreshold: 0.08, criticalThreshold: 0.12 },
  { id: 'kpi-cooling-redundancy', name: 'Cooling Redundancy Score', domain: 'cooling', unit: 'pts', description: 'Cooling system redundancy level', formula: 'n_plus_capacity_check()', inputs: ['unit status'], targetRange: { min: 85, ideal: 100 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 70, criticalThreshold: 50 },
  { id: 'kpi-supply-temp', name: 'Avg Supply Temperature', domain: 'cooling', unit: '°C', description: 'Average cooling supply air temperature', formula: 'avg(supply_temps)', inputs: ['CRAC sensors'], targetRange: { max: 18, ideal: 15 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 20, criticalThreshold: 24 },
  { id: 'kpi-return-temp', name: 'Avg Return Temperature', domain: 'cooling', unit: '°C', description: 'Average cooling return air temperature', formula: 'avg(return_temps)', inputs: ['CRAC sensors'], targetRange: { max: 35, ideal: 30 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 38, criticalThreshold: 42 },
  { id: 'kpi-humidity', name: 'Avg Humidity', domain: 'cooling', unit: '%RH', description: 'Average facility humidity', formula: 'avg(humidity_sensors)', inputs: ['humidity sensors'], targetRange: { min: 40, max: 60, ideal: 50 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 35, criticalThreshold: 25 },
  { id: 'kpi-pue-cooling', name: 'PUE (Cooling Contribution)', domain: 'cooling', unit: '', description: 'PUE attributed to cooling systems', formula: 'cooling_power / it_load', inputs: ['power readings'], targetRange: { max: 0.4, ideal: 0.2 }, direction: 'lower', ownerRole: 'sustainability-team', warningThreshold: 0.5, criticalThreshold: 0.7 },

  // Network (6)
  { id: 'kpi-network-integrity', name: 'Network Integrity Score', domain: 'network', unit: 'pts', description: 'Overall network health and reliability', formula: 'weighted_avg(port_health, latency, errors)', inputs: ['port stats', 'latency'], targetRange: { min: 95, ideal: 99 }, direction: 'higher', ownerRole: 'noc-operator', warningThreshold: 95, criticalThreshold: 90 },
  { id: 'kpi-fabric-saturation', name: 'Fabric Saturation Index', domain: 'network', unit: '%', description: 'Network fabric utilization level', formula: 'max(port_utilization)', inputs: ['port stats'], targetRange: { max: 60, ideal: 40 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 70, criticalThreshold: 85 },
  { id: 'kpi-avg-latency', name: 'Average Latency', domain: 'network', unit: 'ms', description: 'Average network latency', formula: 'avg(latency_samples)', inputs: ['latency probes'], targetRange: { max: 1, ideal: 0.5 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 2, criticalThreshold: 5 },
  { id: 'kpi-packet-loss', name: 'Packet Loss Rate', domain: 'network', unit: '%', description: 'Network packet loss percentage', formula: 'dropped / total * 100', inputs: ['port stats'], targetRange: { max: 0.01, ideal: 0 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 0.1, criticalThreshold: 1 },
  { id: 'kpi-link-flaps', name: 'Link Flap Rate', domain: 'network', unit: '/hr', description: 'Network link flapping events per hour', formula: 'count(flaps) / hours', inputs: ['link events'], targetRange: { max: 1, ideal: 0 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 5, criticalThreshold: 20 },
  { id: 'kpi-throughput', name: 'Total Throughput', domain: 'network', unit: 'Tbps', description: 'Total network throughput', formula: 'sum(port_throughput)', inputs: ['port stats'], targetRange: { min: 1, ideal: 10 }, direction: 'higher', ownerRole: 'noc-operator', warningThreshold: 0.5, criticalThreshold: 0.1 },

  // Facility & Safety (6)
  { id: 'kpi-env-safety', name: 'Environmental Safety Score', domain: 'facility_safety', unit: 'pts', description: 'Overall facility safety score', formula: 'weighted_avg(sensors, compliance)', inputs: ['all sensors'], targetRange: { min: 90, ideal: 100 }, direction: 'higher', ownerRole: 'compliance-officer', warningThreshold: 80, criticalThreshold: 60 },
  { id: 'kpi-early-warning', name: 'Early Warning Index', domain: 'facility_safety', unit: 'pts', description: 'Safety early warning system effectiveness', formula: 'sensor_coverage * response_time', inputs: ['sensor status'], targetRange: { min: 90, ideal: 100 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 85, criticalThreshold: 70 },
  { id: 'kpi-fire-readiness', name: 'Fire Suppression Readiness', domain: 'facility_safety', unit: '%', description: 'Fire suppression system readiness', formula: 'armed_zones / total_zones * 100', inputs: ['fire panel'], targetRange: { min: 100, ideal: 100 }, direction: 'higher', ownerRole: 'facility-engineer', warningThreshold: 95, criticalThreshold: 85 },
  { id: 'kpi-water-leak-risk', name: 'Water Leak Risk', domain: 'facility_safety', unit: '%', description: 'Water leak probability', formula: 'sensor_triggers / sensor_count', inputs: ['water sensors'], targetRange: { max: 0, ideal: 0 }, direction: 'lower', ownerRole: 'facility-engineer', warningThreshold: 5, criticalThreshold: 20 },
  { id: 'kpi-air-quality', name: 'Air Quality Index', domain: 'facility_safety', unit: 'AQI', description: 'Facility air quality measurement', formula: 'calculate_aqi(pm25, pm10)', inputs: ['particle sensors'], targetRange: { max: 50, ideal: 25 }, direction: 'lower', ownerRole: 'facility-engineer', warningThreshold: 100, criticalThreshold: 150 },
  { id: 'kpi-access-compliance', name: 'Access Compliance', domain: 'facility_safety', unit: '%', description: 'Physical access policy compliance', formula: 'compliant_access / total_access', inputs: ['access logs'], targetRange: { min: 99, ideal: 100 }, direction: 'higher', ownerRole: 'compliance-officer', warningThreshold: 95, criticalThreshold: 90 },

  // Workload & GPU (7)
  { id: 'kpi-gpu-utilization', name: 'GPU Utilization', domain: 'workload_gpu', unit: '%', description: 'Average GPU utilization across clusters', formula: 'avg(gpu_util)', inputs: ['DCGM metrics'], targetRange: { min: 70, ideal: 85 }, direction: 'higher', ownerRole: 'noc-operator', warningThreshold: 50, criticalThreshold: 30 },
  { id: 'kpi-gpu-fairness', name: 'GPU Fairness Index', domain: 'workload_gpu', unit: 'pts', description: 'Fair GPU allocation across tenants', formula: 'jain_fairness_index(allocations)', inputs: ['scheduler data'], targetRange: { min: 85, ideal: 95 }, direction: 'higher', ownerRole: 'noc-operator', warningThreshold: 70, criticalThreshold: 50 },
  { id: 'kpi-queue-depth', name: 'Queue Depth', domain: 'workload_gpu', unit: 'jobs', description: 'Number of jobs waiting in queue', formula: 'count(queued_jobs)', inputs: ['scheduler'], targetRange: { max: 50, ideal: 10 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 100, criticalThreshold: 500 },
  { id: 'kpi-avg-queue-time', name: 'Avg Queue Time', domain: 'workload_gpu', unit: 'min', description: 'Average job queue wait time', formula: 'avg(queue_times)', inputs: ['scheduler'], targetRange: { max: 15, ideal: 5 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 30, criticalThreshold: 60 },
  { id: 'kpi-sla-breach', name: 'SLA Breach Rate', domain: 'workload_gpu', unit: '%', description: 'Percentage of jobs breaching SLA', formula: 'breached / total * 100', inputs: ['job logs'], targetRange: { max: 2, ideal: 0 }, direction: 'lower', ownerRole: 'noc-operator', warningThreshold: 2, criticalThreshold: 5 },
  { id: 'kpi-cost-gpu-hour', name: 'Cost per GPU-hour', domain: 'workload_gpu', unit: '$', description: 'All-in cost per GPU hour', formula: 'total_cost / gpu_hours', inputs: ['billing', 'usage'], targetRange: { max: 3, ideal: 2 }, direction: 'lower', ownerRole: 'sustainability-team', warningThreshold: 4, criticalThreshold: 6 },
  { id: 'kpi-training-throughput', name: 'Training Throughput', domain: 'workload_gpu', unit: 'TFLOPS', description: 'Aggregate training compute throughput', formula: 'sum(gpu_tflops * util)', inputs: ['DCGM'], targetRange: { min: 100, ideal: 500 }, direction: 'higher', ownerRole: 'noc-operator', warningThreshold: 50, criticalThreshold: 20 },

  // Sovereignty (6)
  { id: 'kpi-sovereign-compute', name: 'Sovereign Compute Ratio', domain: 'sovereignty', unit: '%', description: 'Percentage of compute in sovereign jurisdiction', formula: 'sovereign_gpus / total_gpus * 100', inputs: ['cluster config'], targetRange: { min: 95, ideal: 100 }, direction: 'higher', ownerRole: 'compliance-officer', warningThreshold: 90, criticalThreshold: 80 },
  { id: 'kpi-sovereignty-risk', name: 'Sovereignty Risk Score', domain: 'sovereignty', unit: 'pts', description: 'Data sovereignty risk score (lower is better)', formula: 'violations * severity', inputs: ['flow logs'], targetRange: { max: 10, ideal: 0 }, direction: 'lower', ownerRole: 'compliance-officer', warningThreshold: 20, criticalThreshold: 40 },
  { id: 'kpi-policy-compliance', name: 'Policy Compliance Rate', domain: 'sovereignty', unit: '%', description: 'Data residency policy compliance', formula: 'compliant / total * 100', inputs: ['policy checks'], targetRange: { min: 98, ideal: 100 }, direction: 'higher', ownerRole: 'compliance-officer', warningThreshold: 95, criticalThreshold: 90 },
  { id: 'kpi-audit-readiness', name: 'Audit Readiness Score', domain: 'sovereignty', unit: 'pts', description: 'Compliance audit readiness', formula: 'doc_coverage * test_pass', inputs: ['audit data'], targetRange: { min: 90, ideal: 100 }, direction: 'higher', ownerRole: 'compliance-officer', warningThreshold: 80, criticalThreshold: 60 },
  { id: 'kpi-cross-border', name: 'Cross-Border Transfers', domain: 'sovereignty', unit: 'count', description: 'Number of cross-border data transfers', formula: 'count(cross_border_flows)', inputs: ['flow logs'], targetRange: { max: 0, ideal: 0 }, direction: 'lower', ownerRole: 'compliance-officer', warningThreshold: 5, criticalThreshold: 20 },
  { id: 'kpi-encryption-coverage', name: 'Encryption Coverage', domain: 'sovereignty', unit: '%', description: 'Data encryption coverage', formula: 'encrypted / total * 100', inputs: ['encryption status'], targetRange: { min: 100, ideal: 100 }, direction: 'higher', ownerRole: 'compliance-officer', warningThreshold: 98, criticalThreshold: 95 },

  // Financial & Carbon (8)
  { id: 'kpi-effective-pue', name: 'Effective PUE', domain: 'financial_carbon', unit: '', description: 'Overall Power Usage Effectiveness', formula: 'total_power / it_load', inputs: ['power readings'], targetRange: { max: 1.3, ideal: 1.2 }, direction: 'lower', ownerRole: 'sustainability-team', warningThreshold: 1.4, criticalThreshold: 1.6 },
  { id: 'kpi-carbon-per-gpu', name: 'gCO₂e per GPU-hour', domain: 'financial_carbon', unit: 'g', description: 'Carbon intensity per GPU hour', formula: 'emissions / gpu_hours', inputs: ['energy', 'carbon intensity'], targetRange: { max: 50, ideal: 20 }, direction: 'lower', ownerRole: 'sustainability-team', warningThreshold: 100, criticalThreshold: 200 },
  { id: 'kpi-renewable-pct', name: 'Renewable Energy %', domain: 'financial_carbon', unit: '%', description: 'Percentage of renewable energy', formula: 'renewable / total * 100', inputs: ['energy mix'], targetRange: { min: 80, ideal: 100 }, direction: 'higher', ownerRole: 'sustainability-team', warningThreshold: 50, criticalThreshold: 25 },
  { id: 'kpi-carbon-neutral', name: 'Carbon Neutral Progress', domain: 'financial_carbon', unit: '%', description: 'Progress towards carbon neutrality', formula: 'offset / emissions * 100', inputs: ['emissions', 'offsets'], targetRange: { min: 80, ideal: 100 }, direction: 'higher', ownerRole: 'sustainability-team', warningThreshold: 50, criticalThreshold: 25 },
  { id: 'kpi-energy-cost', name: 'Energy Cost per MWh', domain: 'financial_carbon', unit: '$/MWh', description: 'Average energy cost', formula: 'energy_spend / mwh', inputs: ['billing'], targetRange: { max: 80, ideal: 50 }, direction: 'lower', ownerRole: 'sustainability-team', warningThreshold: 100, criticalThreshold: 150 },
  { id: 'kpi-carbon-cost', name: 'Carbon Cost Exposure', domain: 'financial_carbon', unit: '$/month', description: 'Monthly carbon pricing exposure', formula: 'emissions * carbon_price', inputs: ['emissions', 'prices'], targetRange: { max: 10000, ideal: 2000 }, direction: 'lower', ownerRole: 'cio-cto', warningThreshold: 20000, criticalThreshold: 50000 },
  { id: 'kpi-npv-green', name: 'NPV Green Build', domain: 'financial_carbon', unit: '$M', description: 'Net present value of green investments', formula: 'npv_calculation()', inputs: ['financial model'], targetRange: { min: 10, ideal: 50 }, direction: 'higher', ownerRole: 'cio-cto', warningThreshold: 5, criticalThreshold: 0 },
  { id: 'kpi-irr', name: 'Internal Rate of Return', domain: 'financial_carbon', unit: '%', description: 'IRR on green infrastructure', formula: 'irr_calculation()', inputs: ['financial model'], targetRange: { min: 15, ideal: 25 }, direction: 'higher', ownerRole: 'cio-cto', warningThreshold: 10, criticalThreshold: 5 },
];

// ============================================================================
// DEFAULT WORKFLOWS
// ============================================================================

const defaultWorkflows: WorkflowBlueprint[] = [
  // Thermal
  { id: 'wf-thermal-runaway', name: 'Server Thermal Runaway', triggerCondition: 'CPU_temp > 90°C for 30 seconds', domain: 'thermal_hardware', agentId: 'thermal-agent', actions: ['Alert NOC', 'Throttle server', 'Increase cooling', 'Create ticket'], rootCauseFields: ['fan RPM', 'airflow', 'ambient temp'], recommendedMitigation: ['Check fan operation', 'Verify airflow path', 'Reduce workload'], autoRun: true, severity: 'critical', enabled: true },
  { id: 'wf-hotspot-detection', name: 'Hotspot Detection', triggerCondition: 'Rack deltaT > 20°C', domain: 'thermal_hardware', agentId: 'thermal-agent', actions: ['Alert', 'Adjust CRAC setpoints', 'Rebalance workload'], rootCauseFields: ['rack temps', 'airflow sensors'], recommendedMitigation: ['Adjust blanking panels', 'Check cable management'], autoRun: true, severity: 'warning', enabled: true },
  { id: 'wf-throttle-prevention', name: 'Throttle Prevention', triggerCondition: 'Thermal headroom < 10%', domain: 'thermal_hardware', agentId: 'thermal-agent', actions: ['Pre-emptive cooling boost', 'Workload migration'], rootCauseFields: ['thermal margin', 'load prediction'], recommendedMitigation: ['Proactive cooling adjustment'], autoRun: true, severity: 'warning', enabled: true },

  // Power
  { id: 'wf-ups-failure', name: 'UPS Failure Response', triggerCondition: 'UPS health < 60% OR battery runtime < 10 min', domain: 'power_ups', agentId: 'power-agent', actions: ['Alert facility team', 'Start generator', 'Reduce non-critical load', 'Escalate'], rootCauseFields: ['battery health', 'load level', 'maintenance history'], recommendedMitigation: ['Replace batteries', 'Load balance', 'Maintenance schedule'], autoRun: true, severity: 'critical', enabled: true },
  { id: 'wf-grid-outage', name: 'Grid Outage Response', triggerCondition: 'Grid voltage = 0 OR frequency deviation > 2%', domain: 'power_ups', agentId: 'power-agent', actions: ['Switch to UPS', 'Start generators', 'Shed non-critical load', 'Notify utility'], rootCauseFields: ['grid status', 'utility feed'], recommendedMitigation: ['Verify generator start', 'Monitor fuel levels'], autoRun: true, severity: 'emergency', enabled: true },
  { id: 'wf-pdu-overload', name: 'PDU Overload', triggerCondition: 'PDU utilization > 85%', domain: 'power_ups', agentId: 'power-agent', actions: ['Alert', 'Load balance', 'Block new provisioning'], rootCauseFields: ['circuit loads', 'growth trends'], recommendedMitigation: ['Redistribute loads', 'Plan capacity expansion'], autoRun: true, severity: 'warning', enabled: true },

  // Cooling
  { id: 'wf-crac-failure', name: 'CRAC/CRAH Failure', triggerCondition: 'CRAC unit status = offline OR supply temp > 24°C', domain: 'cooling', agentId: 'cooling-agent', actions: ['Failover to standby', 'Increase other units', 'Alert facility', 'Reduce IT load'], rootCauseFields: ['unit status', 'compressor current', 'refrigerant pressure'], recommendedMitigation: ['Switch to backup unit', 'Dispatch technician'], autoRun: true, severity: 'critical', enabled: true },
  { id: 'wf-refrigerant-leak', name: 'Refrigerant Leak Detection', triggerCondition: 'Refrigerant pressure drop > 10%', domain: 'cooling', agentId: 'cooling-agent', actions: ['Alert', 'Isolate unit', 'Dispatch maintenance'], rootCauseFields: ['pressure sensors', 'leak detectors'], recommendedMitigation: ['Isolate leaking system', 'Environmental assessment'], autoRun: false, severity: 'warning', enabled: true },
  { id: 'wf-humidity-excursion', name: 'Humidity Excursion', triggerCondition: 'Humidity < 35% OR humidity > 65%', domain: 'cooling', agentId: 'cooling-agent', actions: ['Adjust humidification', 'Alert'], rootCauseFields: ['humidity sensors', 'HVAC status'], recommendedMitigation: ['Check humidifier operation', 'Verify HVAC settings'], autoRun: true, severity: 'warning', enabled: true },

  // Network
  { id: 'wf-network-congestion', name: 'Network Congestion', triggerCondition: 'Port utilization > 80% for 5 minutes', domain: 'network', agentId: 'network-agent', actions: ['Alert', 'Enable QoS', 'Traffic shaping'], rootCauseFields: ['traffic patterns', 'top talkers'], recommendedMitigation: ['Identify traffic source', 'Implement rate limiting'], autoRun: true, severity: 'warning', enabled: true },
  { id: 'wf-switch-failure', name: 'Network Switch Failure', triggerCondition: 'Switch status = down OR port errors > 1000/min', domain: 'network', agentId: 'network-agent', actions: ['Failover routes', 'Alert NOC', 'Create ticket'], rootCauseFields: ['switch logs', 'port stats'], recommendedMitigation: ['Verify redundant paths', 'Replace faulty hardware'], autoRun: true, severity: 'critical', enabled: true },
  { id: 'wf-link-saturation', name: 'Link Saturation', triggerCondition: 'Uplink utilization > 90%', domain: 'network', agentId: 'network-agent', actions: ['Traffic engineering', 'Alert', 'Capacity planning'], rootCauseFields: ['link utilization', 'growth rate'], recommendedMitigation: ['Upgrade links', 'Load balance traffic'], autoRun: true, severity: 'warning', enabled: true },

  // Facility Safety
  { id: 'wf-water-leak', name: 'Water Leak Detection', triggerCondition: 'Water sensor triggered', domain: 'facility_safety', agentId: 'facility-agent', actions: ['Alert', 'Isolate affected area', 'Shutdown nearby equipment', 'Dispatch maintenance'], rootCauseFields: ['sensor location', 'pipe diagrams'], recommendedMitigation: ['Locate and stop leak', 'Assess equipment damage'], autoRun: true, severity: 'critical', enabled: true },
  { id: 'wf-fire-detection', name: 'Fire Detection Response', triggerCondition: 'Smoke/heat detector activated', domain: 'facility_safety', agentId: 'incident-agent', actions: ['Alarm', 'EPO consideration', 'Evacuate', 'Call fire department'], rootCauseFields: ['detector location', 'VESDA levels'], recommendedMitigation: ['Verify alarm', 'Follow evacuation procedures'], autoRun: true, severity: 'emergency', enabled: true },
  { id: 'wf-hydrogen-incident', name: 'Hydrogen Detection', triggerCondition: 'H2 sensor > 25% LEL', domain: 'facility_safety', agentId: 'facility-agent', actions: ['Alert', 'Ventilate', 'Shutdown charging', 'Evacuate battery room'], rootCauseFields: ['H2 levels', 'battery status'], recommendedMitigation: ['Increase ventilation', 'Check battery health'], autoRun: true, severity: 'critical', enabled: true },

  // Workload
  { id: 'wf-gpu-saturation', name: 'GPU Cluster Saturation', triggerCondition: 'GPU utilization > 95% for 1 hour', domain: 'workload_gpu', agentId: 'workload-agent', actions: ['Alert', 'Queue throttling', 'Scale recommendation'], rootCauseFields: ['job queue', 'tenant usage'], recommendedMitigation: ['Add capacity', 'Prioritize jobs'], autoRun: true, severity: 'warning', enabled: true },
  { id: 'wf-sla-breach', name: 'SLA Breach Prevention', triggerCondition: 'Queue time approaching SLA limit', domain: 'workload_gpu', agentId: 'workload-agent', actions: ['Priority boost', 'Preempt low-priority jobs', 'Alert'], rootCauseFields: ['job SLAs', 'queue depth'], recommendedMitigation: ['Expedite critical jobs', 'Add resources'], autoRun: true, severity: 'warning', enabled: true },
  { id: 'wf-tenant-overload', name: 'Tenant Resource Overload', triggerCondition: 'Tenant usage > quota by 20%', domain: 'workload_gpu', agentId: 'workload-agent', actions: ['Alert tenant', 'Queue new jobs', 'Notify billing'], rootCauseFields: ['quota usage', 'job history'], recommendedMitigation: ['Increase quota', 'Throttle submissions'], autoRun: true, severity: 'warning', enabled: true },

  // Sovereignty
  { id: 'wf-sovereignty-violation', name: 'Sovereignty Violation', triggerCondition: 'Data flow to non-compliant jurisdiction detected', domain: 'sovereignty', agentId: 'sovereignty-agent', actions: ['Block transfer', 'Alert compliance', 'Log incident', 'Audit trail'], rootCauseFields: ['flow destination', 'data classification'], recommendedMitigation: ['Reroute to compliant path', 'Review policies'], autoRun: true, severity: 'critical', enabled: true },
  { id: 'wf-policy-breach', name: 'Policy Breach Detection', triggerCondition: 'Policy rule violation detected', domain: 'sovereignty', agentId: 'sovereignty-agent', actions: ['Alert', 'Log violation', 'Generate report'], rootCauseFields: ['policy id', 'violation details'], recommendedMitigation: ['Review and remediate', 'Update policies'], autoRun: true, severity: 'warning', enabled: true },
  { id: 'wf-cross-border-transfer', name: 'Cross-Border Transfer Alert', triggerCondition: 'Cross-border data transfer initiated', domain: 'sovereignty', agentId: 'sovereignty-agent', actions: ['Verify authorization', 'Log transfer', 'Alert if unauthorized'], rootCauseFields: ['source', 'destination', 'data type'], recommendedMitigation: ['Ensure proper authorization', 'Document transfer'], autoRun: true, severity: 'warning', enabled: true },

  // Financial
  { id: 'wf-carbon-price-shock', name: 'Carbon Price Shock', triggerCondition: 'Carbon price increase > 25%', domain: 'financial_carbon', agentId: 'financial-agent', actions: ['Alert leadership', 'Scenario modeling', 'Optimization recommendations'], rootCauseFields: ['carbon price', 'consumption'], recommendedMitigation: ['Increase renewable usage', 'Optimize load scheduling'], autoRun: false, severity: 'warning', enabled: true },
  { id: 'wf-renewable-outage', name: 'Renewable Energy Outage', triggerCondition: 'Renewable % drops below target', domain: 'financial_carbon', agentId: 'financial-agent', actions: ['Alert', 'Shift load to low-carbon periods', 'Report'], rootCauseFields: ['energy mix', 'grid status'], recommendedMitigation: ['Defer flexible workloads', 'Purchase RECs'], autoRun: true, severity: 'warning', enabled: true },
  { id: 'wf-cost-optimization', name: 'Cost Optimization Opportunity', triggerCondition: 'Spot price favorable OR renewable peak', domain: 'financial_carbon', agentId: 'financial-agent', actions: ['Shift workloads', 'Pre-cool facility', 'Alert operations'], rootCauseFields: ['price signals', 'load flexibility'], recommendedMitigation: ['Maximize low-cost periods'], autoRun: true, severity: 'info', enabled: true },

  // Incident Response
  { id: 'wf-major-incident', name: 'Major Incident Coordination', triggerCondition: 'Multiple critical alerts OR P1 incident declared', domain: 'facility_safety', agentId: 'incident-agent', actions: ['War room activation', 'Stakeholder notification', 'Coordination'], rootCauseFields: ['all domain alerts'], recommendedMitigation: ['Follow incident procedure', 'Document timeline'], autoRun: true, severity: 'emergency', enabled: true },
];

// ============================================================================
// DEFAULT HUMAN ROLES
// ============================================================================

const defaultHumanRoles: HumanRoleBlueprint[] = [
  {
    id: 'noc-operator',
    name: 'NOC Operator',
    description: 'Monitors real-time facility performance, responds to operational incidents 24/7',
    responsibilities: ['Monitor dashboards', 'Acknowledge alerts', 'Execute runbooks', 'First-line troubleshooting', 'Escalate incidents'],
    primaryDashboards: ['Data Centre Command', 'Alert Console', 'KPI Cockpit'],
    workflowsOwned: ['wf-network-congestion', 'wf-hotspot-detection'],
    kpisOwned: ['kpi-thermal-stability', 'kpi-network-integrity', 'kpi-gpu-utilization'],
    domains: ['thermal_hardware', 'power_ups', 'cooling', 'network', 'facility_safety', 'workload_gpu'],
  },
  {
    id: 'facility-engineer',
    name: 'Facility Engineer',
    description: 'Manages physical infrastructure including HVAC, power systems, and safety equipment',
    responsibilities: ['Infrastructure maintenance', 'Capacity planning', 'Equipment commissioning', 'Vendor management', 'Emergency response'],
    primaryDashboards: ['Power Domain', 'Cooling Domain', 'Thermal Domain', 'Facility Safety'],
    workflowsOwned: ['wf-ups-failure', 'wf-crac-failure', 'wf-thermal-runaway', 'wf-water-leak'],
    kpisOwned: ['kpi-power-reliability', 'kpi-cooling-efficiency', 'kpi-ups-health', 'kpi-fire-readiness'],
    domains: ['thermal_hardware', 'power_ups', 'cooling', 'facility_safety'],
  },
  {
    id: 'sustainability-team',
    name: 'Sustainability Team',
    description: 'Tracks carbon emissions, renewable energy mix, and ESG reporting requirements',
    responsibilities: ['Carbon accounting', 'Renewable procurement', 'ESG reporting', 'Efficiency optimization', 'Offset management'],
    primaryDashboards: ['Financial & Carbon Domain', 'Energy Analytics'],
    workflowsOwned: ['wf-carbon-price-shock', 'wf-renewable-outage', 'wf-cost-optimization'],
    kpisOwned: ['kpi-effective-pue', 'kpi-carbon-per-gpu', 'kpi-renewable-pct', 'kpi-carbon-neutral'],
    domains: ['financial_carbon'],
  },
  {
    id: 'compliance-officer',
    name: 'Compliance Officer',
    description: 'Ensures data sovereignty, PIPEDA compliance, and maintains audit readiness',
    responsibilities: ['Policy enforcement', 'Audit management', 'Compliance reporting', 'Risk assessment', 'Regulatory liaison'],
    primaryDashboards: ['Sovereignty Domain', 'Audit Dashboard', 'Compliance Reports'],
    workflowsOwned: ['wf-sovereignty-violation', 'wf-policy-breach', 'wf-cross-border-transfer'],
    kpisOwned: ['kpi-sovereign-compute', 'kpi-sovereignty-risk', 'kpi-audit-readiness', 'kpi-policy-compliance'],
    domains: ['sovereignty'],
  },
  {
    id: 'cio-cto',
    name: 'CIO/CTO',
    description: 'Makes strategic decisions on capacity, investments, and infrastructure direction',
    responsibilities: ['Strategic planning', 'Budget approval', 'Technology roadmap', 'Executive reporting', 'Risk management'],
    primaryDashboards: ['Executive Summary', 'Financial Overview', 'Capacity Planning'],
    workflowsOwned: ['wf-major-incident'],
    kpisOwned: ['kpi-npv-green', 'kpi-irr', 'kpi-cost-gpu-hour', 'kpi-carbon-cost'],
    domains: ['thermal_hardware', 'power_ups', 'cooling', 'network', 'facility_safety', 'workload_gpu', 'sovereignty', 'financial_carbon'],
  },
];

// ============================================================================
// DEFAULT SIMULATION SCENARIOS (12+)
// ============================================================================

const defaultSimulationScenarios: SimulationScenarioBlueprint[] = [
  {
    id: 'scenario-gpu-spike',
    name: 'GPU Demand Spike',
    description: 'Sudden 40% increase in GPU workload demand, testing scheduler and cooling response',
    domainImpact: ['workload_gpu', 'thermal_hardware', 'cooling', 'power_ups'],
    severity: 'warning',
    durationMinutes: 30,
    kpiImpacts: [
      { kpiId: 'kpi-gpu-utilization', kpiName: 'GPU Utilization', direction: 'increase', magnitude: 35 },
      { kpiId: 'kpi-avg-queue-time', kpiName: 'Avg Queue Time', direction: 'increase', magnitude: 200 },
      { kpiId: 'kpi-avg-server-temp', kpiName: 'Avg Server Temperature', direction: 'increase', magnitude: 10 },
    ],
    defaultMitigationWorkflowId: 'wf-gpu-saturation',
    triggers: ['Large training job submission', 'Tenant burst', 'Scheduled batch window'],
    category: 'Workload',
  },
  {
    id: 'scenario-crac-failure',
    name: 'CRAC Unit Failure',
    description: 'Primary CRAC unit fails, testing N+1 redundancy and thermal management',
    domainImpact: ['cooling', 'thermal_hardware'],
    severity: 'critical',
    durationMinutes: 45,
    kpiImpacts: [
      { kpiId: 'kpi-cooling-efficiency', kpiName: 'Cooling Efficiency', direction: 'decrease', magnitude: 30 },
      { kpiId: 'kpi-supply-temp', kpiName: 'Avg Supply Temperature', direction: 'increase', magnitude: 6 },
      { kpiId: 'kpi-thermal-stability', kpiName: 'Thermal Stability', direction: 'decrease', magnitude: 20 },
    ],
    defaultMitigationWorkflowId: 'wf-crac-failure',
    triggers: ['Compressor failure', 'Refrigerant leak', 'Power to unit lost'],
    category: 'Cooling',
  },
  {
    id: 'scenario-ups-failure',
    name: 'UPS Bank Failure',
    description: 'One UPS bank goes offline, testing power redundancy and failover',
    domainImpact: ['power_ups'],
    severity: 'critical',
    durationMinutes: 20,
    kpiImpacts: [
      { kpiId: 'kpi-ups-health', kpiName: 'UPS Health Index', direction: 'decrease', magnitude: 50 },
      { kpiId: 'kpi-power-reliability', kpiName: 'Power Reliability', direction: 'decrease', magnitude: 25 },
      { kpiId: 'kpi-ups-runtime', kpiName: 'UPS Runtime', direction: 'decrease', magnitude: 40 },
    ],
    defaultMitigationWorkflowId: 'wf-ups-failure',
    triggers: ['Battery degradation', 'Inverter failure', 'Overload condition'],
    category: 'Power',
  },
  {
    id: 'scenario-grid-outage',
    name: 'Grid Power Outage',
    description: 'Complete utility power loss, testing UPS and generator failover sequence',
    domainImpact: ['power_ups', 'thermal_hardware', 'cooling', 'workload_gpu'],
    severity: 'emergency',
    durationMinutes: 60,
    kpiImpacts: [
      { kpiId: 'kpi-power-reliability', kpiName: 'Power Reliability', direction: 'decrease', magnitude: 40 },
      { kpiId: 'kpi-generator-ready', kpiName: 'Generator Readiness', direction: 'decrease', magnitude: 20 },
    ],
    defaultMitigationWorkflowId: 'wf-grid-outage',
    triggers: ['Utility failure', 'Weather event', 'Grid maintenance'],
    category: 'Power',
  },
  {
    id: 'scenario-water-leak',
    name: 'Water Leak Detection',
    description: 'Water leak detected in cooling system, testing safety protocols',
    domainImpact: ['facility_safety', 'cooling'],
    severity: 'critical',
    durationMinutes: 15,
    kpiImpacts: [
      { kpiId: 'kpi-env-safety', kpiName: 'Environmental Safety', direction: 'decrease', magnitude: 30 },
      { kpiId: 'kpi-water-leak-risk', kpiName: 'Water Leak Risk', direction: 'increase', magnitude: 100 },
    ],
    defaultMitigationWorkflowId: 'wf-water-leak',
    triggers: ['Pipe failure', 'Condensate overflow', 'Chilled water leak'],
    category: 'Safety',
  },
  {
    id: 'scenario-fire-suppression',
    name: 'Fire Suppression Activation',
    description: 'Fire detection triggers suppression sequence, testing emergency response',
    domainImpact: ['facility_safety', 'power_ups', 'workload_gpu'],
    severity: 'emergency',
    durationMinutes: 30,
    kpiImpacts: [
      { kpiId: 'kpi-env-safety', kpiName: 'Environmental Safety', direction: 'decrease', magnitude: 50 },
      { kpiId: 'kpi-fire-readiness', kpiName: 'Fire Suppression Readiness', direction: 'decrease', magnitude: 100 },
    ],
    defaultMitigationWorkflowId: 'wf-fire-detection',
    triggers: ['Smoke detection', 'Heat detection', 'Manual activation'],
    category: 'Safety',
  },
  {
    id: 'scenario-sovereignty-violation',
    name: 'Sovereignty Violation',
    description: 'Workload attempts to route data to non-compliant jurisdiction',
    domainImpact: ['sovereignty', 'workload_gpu'],
    severity: 'critical',
    durationMinutes: 10,
    kpiImpacts: [
      { kpiId: 'kpi-sovereignty-risk', kpiName: 'Sovereignty Risk', direction: 'increase', magnitude: 80 },
      { kpiId: 'kpi-policy-compliance', kpiName: 'Policy Compliance', direction: 'decrease', magnitude: 15 },
      { kpiId: 'kpi-cross-border', kpiName: 'Cross-Border Transfers', direction: 'increase', magnitude: 1 },
    ],
    defaultMitigationWorkflowId: 'wf-sovereignty-violation',
    triggers: ['Misconfigured workload', 'Policy gap', 'Migration error'],
    category: 'Compliance',
  },
  {
    id: 'scenario-carbon-shock',
    name: 'Carbon Price Shock',
    description: 'Carbon price increases 50%, testing financial resilience and optimization',
    domainImpact: ['financial_carbon'],
    severity: 'warning',
    durationMinutes: 120,
    kpiImpacts: [
      { kpiId: 'kpi-carbon-cost', kpiName: 'Carbon Cost Exposure', direction: 'increase', magnitude: 50 },
      { kpiId: 'kpi-cost-gpu-hour', kpiName: 'Cost per GPU-hour', direction: 'increase', magnitude: 15 },
    ],
    defaultMitigationWorkflowId: 'wf-carbon-price-shock',
    triggers: ['Policy change', 'Market volatility', 'Regulatory update'],
    category: 'Financial',
  },
  {
    id: 'scenario-network-congestion',
    name: 'Network Fabric Congestion',
    description: 'East-west traffic spike causes fabric saturation',
    domainImpact: ['network', 'workload_gpu'],
    severity: 'warning',
    durationMinutes: 25,
    kpiImpacts: [
      { kpiId: 'kpi-fabric-saturation', kpiName: 'Fabric Saturation', direction: 'increase', magnitude: 40 },
      { kpiId: 'kpi-avg-latency', kpiName: 'Average Latency', direction: 'increase', magnitude: 300 },
      { kpiId: 'kpi-network-integrity', kpiName: 'Network Integrity', direction: 'decrease', magnitude: 15 },
    ],
    defaultMitigationWorkflowId: 'wf-network-congestion',
    triggers: ['Distributed training', 'Data shuffling', 'Checkpoint sync'],
    category: 'Network',
  },
  {
    id: 'scenario-refrigerant-leak',
    name: 'Refrigerant Leak',
    description: 'Refrigerant leak detected in cooling system, environmental and cooling impact',
    domainImpact: ['cooling', 'facility_safety'],
    severity: 'warning',
    durationMinutes: 40,
    kpiImpacts: [
      { kpiId: 'kpi-cooling-efficiency', kpiName: 'Cooling Efficiency', direction: 'decrease', magnitude: 25 },
      { kpiId: 'kpi-supply-temp', kpiName: 'Avg Supply Temperature', direction: 'increase', magnitude: 4 },
    ],
    defaultMitigationWorkflowId: 'wf-refrigerant-leak',
    triggers: ['System age', 'Vibration damage', 'Maintenance gap'],
    category: 'Cooling',
  },
  {
    id: 'scenario-hydrogen-detection',
    name: 'Hydrogen Detection',
    description: 'Elevated hydrogen levels detected in battery room',
    domainImpact: ['facility_safety', 'power_ups'],
    severity: 'critical',
    durationMinutes: 15,
    kpiImpacts: [
      { kpiId: 'kpi-env-safety', kpiName: 'Environmental Safety', direction: 'decrease', magnitude: 40 },
      { kpiId: 'kpi-early-warning', kpiName: 'Early Warning Index', direction: 'decrease', magnitude: 20 },
    ],
    defaultMitigationWorkflowId: 'wf-hydrogen-incident',
    triggers: ['Battery overcharge', 'Cell failure', 'Ventilation failure'],
    category: 'Safety',
  },
  {
    id: 'scenario-thermal-runaway',
    name: 'Server Thermal Runaway',
    description: 'Multiple servers approaching thermal throttling thresholds',
    domainImpact: ['thermal_hardware', 'workload_gpu'],
    severity: 'critical',
    durationMinutes: 20,
    kpiImpacts: [
      { kpiId: 'kpi-thermal-stability', kpiName: 'Thermal Stability', direction: 'decrease', magnitude: 35 },
      { kpiId: 'kpi-max-server-temp', kpiName: 'Max Server Temperature', direction: 'increase', magnitude: 15 },
      { kpiId: 'kpi-throttle-events', kpiName: 'Thermal Throttle Events', direction: 'increase', magnitude: 10 },
    ],
    defaultMitigationWorkflowId: 'wf-thermal-runaway',
    triggers: ['Cooling failure', 'Airflow obstruction', 'Overloaded rack'],
    category: 'Thermal',
  },
  {
    id: 'scenario-renewable-outage',
    name: 'Renewable Energy Outage',
    description: 'Solar/wind generation drops, increasing grid carbon intensity',
    domainImpact: ['financial_carbon'],
    severity: 'warning',
    durationMinutes: 180,
    kpiImpacts: [
      { kpiId: 'kpi-renewable-pct', kpiName: 'Renewable Energy %', direction: 'decrease', magnitude: 40 },
      { kpiId: 'kpi-carbon-per-gpu', kpiName: 'gCO₂e per GPU-hour', direction: 'increase', magnitude: 80 },
    ],
    defaultMitigationWorkflowId: 'wf-renewable-outage',
    triggers: ['Weather conditions', 'Grid issues', 'Maintenance'],
    category: 'Financial',
  },
  {
    id: 'scenario-gpu-cluster-failure',
    name: 'GPU Cluster Failure',
    description: 'Entire GPU cluster goes offline, testing failover and job redistribution',
    domainImpact: ['workload_gpu', 'network'],
    severity: 'critical',
    durationMinutes: 45,
    kpiImpacts: [
      { kpiId: 'kpi-gpu-utilization', kpiName: 'GPU Utilization', direction: 'decrease', magnitude: 50 },
      { kpiId: 'kpi-sla-breach', kpiName: 'SLA Breach Rate', direction: 'increase', magnitude: 25 },
      { kpiId: 'kpi-avg-queue-time', kpiName: 'Avg Queue Time', direction: 'increase', magnitude: 500 },
    ],
    defaultMitigationWorkflowId: 'wf-gpu-saturation',
    triggers: ['Network partition', 'Power loss', 'Switch failure'],
    category: 'Workload',
  },
  {
    id: 'scenario-multi-domain-cascade',
    name: 'Multi-Domain Cascade Failure',
    description: 'Cascading failure across multiple domains testing incident coordination',
    domainImpact: ['cooling', 'thermal_hardware', 'power_ups', 'workload_gpu', 'facility_safety'],
    severity: 'emergency',
    durationMinutes: 90,
    kpiImpacts: [
      { kpiId: 'kpi-thermal-stability', kpiName: 'Thermal Stability', direction: 'decrease', magnitude: 40 },
      { kpiId: 'kpi-cooling-efficiency', kpiName: 'Cooling Efficiency', direction: 'decrease', magnitude: 50 },
      { kpiId: 'kpi-env-safety', kpiName: 'Environmental Safety', direction: 'decrease', magnitude: 30 },
    ],
    defaultMitigationWorkflowId: 'wf-major-incident',
    triggers: ['Compounding failures', 'Extreme weather', 'Equipment age'],
    category: 'Incident',
  },
];

// ============================================================================
// DEFAULT DOMAIN SECTIONS
// ============================================================================

function createDefaultDomains(): DataCentreBlueprint['domains'] {
  return {
    thermal: {
      id: 'domain-thermal',
      name: 'Thermal & Hardware',
      description: 'Server temperatures, fan control, disk health, thermal management',
      enabled: true,
      agentIds: ['thermal-agent'],
      dataSourceIds: ['ds-ipmi', 'ds-redfish', 'ds-ambient'],
      kpiIds: defaultKpis.filter(k => k.domain === 'thermal_hardware').map(k => k.id),
      workflowIds: defaultWorkflows.filter(w => w.domain === 'thermal_hardware').map(w => w.id),
    },
    power: {
      id: 'domain-power',
      name: 'Power & UPS',
      description: 'Power distribution, UPS health, generator failover, grid stability',
      enabled: true,
      agentIds: ['power-agent'],
      dataSourceIds: ['ds-pdu', 'ds-ups', 'ds-generator'],
      kpiIds: defaultKpis.filter(k => k.domain === 'power_ups').map(k => k.id),
      workflowIds: defaultWorkflows.filter(w => w.domain === 'power_ups').map(w => w.id),
    },
    cooling: {
      id: 'domain-cooling',
      name: 'Cooling System',
      description: 'CRAC/CRAH units, chiller plant, humidity, refrigerant management',
      enabled: true,
      agentIds: ['cooling-agent'],
      dataSourceIds: ['ds-crac', 'ds-chiller', 'ds-refrigerant'],
      kpiIds: defaultKpis.filter(k => k.domain === 'cooling').map(k => k.id),
      workflowIds: defaultWorkflows.filter(w => w.domain === 'cooling').map(w => w.id),
    },
    network: {
      id: 'domain-network',
      name: 'Network Fabric',
      description: 'Network switches, fabric health, latency, throughput monitoring',
      enabled: true,
      agentIds: ['network-agent'],
      dataSourceIds: ['ds-switch', 'ds-netflow', 'ds-firewall'],
      kpiIds: defaultKpis.filter(k => k.domain === 'network').map(k => k.id),
      workflowIds: defaultWorkflows.filter(w => w.domain === 'network').map(w => w.id),
    },
    facility: {
      id: 'domain-facility',
      name: 'Facility & Safety',
      description: 'Environmental monitoring, fire suppression, access control, safety sensors',
      enabled: true,
      agentIds: ['facility-agent', 'incident-agent'],
      dataSourceIds: ['ds-bms', 'ds-fire', 'ds-access'],
      kpiIds: defaultKpis.filter(k => k.domain === 'facility_safety').map(k => k.id),
      workflowIds: defaultWorkflows.filter(w => w.domain === 'facility_safety').map(w => w.id),
    },
    workload: {
      id: 'domain-workload',
      name: 'Workload & GPU',
      description: 'GPU scheduling, workload management, queue optimization, SLA tracking',
      enabled: true,
      agentIds: ['workload-agent'],
      dataSourceIds: ['ds-k8s', 'ds-slurm', 'ds-dcgm'],
      kpiIds: defaultKpis.filter(k => k.domain === 'workload_gpu').map(k => k.id),
      workflowIds: defaultWorkflows.filter(w => w.domain === 'workload_gpu').map(w => w.id),
    },
    sovereignty: {
      id: 'domain-sovereignty',
      name: 'Sovereignty & Compliance',
      description: 'Data residency, cross-border monitoring, policy enforcement, audit',
      enabled: true,
      agentIds: ['sovereignty-agent'],
      dataSourceIds: ['ds-lineage', 'ds-audit'],
      kpiIds: defaultKpis.filter(k => k.domain === 'sovereignty').map(k => k.id),
      workflowIds: defaultWorkflows.filter(w => w.domain === 'sovereignty').map(w => w.id),
    },
    financial: {
      id: 'domain-financial',
      name: 'Financial & Carbon',
      description: 'Energy costs, carbon tracking, renewable mix, financial optimization',
      enabled: true,
      agentIds: ['financial-agent'],
      dataSourceIds: ['ds-energy', 'ds-carbon', 'ds-weather'],
      kpiIds: defaultKpis.filter(k => k.domain === 'financial_carbon').map(k => k.id),
      workflowIds: defaultWorkflows.filter(w => w.domain === 'financial_carbon').map(w => w.id),
    },
  };
}

// ============================================================================
// BLUEPRINT GENERATOR
// ============================================================================

export function generateDefaultBlueprint(
  twinId: string,
  name: string = 'Montreal Sovereign AI DC',
  location: string = 'Montreal, QC, Canada',
  capacityKw: number = 10000,
  racks: number = 200,
  tier: string = 'Tier III'
): DataCentreBlueprint {
  const now = new Date().toISOString();
  
  return {
    id: `bp-${twinId}`,
    twinId,
    name,
    location,
    capacityKw,
    racks,
    tier,
    jurisdiction: 'CA-QC',
    
    domains: createDefaultDomains(),
    agents: defaultAgents,
    dataSources: defaultDataSources,
    integrations: defaultIntegrations,
    kpis: defaultKpis,
    workflows: defaultWorkflows,
    humanRoles: defaultHumanRoles,
    simulationScenarios: defaultSimulationScenarios,
    
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export { defaultAgents, defaultDataSources, defaultIntegrations, defaultKpis, defaultWorkflows, defaultHumanRoles, defaultSimulationScenarios };
