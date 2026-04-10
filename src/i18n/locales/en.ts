/**
 * English locale — mirrors UX_STRINGS structure for i18n
 */

const en = {
  // Global
  global: {
    productName: 'M2M Agentic Studio',
    twinSuffix: 'Sovereign Green AI Data Centre Twin',
    actions: {
      simulate: 'Simulate',
      forecast: 'Forecast',
      optimize: 'Optimize',
      enforce: 'Enforce',
      model: 'Model',
      quantify: 'Quantify',
      evaluate: 'Evaluate',
      predict: 'Predict',
    },
  },

  // Navigation & Layout
  nav: {
    overview: 'Overview',
    blueprint: 'Blueprint',
    simulation: 'Simulation',
    agents: 'Agents',
    workflows: 'Workflows',
    deploy: 'Deploy',
    integrations: 'Integrations',
    compliance: 'Compliance',
    teams: 'Teams',
    marketplace: 'Marketplace',
    help: 'Help',
    settings: 'Settings',
    search: 'Search',
    dashboard: 'Dashboard',
    intelligence: 'Intelligence',
    builder: 'Builder',
    infrastructure: 'Infrastructure',
  },

  // Auth
  auth: {
    login: 'Login',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    forgotPassword: 'Forgot Password',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    resetPassword: 'Reset Password',
    sendResetLink: 'Send Reset Link',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    welcomeBack: 'Welcome back',
    getStarted: 'Get Started',
    loginSubtitle: 'Sign in to your Data Centre Twin',
    signUpSubtitle: 'Create your Sovereign Green AI Data Centre Twin',
  },

  // Landing Page
  landing: {
    heroTitle: 'Sovereign AI Data Centre Digital Twin',
    heroSubtitle: 'Simulate energy, carbon, sovereignty, and GPU-capacity outcomes for sustainable, compliant infrastructure operations.',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
    features: 'Features',
    useCases: 'Use Cases',
    integrations: 'Integrations',
    whyM2M: 'Why M2M',
    solutions: 'Solutions',
    product: 'Product',
    company: 'Company',
    resources: 'Resources',
    legal: 'Legal',
    enterpriseSolutions: 'Enterprise Solutions',
    enterpriseDesc: 'For CIOs, CTOs & data centre ops',
    sustainability: 'Sustainability',
    sustainabilityDesc: 'Carbon tracking & ESG reporting',
    clientLogin: 'Client Login',
    aboutM2M: 'About M2M Tech',
    ourTeam: 'Our Team',
    contactUs: 'Contact Us',
    careers: 'Careers',
    blog: 'Blog',
    caseStudies: 'Case Studies',
    documentation: 'Documentation',
    support: 'Support',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    security: 'Security',
    copyright: '© {{year}} M2M Tech Connect Inc. All rights reserved.',
    carbonNeutral: 'Carbon Neutral',
    madeInCanada: 'Made in Canada',
    footerDescription: 'Sovereign AI Data Centre Twins for sustainable, compliant infrastructure operations.',
  },

  // Overview Tab
  overview: {
    title: 'Data Centre Command',
    subtitle: 'Sovereign Green AI Data Centre Operations',
    purposeStatement: 'Simulate energy, carbon, sovereignty, and GPU-capacity outcomes for the selected data centre. Live indicators for PUE, carbon intensity, renewable mix, and sovereign compute.',
    businessImpact: 'Quantify energy savings, carbon reduction, sovereignty compliance, and GPU utilization improvements under different operational or regulatory conditions.',
    keyMetrics: {
      roiImpact: 'Projected ROI Impact',
      efficiencyGain: 'Operational Efficiency Gain',
      greenEnergy: 'Green Energy Share',
      computeCapacity: 'Rated Compute Capacity',
    },
    quickActions: {
      runSimulation: 'Run Simulation',
      viewBlueprint: 'View System Blueprint',
      manageAgents: 'Manage Subsystem Agents',
      reviewKPIs: 'Review KPI Dashboard',
    },
    emptyState: {
      noTwin: 'No data centre twin selected. Scan a website or create a new twin to begin.',
      noData: 'Awaiting telemetry. Connect data sources to populate live metrics.',
    },
  },

  // Blueprint Tab
  blueprint: {
    title: 'Design Blueprint',
    subtitle: 'Authoritative System Configuration',
    intro: 'Full structural model of domains, agents, KPIs, workflows, scenarios, and sovereignty rules. Defines the authoritative configuration used for all simulations.',
    sections: {
      domains: 'Domain Architecture',
      agents: 'Subsystem Agents',
      kpis: 'Key Performance Indicators',
      workflows: 'Automated Workflows',
      scenarios: 'Simulation Scenarios',
      dataSources: 'Data Integrations',
    },
    actions: {
      downloadJSON: 'Download Blueprint JSON',
      exportAudit: 'Export for Audit',
      viewChangelog: 'View Change History',
    },
  },

  // Domains
  domains: {
    thermal: { name: 'Thermal & Hardware', description: 'Models server thermals, rack airflow, cooling capacity, and heat rejection.' },
    power: { name: 'Power & UPS', description: 'Tracks PDU load, UPS health, generator failover, and power redundancy.' },
    cooling: { name: 'Cooling Systems', description: 'Monitors CRAH/CRAC units, chiller performance, and refrigerant efficiency.' },
    network: { name: 'Network Infrastructure', description: 'Measures switch throughput, latency, packet loss, and firewall capacity.' },
    facility: { name: 'Facility & Safety', description: 'Tracks ambient conditions, fire suppression, water detection, and physical security.' },
    workload: { name: 'Workload & GPU', description: 'Schedules GPU jobs, balances training vs inference, and optimizes queue times.' },
    sovereignty: { name: 'Sovereignty & Compliance', description: 'Tracks data residency, cross-border flows, policy enforcement, and regulatory thresholds.' },
    financial: { name: 'Financial & Carbon', description: 'Models energy cost, carbon exposure, renewable share, and financial trajectories.' },
  },

  // Agents
  agents: {
    sectionIntro: 'Autonomous agents monitor domains, detect anomalies, and trigger automated responses. Each agent binds to specific KPIs and workflows to maintain operational stability.',
    items: {
      'thermal-guardian': { name: 'Thermal Guardian', summary: 'Predicts thermal drift and triggers cooling adjustments before throttling thresholds are breached.' },
      'power-monitor': { name: 'Power & UPS Monitor', summary: 'Tracks power distribution, battery health, and failover readiness to ensure uninterrupted operations.' },
      'cooling-optimizer': { name: 'Cooling Optimization Agent', summary: 'Predicts cooling inefficiencies and adjusts airflow/chiller usage to maintain thermal stability during load spikes.' },
      'network-sentinel': { name: 'Network Sentinel', summary: 'Monitors switch saturation, latency spikes, and packet loss to maintain network reliability.' },
      'facility-guardian': { name: 'Facility Guardian', summary: 'Detects environmental anomalies, fire risks, and water intrusion to protect physical infrastructure.' },
      'workload-orchestrator': { name: 'Workload Orchestrator', summary: 'Balances GPU workloads across racks, optimizes queue times, and prevents resource contention.' },
      'sovereignty-sentinel': { name: 'Sovereignty Sentinel', summary: 'Detects cross-border data flows and enforces regional data-processing constraints.' },
      'carbon-optimizer': { name: 'Carbon & Cost Optimizer', summary: 'Forecasts emissions and cost exposure based on workload, grid mix, and renewable penetration.' },
      'incident-response': { name: 'Incident Response Agent', summary: 'Coordinates automated responses to critical alerts across thermal, power, and sovereignty domains.' },
    },
  },

  // KPIs
  kpis: {
    sectionIntro: 'Key Performance Indicators validate energy, carbon, sovereignty, and operational thresholds. Each KPI defines targets, alerts, and owner accountability.',
    items: {
      'effective-ai-pue': { name: 'Effective AI PUE', description: 'Measures power efficiency across compute and facility infrastructure.' },
      'gco2-per-gpu-hour': { name: 'Carbon Intensity', description: 'Tracks emissions per compute unit; essential for green-build modeling.' },
      'sovereign-compute-ratio': { name: 'Sovereign Compute Ratio', description: 'Indicates the percentage of compute processed within sovereign boundaries.' },
      'renewable-share': { name: 'Renewable Energy Share', description: 'Measures the proportion of energy sourced from renewable generation.' },
      'uptime': { name: 'System Uptime', description: 'Critical for assessing operational reliability and SLA compliance.' },
      'gpu-utilization': { name: 'GPU Fleet Utilization', description: 'Measures compute efficiency across the GPU fleet.' },
      'thermal-stability': { name: 'Thermal Stability Index', description: 'Used to validate thermal thresholds and cooling effectiveness.' },
      'power-redundancy': { name: 'Power Redundancy Level', description: 'Indicates failover capacity and power infrastructure resilience.' },
      'cooling-efficiency': { name: 'Cooling Efficiency', description: 'Measures cooling system effectiveness relative to heat load.' },
      'carbon-cost-exposure': { name: 'Carbon Cost Exposure', description: 'Quantifies financial risk from carbon pricing and regulatory changes.' },
    },
  },

  // Workflows
  workflows: {
    sectionIntro: 'Automated operational controls for thermal response, GPU orchestration, power stability, and sovereignty enforcement.',
    items: {
      'thermal-response': { name: 'Thermal Response Workflow', description: 'Triggers cooling adjustments when rack temperatures exceed thresholds.' },
      'gpu-orchestration': { name: 'GPU Orchestration Workflow', description: 'Balances training and inference workloads across available GPU capacity.' },
      'power-failover': { name: 'Power Failover Workflow', description: 'Initiates UPS and generator failover during power anomalies.' },
      'sovereignty-enforcement': { name: 'Sovereignty Enforcement Workflow', description: 'Blocks or reroutes data flows that violate residency policies.' },
      'carbon-optimization': { name: 'Carbon Optimization Workflow', description: 'Shifts workloads to periods of higher renewable grid mix.' },
    },
  },

  // Scenarios
  scenarios: {
    sectionIntro: 'Stress-test operational resilience, forecast energy and carbon outcomes, and quantify financial impact under various conditions.',
    items: {
      'gpu-spike': { name: 'GPU Load Spike', description: 'Simulate rapid GPU load surges and observe thermal drift, throttling risk, and carbon impact.' },
      'cooling-failure': { name: 'Cooling System Failure', description: 'Model sudden cooling loss and predict failure cascades across racks and workloads.' },
      'carbon-price-shock': { name: 'Carbon Price Shock', description: 'Quantify operational cost exposure as carbon price increases abruptly.' },
      'grid-instability': { name: 'Grid Instability', description: 'Evaluate resilience during renewable fluctuation or brownout conditions.' },
      'sovereignty-breach': { name: 'Sovereignty Breach Attempt', description: 'Test detection and response to unauthorized cross-border data routing.' },
      'thermal-runaway': { name: 'Thermal Runaway', description: 'Model cascading thermal failures from hot aisle containment breach.' },
      'power-outage': { name: 'Extended Power Outage', description: 'Simulate prolonged utility failure and evaluate UPS/generator endurance.' },
      'network-saturation': { name: 'Network Saturation', description: 'Test network resilience under extreme traffic loads and DDoS conditions.' },
    },
  },

  // Simulation Tab
  simulation: {
    title: 'Scenario Simulation',
    subtitle: 'Stress-Test & Impact Modeling',
    intro: 'Run stress tests, model failure cascades, forecast energy/carbon outcomes, and quantify financial + sovereignty impact.',
    controls: {
      run: 'Run Simulation',
      pause: 'Pause',
      resume: 'Resume',
      reset: 'Reset',
      speed: 'Playback Speed',
    },
    status: {
      ready: 'Ready to simulate',
      running: 'Simulation in progress',
      paused: 'Simulation paused',
      completed: 'Simulation complete',
      failed: 'Simulation failed',
    },
  },

  // Scanner
  scanner: {
    title: 'Green Data Centre Twin Scanner',
    placeholder: 'Enter website URL to analyze...',
    scanning: 'Analyzing website for industry, mission, and sustainability signals...',
    actions: {
      createTwin: 'Create Twin',
      customize: 'Customize in Builder',
      rescan: 'Re-scan Website',
    },
    detected: {
      industry: 'Detected Industry',
      capacity: 'Recommended Capacity',
      tier: 'Infrastructure Tier',
      profile: 'Blueprint Profile',
    },
  },

  // Builder
  builder: {
    steps: {
      step1: { name: 'Business Profile', title: 'Data Centre Twin Configuration', description: 'Define facility location, capacity, and sustainability targets.' },
      step2: { name: 'Capabilities', title: 'Blueprint Configuration', description: 'Configure KPI thresholds and enable subsystem agents.' },
      step3: { name: 'AI & Integrations', title: 'Integrations', description: 'Set intelligence model and connect data sources.' },
      step4: { name: 'Scenarios & Workflows', title: 'Workflows & Scenarios', description: 'Enable simulation scenarios and automated workflows.' },
      step5: { name: 'Deployment & Financials', title: 'Deployment Configuration', description: 'Select cloud region and configure financial model.' },
    },
    actions: {
      saveDraft: 'Save Draft',
      deploy: 'Deploy Twin',
      preview: 'Preview Configuration',
    },
  },

  // CoPilot
  copilot: {
    title: 'Data Centre Co-Pilot',
    placeholder: 'Ask about PUE, cooling, GPU saturation, carbon, or sovereignty...',
    quickActions: {
      explainKPI: 'Explain this KPI',
      suggestAgent: 'Suggest an agent',
      analyzeTrend: 'Analyze this trend',
      recommendScenario: 'Recommend a scenario',
    },
  },

  // Buttons & Common
  buttons: {
    create: 'Create',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    download: 'Download',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    close: 'Close',
    apply: 'Apply',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
  },

  // Tooltips
  tooltips: {
    pue: 'Power Usage Effectiveness - ratio of total facility power to IT equipment power. Lower is better.',
    carbonIntensity: 'Grams of CO₂ emitted per GPU-hour of compute. Critical for sustainability reporting.',
    sovereignCompute: 'Percentage of compute workloads processed within sovereign data boundaries.',
    renewableShare: 'Proportion of energy from renewable sources (solar, wind, hydro).',
    simulationSnapshot: 'Simulations run against a frozen blueprint snapshot to ensure reproducibility.',
  },

  // Industries
  industries: {
    finance: { name: 'Financial Services', twinIntro: 'Optimize trading infrastructure, ensure regulatory compliance, and model carbon exposure for financial operations.' },
    government: { name: 'Government & Public Sector', twinIntro: 'Enforce data sovereignty, ensure regulatory compliance, and optimize energy consumption for public sector operations.' },
    retail: { name: 'Retail & E-commerce', twinIntro: 'Optimize edge compute, cold-chain energy, and supply chain sovereignty for retail operations.' },
    telecom: { name: 'Telecommunications', twinIntro: 'Model network infrastructure, optimize edge deployments, and ensure service availability.' },
    cloud_saas: { name: 'Cloud & SaaS', twinIntro: 'Optimize multi-tenant infrastructure, model scaling scenarios, and minimize carbon footprint.' },
    manufacturing: { name: 'Manufacturing & Industrial', twinIntro: 'Integrate IT/OT systems, optimize industrial compute, and ensure operational continuity.' },
    healthcare: { name: 'Healthcare & Life Sciences', twinIntro: 'Ensure HIPAA compliance, protect patient data sovereignty, and optimize research compute.' },
    energy: { name: 'Energy & Utilities', twinIntro: 'Model grid integration, optimize renewable consumption, and forecast carbon trajectories.' },
    ai_compute: { name: 'AI & High-Performance Computing', twinIntro: 'Optimize GPU fleet utilization, model training workloads, and minimize carbon per compute cycle.' },
    other: { name: 'General Enterprise', twinIntro: 'Optimize data centre operations, model sustainability outcomes, and ensure operational resilience.' },
  },

  // Empty States
  emptyStates: {
    noAgents: 'No agents configured. Add subsystem agents to enable automated operations.',
    noKPIs: 'No KPIs enabled. Configure KPIs to track operational performance.',
    noWorkflows: 'No workflows active. Enable workflows to automate event-driven responses.',
    noScenarios: 'No scenarios defined. Add scenarios to stress-test your twin.',
    noData: 'Awaiting data. Connect telemetry sources to populate metrics.',
    noResults: 'No simulation results. Run a scenario to generate performance data.',
  },

  // Language selector
  language: {
    label: 'Language',
    en: 'English',
    'fr-CA': 'Français (Québec)',
  },
};

export default en;
