import { supabase } from "@/integrations/supabase/client";
import type { BuildKind } from "@/lib/builder/buildKind";

export interface BuilderConfig {
  source?: 'file' | 'questionnaire' | 'template' | 'url' | 'manual' | 'homepage' | 'dashboard' | 'imported' | 'manage-agents' | 'blank' | 'facility';
  goal?: string;
  industry?: string;
  department?: string;
  type?: 'agent' | 'process_twin' | '3d_twin' | null;
  template_id?: string | null;
  /** Durable facility identity for twin/process-twin builds. */
  twin_id?: string | null;
  workflow?: {
    triggers: string[];
    actions: string[];
    integrations: string[];
    hitl: string[];
  };
  model_config?: {
    /** Stable managed-AI response profile (browser contract). */
    response_profile?: string | null;
    /** Legacy raw identifiers - readable for old drafts, never required. */
    provider?: string;
    model?: string;
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

function routedTwinId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = new URL(window.location.href).searchParams.get('twin');
  return value || undefined;
}

export const builderService = {
  /**
   * Create a new builder draft. The canonical Build route carries the facility
   * identity in `?twin=`; include it in the server request unless an explicit
   * caller-supplied twin_id already exists.
   */
  async create(params: {
    source?: string;
    goal?: string;
    industry?: string;
    department?: string;
    /** Backend contract value only; normalize through `@/lib/builder/buildKind`. */
    type?: BuildKind;
    template_id?: string;
    twin_id?: string;
  }): Promise<{ id: string; builder: Builder }> {
    try {
      const request = {
        ...params,
        twin_id: params.twin_id ?? routedTwinId(),
      };
      const { data, error } = await supabase.functions.invoke('builders-create', {
        body: request
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

  /** Get builder by ID. */
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

  /** Update builder config fields. */
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

  /** Activate the configured builder record. Runtime provisioning is handled separately. */
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