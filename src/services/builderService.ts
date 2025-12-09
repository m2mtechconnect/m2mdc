import { supabase } from "@/integrations/supabase/client";

export interface BuilderConfig {
  source?: 'homepage' | 'dashboard' | 'imported';
  goal?: string;
  industry?: string;
  department?: string;
  type?: 'agent' | 'process_twin' | '3d_twin' | null;
  template_id?: string | null;
  workflow?: {
    triggers: string[];
    actions: string[];
    integrations: string[];
    hitl: string[];
  };
  model_config?: {
    provider: string;
    model: string;
    rag?: Record<string, any>;
    policies?: Record<string, any>;
    mcp_servers?: any[];
  };
  step_completed?: number;
}

export interface Builder {
  id: string;
  name: string;
  description: string | null;
  status: string;
  config: BuilderConfig;
  created_at: string;
  updated_at: string;
}

export const builderService = {
  /**
   * Create a new builder draft
   */
  async create(params: {
    source?: string;
    goal?: string;
    industry?: string;
    department?: string;
    type?: string;
    template_id?: string;
  }): Promise<{ id: string; builder: Builder }> {
    try {
      const { data, error } = await supabase.functions.invoke('builders-create', {
        body: params
      });

      if (error) {
        console.error('[builderService] Create failed:', error);
        throw new Error(`Failed to create builder: ${error.message || 'Unknown error'}`);
      }

      if (!data || !data.data) {
        throw new Error('No data returned from builders-create');
      }

      return data.data;
    } catch (err) {
      console.error('[builderService] Create exception:', err);
      throw err instanceof Error ? err : new Error('Failed to create builder');
    }
  },

  /**
   * Get builder by ID
   */
  async get(builderId: string): Promise<{ builder: Builder }> {
    try {
      const { data, error } = await supabase.functions.invoke('builders-get', {
        body: { builderId }
      });

      if (error) {
        console.error('[builderService] Get failed:', error);
        throw new Error(`Failed to load builder: ${error.message || 'Unknown error'}`);
      }

      if (!data || !data.data) {
        throw new Error('No data returned from builders-get');
      }

      return data.data;
    } catch (err) {
      console.error('[builderService] Get exception:', err);
      throw err instanceof Error ? err : new Error('Failed to load builder');
    }
  },

  /**
   * Update builder (patch specific fields)
   */
  async update(builderId: string, updates: Partial<BuilderConfig>): Promise<{ builder: Builder }> {
    try {
      const { data, error } = await supabase.functions.invoke('builders-update', {
        body: { builderId, updates }
      });

      if (error) {
        console.error('[builderService] Update failed:', error);
        throw new Error(`Failed to update builder: ${error.message || 'Unknown error'}`);
      }

      if (!data || !data.data) {
        throw new Error('No data returned from builders-update');
      }

      return data.data;
    } catch (err) {
      console.error('[builderService] Update exception:', err);
      throw err instanceof Error ? err : new Error('Failed to update builder');
    }
  },

  /**
   * Deploy builder as live agent/twin
   */
  async deploy(builderId: string): Promise<{
    deployment_id: string;
    status: 'success' | 'error';
    agent_url?: string;
    message?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('builders-deploy', {
        body: { builderId }
      });

      if (error) {
        console.error('[builderService] Deploy failed:', error);
        throw new Error(`Failed to deploy builder: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No data returned from builders-deploy');
      }

      return data;
    } catch (err) {
      console.error('[builderService] Deploy exception:', err);
      throw err instanceof Error ? err : new Error('Failed to deploy builder');
    }
  }
};
