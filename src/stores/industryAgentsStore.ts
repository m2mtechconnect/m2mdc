import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface IndustryAgent {
  id: string;
  name: string;
  industry: string;
  category: string;
  integration_type: 'Zapier' | 'API' | 'Native';
  status: 'Connected' | 'Not Connected';
  last_run_at?: string;
  features: string[];
  logo_url?: string;
  agent_type: 'industry';
  marketplace_type: 'agent';
  
  // Enhanced fields
  version?: string;
  thumbnail_url?: string;
  short_description?: string;
  updated_at?: string;
  
  // Build Steps / Architecture
  build_steps?: Array<{
    step: number;
    title: string;
    description: string;
    config_diff?: Record<string, any>;
  }>;
  workflow_diagram_url?: string;
  io_schema?: {
    inputs: Array<{ key: string; type: string; required: boolean; example?: any }>;
    outputs: Array<{ key: string; type: string; example?: any }>;
  };
  
  // Model & Tooling
  model_stack?: {
    primary_model: { provider: string; family: string; version: string; context_window?: number };
    secondary_models?: Array<{ provider: string; family: string; version: string; role?: 'reranker' | 'embedding' | 'vision' }>;
    embeddings?: { provider: string; model: string; dim?: number };
    tools?: Array<{ name: string; type: 'mcp' | 'http' | 'db' | 'retrieval' | 'function'; endpoint?: string }>;
    system_prompt_summary?: string;
    guardrails?: Array<{ rule: string; policy_ref?: string }>;
  };
  
  // Reliability & Cost
  performance?: {
    latency_ms_p50?: number;
    latency_ms_p95?: number;
    throughput_rpm?: number;
    cost_estimate_per_1k_tokens?: number;
    availability_slo?: string;
  };
  
  // Quality Signals
  evaluations?: Array<{ name: string; metric: string; score: number; notes?: string }>;
  
  // Dependencies / Secrets / Compliance
  required_secrets?: string[];
  dependencies?: string[];
  compliance_notes?: string;
  changelog?: Array<{ version: string; date: string; changes: string[] }>;
}

interface IndustryAgentsStore {
  agents: IndustryAgent[];
  isLoading: boolean;
  error: string | null;
  
  loadAgents: () => Promise<void>;
  getAgentById: (id: string) => IndustryAgent | null;
  updateAgentStatus: (id: string, status: 'Connected' | 'Not Connected') => Promise<void>;
}

export const useIndustryAgentsStore = create<IndustryAgentsStore>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,

  loadAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load only from industry_agents table with all fields
      const { data, error } = await supabase
        .from('industry_agents')
        .select('*')
        .eq('agent_type', 'industry')
        .order('status', { ascending: false }) // Connected first
        .order('name', { ascending: true })
        .limit(50);

      if (error) throw error;

      const agents: IndustryAgent[] = (data || []).map(agent => ({
        id: agent.id,
        name: agent.name,
        industry: agent.industry,
        category: agent.category,
        integration_type: agent.integration_type as 'Zapier' | 'API' | 'Native',
        status: agent.status as 'Connected' | 'Not Connected',
        last_run_at: agent.last_run_at || undefined,
        features: Array.isArray(agent.features) ? agent.features.map(f => String(f)) : [],
        logo_url: agent.logo_url || undefined,
        agent_type: 'industry' as const,
        marketplace_type: 'agent' as const,
        version: agent.version || undefined,
        thumbnail_url: agent.thumbnail_url || undefined,
        short_description: agent.short_description || undefined,
        updated_at: agent.updated_at || undefined,
        build_steps: agent.build_steps as any,
        workflow_diagram_url: agent.workflow_diagram_url || undefined,
        io_schema: agent.io_schema as any,
        model_stack: agent.model_stack as any,
        performance: agent.performance as any,
        evaluations: agent.evaluations as any,
        required_secrets: agent.required_secrets || undefined,
        dependencies: agent.dependencies || undefined,
        compliance_notes: agent.compliance_notes || undefined,
        changelog: agent.changelog as any,
      }));

      set({ agents, isLoading: false });
    } catch (error) {
      console.error('Error loading industry agents:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load agents',
        isLoading: false 
      });
    }
  },

  updateAgentStatus: async (id: string, status: 'Connected' | 'Not Connected') => {
    try {
      const { data, error } = await supabase
        .from('industry_agents')
        .update({ 
          status, 
          last_run_at: status === 'Connected' ? new Date().toISOString() : undefined 
        })
        .eq('id', id)
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('You do not have permission to change this agent catalogue entry.');
      }

      // Update local state
      set(state => ({
        agents: state.agents.map(agent =>
          agent.id === id ? { ...agent, status, last_run_at: status === 'Connected' ? new Date().toISOString() : agent.last_run_at } : agent
        )
      }));
    } catch (error) {
      console.error('Error updating agent status:', error);
      throw error;
    }
  },

  getAgentById: (id: string) => {
    const { agents } = get();
    return agents.find(a => a.id === id) || null;
  },
}));
