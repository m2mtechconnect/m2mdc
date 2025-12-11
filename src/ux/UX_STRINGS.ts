/**
 * M2M Agentic Studio - Unified UX Language System
 * 
 * All UX content must be imported from this file.
 * No component may use hardcoded UX strings.
 * 
 * Tone: Technical, concise, high-density, outcomes-focused, 
 * sovereignty-aware, sustainability-aware, executive-grade.
 */

// =============================================================================
// GLOBAL
// =============================================================================

export const GLOBAL = {
  PRODUCT_NAME: 'M2M Agentic Studio',
  TWIN_SUFFIX: 'Sovereign Green AI Data Centre Twin',
  
  // Common action verbs
  ACTIONS: {
    SIMULATE: 'Simulate',
    FORECAST: 'Forecast',
    OPTIMIZE: 'Optimize',
    ENFORCE: 'Enforce',
    MODEL: 'Model',
    QUANTIFY: 'Quantify',
    EVALUATE: 'Evaluate',
    PREDICT: 'Predict',
  },
  
  // Core themes to embed
  THEMES: ['energy', 'emissions', 'sovereignty', 'cost', 'carbon', 'risk'],
} as const;

// =============================================================================
// OVERVIEW TAB
// =============================================================================

export const OVERVIEW = {
  TITLE: 'Data Centre Command',
  SUBTITLE: 'Sovereign Green AI Data Centre Operations',
  
  PURPOSE_STATEMENT: 
    'Simulate energy, carbon, sovereignty, and GPU-capacity outcomes for the selected data centre. Live indicators for PUE, carbon intensity, renewable mix, and sovereign compute.',
  
  BUSINESS_IMPACT: 
    'Quantify energy savings, carbon reduction, sovereignty compliance, and GPU utilization improvements under different operational or regulatory conditions.',
  
  KEY_METRICS: {
    ROI_IMPACT: 'Projected ROI Impact',
    EFFICIENCY_GAIN: 'Operational Efficiency Gain',
    GREEN_ENERGY: 'Green Energy Share',
    COMPUTE_CAPACITY: 'Rated Compute Capacity',
  },
  
  QUICK_ACTIONS: {
    RUN_SIMULATION: 'Run Simulation',
    VIEW_BLUEPRINT: 'View System Blueprint',
    MANAGE_AGENTS: 'Manage Subsystem Agents',
    REVIEW_KPIs: 'Review KPI Dashboard',
  },
  
  EMPTY_STATE: {
    NO_TWIN: 'No data centre twin selected. Scan a website or create a new twin to begin.',
    NO_DATA: 'Awaiting telemetry. Connect data sources to populate live metrics.',
  },
} as const;

// =============================================================================
// BLUEPRINT TAB
// =============================================================================

export const BLUEPRINT = {
  TITLE: 'Design Blueprint',
  SUBTITLE: 'Authoritative System Configuration',
  
  INTRO: 
    'Full structural model of domains, agents, KPIs, workflows, scenarios, and sovereignty rules. Defines the authoritative configuration used for all simulations.',
  
  SECTIONS: {
    DOMAINS: 'Domain Architecture',
    AGENTS: 'Subsystem Agents',
    KPIS: 'Key Performance Indicators',
    WORKFLOWS: 'Automated Workflows',
    SCENARIOS: 'Simulation Scenarios',
    DATA_SOURCES: 'Data Integrations',
  },
  
  ACTIONS: {
    DOWNLOAD_JSON: 'Download Blueprint JSON',
    EXPORT_AUDIT: 'Export for Audit',
    VIEW_CHANGELOG: 'View Change History',
  },
} as const;

// =============================================================================
// DOMAINS
// =============================================================================

export const DOMAINS = {
  thermal: {
    NAME: 'Thermal & Hardware',
    DESCRIPTION: 'Models server thermals, rack airflow, cooling capacity, and heat rejection.',
    ICON: 'thermometer',
  },
  power: {
    NAME: 'Power & UPS',
    DESCRIPTION: 'Tracks PDU load, UPS health, generator failover, and power redundancy.',
    ICON: 'zap',
  },
  cooling: {
    NAME: 'Cooling Systems',
    DESCRIPTION: 'Monitors CRAH/CRAC units, chiller performance, and refrigerant efficiency.',
    ICON: 'wind',
  },
  network: {
    NAME: 'Network Infrastructure',
    DESCRIPTION: 'Measures switch throughput, latency, packet loss, and firewall capacity.',
    ICON: 'network',
  },
  facility: {
    NAME: 'Facility & Safety',
    DESCRIPTION: 'Tracks ambient conditions, fire suppression, water detection, and physical security.',
    ICON: 'building',
  },
  workload: {
    NAME: 'Workload & GPU',
    DESCRIPTION: 'Schedules GPU jobs, balances training vs inference, and optimizes queue times.',
    ICON: 'cpu',
  },
  sovereignty: {
    NAME: 'Sovereignty & Compliance',
    DESCRIPTION: 'Tracks data residency, cross-border flows, policy enforcement, and regulatory thresholds.',
    ICON: 'shield',
  },
  financial: {
    NAME: 'Financial & Carbon',
    DESCRIPTION: 'Models energy cost, carbon exposure, renewable share, and financial trajectories.',
    ICON: 'dollar-sign',
  },
} as const;

export type DomainKey = keyof typeof DOMAINS;

// =============================================================================
// AGENTS
// =============================================================================

export const AGENTS = {
  SECTION_INTRO: 
    'Autonomous agents monitor domains, detect anomalies, and trigger automated responses. Each agent binds to specific KPIs and workflows to maintain operational stability.',
  
  ITEMS: {
    'thermal-guardian': {
      NAME: 'Thermal Guardian',
      SUMMARY: 'Predicts thermal drift and triggers cooling adjustments before throttling thresholds are breached.',
      DOMAIN: 'thermal',
    },
    'power-monitor': {
      NAME: 'Power & UPS Monitor',
      SUMMARY: 'Tracks power distribution, battery health, and failover readiness to ensure uninterrupted operations.',
      DOMAIN: 'power',
    },
    'cooling-optimizer': {
      NAME: 'Cooling Optimization Agent',
      SUMMARY: 'Predicts cooling inefficiencies and adjusts airflow/chiller usage to maintain thermal stability during load spikes.',
      DOMAIN: 'cooling',
    },
    'network-sentinel': {
      NAME: 'Network Sentinel',
      SUMMARY: 'Monitors switch saturation, latency spikes, and packet loss to maintain network reliability.',
      DOMAIN: 'network',
    },
    'facility-guardian': {
      NAME: 'Facility Guardian',
      SUMMARY: 'Detects environmental anomalies, fire risks, and water intrusion to protect physical infrastructure.',
      DOMAIN: 'facility',
    },
    'workload-orchestrator': {
      NAME: 'Workload Orchestrator',
      SUMMARY: 'Balances GPU workloads across racks, optimizes queue times, and prevents resource contention.',
      DOMAIN: 'workload',
    },
    'sovereignty-sentinel': {
      NAME: 'Sovereignty Sentinel',
      SUMMARY: 'Detects cross-border data flows and enforces regional data-processing constraints.',
      DOMAIN: 'sovereignty',
    },
    'carbon-optimizer': {
      NAME: 'Carbon & Cost Optimizer',
      SUMMARY: 'Forecasts emissions and cost exposure based on workload, grid mix, and renewable penetration.',
      DOMAIN: 'financial',
    },
    'incident-response': {
      NAME: 'Incident Response Agent',
      SUMMARY: 'Coordinates automated responses to critical alerts across thermal, power, and sovereignty domains.',
      DOMAIN: 'facility',
    },
  },
} as const;

export type AgentKey = keyof typeof AGENTS.ITEMS;

// =============================================================================
// KPIs
// =============================================================================

export const KPIS = {
  SECTION_INTRO: 
    'Key Performance Indicators validate energy, carbon, sovereignty, and operational thresholds. Each KPI defines targets, alerts, and owner accountability.',
  
  ITEMS: {
    'effective-ai-pue': {
      NAME: 'Effective AI PUE',
      DESCRIPTION: 'Measures power efficiency across compute and facility infrastructure.',
      UNIT: 'ratio',
      DIRECTION: 'lower_is_better',
    },
  'gco2-per-gpu-hour': {
    NAME: 'Carbon Intensity',
    DESCRIPTION: 'Tracks emissions per compute unit; essential for green-build modeling.',
    UNIT: 'gCO₂/GPU-hr',
    DIRECTION: 'lower_is_better',
  },
  'sovereign-compute-ratio': {
    NAME: 'Sovereign Compute Ratio',
    DESCRIPTION: 'Indicates the percentage of compute processed within sovereign boundaries.',
    UNIT: '%',
    DIRECTION: 'higher_is_better',
  },
  'renewable-share': {
    NAME: 'Renewable Energy Share',
    DESCRIPTION: 'Measures the proportion of energy sourced from renewable generation.',
    UNIT: '%',
    DIRECTION: 'higher_is_better',
  },
  'uptime': {
    NAME: 'System Uptime',
    DESCRIPTION: 'Critical for assessing operational reliability and SLA compliance.',
    UNIT: '%',
    DIRECTION: 'higher_is_better',
  },
  'gpu-utilization': {
    NAME: 'GPU Fleet Utilization',
    DESCRIPTION: 'Measures compute efficiency across the GPU fleet.',
    UNIT: '%',
    DIRECTION: 'higher_is_better',
  },
  'thermal-stability': {
    NAME: 'Thermal Stability Index',
    DESCRIPTION: 'Used to validate thermal thresholds and cooling effectiveness.',
    UNIT: 'index',
    DIRECTION: 'higher_is_better',
  },
  'power-redundancy': {
    NAME: 'Power Redundancy Level',
    DESCRIPTION: 'Indicates failover capacity and power infrastructure resilience.',
    UNIT: 'N+',
    DIRECTION: 'higher_is_better',
  },
  'cooling-efficiency': {
    NAME: 'Cooling Efficiency',
    DESCRIPTION: 'Measures cooling system effectiveness relative to heat load.',
    UNIT: 'kW/kW',
    DIRECTION: 'higher_is_better',
  },
    'carbon-cost-exposure': {
      NAME: 'Carbon Cost Exposure',
      DESCRIPTION: 'Quantifies financial risk from carbon pricing and regulatory changes.',
      UNIT: 'USD',
      DIRECTION: 'lower_is_better',
    },
  },
} as const;

export type KPIKey = keyof typeof KPIS.ITEMS;

// =============================================================================
// WORKFLOWS
// =============================================================================

export const WORKFLOWS = {
  SECTION_INTRO: 
    'Automated operational controls for thermal response, GPU orchestration, power stability, and sovereignty enforcement. Event-driven rules that mitigate risk and improve resilience.',
  
  ITEMS: {
    'thermal-response': {
      NAME: 'Thermal Response Workflow',
      DESCRIPTION: 'Triggers cooling adjustments when rack temperatures exceed thresholds.',
      TRIGGER: 'Rack inlet temp > 28°C',
      ACTION: 'Increase CRAH fan speed, redistribute workloads',
      IMPACT: 'Prevents GPU throttling and extends hardware lifespan',
      RISK_IF_FAILS: 'Thermal runaway, equipment damage, unplanned downtime',
    },
    'gpu-orchestration': {
      NAME: 'GPU Orchestration Workflow',
      DESCRIPTION: 'Balances training and inference workloads across available GPU capacity.',
      TRIGGER: 'Queue depth > threshold OR GPU utilization imbalance',
      ACTION: 'Rebalance jobs, defer low-priority training',
      IMPACT: 'Maximizes GPU utilization and reduces queue times',
      RISK_IF_FAILS: 'SLA breaches, revenue loss, customer churn',
    },
    'power-failover': {
      NAME: 'Power Failover Workflow',
      DESCRIPTION: 'Initiates UPS and generator failover during power anomalies.',
      TRIGGER: 'Utility power loss OR voltage sag',
      ACTION: 'Transfer to UPS, start generators, shed non-critical loads',
      IMPACT: 'Maintains continuous operations during grid instability',
      RISK_IF_FAILS: 'Data loss, service interruption, hardware corruption',
    },
    'sovereignty-enforcement': {
      NAME: 'Sovereignty Enforcement Workflow',
      DESCRIPTION: 'Blocks or reroutes data flows that violate residency policies.',
      TRIGGER: 'Cross-border data transfer detected',
      ACTION: 'Block transfer, alert compliance team, log violation',
      IMPACT: 'Ensures regulatory compliance and data sovereignty',
      RISK_IF_FAILS: 'Regulatory fines, data breaches, reputational damage',
    },
    'carbon-optimization': {
      NAME: 'Carbon Optimization Workflow',
      DESCRIPTION: 'Shifts workloads to periods of higher renewable grid mix.',
      TRIGGER: 'Grid carbon intensity > threshold',
      ACTION: 'Defer deferrable jobs, scale down non-critical workloads',
      IMPACT: 'Reduces carbon footprint and improves sustainability metrics',
      RISK_IF_FAILS: 'Missed sustainability targets, increased carbon costs',
    },
  },
} as const;

export type WorkflowKey = keyof typeof WORKFLOWS.ITEMS;

// =============================================================================
// SCENARIOS
// =============================================================================

export const SCENARIOS = {
  SECTION_INTRO: 
    'Stress-test operational resilience, forecast energy and carbon outcomes, and quantify financial impact under various conditions.',
  
  ITEMS: {
    'gpu-spike': {
      NAME: 'GPU Load Spike',
      DESCRIPTION: 'Simulate rapid GPU load surges and observe thermal drift, throttling risk, and carbon impact.',
      SEVERITY: 'high',
      CATEGORY: 'workload',
      DURATION: '30 min',
    },
    'cooling-failure': {
      NAME: 'Cooling System Failure',
      DESCRIPTION: 'Model sudden cooling loss and predict failure cascades across racks and workloads.',
      SEVERITY: 'critical',
      CATEGORY: 'cooling',
      DURATION: '15 min',
    },
    'carbon-price-shock': {
      NAME: 'Carbon Price Shock',
      DESCRIPTION: 'Quantify operational cost exposure as carbon price increases abruptly.',
      SEVERITY: 'medium',
      CATEGORY: 'financial',
      DURATION: '24 hr',
    },
    'grid-instability': {
      NAME: 'Grid Instability',
      DESCRIPTION: 'Evaluate resilience during renewable fluctuation or brownout conditions.',
      SEVERITY: 'high',
      CATEGORY: 'power',
      DURATION: '60 min',
    },
    'sovereignty-breach': {
      NAME: 'Sovereignty Breach Attempt',
      DESCRIPTION: 'Test detection and response to unauthorized cross-border data routing.',
      SEVERITY: 'critical',
      CATEGORY: 'sovereignty',
      DURATION: '5 min',
    },
    'thermal-runaway': {
      NAME: 'Thermal Runaway',
      DESCRIPTION: 'Model cascading thermal failures from hot aisle containment breach.',
      SEVERITY: 'critical',
      CATEGORY: 'thermal',
      DURATION: '20 min',
    },
    'power-outage': {
      NAME: 'Extended Power Outage',
      DESCRIPTION: 'Simulate prolonged utility failure and evaluate UPS/generator endurance.',
      SEVERITY: 'critical',
      CATEGORY: 'power',
      DURATION: '4 hr',
    },
    'network-saturation': {
      NAME: 'Network Saturation',
      DESCRIPTION: 'Test network resilience under extreme traffic loads and DDoS conditions.',
      SEVERITY: 'high',
      CATEGORY: 'network',
      DURATION: '30 min',
    },
  },
} as const;

export type ScenarioKey = keyof typeof SCENARIOS.ITEMS;

// =============================================================================
// SIMULATION TAB
// =============================================================================

export const SIMULATION = {
  TITLE: 'Scenario Simulation',
  SUBTITLE: 'Stress-Test & Impact Modeling',
  
  INTRO: 
    'Run stress tests, model failure cascades, forecast energy/carbon outcomes, and quantify financial + sovereignty impact. Uses an immutable design snapshot for reproducibility.',
  
  SECTIONS: {
    KPI_OVERLAY: 'Multi-KPI Performance Model',
    KPI_OVERLAY_DESC: 'Compare thermal, energy, carbon, utilization, and sovereignty metrics over time.',
    
    COMPARE_MODE: 'Scenario Comparison',
    COMPARE_MODE_DESC: 'Evaluate impact differences across cost, carbon, uptime, and operational risk.',
    
    LIVE_INSIGHTS: 'Live System Intelligence',
    LIVE_INSIGHTS_DESC: 'Predict failures, recommend mitigations, and surface KPI deviations during simulation.',
  },
  
  CONTROLS: {
    RUN: 'Run Simulation',
    PAUSE: 'Pause',
    RESUME: 'Resume',
    RESET: 'Reset',
    SPEED: 'Playback Speed',
  },
  
  STATUS: {
    READY: 'Ready to simulate',
    RUNNING: 'Simulation in progress',
    PAUSED: 'Simulation paused',
    COMPLETED: 'Simulation complete',
    FAILED: 'Simulation failed',
  },
  
  SNAPSHOT: {
    BADGE: 'Design Snapshot',
    TOOLTIP: 'Simulation runs against a frozen design snapshot. Configuration changes must be made in the Blueprint Designer.',
  },
  
  RESULT: {
    KPI_SUMMARY: 'KPI Summary',
    RCA_TITLE: 'Root Cause Analysis',
    ACTIONS_TITLE: 'Recommended Actions',
    IMPROVEMENTS: 'Improvements',
    DEGRADATIONS: 'Degradations',
    ACTUAL_VS_EXPECTED: 'Actual vs Expected Impact',
    NO_RCA: 'No root cause analysis available for this scenario.',
    NO_ACTIONS: 'No specific recommendations for this scenario.',
  },
} as const;

// =============================================================================
// SCANNER & RECOMMENDER
// =============================================================================

export const SCANNER = {
  TITLE: 'Green Data Centre Twin Scanner',
  PLACEHOLDER: 'Enter website URL to analyze...',
  
  SCANNING: 'Analyzing website for industry, mission, and sustainability signals...',
  
  RECOMMENDATION_INTRO: (companyName: string) => 
    `${companyName} Sovereign Green AI Data Centre Twin.`,
  
  RECOMMENDATION_BODY: 
    'Simulate energy, emissions, sovereignty, and GPU-capacity outcomes. Use prebuilt scenarios (GPU spikes, cooling faults, carbon shocks) to quantify operational, financial, and sustainability impact.',
  
  ACTIONS: {
    CREATE_TWIN: 'Create Twin',
    CUSTOMIZE: 'Customize in Builder',
    RESCAN: 'Re-scan Website',
  },
  
  DETECTED: {
    INDUSTRY: 'Detected Industry',
    CAPACITY: 'Recommended Capacity',
    TIER: 'Infrastructure Tier',
    PROFILE: 'Blueprint Profile',
  },
} as const;

// =============================================================================
// BUILDER
// =============================================================================

export const BUILDER = {
  STEPS: {
    STEP_1: {
      NAME: 'Business Profile',
      TITLE: 'Data Centre Twin Configuration',
      SUBTITLE: 'Configure your Sovereign Green AI Data Centre Twin',
      DESCRIPTION: 'Define facility location, capacity, and sustainability targets.',
    },
    STEP_2: {
      NAME: 'Capabilities',
      DESCRIPTION: 'Configure KPI thresholds and enable subsystem agents.',
    },
    STEP_3: {
      NAME: 'AI & Integrations',
      DESCRIPTION: 'Set intelligence model and connect data sources.',
    },
    STEP_4: {
      NAME: 'Scenarios & Workflows',
      DESCRIPTION: 'Enable simulation scenarios and automated workflows.',
    },
    STEP_5: {
      NAME: 'Deployment & Financials',
      DESCRIPTION: 'Select cloud region and configure financial model.',
    },
  },
  
  ACTIONS: {
    SAVE_DRAFT: 'Save Draft',
    DEPLOY: 'Deploy Twin',
    PREVIEW: 'Preview Configuration',
  },
} as const;

// =============================================================================
// COPILOT
// =============================================================================

export const COPILOT = {
  TITLE: 'Data Centre Co-Pilot',
  
  PERSONAS: {
    DESIGNER: {
      NAME: 'Design Assistant',
      INTRO: 'I help you configure domains, agents, KPIs, and workflows. Ask about blueprint design, agent capabilities, or scenario planning.',
    },
    ANALYST: {
      NAME: 'Run Analyst',
      INTRO: 'I analyze simulation results, explain KPI trends, and recommend operational improvements.',
    },
  },
  
  PLACEHOLDER: 'Ask about PUE, cooling, GPU saturation, carbon, or sovereignty...',
  
  QUICK_ACTIONS: {
    EXPLAIN_KPI: 'Explain this KPI',
    SUGGEST_AGENT: 'Suggest an agent',
    ANALYZE_TREND: 'Analyze this trend',
    RECOMMEND_SCENARIO: 'Recommend a scenario',
  },
} as const;

// =============================================================================
// EMPTY STATES
// =============================================================================

export const EMPTY_STATES = {
  NO_AGENTS: 'No agents configured. Add subsystem agents to enable automated operations.',
  NO_KPIS: 'No KPIs enabled. Configure KPIs to track operational performance.',
  NO_WORKFLOWS: 'No workflows active. Enable workflows to automate event-driven responses.',
  NO_SCENARIOS: 'No scenarios defined. Add scenarios to stress-test your twin.',
  NO_DATA: 'Awaiting data. Connect telemetry sources to populate metrics.',
  NO_RESULTS: 'No simulation results. Run a scenario to generate performance data.',
  SCENARIOS: 'No scenarios found.',
  SCENARIO_DETAIL: 'Select a scenario to view details',
} as const;

// =============================================================================
// BUTTONS & LABELS
// =============================================================================

export const BUTTONS = {
  CREATE: 'Create',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  EDIT: 'Edit',
  VIEW: 'View',
  DOWNLOAD: 'Download',
  EXPORT: 'Export',
  IMPORT: 'Import',
  REFRESH: 'Refresh',
  CLOSE: 'Close',
  APPLY: 'Apply',
  CONFIRM: 'Confirm',
  BACK: 'Back',
  NEXT: 'Next',
  FINISH: 'Finish',
} as const;

// =============================================================================
// TOOLTIPS
// =============================================================================

export const TOOLTIPS = {
  PUE: 'Power Usage Effectiveness - ratio of total facility power to IT equipment power. Lower is better.',
  CARBON_INTENSITY: 'Grams of CO₂ emitted per GPU-hour of compute. Critical for sustainability reporting.',
  SOVEREIGN_COMPUTE: 'Percentage of compute workloads processed within sovereign data boundaries.',
  RENEWABLE_SHARE: 'Proportion of energy from renewable sources (solar, wind, hydro).',
  SIMULATION_SNAPSHOT: 'Simulations run against a frozen blueprint snapshot to ensure reproducibility.',
} as const;

// =============================================================================
// INDUSTRY-SPECIFIC
// =============================================================================

export const INDUSTRIES = {
  finance: {
    NAME: 'Financial Services',
    TWIN_INTRO: 'Optimize trading infrastructure, ensure regulatory compliance, and model carbon exposure for financial operations.',
  },
  government: {
    NAME: 'Government & Public Sector',
    TWIN_INTRO: 'Enforce data sovereignty, ensure regulatory compliance, and optimize energy consumption for public sector operations.',
  },
  retail: {
    NAME: 'Retail & E-commerce',
    TWIN_INTRO: 'Optimize edge compute, cold-chain energy, and supply chain sovereignty for retail operations.',
  },
  telecom: {
    NAME: 'Telecommunications',
    TWIN_INTRO: 'Model network infrastructure, optimize edge deployments, and ensure service availability.',
  },
  cloud_saas: {
    NAME: 'Cloud & SaaS',
    TWIN_INTRO: 'Optimize multi-tenant infrastructure, model scaling scenarios, and minimize carbon footprint.',
  },
  manufacturing: {
    NAME: 'Manufacturing & Industrial',
    TWIN_INTRO: 'Integrate IT/OT systems, optimize industrial compute, and ensure operational continuity.',
  },
  healthcare: {
    NAME: 'Healthcare & Life Sciences',
    TWIN_INTRO: 'Ensure HIPAA compliance, protect patient data sovereignty, and optimize research compute.',
  },
  energy: {
    NAME: 'Energy & Utilities',
    TWIN_INTRO: 'Model grid integration, optimize renewable consumption, and forecast carbon trajectories.',
  },
  ai_compute: {
    NAME: 'AI & High-Performance Computing',
    TWIN_INTRO: 'Optimize GPU fleet utilization, model training workloads, and minimize carbon per compute cycle.',
  },
  other: {
    NAME: 'General Enterprise',
    TWIN_INTRO: 'Optimize data centre operations, model sustainability outcomes, and ensure operational resilience.',
  },
} as const;

export type IndustryKey = keyof typeof INDUSTRIES;
