/**
 * Test fixtures for Data Centre Digital Twin template
 */

export const dataCentreDigitalTwinTemplate = {
  id: 'datacentre-master-twin-v1',
  name: 'Data Centre Digital Twin',
  description: 'Production-grade Data Centre Digital Twin with 9 domain twins (Thermal, Power, Cooling, Network, Facility, Workload, Sovereignty, Carbon, Financial), 50+ KPIs, 15+ simulation scenarios, and comprehensive synthetic telemetry for sovereign AI infrastructure.',
  short_description: 'Complete data centre monitoring, simulation, and optimization platform',
  industry: 'Technology',
  department: 'Infrastructure Operations',
  twin_type: 'operational',
  certified: true,
  rating: 4.9,
  downloads: 1250,
  roi_pct: 280,
  roi_hint: 280,
  tags: ['Sovereign AI', 'Carbon Neutral', 'GPU-Optimized', 'Tier IV', 'Real-time Telemetry', 'Simulation-Ready'],
  hero_icon: '🏢',
  
  default_config: {
    department: 'Infrastructure Operations',
    useCase: 'Data Centre Operations & Infrastructure Management',
    level: 'Strategic',
    type: 'operational',
    goals: [
      'Optimize PUE to 1.2 or lower',
      'Maximize GPU cluster utilization to 85%+',
      'Achieve 100% sovereignty compliance',
      'Reduce carbon emissions by 40%',
    ],
    selectedModel: 'google/gemini-2.5-pro',
    temperature: 0.3,
    topK: 10,
    topP: 0.95,
    systemPrompt: 'You are the Data Centre Digital Twin CoPilot, an expert AI assistant for sovereign data centre operations. You monitor 9 domain twins: Thermal, Power, Cooling, Network, Facility, Workload, Sovereignty, Carbon, and Financial. Provide actionable insights based on real-time telemetry and simulation results.',
    personaTemplate: 'Data Centre Operations Expert',
    grounding: true,
    knowledge: true,
    communicationStyle: {
      formal: true,
      emojis: false,
      detailedExplanations: true,
    },
    connectors: [
      { id: 'gpu_telemetry', mode: 'realtime' },
      { id: 'power_chain', mode: 'realtime' },
      { id: 'cooling_engine', mode: 'realtime' },
      { id: 'network_fabric', mode: 'realtime' },
      { id: 'sovereignty_validator', mode: 'realtime' },
      { id: 'carbon_tracker', mode: 'batch' },
      { id: 'financial_engine', mode: 'batch' },
    ],
    workflowNodes: [
      {
        type: 'ingest',
        name: 'Telemetry Ingestion',
        description: 'Ingest telemetry from all 9 domain twins',
      },
      {
        type: 'compute',
        name: 'Anomaly Detection',
        description: 'AI-powered anomaly detection and forecasting',
      },
      {
        type: 'decision',
        name: 'Alert Classification',
        description: 'Smart alerting with severity classification',
      },
      {
        type: 'human',
        name: 'NOC Approval',
        description: 'NOC operator approval for critical actions',
      },
      {
        type: 'action',
        name: 'Auto-Remediation',
        description: 'Automated remediation or escalation',
      },
    ],
  },
  
  blueprint: {
    process_mirrored: 'Data Centre Operations & Infrastructure Management',
    event_triggers: ['Thermal anomaly', 'Power fluctuation', 'Cooling inefficiency', 'GPU utilization spike', 'Sovereignty violation', 'Carbon threshold exceeded'],
    kpis: [
      { name: 'Power Usage Effectiveness', metric: 'ratio', target: 1.2 },
      { name: 'GPU Cluster Utilization', metric: 'percentage', target: 85 },
      { name: 'Thermal Stability Score', metric: 'score', target: 95 },
      { name: 'Sovereign Compute Ratio', metric: 'percentage', target: 100 },
      { name: 'Carbon Efficiency', metric: 'gCO2/kWh', target: 50 },
      { name: 'UPS Health Index', metric: 'percentage', target: 99 },
      { name: 'Network Fabric Saturation', metric: 'percentage', target: 60 },
      { name: 'Cooling Efficiency Ratio', metric: 'ratio', target: 0.8 },
    ],
    integrations: ['Prometheus', 'SNMP', 'DCIM', 'Slurm/K8s', 'Carbon APIs', 'Energy Providers', 'Vertex AI'],
  },
  
  kpi_definitions: {
    pue: { name: 'PUE', target: 1.2, unit: 'ratio' },
    gpuUtilization: { name: 'GPU Utilization', target: 85, unit: '%' },
    thermalStability: { name: 'Thermal Stability', target: 95, unit: 'score' },
    sovereignCompute: { name: 'Sovereign Compute', target: 100, unit: '%' },
    carbonEfficiency: { name: 'Carbon Efficiency', target: 50, unit: 'gCO2/kWh' },
  },
  
  metrics_defaults: {
    time_saved_per_run_min: 45,
    runs_per_week: 168,
    loaded_cost_per_hour: 150,
    accuracy_improvement_pct: 35,
    cost_per_error: 25000,
  },
};

// Alias for backward compatibility
export const inventoryOptimizationTemplate = dataCentreDigitalTwinTemplate;
export const customerSupportTemplate = dataCentreDigitalTwinTemplate;
export const minimalTemplate = dataCentreDigitalTwinTemplate;
