/**
 * Deterministic Mapping: Industry → Department → Agent / Process Twin / 3D Twin
 * STRICT: No guessing, no improvisation, exact matches only
 */

// 1. ALLOWED INDUSTRIES (exact match only)
export const ALLOWED_INDUSTRIES = [
  'Healthcare',
  'Energy',
  'Manufacturing',
  'Public Sector',
  'Maritime',
  'Agriculture',
  'Retail',
  'Real Estate',
  'Financial Services',
  'Insurance',
  'Transportation & Logistics',
  'Telecommunications',
  'Education',
  'Construction',
  'Hospitality & Tourism',
  'Mining & Natural Resources',
  'Technology & SaaS',
  'CPG',
  'Automotive',
  'Media & Entertainment',
] as const;

export type AllowedIndustry = (typeof ALLOWED_INDUSTRIES)[number];

// 2. ALLOWED DEPARTMENTS
export const ALLOWED_DEPARTMENTS = [
  'Operations',
  'Sales',
  'Marketing',
  'Finance',
  'Customer Support',
  'HR',
  'IT/Engineering',
  'Product',
  'Legal',
  'Supply Chain',
  'Risk & Compliance',
  'Procurement',
] as const;

export type AllowedDepartment = (typeof ALLOWED_DEPARTMENTS)[number];

// 3. TEMPLATE CATEGORIES
export type TemplateCategory = 'agent' | 'process_twin' | '3d_twin';

// 3A. AGENT TEMPLATES
export const AGENT_TEMPLATES = [
  'Marketing Automation Agent',
  'Sales Outreach Agent',
  'Customer Support Agent',
  'Compliance & Policy Agent',
  'Financial Analysis Agent',
  'HR Assistant Agent',
  'Supply Chain Monitoring Agent',
  'IT Automation Agent',
  'Procurement Workflow Agent',
  'Operations Efficiency Agent',
] as const;

// 3B. PROCESS TWIN TEMPLATES
export const PROCESS_TWIN_TEMPLATES = [
  'Real Estate Portfolio Twin',
  'Finance Risk Twin',
  'Insurance Claim Twin',
  'Retail Store Twin',
  'Logistics Network Twin',
  'Agriculture Yield Twin',
  'Public Sector Service Twin',
  'Media Content Twin',
  'Telecom Network Twin',
  'Education Success Twin',
  'SaaS Customer Lifecycle Twin',
  'Hospitality Guest Journey Twin',
] as const;

// 3C. 3D TWIN TEMPLATES
export const THREE_D_TWIN_TEMPLATES = [
  'Manufacturing Operations Twin',
  'Energy Grid Twin',
  'Maritime Fleet Twin',
  'Transportation Fleet Twin',
  'Construction Project Twin',
  'Mining Production Twin',
  'Automotive Dealership Twin',
  'Healthcare Facility Twin',
] as const;

type AgentTemplate = (typeof AGENT_TEMPLATES)[number];
type ProcessTwinTemplate = (typeof PROCESS_TWIN_TEMPLATES)[number];
type ThreeDTwinTemplate = (typeof THREE_D_TWIN_TEMPLATES)[number];

type AllowedTemplate = AgentTemplate | ProcessTwinTemplate | ThreeDTwinTemplate;

// MAPPING TABLE: Industry + Department → Template
type TemplateMapping = {
  [K in AllowedIndustry]?: {
    [D in AllowedDepartment]?: {
      category: TemplateCategory;
      template: AllowedTemplate;
    };
  };
};

const TEMPLATE_MAPPINGS: TemplateMapping = {
  Healthcare: {
    Operations: { category: '3d_twin', template: 'Healthcare Facility Twin' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
    Finance: { category: 'agent', template: 'Financial Analysis Agent' },
    HR: { category: 'agent', template: 'HR Assistant Agent' },
    'IT/Engineering': { category: 'agent', template: 'IT Automation Agent' },
    'Risk & Compliance': { category: 'agent', template: 'Compliance & Policy Agent' },
  },
  Energy: {
    Operations: { category: '3d_twin', template: 'Energy Grid Twin' },
    'IT/Engineering': { category: 'agent', template: 'IT Automation Agent' },
    'Risk & Compliance': { category: 'agent', template: 'Compliance & Policy Agent' },
  },
  Manufacturing: {
    Operations: { category: '3d_twin', template: 'Manufacturing Operations Twin' },
    'Supply Chain': { category: 'agent', template: 'Supply Chain Monitoring Agent' },
    Procurement: { category: 'agent', template: 'Procurement Workflow Agent' },
    Finance: { category: 'agent', template: 'Financial Analysis Agent' },
    HR: { category: 'agent', template: 'HR Assistant Agent' },
  },
  'Public Sector': {
    Operations: { category: 'process_twin', template: 'Public Sector Service Twin' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
    Finance: { category: 'agent', template: 'Financial Analysis Agent' },
    'Risk & Compliance': { category: 'agent', template: 'Compliance & Policy Agent' },
  },
  Maritime: {
    Operations: { category: '3d_twin', template: 'Maritime Fleet Twin' },
    'Supply Chain': { category: 'process_twin', template: 'Logistics Network Twin' },
  },
  Agriculture: {
    Operations: { category: 'process_twin', template: 'Agriculture Yield Twin' },
    'Supply Chain': { category: 'agent', template: 'Supply Chain Monitoring Agent' },
  },
  Retail: {
    Operations: { category: 'process_twin', template: 'Retail Store Twin' },
    Sales: { category: 'agent', template: 'Sales Outreach Agent' },
    Marketing: { category: 'agent', template: 'Marketing Automation Agent' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
    'Supply Chain': { category: 'agent', template: 'Supply Chain Monitoring Agent' },
  },
  'Real Estate': {
    Operations: { category: 'process_twin', template: 'Real Estate Portfolio Twin' },
    Sales: { category: 'agent', template: 'Sales Outreach Agent' },
    Finance: { category: 'process_twin', template: 'Finance Risk Twin' },
  },
  'Financial Services': {
    Operations: { category: 'process_twin', template: 'Finance Risk Twin' },
    Finance: { category: 'agent', template: 'Financial Analysis Agent' },
    'Risk & Compliance': { category: 'agent', template: 'Compliance & Policy Agent' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
  },
  Insurance: {
    Operations: { category: 'process_twin', template: 'Insurance Claim Twin' },
    Sales: { category: 'agent', template: 'Sales Outreach Agent' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
    'Risk & Compliance': { category: 'agent', template: 'Compliance & Policy Agent' },
  },
  'Transportation & Logistics': {
    Operations: { category: '3d_twin', template: 'Transportation Fleet Twin' },
    'Supply Chain': { category: 'process_twin', template: 'Logistics Network Twin' },
  },
  Telecommunications: {
    Operations: { category: 'process_twin', template: 'Telecom Network Twin' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
    Sales: { category: 'agent', template: 'Sales Outreach Agent' },
    'IT/Engineering': { category: 'agent', template: 'IT Automation Agent' },
  },
  Education: {
    Operations: { category: 'process_twin', template: 'Education Success Twin' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
    Marketing: { category: 'agent', template: 'Marketing Automation Agent' },
  },
  Construction: {
    Operations: { category: '3d_twin', template: 'Construction Project Twin' },
    Procurement: { category: 'agent', template: 'Procurement Workflow Agent' },
    Finance: { category: 'agent', template: 'Financial Analysis Agent' },
  },
  'Hospitality & Tourism': {
    Operations: { category: 'process_twin', template: 'Hospitality Guest Journey Twin' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
    Marketing: { category: 'agent', template: 'Marketing Automation Agent' },
  },
  'Mining & Natural Resources': {
    Operations: { category: '3d_twin', template: 'Mining Production Twin' },
    'Supply Chain': { category: 'agent', template: 'Supply Chain Monitoring Agent' },
    'Risk & Compliance': { category: 'agent', template: 'Compliance & Policy Agent' },
  },
  'Technology & SaaS': {
    Operations: { category: 'process_twin', template: 'SaaS Customer Lifecycle Twin' },
    Sales: { category: 'agent', template: 'Sales Outreach Agent' },
    'Customer Support': { category: 'agent', template: 'Customer Support Agent' },
    Marketing: { category: 'agent', template: 'Marketing Automation Agent' },
    Product: { category: 'agent', template: 'Operations Efficiency Agent' },
    'IT/Engineering': { category: 'agent', template: 'IT Automation Agent' },
  },
  CPG: {
    Operations: { category: 'process_twin', template: 'Retail Store Twin' },
    'Supply Chain': { category: 'agent', template: 'Supply Chain Monitoring Agent' },
    Marketing: { category: 'agent', template: 'Marketing Automation Agent' },
  },
  Automotive: {
    Operations: { category: '3d_twin', template: 'Automotive Dealership Twin' },
    Sales: { category: 'agent', template: 'Sales Outreach Agent' },
    'Supply Chain': { category: 'agent', template: 'Supply Chain Monitoring Agent' },
  },
  'Media & Entertainment': {
    Operations: { category: 'process_twin', template: 'Media Content Twin' },
    Marketing: { category: 'agent', template: 'Marketing Automation Agent' },
    Sales: { category: 'agent', template: 'Sales Outreach Agent' },
  },
};

// OUTPUT TYPES
export interface DeterministicMappingSuccess {
  recommendation: string;
  industry: AllowedIndustry;
  department: AllowedDepartment;
  twin_or_agent_type: TemplateCategory;
  template_assigned: AllowedTemplate;
  why: string;
  integration_requirements: string[];
  config: {
    skills: string[];
    workflows: string[];
    tools: string[];
    data_sources: string[];
    KPIs: string[];
  };
  validation_status: 'passed';
}

export interface DeterministicMappingError {
  error: 'INVALID_MAPPING';
  reason: string;
  missing: string[];
  next_step: string;
}

export type DeterministicMappingResult =
  | DeterministicMappingSuccess
  | DeterministicMappingError;

// 4. DECISION TREE (Gemini-Optimized)
export function mapToDeterministicTemplate(
  recommendation: string,
  industryInput: string,
  departmentInput: string,
  content?: string
): DeterministicMappingResult {
  const missing: string[] = [];

  // Step 1: Identify industry (exact match)
  const industry = ALLOWED_INDUSTRIES.find(
    (i) => i.toLowerCase() === industryInput.toLowerCase().trim()
  );
  if (!industry) {
    missing.push('industry');
  }

  // Step 2: Identify department (exact match)
  const department = ALLOWED_DEPARTMENTS.find(
    (d) => d.toLowerCase() === departmentInput.toLowerCase().trim()
  );
  if (!department) {
    missing.push('department');
  }

  // If either is missing, return error
  if (missing.length > 0) {
    return {
      error: 'INVALID_MAPPING',
      reason: `Industry or department not in allowed list. Got: industry="${industryInput}", department="${departmentInput}"`,
      missing,
      next_step: 'Refine classification or correct input.',
    };
  }

  // Step 3: Determine category using mapping table
  const mapping = TEMPLATE_MAPPINGS[industry!]?.[department!];
  if (!mapping) {
    // No predefined mapping, default to process twin
    return {
      error: 'INVALID_MAPPING',
      reason: `No template mapping found for industry="${industry}" and department="${department}"`,
      missing: ['template'],
      next_step: 'Add mapping to TEMPLATE_MAPPINGS or refine classification.',
    };
  }

  const { category, template } = mapping;

  // Step 4: Build why explanation
  const why = buildWhyExplanation(category, template, industry!, department!);

  // Step 5: Build integration requirements
  const integrationRequirements = buildIntegrationRequirements(category, department!);

  // Step 6: Build config
  const config = buildConfig(category, template, industry!, department!, content);

  // Step 7: Validate
  if (!validateOutput(industry!, department!, template)) {
    return {
      error: 'INVALID_MAPPING',
      reason: 'Validation failed: invalid combination of industry, department, and template',
      missing: ['validation'],
      next_step: 'Check template mappings for consistency.',
    };
  }

  return {
    recommendation,
    industry: industry!,
    department: department!,
    twin_or_agent_type: category,
    template_assigned: template,
    why,
    integration_requirements: integrationRequirements,
    config,
    validation_status: 'passed',
  };
}

// Helper: Build "why" explanation
function buildWhyExplanation(
  category: TemplateCategory,
  template: AllowedTemplate,
  industry: AllowedIndustry,
  department: AllowedDepartment
): string {
  const categoryLabel = category === '3d_twin' ? '3D Twin' : category === 'process_twin' ? 'Process Twin' : 'Agent';
  return `This is a ${categoryLabel} (${template}) for ${industry} ${department}. It provides ${getCategoryDescription(category)} with structured integration and automation capabilities.`;
}

function getCategoryDescription(category: TemplateCategory): string {
  switch (category) {
    case 'agent':
      return 'task automation, system integration, and event-driven workflows';
    case 'process_twin':
      return 'business logic simulation, multi-step approvals, and operational forecasting';
    case '3d_twin':
      return 'spatial simulation, robotics integration, and physical asset monitoring';
  }
}

// Helper: Build integration requirements
function buildIntegrationRequirements(
  category: TemplateCategory,
  department: AllowedDepartment
): string[] {
  const base = [
    'Event triggers for automation',
    'System integrations (CRM, ERP, HRIS, DB, APIs)',
  ];

  if (category === 'agent') {
    base.push('MCP endpoints for tool execution');
    base.push('Structured outputs for downstream processing');
  }

  if (category === 'process_twin') {
    base.push('Multi-step workflow logic');
    base.push('HITL approval steps');
  }

  if (category === '3d_twin') {
    base.push('3D simulation environment (e.g., Nvidia Isaac Sim)');
    base.push('IoT sensor data feeds');
  }

  // Department-specific
  if (department === 'Finance' || department === 'Risk & Compliance') {
    base.push('HITL approval for financial decisions');
  }

  return base;
}

// Helper: Build config
function buildConfig(
  category: TemplateCategory,
  template: AllowedTemplate,
  industry: AllowedIndustry,
  department: AllowedDepartment,
  content?: string
): DeterministicMappingSuccess['config'] {
  const config: DeterministicMappingSuccess['config'] = {
    skills: [],
    workflows: [],
    tools: [],
    data_sources: [],
    KPIs: [],
  };

  // Category-specific defaults
  if (category === 'agent') {
    config.skills = ['Task automation', 'API integration', 'Event monitoring'];
    config.workflows = ['Trigger → Execute → Notify'];
    config.tools = ['CRM', 'ERP', 'Email', 'Slack', 'Database'];
  } else if (category === 'process_twin') {
    config.skills = ['Workflow simulation', 'Risk modeling', 'Forecasting'];
    config.workflows = ['Approval flow', 'Multi-step logic', 'Decision tree'];
    config.tools = ['ERP', 'HRIS', 'Finance systems', 'Analytics platform'];
  } else if (category === '3d_twin') {
    config.skills = ['Spatial simulation', 'Asset tracking', 'IoT monitoring'];
    config.workflows = ['Sensor → Process → Alert'];
    config.tools = ['IoT sensors', 'SCADA', '3D simulation', 'Fleet management'];
  }

  // Department-specific KPIs
  config.KPIs = getDepartmentKPIs(department);

  // Data sources
  config.data_sources = getDataSources(industry, department);

  return config;
}

function getDepartmentKPIs(department: AllowedDepartment): string[] {
  const kpiMap: Record<AllowedDepartment, string[]> = {
    Operations: ['Efficiency rate', 'Throughput', 'Downtime reduction'],
    Sales: ['Conversion rate', 'Pipeline velocity', 'Deal size'],
    Marketing: ['Campaign ROI', 'Lead generation', 'Customer acquisition cost'],
    Finance: ['Cash flow accuracy', 'Budget variance', 'Risk score'],
    'Customer Support': ['CSAT score', 'Response time', 'Resolution rate'],
    HR: ['Time to hire', 'Employee satisfaction', 'Retention rate'],
    'IT/Engineering': ['Uptime', 'Incident resolution time', 'Deployment frequency'],
    Product: ['Feature adoption', 'Product-market fit', 'User engagement'],
    Legal: ['Contract turnaround time', 'Compliance score', 'Risk mitigation'],
    'Supply Chain': ['Inventory accuracy', 'Order fulfillment rate', 'Lead time'],
    'Risk & Compliance': ['Compliance rate', 'Audit pass rate', 'Risk exposure'],
    Procurement: ['Cost savings', 'Vendor performance', 'Purchase order cycle time'],
  };

  return kpiMap[department] || [];
}

function getDataSources(industry: AllowedIndustry, department: AllowedDepartment): string[] {
  const sources: string[] = [];

  // Industry-specific
  if (industry === 'Healthcare') sources.push('EHR', 'Patient data', 'Lab systems');
  if (industry === 'Manufacturing') sources.push('MES', 'SCADA', 'IoT sensors');
  if (industry === 'Retail') sources.push('POS', 'Inventory systems', 'CRM');
  if (industry === 'Financial Services') sources.push('Core banking', 'Trading systems', 'Risk DB');
  if (industry === 'Energy') sources.push('Grid sensors', 'SCADA', 'Asset management');

  // Department-specific
  if (department === 'Finance') sources.push('ERP', 'Financial systems');
  if (department === 'HR') sources.push('HRIS', 'Payroll systems');
  if (department === 'Supply Chain') sources.push('WMS', 'TMS', 'Supplier portals');
  if (department === 'Sales') sources.push('CRM', 'Sales database');

  return sources.length > 0 ? sources : ['ERP', 'CRM', 'Database'];
}

// Validation
function validateOutput(
  industry: AllowedIndustry,
  department: AllowedDepartment,
  template: AllowedTemplate
): boolean {
  // Check if industry is valid
  if (!ALLOWED_INDUSTRIES.includes(industry)) return false;

  // Check if department is valid
  if (!ALLOWED_DEPARTMENTS.includes(department)) return false;

  // Check if template exists in one of the template lists
  const allTemplates = [
    ...AGENT_TEMPLATES,
    ...PROCESS_TWIN_TEMPLATES,
    ...THREE_D_TWIN_TEMPLATES,
  ];
  if (!allTemplates.includes(template as any)) return false;

  return true;
}
