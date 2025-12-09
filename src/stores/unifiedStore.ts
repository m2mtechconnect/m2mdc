/**
 * Unified store for Marketplace and Builder
 * Single source of truth for all marketplace data and builder selections
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { Template, IndustryApp, McpServer } from './marketplaceStore';

export interface SystemState {
  id: string;
  template_id?: string | null;
  connector_ids: string[]; // Industry apps (Zapier integrations)
  mcp_server_ids: string[]; // MCP servers from intelligence_settings
  name: string;
  status: string;
  updated_at: string;
}

export interface UnifiedFilters {
  // Template filters
  industry?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  certified?: boolean;
  
  // Industry filters
  category?: string;
  connection?: 'all' | 'connected' | 'disconnected';
  
  // MCP filters
  mcpCategory?: string;
  type?: 'tool' | 'resource' | 'prompt';
  designation?: 'arcade-optimized' | 'starter' | 'verified' | 'community';
  
  // Global search
  q?: string;
}

interface UnifiedStore {
  // Data
  systems: Record<string, SystemState>;
  templates: Template[];
  industryApps: IndustryApp[];
  mcpServers: McpServer[];
  
  // UI state
  filters: UnifiedFilters;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadAll: (filters?: Partial<UnifiedFilters>) => Promise<void>;
  updateFilters: (filters: Partial<UnifiedFilters>) => void;
  
  // Selection actions (marketplace → builder)
  selectTemplate: (params: { systemId: string; templateId: string }) => Promise<void>;
  selectIndustryApp: (params: { systemId: string; appId: string }) => Promise<void>;
  selectMcpServer: (params: { systemId: string; serverId: string }) => Promise<void>;
  
  // System management
  loadSystem: (systemId: string) => Promise<void>;
  refreshSystem: (systemId: string) => Promise<void>;
}

// Helper: Deduplicate array
const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

export const useUnifiedStore = create<UnifiedStore>()(
  persist(
    (set, get) => ({
      systems: {},
      templates: [],
      industryApps: [],
      mcpServers: [],
      filters: {},
      isLoading: false,
      error: null,

      loadAll: async (filters) => {
        set({ isLoading: true, error: null });
        if (filters) {
          set({ filters: { ...get().filters, ...filters } });
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // Load templates
          const { data: templatesData, error: templatesError } = await supabase
            .from('agent_templates')
            .select('*')
            .order('name');

          if (templatesError) throw templatesError;

          // Load integrations (industry apps)
          const { data: integrationsData, error: integrationsError } = await supabase
            .from('integrations')
            .select('*')
            .eq('user_id', user.id);

          if (integrationsError) throw integrationsError;

          // Load MCP servers from Arcade
          const { data: mcpData, error: mcpError } = await supabase.functions.invoke('arcade-servers');
          if (mcpError) throw mcpError;

          set({
            templates: (templatesData || []).map(t => ({
              id: t.id,
              name: t.name,
              description: t.description,
              category: t.category,
              icon: t.icon,
              default_config: typeof t.default_config === 'object' ? t.default_config : {},
              kpi_definitions: Array.isArray(t.kpi_definitions) ? t.kpi_definitions : [],
              sample_prompts: Array.isArray(t.sample_prompts) ? t.sample_prompts.map(String) : [],
              recommended_models: Array.isArray(t.recommended_models) ? t.recommended_models.map(String) : [],
            })),
            industryApps: (integrationsData || []).map(i => ({
              id: i.id,
              name: i.name,
              provider: i.provider,
              category: i.category || 'Other',
              description: `${i.provider} integration`,
              status: i.status === 'connected' ? 'connected' : 'disconnected',
              zapier_enabled: true,
              config: i.config,
            })),
            mcpServers: mcpData?.items || [],
            isLoading: false,
          });
        } catch (error) {
          console.error('Error loading unified data:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load data',
            isLoading: false,
          });
        }
      },

      updateFilters: (filters) => {
        set({ filters: { ...get().filters, ...filters } });
      },

      selectTemplate: async ({ systemId, templateId }) => {
        try {
          const { error } = await supabase
            .from('agents')
            .update({
              template_id: templateId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', systemId);

          if (error) throw error;

          // Update local state
          const systems = get().systems;
          if (systems[systemId]) {
            set({
              systems: {
                ...systems,
                [systemId]: {
                  ...systems[systemId],
                  template_id: templateId,
                },
              },
            });
          }

          await get().refreshSystem(systemId);
        } catch (error) {
          console.error('Error selecting template:', error);
          throw error;
        }
      },

      selectIndustryApp: async ({ systemId, appId }) => {
        try {
          const systems = get().systems;
          const currentSystem = systems[systemId];
          const connectorIds = uniq([...(currentSystem?.connector_ids || []), appId]);

          const { error } = await supabase
            .from('agents')
            .update({
              connector_ids: connectorIds,
              updated_at: new Date().toISOString(),
            })
            .eq('id', systemId);

          if (error) throw error;

          // Update local state
          set({
            systems: {
              ...systems,
              [systemId]: {
                ...currentSystem,
                id: systemId,
                connector_ids: connectorIds,
                name: currentSystem?.name || '',
                status: currentSystem?.status || 'draft',
                updated_at: new Date().toISOString(),
              },
            },
          });

          await get().refreshSystem(systemId);
        } catch (error) {
          console.error('Error selecting industry app:', error);
          throw error;
        }
      },

      selectMcpServer: async ({ systemId, serverId }) => {
        try {
          // Get current MCP servers from intelligence_settings
          const { data: settings } = await supabase
            .from('intelligence_settings')
            .select('mcp_servers')
            .eq('system_id', systemId)
            .maybeSingle();

          const mcpServers = Array.isArray(settings?.mcp_servers) ? settings.mcp_servers : [];
          const serverIds = mcpServers.map((s: any) => s.server_id || s);
          const uniqueIds = uniq([...serverIds, serverId]);
          const updatedServers = uniqueIds.map(sid => ({ server_id: sid }));

          // Update intelligence_settings
          const { error } = await supabase
            .from('intelligence_settings')
            .upsert({
              system_id: systemId,
              mcp_servers: updatedServers,
              arcade_server_id: serverId,
              arcade_registry: true,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'system_id',
            });

          if (error) throw error;

          // Update local state
          const systems = get().systems;
          set({
            systems: {
              ...systems,
              [systemId]: {
                ...systems[systemId],
                mcp_server_ids: uniqueIds,
              },
            },
          });

          await get().refreshSystem(systemId);
        } catch (error) {
          console.error('Error selecting MCP server:', error);
          throw error;
        }
      },

      loadSystem: async (systemId) => {
        try {
          const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', systemId)
            .maybeSingle();

          if (agentError) throw agentError;
          if (!agent) throw new Error('System not found');

          // Load MCP servers from intelligence_settings
          const { data: settings } = await supabase
            .from('intelligence_settings')
            .select('mcp_servers')
            .eq('system_id', systemId)
            .maybeSingle();

          const mcpServers = Array.isArray(settings?.mcp_servers) ? settings.mcp_servers : [];
          const mcpServerIds = mcpServers.map((s: any) => s.server_id || s);

          const systems = get().systems;
          set({
            systems: {
              ...systems,
              [systemId]: {
                id: agent.id,
                template_id: agent.template_id,
                connector_ids: agent.connector_ids || [],
                mcp_server_ids: mcpServerIds,
                name: agent.name,
                status: agent.status,
                updated_at: agent.updated_at,
              },
            },
          });
        } catch (error) {
          console.error('Error loading system:', error);
          throw error;
        }
      },

      refreshSystem: async (systemId) => {
        await get().loadSystem(systemId);
      },
    }),
    {
      name: 'unified-storage',
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);
