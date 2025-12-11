/**
 * AOC (Agent Operations Center) Reference Data
 * Industry-accurate operational data for Data Centre Twin agents
 * Sources: Uptime Institute, NVIDIA DCGM, Hydro-Québec, ASHRAE TC 9.9
 */

/**
 * AGENT ACTIVITY LOGS - Real DC Operations Examples
 * Based on typical data center operations workflows
 */
export const mockAgentActivityLogs = [
  {
    id: 'log-thermal-001',
    agent_id: 'thermal-guardian',
    log_type: 'info',
    message: 'Thermal Guardian agent initialized with ASHRAE A1 monitoring profile',
    details: { version: 'v2.1', environment: 'production', ashrae_tier: 'A1', temp_range: '15-32°C' },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-thermal-002',
    agent_id: 'thermal-guardian',
    log_type: 'workflow_event',
    message: 'Hot aisle containment monitoring activated for Zone B',
    details: { workflow_id: 'thermal-monitoring', trigger: 'scheduled', zone: 'hot-aisle-b' },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-thermal-003',
    agent_id: 'thermal-guardian',
    log_type: 'action',
    message: 'Processing rack temperature telemetry batch',
    details: { batch_size: 480, source: 'dcim_sensors', racks: 20, sensors_per_rack: 24 },
    created_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-thermal-004',
    agent_id: 'thermal-guardian',
    log_type: 'llm',
    message: 'Thermal anomaly pattern analysis completed',
    details: { model: 'gemini-2.5-flash', tokens: 2456, latency_ms: 890 },
    created_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-power-001',
    agent_id: 'power-monitor',
    log_type: 'integration',
    message: 'Hydro-Québec grid frequency monitoring connected',
    details: { endpoint: '/grid-status', status: 200, frequency_hz: 60.02 },
    created_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-gpu-001',
    agent_id: 'workload-orchestrator',
    log_type: 'success',
    message: 'GPU workload rebalancing completed across H100 cluster',
    details: { processed: 8, gpus_rebalanced: 3, utilization_improvement: 12 },
    created_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-thermal-005',
    agent_id: 'thermal-guardian',
    log_type: 'action',
    message: 'Thermal alert generated for ASHRAE A1 boundary approach',
    details: { rack_id: 'R-B-12', inlet_temp: 26.8, threshold: 27.0, severity: 'warning' },
    created_at: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-cooling-001',
    agent_id: 'cooling-optimizer',
    log_type: 'tool_call',
    message: 'CRAH supply air temperature adjustment executed',
    details: { tool: 'bms_control', unit: 'CRAH-B-02', new_setpoint: 22.5 },
    created_at: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-carbon-001',
    agent_id: 'carbon-tracker',
    log_type: 'info',
    message: 'Daily carbon emissions report generated',
    details: { date: '2024-12-01', emissions_kg: 45.2, pue: 1.32, renewable_pct: 99.2 },
    created_at: new Date(Date.now() - 42 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-power-002',
    agent_id: 'power-monitor',
    log_type: 'warning',
    message: 'UPS battery capacity approaching maintenance threshold',
    details: { ups_id: 'UPS-A-01', capacity_pct: 82, threshold_pct: 80 },
    created_at: new Date(Date.now() - 32 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-thermal-006',
    agent_id: 'thermal-guardian',
    log_type: 'error',
    message: 'Temperature sensor communication timeout in Hot Aisle C',
    details: { sensor_group: 'HA-C-SENSORS', timeout_ms: 5000, retry_scheduled: true },
    created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-thermal-007',
    agent_id: 'thermal-guardian',
    log_type: 'info',
    message: 'Sensor communication restored after retry',
    details: { attempt: 2, sensor_group: 'HA-C-SENSORS', latency_ms: 120 },
    created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * AGENT WORKFLOWS - Data Centre Operations Workflows
 * Based on standard DCIM and BMS integration patterns
 */
export const mockAgentWorkflows = [
  {
    id: 'workflow-thermal-001',
    agent_id: 'thermal-guardian',
    name: 'Thermal Anomaly Detection Pipeline',
    workflow_json: {
      nodes: [
        { id: '1', name: 'Collect Sensor Data', type: 'trigger', action: 'dcim_poll', status: 'completed' },
        { id: '2', name: 'Parse Temperature Readings', type: 'action', action: 'extract_fields', status: 'completed' },
        { id: '3', name: 'Analyze Thermal Patterns', type: 'llm', action: 'pattern_analysis', status: 'running' },
        { id: '4', name: 'Check ASHRAE Compliance', type: 'integration', action: 'ashrae_check', status: 'idle' },
        { id: '5', name: 'Generate Thermal Alert', type: 'action', action: 'create_alert', status: 'idle' },
        { id: '6', name: 'Notify Facilities Team', type: 'action', action: 'send_notification', status: 'idle' },
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '2', to: '3' },
        { from: '3', to: '4' },
        { from: '4', to: '5' },
        { from: '5', to: '6' },
      ],
    },
    enabled: true,
    trigger_type: 'scheduled',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'workflow-power-001',
    agent_id: 'power-monitor',
    name: 'Power Distribution Monitoring',
    workflow_json: {
      nodes: [
        { id: '1', name: 'PDU Polling Trigger', type: 'trigger', action: 'snmp_poll', status: 'completed' },
        { id: '2', name: 'Aggregate Power Metrics', type: 'integration', action: 'power_aggregate', status: 'completed' },
        { id: '3', name: 'Calculate PUE', type: 'action', action: 'pue_calculation', status: 'idle' },
        { id: '4', name: 'Update Dashboard', type: 'action', action: 'update_kpis', status: 'idle' },
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '2', to: '3' },
        { from: '3', to: '4' },
      ],
    },
    enabled: true,
    trigger_type: 'scheduled',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * AGENT RUNS - Historical Execution Records
 * Based on typical DC agent execution patterns
 */
export const mockAgentRuns = [
  {
    id: 'run-thermal-001',
    agent_id: 'thermal-guardian',
    user_id: 'system',
    status: 'completed',
    input: { workflow: 'thermal-monitoring', zone: 'all', racks: 20 },
    output: { processed: 480, alerts: 2, within_ashrae: 478 },
    duration_ms: 1234,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1234).toISOString(),
  },
  {
    id: 'run-gpu-001',
    agent_id: 'workload-orchestrator',
    user_id: 'system',
    status: 'completed',
    input: { workflow: 'gpu-rebalancing', cluster: 'dgx-cluster-a' },
    output: { gpus_evaluated: 64, migrations: 4, utilization_delta: '+8%' },
    duration_ms: 2456,
    created_at: new Date(Date.now() - 42 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 42 * 60 * 60 * 1000 + 2456).toISOString(),
  },
  {
    id: 'run-thermal-002',
    agent_id: 'thermal-guardian',
    user_id: 'system',
    status: 'failed',
    input: { workflow: 'thermal-monitoring', zone: 'hot-aisle-c' },
    output: null,
    error: 'Sensor communication timeout - Hot Aisle C sensors offline',
    duration_ms: 5001,
    created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 30 * 60 * 60 * 1000 + 5001).toISOString(),
  },
  {
    id: 'run-carbon-001',
    agent_id: 'carbon-tracker',
    user_id: 'system',
    status: 'completed',
    input: { workflow: 'daily-carbon-report', date: '2024-12-01' },
    output: { emissions_kg: 45.2, renewable_pct: 99.2, pue_avg: 1.32 },
    duration_ms: 876,
    created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 18 * 60 * 60 * 1000 + 876).toISOString(),
  },
  {
    id: 'run-cooling-001',
    agent_id: 'cooling-optimizer',
    user_id: 'system',
    status: 'completed',
    input: { workflow: 'economizer-optimization', oat_celsius: 12 },
    output: { free_cooling_enabled: true, chiller_load_reduction: '45%' },
    duration_ms: 654,
    created_at: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 16 * 60 * 60 * 1000 + 654).toISOString(),
  },
];

/**
 * CLOUD DEPLOYMENTS - Canadian Sovereign Cloud Configurations
 * Based on AWS Canada Central, Azure Canada, GCP Montreal regions
 */
export const mockCloudDeployments = [
  {
    id: 'deploy-ca-central',
    agent_id: 'dc-twin-primary',
    provider: 'aws',
    region: 'ca-central-1',
    status: 'running',
    instance_id: 'i-dc-twin-prod-mtl',
    compute_tier: 'r6i.2xlarge',
    cost_estimate: 245.0,
    resources: {
      lambda: 'dc-twin-thermal-fn',
      kinesis: 'telemetry-stream',
      rds: 'dc-twin-metrics-db',
      s3: 'dc-twin-audit-logs',
    },
    endpoints: {
      api: 'https://api.dc-twin.ca-central-1.example.com',
      webhook: 'https://webhook.dc-twin.ca-central-1.example.com',
    },
    deployed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'deploy-azure-canada',
    agent_id: 'dc-twin-secondary',
    provider: 'azure',
    region: 'canadacentral',
    status: 'running',
    instance_id: 'vm-dc-twin-dr',
    compute_tier: 'Standard_E4s_v5',
    cost_estimate: 280.0,
    resources: {
      functions: 'dc-twin-cooling-fn',
      event_hubs: 'sensor-events',
      cosmos: 'dc-twin-state',
      storage: 'thermal-snapshots',
    },
    endpoints: {
      api: 'https://api.dc-twin.canadacentral.example.com',
    },
    deployed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'deploy-gcp-montreal',
    agent_id: 'dc-twin-analytics',
    provider: 'gcp',
    region: 'northamerica-northeast1',
    status: 'deploying',
    instance_id: 'gke-dc-twin-analytics',
    compute_tier: 'n2-standard-4',
    cost_estimate: 195.0,
    resources: {
      cloud_run: 'dc-twin-analytics-svc',
      pub_sub: 'kpi-topic',
      bigquery: 'dc-twin-warehouse',
      storage: 'simulation-results',
    },
    endpoints: null,
    deployed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

/**
 * AGENT VERSIONS - Version History for DC Twin Agents
 */
export const mockAgentVersions = [
  {
    id: 'version-001',
    agent_id: 'thermal-guardian',
    version: 'v1.0',
    commit_message: 'Initial thermal monitoring with ASHRAE A1 compliance',
    config_snapshot: {
      model: 'gemini-2.5-flash',
      temp_threshold_c: 27,
      monitoring_interval_sec: 60,
    },
    deployed_to_env: ['dev'],
    published_by: 'system',
    published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'version-002',
    agent_id: 'thermal-guardian',
    version: 'v1.5',
    commit_message: 'Enhanced anomaly detection with ML pattern analysis',
    config_snapshot: {
      model: 'gemini-2.5-flash',
      temp_threshold_c: 27,
      monitoring_interval_sec: 30,
      anomaly_detection: true,
    },
    deployed_to_env: ['dev', 'staging'],
    published_by: 'system',
    published_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'version-003',
    agent_id: 'thermal-guardian',
    version: 'v2.0',
    commit_message: 'Production release with predictive thermal forecasting',
    config_snapshot: {
      model: 'gemini-2.5-flash',
      temp_threshold_c: 27,
      monitoring_interval_sec: 30,
      anomaly_detection: true,
      predictive_forecasting: true,
      forecast_horizon_min: 15,
    },
    deployed_to_env: ['dev', 'staging', 'production'],
    published_by: 'system',
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * AUDIT LOGS - Compliance and Operations Audit Trail
 */
export const mockAuditLogs = [
  {
    id: 'audit-001',
    user_id: 'system',
    action: 'agent_deployed',
    entity_type: 'agent',
    entity_id: 'thermal-guardian',
    details: { environment: 'production', version: 'v2.0', region: 'ca-central-1' },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-002',
    user_id: 'system',
    action: 'version_created',
    entity_type: 'agent',
    entity_id: 'thermal-guardian',
    details: { version: 'v2.0', changes: 'Added predictive forecasting', approver: 'dc-admin' },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-003',
    user_id: 'dc-operator',
    action: 'config_updated',
    entity_type: 'agent',
    entity_id: 'cooling-optimizer',
    details: { field: 'setpoint', changes: { old: 21.5, new: 22.5 } },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-004',
    user_id: 'system',
    action: 'workflow_triggered',
    entity_type: 'workflow',
    entity_id: 'thermal-anomaly-detection',
    details: { trigger: 'scheduled', zone: 'all' },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-005',
    user_id: 'system',
    action: 'deployment_created',
    entity_type: 'deployment',
    entity_id: 'dc-twin-primary',
    details: { provider: 'aws', region: 'ca-central-1', status: 'running' },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-006',
    user_id: 'dc-admin',
    action: 'role_granted',
    entity_type: 'user',
    entity_id: 'dc-operator',
    details: { role: 'operator', scope: 'thermal-guardian', expires: null },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-007',
    user_id: 'system',
    action: 'alert_triggered',
    entity_type: 'alert',
    entity_id: 'thermal-alert-001',
    details: { type: 'ashrae_warning', rack_id: 'R-B-12', temp_c: 26.8 },
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-008',
    user_id: 'system',
    action: 'report_generated',
    entity_type: 'report',
    entity_id: 'carbon-report-001',
    details: { type: 'daily_carbon', date: '2024-12-01', emissions_kg: 45.2 },
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * AGENT RUNTIME STATUS - Current Operational State
 */
export const mockAgentRuntimeStatus = {
  id: 'status-thermal-001',
  agent_id: 'thermal-guardian',
  status: 'running',
  environment: 'production',
  current_version: 'v2.0',
  health_status: 'healthy',
  last_action: 'thermal_scan',
  last_action_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  metadata: { uptime_hours: 72, health: 'optimal', sensors_online: 480 },
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
};

/**
 * USER ROLES - RBAC Configuration for DC Operations
 */
export const mockUserRoles = [
  {
    id: 'role-001',
    user_id: 'dc-admin',
    role: 'admin',
    scope: 'global',
    granted_by: 'system',
    granted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'role-002',
    user_id: 'dc-operator',
    role: 'operator',
    scope: 'agent:thermal-guardian',
    granted_by: 'dc-admin',
    granted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'role-003',
    user_id: 'dc-viewer',
    role: 'viewer',
    scope: 'global',
    granted_by: 'dc-admin',
    granted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
