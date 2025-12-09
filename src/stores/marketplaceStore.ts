import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// Unified filter constants
export const INDUSTRY_CATEGORIES = [
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Energy",
  "Marketing",
  "Operations",
  "HR",
  "Legal",
  "Public Sector",
  "Agriculture",
] as const;

export const MCP_CATEGORIES = [
  "Productivity & Docs",
  "Social & Communication",
  "Entertainment",
  "Developer Tools",
  "Payments & Finance",
  "Search Tools",
  "Sales",
  "Databases",
  "Customer Support"
] as const;

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  industry?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  certified?: boolean;
  icon?: string;
  default_config?: any;
  kpi_definitions?: any[];
  sample_prompts?: string[];
  recommended_models?: string[];
}

export interface IndustryApp {
  id: string;
  name: string;
  provider: string;
  category: string;
  logo?: string;
  description: string;
  capabilities?: string[];
  status?: 'connected' | 'disconnected';
  zapier_enabled?: boolean;
  config?: any;
}

export interface McpServer {
  id: string;
  name: string;
  designation: string;
  category: string;
  tags: string[];
  description: string;
  logo?: string;
  capabilities: {
    tools: number;
    resources: number;
    prompts: number;
  };
  auth_method: string;
  endpoint: string;
  featured: boolean;
}

interface MarketplaceStore {
  templates: Template[];
  industries: IndustryApp[];
  mcps: McpServer[];
  isLoading: boolean;
  error: string | null;
  
  // Load functions
  loadAll: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  loadIndustries: () => Promise<void>;
  loadMcps: () => Promise<void>;
  
  // Selection functions for builder integration
  selectForBuilder: (payload: {
    type: 'template' | 'industry' | 'mcp';
    id: string;
    system_id: string;
  }) => Promise<{ success: boolean; nextStep?: string }>;
}

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  templates: [],
  industries: [],
  mcps: [],
  isLoading: false,
  error: null,

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().loadTemplates(),
        get().loadIndustries(),
        get().loadMcps(),
      ]);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to load marketplace data' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadTemplates: async () => {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select('*')
        .order('name');

      if (error) throw error;

      const templates: Template[] = (data || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        industry: undefined,
        difficulty: undefined,
        certified: undefined,
        icon: t.icon,
        default_config: typeof t.default_config === 'object' ? t.default_config : {},
        kpi_definitions: Array.isArray(t.kpi_definitions) ? t.kpi_definitions : [],
        sample_prompts: Array.isArray(t.sample_prompts) ? t.sample_prompts.map(String) : [],
        recommended_models: Array.isArray(t.recommended_models) ? t.recommended_models.map(String) : [],
      }));

      set({ templates });
    } catch (error) {
      console.error('Error loading templates:', error);
      throw error;
    }
  },

  loadIndustries: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Load integrations from integrations table
      const { data: integrations, error: intError } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id);

      if (intError) throw intError;

      // Transform integrations into industry apps
      const apps: IndustryApp[] = (integrations || []).map(integration => ({
        id: integration.id,
        name: integration.name,
        provider: integration.provider,
        category: integration.category || 'Other',
        description: `${integration.provider} integration`,
        status: integration.status === 'connected' ? 'connected' : 'disconnected',
        zapier_enabled: true,
        config: integration.config,
      }));

      set({ industries: apps });
    } catch (error) {
      console.error('Error loading industry apps:', error);
      throw error;
    }
  },

  loadMcps: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch from arcade-servers edge function
      const { data, error } = await supabase.functions.invoke('arcade-servers', {
        method: 'GET',
      });

      if (error) throw error;

      set({ mcps: data?.items || [] });
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      throw error;
    }
  },

  selectForBuilder: async (payload) => {
    const { type, id, system_id } = payload;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current system data
      const { data: system, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', system_id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!system) throw new Error('System not found');

      let updateData: any = {};
      let nextStep = '/builder';

      switch (type) {
        case 'template':
          updateData = { template_id: id };
          nextStep = `/builder?systemId=${system_id}&step=2`;
          break;

        case 'industry':
          // Add to connector_ids array (dedupe)
          const connectorIds = Array.from(new Set([...(system?.connector_ids || []), id]));
          updateData = { connector_ids: connectorIds };
          nextStep = `/builder?systemId=${system_id}&step=4`;
          break;

        case 'mcp':
          // Update intelligence_settings with MCP server
          const { data: intSettings } = await supabase
            .from('intelligence_settings')
            .select('*')
            .eq('system_id', system_id)
            .maybeSingle();

          const mcpServers = Array.isArray(intSettings?.mcp_servers) ? intSettings.mcp_servers : [];
          const mcpServerIds = mcpServers.map((s: any) => s.server_id || s);
          const uniqueIds = Array.from(new Set([...mcpServerIds, id]));
          const updatedMcpServers = uniqueIds.map(sid => ({ server_id: sid }));

          await supabase
            .from('intelligence_settings')
            .upsert({
              system_id,
              mcp_servers: updatedMcpServers,
              arcade_server_id: id,
              arcade_registry: true,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'system_id',
            });

          nextStep = `/builder?systemId=${system_id}&step=3`;
          break;
      }

      // Update system
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('agents')
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', system_id);

        if (updateError) throw updateError;
      }

      return { success: true, nextStep };
    } catch (error) {
      console.error('Error selecting for builder:', error);
      return { success: false };
    }
  },
}));
