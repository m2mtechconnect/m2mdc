/**
 * Canonical Builder Types - Single Source of Truth
 * All Builder steps use these types for state management and persistence
 */

export interface BuilderTwinSummary {
  id: string;
  name: string;
  description: string;
  industry: string;
  department: string;
  useCase: string;
  type: 'agent' | 'process_twin' | '3d_twin';
  ownerId: string;
  goals?: string[];
  expectedRoi?: string;
  timeSavedPerWeek?: string;
  efficiencyGain?: string;
}

export interface BuilderKnowledgeSource {
  id: string;
  type: 'url' | 'file' | 'vector_store' | 'internal_doc' | 'notion' | 'gdrive' | 'confluence';
  label: string;
  status: 'pending' | 'indexing' | 'indexed' | 'failed';
  url?: string;
  metadata?: Record<string, any>;
}

export interface BuilderIntelligenceConfig {
  // Model config
  provider: string;
  model: string;
  temperature: number;
  topK: number;
  topP: number;
  maxTokens?: number;
  
  // Agent modes
  supervisorEnabled: boolean;
  deepResearchEnabled: boolean;
  
  // Knowledge / RAG
  knowledgeSources: BuilderKnowledgeSource[];
  ragEnabled: boolean;
  
  // Behavior
  systemPrompt: string;
  persona: 'professional' | 'friendly' | 'technical' | 'concise';
  formalTone: boolean;
  useEmojis: boolean;
  detailedExplanations: boolean;
  
  // Safety
  hallucinationPrevention: boolean;
  knowledgeRestrictions: boolean;
  requireCitations: boolean;
  
  // Memory
  memoryType: 'none' | 'short' | 'long';
}

export interface BuilderTool {
  id: string;
  type: 'integration' | 'mcp' | 'api';
  name: string;
  category?: string;
  enabled: boolean;
  connected: boolean;
  config: Record<string, any>;
}

export interface BuilderToolsConfig {
  tools: BuilderTool[];
  mcpServers: Array<{
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    tools: string[];
  }>;
  apiConnectors: Array<{
    id: string;
    name: string;
    endpoint: string;
    method: string;
    authType: string;
    headers: Record<string, string>;
  }>;
}

export interface BuilderWorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
}

export interface BuilderWorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface BuilderWorkflowConfig {
  id?: string;
  name: string;
  description?: string;
  triggerType: 'manual' | 'api' | 'scheduled' | 'event';
  triggers: string[];
  actions: string[];
  integrations: string[];
  hitl: string[]; // Human-in-the-loop checkpoints
  nodes: BuilderWorkflowNode[];
  edges: BuilderWorkflowEdge[];
  workflowJson?: any; // Full serialized workflow for LangGraph
  isValid: boolean;
  validationErrors: string[];
}

export interface BuilderKPI {
  code: string;
  label: string;
  unit: string;
  baseline: number;
  target: number;
  direction: 'increase' | 'decrease';
}

export interface BuilderDeployConfig {
  environment: 'dev' | 'test' | 'staging' | 'production';
  currentVersion: string;
  simulationTemplateId?: string;
  kpis: BuilderKPI[];
  auditEnabled: boolean;
  governanceTags: string[];
  rbacRoles: string[];
}

export interface BuilderSimulationRun {
  id: string;
  scenario: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration: number;
  timestamp: Date;
  input?: string;
  output?: string;
  events: number;
  latency: number;
}

export interface BuilderVersionSnapshot {
  id: string;
  version: string;
  configHash: string;
  commitMessage: string;
  createdAt: Date;
  createdBy: string;
  deployedTo?: string[];
  changes: string[];
}

/**
 * Canonical BuilderState - Aggregate Type
 * This is the only source of truth used by all steps
 */
export interface BuilderState {
  // Identity
  agentId: string | null;
  builderId: string | null;
  
  // Step 1: Summary
  summary: BuilderTwinSummary;
  
  // Step 2: Intelligence
  intelligence: BuilderIntelligenceConfig;
  
  // Step 3: Tools
  tools: BuilderToolsConfig;
  
  // Step 4: Workflow
  workflow: BuilderWorkflowConfig;
  
  // Step 5: Deploy
  deploy: BuilderDeployConfig;
  
  // History
  simulationHistory: BuilderSimulationRun[];
  versionHistory: BuilderVersionSnapshot[];
  
  // Meta
  currentStep: number;
  completedSteps: number[];
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  error: string | null;
}

/**
 * Default values for BuilderState
 */
export const DEFAULT_INTELLIGENCE_CONFIG: BuilderIntelligenceConfig = {
  provider: 'google',
  model: 'google/gemini-2.5-flash',
  temperature: 0.7,
  topK: 50,
  topP: 0.95,
  supervisorEnabled: false,
  deepResearchEnabled: false,
  knowledgeSources: [],
  ragEnabled: false,
  systemPrompt: '',
  persona: 'professional',
  formalTone: false,
  useEmojis: false,
  detailedExplanations: true,
  hallucinationPrevention: true,
  knowledgeRestrictions: true,
  requireCitations: false,
  memoryType: 'short',
};

export const DEFAULT_TOOLS_CONFIG: BuilderToolsConfig = {
  tools: [],
  mcpServers: [],
  apiConnectors: [],
};

export const DEFAULT_WORKFLOW_CONFIG: BuilderWorkflowConfig = {
  name: 'Primary Workflow',
  triggerType: 'manual',
  triggers: [],
  actions: [],
  integrations: [],
  hitl: [],
  nodes: [],
  edges: [],
  isValid: false,
  validationErrors: ['At least one action is required'],
};

export const DEFAULT_DEPLOY_CONFIG: BuilderDeployConfig = {
  environment: 'dev',
  currentVersion: '1.0.0',
  kpis: [],
  auditEnabled: true,
  governanceTags: [],
  rbacRoles: ['admin', 'operator', 'viewer'],
};

export const createEmptyBuilderState = (): BuilderState => ({
  agentId: null,
  builderId: null,
  summary: {
    id: '',
    name: '',
    description: '',
    industry: '',
    department: '',
    useCase: '',
    type: 'agent',
    ownerId: '',
  },
  intelligence: DEFAULT_INTELLIGENCE_CONFIG,
  tools: DEFAULT_TOOLS_CONFIG,
  workflow: DEFAULT_WORKFLOW_CONFIG,
  deploy: DEFAULT_DEPLOY_CONFIG,
  simulationHistory: [],
  versionHistory: [],
  currentStep: 1,
  completedSteps: [],
  isLoading: false,
  isSaving: false,
  isDirty: false,
  lastSaved: null,
  error: null,
});
