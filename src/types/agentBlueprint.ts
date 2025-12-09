/**
 * Unified Agent Blueprint Type
 * Used by all three intake flows (file upload, questionnaire, templates)
 * to provide a consistent data structure for the Builder
 */

export type AgentBlueprintSource = "file" | "questionnaire" | "template" | "url" | "manual";

export type TemplateSourceEntry = "dashboard" | "marketplace" | "builder";

export type AgentBlueprintLevel = "Operational" | "Tactical" | "Strategic";

export interface AgentBlueprintModel {
  provider: "gemini" | "openai" | "claude" | string;
  modelName: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  reasoningMode?: string;
  // Agent modes
  supervisorEnabled?: boolean;
  deepResearchEnabled?: boolean;
}

export interface AgentBlueprintKnowledge {
  documents?: string[];  // IDs / URLs in storage
  urls?: string[];
  cloudDrives?: {
    notion?: boolean;
    gdrive?: boolean;
    confluence?: boolean;
  };
  summary?: string | null;  // Pre-computed RAG summary or topics
}

export interface AgentBlueprintBehavior {
  systemPrompt: string;
  personaTemplate?: string;
  communicationStyle?: {
    formal?: boolean;
    emojis?: boolean;
    detailedExplanations?: boolean;
  };
  safety?: {
    hallucinationPrevention?: boolean;
    knowledgeRestrictions?: boolean;
    requireCitations?: boolean;
  };
}

export interface AgentBlueprintTools {
  recommendedIntegrations: string[];
  preselectedIntegrations?: string[];
  customApis?: Array<{
    name: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    endpoint: string;
    authType?: string;
  }>;
}

export interface AgentBlueprintWorkflow {
  templateType?: "auto" | "blank";
  triggers: any[];
  actions: any[];
  integrations: string[];
}

/**
 * Complete Agent Blueprint schema
 * This is the unified data structure that all intakes must produce
 */
export interface AgentBlueprint {
  // Metadata
  id?: string;  // Optional, for templates
  source: AgentBlueprintSource;
  sourceEntry?: TemplateSourceEntry;  // Where the template was selected from (for templates only)
  createdAt?: string;
  
  // Step 1: Summary
  name: string;
  description: string;
  industry?: string | null;
  department?: string | null;
  useCase?: string | null;
  level?: AgentBlueprintLevel | null;
  type?: 'agent' | 'process_twin' | '3d_twin' | null;
  
  // Business metrics
  goals: string[];
  expectedRoi?: string | null;
  timeSavedPerWeek?: string | null;
  efficiencyGain?: string | null;
  
  // Step 2: Intelligence Setup
  model: AgentBlueprintModel;
  knowledge: AgentBlueprintKnowledge;
  behavior: AgentBlueprintBehavior;
  
  // Step 3: Tools & Integrations
  tools: AgentBlueprintTools;
  
  // Step 4: Workflow Builder
  workflow: AgentBlueprintWorkflow;
  
  // Optional: Template marketplace tags
  tags?: string[];
  
  // Optional: Template metadata
  templateId?: string;
  templateName?: string;
  certified?: boolean;
  rating?: number;
  downloads?: number;
}

/**
 * Default/empty blueprint for starting from scratch
 */
export const createEmptyBlueprint = (): AgentBlueprint => ({
  source: "manual",
  name: "",
  description: "",
  goals: [],
  model: {
    provider: "gemini",
    modelName: "google/gemini-2.5-flash",
    temperature: 0.7,
    topK: 20,
    topP: 0.95,
  },
  knowledge: {
    documents: [],
    urls: [],
    cloudDrives: {},
  },
  behavior: {
    systemPrompt: "",
    communicationStyle: {},
    safety: {
      hallucinationPrevention: true,
      requireCitations: true,
    },
  },
  tools: {
    recommendedIntegrations: [],
    preselectedIntegrations: [],
    customApis: [],
  },
  workflow: {
    templateType: "auto",
    triggers: [],
    actions: [],
    integrations: [],
  },
});
