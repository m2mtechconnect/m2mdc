// Template loader utility for Digital Twin Studio
// SINGLE TEMPLATE: Data Centre Digital Twin Master Template

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

// Load ONLY the Data Centre Master Template
import dataCentreTemplate from '@/data/templates/data-centre-master.json';

const allBlueprints = dataCentreTemplate as DigitalTwinBlueprint[];

console.log('[templateLoader] Data Centre Master Template loaded');

const templates: Record<string, DigitalTwinBlueprint> = {};

// Index templates by ID
allBlueprints.forEach(template => {
  templates[template.id] = template;
});

export function loadAllTemplates(): DigitalTwinBlueprint[] {
  console.log('[templateLoader] loadAllTemplates called, returning Data Centre template');
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
