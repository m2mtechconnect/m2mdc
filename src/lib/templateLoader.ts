// Template loader utility for Industry Marketplace
// Phase 1: Cleaned - ready for new Digital Twin Blueprint format

export interface DigitalTwinBlueprint {
  id: string;
  name: string;
  industry: string;
  department: string;
  twin_type: 'operational' | 'workforce' | 'compliance' | 'financial' | 'supply_chain' | 'predictive' | 'sales_agent' | 'support_agent' | 'risk_agent';
  description: string;
  short_description: string;
  badges: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  certified: boolean;
  
  // Blueprint Structure
  blueprint: {
    process_mirrored: string;
    event_triggers: string[];
    data_sources: string[];
    workflow_steps: Array<{
      id: string;
      type: string;
      label: string;
      params?: Record<string, any>;
    }>;
    human_approval_points: string[];
    kpis: Array<{
      name: string;
      metric: string;
      target: number;
    }>;
    integrations: string[];
  };
  
  // RAG Configuration
  rag: {
    provider: string;
    hybrid_search: boolean;
    top_k: number;
    top_n: number;
    embedding_model: string;
    vector_dim: number;
    index_name: string;
    grounding_provider: string;
  };
  
  // LLM Configuration
  llm: {
    provider: string;
    model: string;
    temperature: number;
    location: string;
  };
  
  // Knowledge Sources
  knowledge: Array<{
    type: string;
    ref?: string;
    allow?: string[];
    deny?: string[];
  }>;
  
  // Connectors
  connectors: Array<{
    id: string;
    mode: string;
  }>;
  
  // Workflow Graph
  workflow: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      params?: Record<string, any>;
    }>;
    edges: Array<{
      from: string;
      to: string;
    }>;
  };
  
  // System Prompt
  system_prompt: string;
  
  // Metrics & ROI
  metrics_defaults: {
    time_saved_per_run_min: number;
    runs_per_week: number;
    loaded_cost_per_hour: number;
    accuracy_improvement_pct: number;
    cost_per_error: number;
  };
  
  roi_hint: number;
  rating: number;
  downloads: number;
  
  // Simulation
  simulation_scripts?: Array<{
    scenario: string;
    inputs: Record<string, any>;
    expected_outputs: Record<string, any>;
  }>;
  
  // Gemini Co-Pilot
  copilot_prompts?: {
    intro: string;
    capabilities: string[];
    limitations: string[];
  };
  
  // TwinScore metadata
  twin_score?: {
    overall: number;
    explainability: number;
    reliability: number;
    efficiency: number;
  };
}

// Phase 3: Load templates from JSON files
import blueprints1 from '@/data/templates/digital-twin-blueprints.json';
import blueprints2 from '@/data/templates/digital-twin-blueprints-2.json';
import blueprints3 from '@/data/templates/digital-twin-blueprints-3.json';
import blueprintsComplete from '@/data/templates/digital-twin-blueprints-complete.json';
import blueprintsAutomotive from '@/data/templates/digital-twin-blueprints-automotive.json';
import blueprintsEnergy from '@/data/templates/digital-twin-blueprints-energy.json';
import blueprintsTelecomEduRE from '@/data/templates/digital-twin-blueprints-telecom-edu-realestate.json';
import blueprintsAgriTravelConsumer from '@/data/templates/digital-twin-blueprints-agriculture-travel-consumer.json';
import blueprintsHRSalesMarketing from '@/data/templates/digital-twin-blueprints-hr-sales-marketing.json';
import blueprintsSupportProcFinance from '@/data/templates/digital-twin-blueprints-support-procurement-finance.json';
import blueprintsAdditional from '@/data/templates/digital-twin-blueprints-additional-industries.json';
import blueprintsExtended from '@/data/templates/digital-twin-blueprints-extended-coverage.json';
import blueprintsFashionIndustrial from '@/data/templates/digital-twin-blueprints-fashion-industrial.json';
import blueprintsTransportCanada from '@/data/templates/digital-twin-blueprints-transport-canada.json';

const allBlueprints = [
  ...blueprints1, 
  ...blueprints2, 
  ...blueprints3, 
  ...blueprintsComplete,
  ...blueprintsAutomotive,
  ...blueprintsEnergy,
  ...blueprintsTelecomEduRE,
  ...blueprintsAgriTravelConsumer,
  ...blueprintsHRSalesMarketing,
  ...blueprintsSupportProcFinance,
  ...blueprintsAdditional,
  ...blueprintsExtended,
  ...blueprintsFashionIndustrial,
  ...blueprintsTransportCanada
] as DigitalTwinBlueprint[];

console.log('[templateLoader] Loaded', allBlueprints.length, 'blueprints from JSON files');

const templates: Record<string, DigitalTwinBlueprint> = {};

// Index templates by ID
allBlueprints.forEach(template => {
  templates[template.id] = template;
});

export function loadAllTemplates(): DigitalTwinBlueprint[] {
  console.log('[templateLoader] loadAllTemplates called, returning', allBlueprints.length, 'templates');
  return allBlueprints;
}

export function loadTemplateById(id: string): DigitalTwinBlueprint | null {
  return templates[id] || null;
}

export function validateTemplate(template: any): boolean {
  const required = [
    'id', 'name', 'industry', 'department', 'twin_type', 'description',
    'blueprint', 'rag', 'llm', 'knowledge', 'connectors', 'workflow',
    'system_prompt', 'metrics_defaults'
  ];
  
  return required.every(field => field in template);
}
