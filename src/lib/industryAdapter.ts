/**
 * Industry Adaptation Logic
 * Maps detected industries to universal TwinBlueprintBaseSchema configurations
 * 
 * INDUSTRY SOURCES:
 * - NAICS Industry Classification: https://www.census.gov/naics/
 * - GICS Industry Standards: https://www.msci.com/our-solutions/indexes/gics
 * - Digital Twin Vertical Applications: https://www.digitaltwinconsortium.org/
 * - Healthcare Compliance (HIPAA): https://www.hhs.gov/hipaa/
 * - Retail Digital Transformation: https://nrf.com/research-insights
 * - Financial Services Standards: https://www.iso.org/iso-20022-universal-financial-industry-message-scheme.html
 * - Manufacturing IIoT Standards: https://www.iiconsortium.org/
 * - Telecom Infrastructure: https://www.3gpp.org/specifications
 * - Energy Grid Standards: https://www.nerc.com/
 * - Government Compliance: https://www.canada.ca/en/government/system/digital-government.html
 * - Canadian Sovereignty: https://www.canada.ca/en/treasury-board-secretariat/services/access-information-privacy.html
 */

import type { 
  TwinBlueprintBaseSchema, 
  TwinDomain, 
  TwinAgent, 
  TwinKPI, 
  TwinWorkflow, 
  TwinScenario,
  DataCentreBlueprintExtension,
  HealthcareBlueprintExtension,
  RetailBlueprintExtension 
} from '@/types/twinBlueprintSchema';

// Supported industries
export type SupportedIndustry = 
  | 'data_centre'
  | 'healthcare'
  | 'retail'
  | 'finance'
  | 'manufacturing'
  | 'telecom'
  | 'energy'
  | 'government'
  | 'education'
  | 'generic';

// Industry detection patterns
const INDUSTRY_PATTERNS: Record<SupportedIndustry, RegExp[]> = {
  data_centre: [/cloud|hosting|colocation|data.?cent|server|compute/i],
  healthcare: [/hospital|clinic|health|medical|pharma|patient|hipaa/i],
  retail: [/shop|store|retail|ecommerce|walmart|costco|target|amazon/i],
  finance: [/bank|finance|insurance|trading|investment|fintech/i],
  manufacturing: [/factory|manufactur|industrial|iiot|production/i],
  telecom: [/telecom|mobile|5g|network|carrier|wireless/i],
  energy: [/energy|power|utility|grid|solar|wind|renewable/i],
  government: [/gov|government|federal|provincial|municipal|public/i],
  education: [/university|college|school|education|research|academic/i],
  generic: [/.*/],
};

// Detect industry from URL/content
export function detectIndustry(url: string, content?: string): SupportedIndustry {
  const searchText = `${url} ${content || ''}`.toLowerCase();
  
  for (const [industry, patterns] of Object.entries(INDUSTRY_PATTERNS)) {
    if (industry === 'generic') continue;
    if (patterns.some(p => p.test(searchText))) {
      return industry as SupportedIndustry;
    }
  }
  
  return 'generic';
}

// Base domains that apply to all industries (with DC as foundation)
const BASE_DOMAINS: TwinDomain[] = [
  { id: 'infrastructure', name: 'Infrastructure', description: 'Physical infrastructure and facilities', icon: 'Building', color: 'blue', category: 'core', status: 'healthy', healthScore: 95, agentIds: [], kpiIds: [], workflowIds: [] },
  { id: 'operations', name: 'Operations', description: 'Operational processes and monitoring', icon: 'Activity', color: 'green', category: 'core', status: 'healthy', healthScore: 92, agentIds: [], kpiIds: [], workflowIds: [] },
  { id: 'security', name: 'Security', description: 'Security and compliance', icon: 'Shield', color: 'cyan', category: 'core', status: 'healthy', healthScore: 98, agentIds: [], kpiIds: [], workflowIds: [] },
  { id: 'sustainability', name: 'Sustainability', description: 'Environmental and carbon management', icon: 'Leaf', color: 'emerald', category: 'core', status: 'healthy', healthScore: 88, agentIds: [], kpiIds: [], workflowIds: [] },
  { id: 'financial', name: 'Financial', description: 'Cost and financial optimization', icon: 'DollarSign', color: 'amber', category: 'core', status: 'healthy', healthScore: 90, agentIds: [], kpiIds: [], workflowIds: [] },
];

// Industry-specific domain additions
const INDUSTRY_DOMAINS: Partial<Record<SupportedIndustry, TwinDomain[]>> = {
  data_centre: [
    { id: 'thermal', name: 'Thermal', description: 'Temperature and cooling management', icon: 'Thermometer', color: 'red', category: 'dc', status: 'healthy', healthScore: 94, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'power', name: 'Power', description: 'Power distribution and UPS', icon: 'Zap', color: 'yellow', category: 'dc', status: 'healthy', healthScore: 97, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'cooling', name: 'Cooling', description: 'CRAH/CRAC and cooling systems', icon: 'Wind', color: 'cyan', category: 'dc', status: 'healthy', healthScore: 91, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'network', name: 'Network', description: 'Network fabric and connectivity', icon: 'Network', color: 'indigo', category: 'dc', status: 'healthy', healthScore: 99, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'workload', name: 'Workload', description: 'GPU/CPU workload scheduling', icon: 'Cpu', color: 'teal', category: 'dc', status: 'healthy', healthScore: 85, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'sovereignty', name: 'Sovereignty', description: 'Data residency and compliance', icon: 'Globe', color: 'teal', category: 'dc', status: 'healthy', healthScore: 100, agentIds: [], kpiIds: [], workflowIds: [] },
  ],
  healthcare: [
    { id: 'patient_data', name: 'Patient Data', description: 'PHI and patient data management', icon: 'Users', color: 'pink', category: 'healthcare', status: 'healthy', healthScore: 99, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'clinical', name: 'Clinical Systems', description: 'EHR and clinical applications', icon: 'Stethoscope', color: 'blue', category: 'healthcare', status: 'healthy', healthScore: 97, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'compliance', name: 'HIPAA Compliance', description: 'Healthcare regulatory compliance', icon: 'FileCheck', color: 'green', category: 'healthcare', status: 'healthy', healthScore: 100, agentIds: [], kpiIds: [], workflowIds: [] },
  ],
  retail: [
    { id: 'supply_chain', name: 'Supply Chain', description: 'Logistics and inventory', icon: 'Truck', color: 'orange', category: 'retail', status: 'healthy', healthScore: 88, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'edge_compute', name: 'Edge Compute', description: 'Store-level compute infrastructure', icon: 'Store', color: 'blue', category: 'retail', status: 'healthy', healthScore: 92, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'cold_chain', name: 'Cold Chain', description: 'Refrigeration and temperature control', icon: 'Snowflake', color: 'cyan', category: 'retail', status: 'healthy', healthScore: 95, agentIds: [], kpiIds: [], workflowIds: [] },
  ],
  finance: [
    { id: 'trading', name: 'Trading Systems', description: 'Low-latency trading infrastructure', icon: 'TrendingUp', color: 'green', category: 'finance', status: 'healthy', healthScore: 99, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'regulatory', name: 'Regulatory', description: 'Financial regulatory compliance', icon: 'Scale', color: 'teal', category: 'finance', status: 'healthy', healthScore: 100, agentIds: [], kpiIds: [], workflowIds: [] },
    { id: 'risk', name: 'Risk Management', description: 'Risk monitoring and mitigation', icon: 'AlertTriangle', color: 'amber', category: 'finance', status: 'healthy', healthScore: 96, agentIds: [], kpiIds: [], workflowIds: [] },
  ],
};

// Industry-specific KPIs
const INDUSTRY_KPIS: Partial<Record<SupportedIndustry, Partial<TwinKPI>[]>> = {
  data_centre: [
    { id: 'pue', name: 'Power Usage Effectiveness', unit: '', target: 1.3, direction: 'lower_is_better', domain: 'power' },
    { id: 'gpu-utilization', name: 'GPU Utilization', unit: '%', target: 85, direction: 'higher_is_better', domain: 'workload' },
    { id: 'thermal-stability', name: 'Thermal Stability', unit: '%', target: 95, direction: 'higher_is_better', domain: 'thermal' },
    { id: 'uptime', name: 'Uptime', unit: '%', target: 99.99, direction: 'higher_is_better', domain: 'operations' },
    { id: 'renewable-share', name: 'Renewable Energy Share', unit: '%', target: 80, direction: 'higher_is_better', domain: 'sustainability' },
    { id: 'carbon-intensity', name: 'Carbon Intensity', unit: 'kg/MWh', target: 50, direction: 'lower_is_better', domain: 'sustainability' },
  ],
  healthcare: [
    { id: 'phi-compliance', name: 'PHI Compliance Score', unit: '%', target: 100, direction: 'higher_is_better', domain: 'compliance' },
    { id: 'system-availability', name: 'Clinical System Availability', unit: '%', target: 99.99, direction: 'higher_is_better', domain: 'clinical' },
    { id: 'data-integrity', name: 'Data Integrity Score', unit: '%', target: 100, direction: 'higher_is_better', domain: 'patient_data' },
    { id: 'audit-readiness', name: 'Audit Readiness', unit: '%', target: 100, direction: 'higher_is_better', domain: 'compliance' },
  ],
  retail: [
    { id: 'edge-uptime', name: 'Edge Node Uptime', unit: '%', target: 99.5, direction: 'higher_is_better', domain: 'edge_compute' },
    { id: 'cold-chain-efficiency', name: 'Cold Chain Efficiency', unit: '%', target: 95, direction: 'higher_is_better', domain: 'cold_chain' },
    { id: 'inventory-accuracy', name: 'Inventory Accuracy', unit: '%', target: 99, direction: 'higher_is_better', domain: 'supply_chain' },
    { id: 'order-latency', name: 'Order Processing Latency', unit: 'ms', target: 200, direction: 'lower_is_better', domain: 'operations' },
  ],
  finance: [
    { id: 'trade-latency', name: 'Trade Execution Latency', unit: 'μs', target: 50, direction: 'lower_is_better', domain: 'trading' },
    { id: 'regulatory-compliance', name: 'Regulatory Compliance', unit: '%', target: 100, direction: 'higher_is_better', domain: 'regulatory' },
    { id: 'risk-exposure', name: 'Risk Exposure Index', unit: '', target: 0.1, direction: 'lower_is_better', domain: 'risk' },
    { id: 'transaction-success', name: 'Transaction Success Rate', unit: '%', target: 99.999, direction: 'higher_is_better', domain: 'operations' },
  ],
};

// Industry-specific agents
const INDUSTRY_AGENTS: Partial<Record<SupportedIndustry, Partial<TwinAgent>[]>> = {
  data_centre: [
    { id: 'thermal-guardian', slug: 'thermal-guardian', name: 'Thermal Guardian', domain: 'thermal', type: 'monitoring' },
    { id: 'power-optimizer', slug: 'power-optimizer', name: 'Power Optimizer', domain: 'power', type: 'optimizer' },
    { id: 'cooling-controller', slug: 'cooling-controller', name: 'Cooling Controller', domain: 'cooling', type: 'control' },
    { id: 'workload-scheduler', slug: 'workload-scheduler', name: 'Workload Scheduler', domain: 'workload', type: 'scheduler' },
    { id: 'sovereignty-sentinel', slug: 'sovereignty-sentinel', name: 'Sovereignty Sentinel', domain: 'sovereignty', type: 'monitoring' },
    { id: 'carbon-tracker', slug: 'carbon-tracker', name: 'Carbon Tracker', domain: 'sustainability', type: 'monitoring' },
    { id: 'incident-responder', slug: 'incident-responder', name: 'Incident Responder', domain: 'operations', type: 'responder' },
  ],
  healthcare: [
    { id: 'phi-guardian', slug: 'phi-guardian', name: 'PHI Guardian', domain: 'patient_data', type: 'monitoring' },
    { id: 'compliance-monitor', slug: 'compliance-monitor', name: 'HIPAA Compliance Monitor', domain: 'compliance', type: 'monitoring' },
    { id: 'clinical-optimizer', slug: 'clinical-optimizer', name: 'Clinical System Optimizer', domain: 'clinical', type: 'optimizer' },
  ],
  retail: [
    { id: 'edge-monitor', slug: 'edge-monitor', name: 'Edge Node Monitor', domain: 'edge_compute', type: 'monitoring' },
    { id: 'cold-chain-optimizer', slug: 'cold-chain-optimizer', name: 'Cold Chain Optimizer', domain: 'cold_chain', type: 'optimizer' },
    { id: 'supply-chain-agent', slug: 'supply-chain-agent', name: 'Supply Chain Agent', domain: 'supply_chain', type: 'scheduler' },
  ],
  finance: [
    { id: 'latency-guardian', slug: 'latency-guardian', name: 'Latency Guardian', domain: 'trading', type: 'monitoring' },
    { id: 'compliance-auditor', slug: 'compliance-auditor', name: 'Regulatory Auditor', domain: 'regulatory', type: 'monitoring' },
    { id: 'risk-analyzer', slug: 'risk-analyzer', name: 'Risk Analyzer', domain: 'risk', type: 'monitoring' },
  ],
};

// Industry-specific scenarios
const INDUSTRY_SCENARIOS: Partial<Record<SupportedIndustry, Partial<TwinScenario>[]>> = {
  data_centre: [
    { id: 'gpu-spike', name: 'GPU Utilization Spike', category: 'workload', complexity: 'medium', estimatedDuration: 300 },
    { id: 'cooling-failure', name: 'CRAH Unit Failure', category: 'thermal', complexity: 'high', estimatedDuration: 600 },
    { id: 'power-grid-instability', name: 'Power Grid Instability', category: 'power', complexity: 'catastrophic', estimatedDuration: 900 },
    { id: 'sovereignty-violation', name: 'Data Routing Violation', category: 'sovereignty', complexity: 'high', estimatedDuration: 180 },
    { id: 'carbon-spike', name: 'Carbon Intensity Surge', category: 'sustainability', complexity: 'low', estimatedDuration: 120 },
  ],
  healthcare: [
    { id: 'phi-breach', name: 'Potential PHI Breach', category: 'security', complexity: 'catastrophic', estimatedDuration: 300 },
    { id: 'ehr-downtime', name: 'EHR System Downtime', category: 'clinical', complexity: 'high', estimatedDuration: 600 },
    { id: 'audit-alert', name: 'Compliance Audit Alert', category: 'compliance', complexity: 'medium', estimatedDuration: 180 },
  ],
  retail: [
    { id: 'edge-outage', name: 'Multi-Store Edge Outage', category: 'infrastructure', complexity: 'high', estimatedDuration: 300 },
    { id: 'cold-chain-breach', name: 'Cold Chain Temperature Breach', category: 'cold_chain', complexity: 'high', estimatedDuration: 180 },
    { id: 'supply-chain-disruption', name: 'Supply Chain Disruption', category: 'supply_chain', complexity: 'catastrophic', estimatedDuration: 900 },
  ],
  finance: [
    { id: 'latency-spike', name: 'Trading Latency Spike', category: 'trading', complexity: 'high', estimatedDuration: 60 },
    { id: 'regulatory-violation', name: 'Regulatory Violation Alert', category: 'regulatory', complexity: 'catastrophic', estimatedDuration: 300 },
    { id: 'market-volatility', name: 'Market Volatility Response', category: 'risk', complexity: 'medium', estimatedDuration: 180 },
  ],
};

/**
 * Generate a complete blueprint for a detected industry
 */
export function generateIndustryBlueprint(
  industry: SupportedIndustry,
  baseConfig: {
    name: string;
    region: string;
    city?: string;
    country?: string;
    capacity?: number;
  }
): TwinBlueprintBaseSchema {
  // Combine base domains with industry-specific domains
  const domains = [
    ...BASE_DOMAINS,
    ...(INDUSTRY_DOMAINS[industry] || []),
  ];

  // Get industry-specific entities
  const kpis = (INDUSTRY_KPIS[industry] || INDUSTRY_KPIS.data_centre || []).map((kpi, i) => ({
    ...kpi,
    id: kpi.id || `kpi-${i}`,
    name: kpi.name || 'Unnamed KPI',
    description: kpi.description || '',
    domain: kpi.domain || 'operations',
    category: 'performance',
    value: kpi.target || 0,
    unit: kpi.unit || '',
    direction: kpi.direction || 'higher_is_better',
    target: kpi.target || 0,
    warningThreshold: kpi.target ? kpi.target * 0.9 : 0,
    criticalThreshold: kpi.target ? kpi.target * 0.8 : 0,
    trend: 'stable' as const,
    trendValue: 0,
  })) as TwinKPI[];

  const agents = (INDUSTRY_AGENTS[industry] || INDUSTRY_AGENTS.data_centre || []).map((agent, i) => ({
    ...agent,
    id: agent.id || `agent-${i}`,
    slug: agent.slug || `agent-${i}`,
    name: agent.name || 'Unnamed Agent',
    description: agent.description || `${agent.name} agent for ${industry}`,
    domain: agent.domain || 'operations',
    type: agent.type || 'monitoring',
    status: 'active' as const,
    healthScore: 95,
    inputs: [],
    outputs: [],
    tools: [],
    kpiBindings: [],
  })) as TwinAgent[];

  const scenarios = (INDUSTRY_SCENARIOS[industry] || INDUSTRY_SCENARIOS.data_centre || []).map((scenario, i) => ({
    ...scenario,
    id: scenario.id || `scenario-${i}`,
    name: scenario.name || 'Unnamed Scenario',
    description: scenario.description || `${scenario.name} simulation`,
    category: scenario.category || 'operations',
    complexity: scenario.complexity || 'medium',
    complexityScore: scenario.complexity === 'catastrophic' ? 10 : scenario.complexity === 'high' ? 7 : scenario.complexity === 'medium' ? 4 : 2,
    kpisAffected: [],
    kpiDeltas: [],
    estimatedDuration: scenario.estimatedDuration || 300,
  })) as TwinScenario[];

  // Build industry extensions
  let industryExtensions: Record<string, unknown> = {};
  
  if (industry === 'data_centre') {
    const dcExt: DataCentreBlueprintExtension = {
      facilityType: 'enterprise',
      coolingType: 'hybrid',
      powerTopology: '2n',
      pueTarget: 1.3,
    };
    industryExtensions = { dataCentre: dcExt };
  } else if (industry === 'healthcare') {
    const hcExt: HealthcareBlueprintExtension = {
      facilityType: 'hospital',
      complianceFrameworks: ['HIPAA', 'PIPEDA'],
    };
    industryExtensions = { healthcare: hcExt };
  } else if (industry === 'retail') {
    const rtExt: RetailBlueprintExtension = {
      storeCount: 100,
      coldChainEnabled: true,
    };
    industryExtensions = { retail: rtExt };
  }

  return {
    metadata: {
      id: crypto.randomUUID(),
      name: baseConfig.name,
      description: `${industry} digital twin for ${baseConfig.name}`,
      industry,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      region: baseConfig.region,
      city: baseConfig.city,
      country: baseConfig.country || 'Canada',
      timezone: 'America/Toronto',
      capacityTier: baseConfig.capacity && baseConfig.capacity > 10000 ? 'hyperscale' : 
                    baseConfig.capacity && baseConfig.capacity > 5000 ? 'large' :
                    baseConfig.capacity && baseConfig.capacity > 1000 ? 'medium' : 'small',
      capacityValue: baseConfig.capacity,
      capacityUnit: 'kW',
    },
    domains,
    agents,
    dataSources: [],
    kpis,
    workflows: [],
    roles: [],
    scenarios,
    simulationModels: [],
    industryExtensions,
  };
}

/**
 * Map industry to recommended cloud regions (Canadian sovereignty focus)
 */
export function getRecommendedRegions(industry: SupportedIndustry): string[] {
  // Canadian sovereign regions prioritized
  const canadianRegions = ['ca-central-1', 'canadacentral', 'northamerica-northeast1'];
  
  switch (industry) {
    case 'government':
    case 'healthcare':
      // Strict Canadian sovereignty
      return canadianRegions;
    case 'finance':
      // Canadian primary with US backup
      return [...canadianRegions, 'us-east-1'];
    default:
      // Canadian primary with global options
      return [...canadianRegions, 'us-east-1', 'eu-west-1'];
  }
}

/**
 * Get industry-specific compliance frameworks
 */
export function getComplianceFrameworks(industry: SupportedIndustry): string[] {
  switch (industry) {
    case 'healthcare':
      return ['HIPAA', 'PIPEDA', 'PHIPA', 'SOC2'];
    case 'finance':
      return ['SOC2', 'PCI-DSS', 'OSFI', 'GDPR'];
    case 'government':
      return ['PBMM', 'FedRAMP', 'ITSG-33', 'SOC2'];
    case 'retail':
      return ['PCI-DSS', 'SOC2', 'GDPR', 'CCPA'];
    default:
      return ['SOC2', 'ISO27001'];
  }
}
