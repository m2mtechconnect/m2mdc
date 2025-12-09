import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/hooks/useEdgeFunction';

export interface M2MTemplate {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  tags: string[];
  roi_pct?: number;
  rating?: number;
  downloads?: number;
  certified: boolean;
  hero_icon?: string;
  thumbnail_url?: string;
  sample_prompts?: any[];
  kpi_definitions?: any[];
}

export interface IndustryTemplate {
  id: string;
  name: string;
  description?: string;
  industry: string;
  tags: string[];
  roi_pct?: number;
  rating?: number;
  downloads?: number;
  certified: boolean;
  hero_icon?: string;
  thumbnail_url?: string;
  sample_prompts?: any[];
  kpi_definitions?: any[];
}

export interface McpServer {
  id: string;
  name: string;
  provider: string;
  category: string;
  auth_type: string;
  verified: boolean;
  tools_count: number;
  resources_count: number;
  prompts_count: number;
  optimized: boolean;
  logo_url?: string;
  description?: string;
  endpoint?: string;
}

interface CatalogStore {
  m2mTemplates: M2MTemplate[];
  industryTemplates: IndustryTemplate[];
  mcpServers: McpServer[];
  isLoadingM2M: boolean;
  isLoadingIndustry: boolean;
  isLoadingMcp: boolean;
  error: string | null;

  loadM2MTemplates: (filters?: { q?: string; industry?: string; tag?: string; sort?: string }) => Promise<void>;
  loadIndustryTemplates: (filters?: { q?: string; industry?: string; tag?: string; sort?: string }) => Promise<void>;
  loadMcpServers: (filters?: { q?: string; provider?: string; category?: string; verified?: boolean; optimized?: boolean }) => Promise<void>;
  syncMcpServers: (mode?: 'delta' | 'full') => Promise<any>;
  getLastSync: () => Promise<any>;
  getM2MTemplateById: (id: string) => M2MTemplate | null;
  getIndustryTemplateById: (id: string) => IndustryTemplate | null;
  getMcpServerById: (id: string) => McpServer | null;
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  m2mTemplates: [],
  industryTemplates: [],
  mcpServers: [],
  isLoadingM2M: false,
  isLoadingIndustry: false,
  isLoadingMcp: false,
  error: null,

  loadM2MTemplates: async (filters = {}) => {
    set({ isLoadingM2M: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.sort) params.append('sort', filters.sort);
      params.append('pageSize', '50');

      const queryString = params.toString();
      const url = `catalog-templates-m2m${queryString ? `?${queryString}` : ''}`;

      const data = await invokeEdgeFunction(url);

      set({ m2mTemplates: data?.items || [], isLoadingM2M: false });
    } catch (error) {
      console.error('Error loading M2M templates:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load templates',
        isLoadingM2M: false,
      });
    }
  },

  loadIndustryTemplates: async (filters = {}) => {
    set({ isLoadingIndustry: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.sort) params.append('sort', filters.sort);
      params.append('pageSize', '50');

      const queryString = params.toString();
      const url = `catalog-templates-industry${queryString ? `?${queryString}` : ''}`;

      const data = await invokeEdgeFunction(url);

      set({ industryTemplates: data?.items || [], isLoadingIndustry: false });
    } catch (error) {
      console.error('Error loading industry templates:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load templates',
        isLoadingIndustry: false,
      });
    }
  },

  loadMcpServers: async (filters = {}) => {
    set({ isLoadingMcp: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.provider) params.append('provider', filters.provider);
      if (filters.category) params.append('category', filters.category);
      if (filters.verified !== undefined) params.append('verified', filters.verified.toString());
      if (filters.optimized !== undefined) params.append('optimized', filters.optimized.toString());
      params.append('pageSize', '50');

      const queryString = params.toString();
      const url = `catalog-mcp${queryString ? `?${queryString}` : ''}`;

      const data = await invokeEdgeFunction(url);

      set({ mcpServers: data?.items || [], isLoadingMcp: false });
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load MCP servers',
        isLoadingMcp: false,
      });
    }
  },

  getM2MTemplateById: (id: string) => {
    const { m2mTemplates } = get();
    return m2mTemplates.find(t => t.id === id) || null;
  },

  getIndustryTemplateById: (id: string) => {
    const { industryTemplates } = get();
    return industryTemplates.find(t => t.id === id) || null;
  },

  getMcpServerById: (id: string) => {
    const { mcpServers } = get();
    return mcpServers.find(s => s.id === id) || null;
  },

  syncMcpServers: async (mode: 'delta' | 'full' = 'delta') => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-mcp/sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode }),
        }
      );

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error syncing MCP servers:', error);
      throw error;
    }
  },

  getLastSync: async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-mcp/last-sync`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.lastSync;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  },
}));