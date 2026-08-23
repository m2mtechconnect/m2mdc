/**
 * Hook for managing Agent Definitions
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  AgentDefinition, 
  AgentIOField, 
  AgentToolBinding, 
  AgentKpiBinding, 
  AgentRuntimeConfig,
  AgentDomain,
  AgentType
} from '@/types/agentDefinition';
import { toast } from 'sonner';
import type { Database, Json } from '@/integrations/supabase/types';

type AgentDefinitionUpdate = Database['public']['Tables']['agent_definitions']['Update'];

// Transform DB row to AgentDefinition
function transformAgent(row: any): AgentDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    domain: row.domain as AgentDomain,
    type: row.type as AgentType,
    description: row.description,
    icon: row.icon || 'Bot',
    inputs: (row.inputs || []) as AgentIOField[],
    outputs: (row.outputs || []) as AgentIOField[],
    tools: (row.tools || []) as AgentToolBinding[],
    kpiBindings: (row.kpi_bindings || []) as AgentKpiBinding[],
    safetyRules: (row.safety_rules || []) as string[],
    runtimeConfig: (row.runtime_config || {}) as AgentRuntimeConfig,
    ownerId: row.owner_id,
    isSystemDefault: row.is_system_default,
    isActive: row.is_active,
    totalRuns: row.total_runs || 0,
    successRate: parseFloat(row.success_rate) || 0,
    avgDurationMs: row.avg_duration_ms || 0,
    lastRunAt: row.last_run_at,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Fetch all agent definitions
export function useAgentDefinitions(options?: { domain?: AgentDomain; activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['agent-definitions', options],
    queryFn: async () => {
      let query = supabase
        .from('agent_definitions')
        .select('*')
        .order('domain', { ascending: true })
        .order('name', { ascending: true });
      
      if (options?.domain) {
        query = query.eq('domain', options.domain);
      }
      
      if (options?.activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(transformAgent);
    },
  });
}

// Fetch single agent definition
export function useAgentDefinition(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ['agent-definition', idOrSlug],
    queryFn: async () => {
      if (!idOrSlug) return null;
      
      // Try by ID first, then by slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      
      const { data, error } = await supabase
        .from('agent_definitions')
        .select('*')
        .eq(isUuid ? 'id' : 'slug', idOrSlug)
        .single();
      
      if (error) throw error;
      return transformAgent(data);
    },
    enabled: !!idOrSlug,
  });
}

// Create agent definition
export function useCreateAgentDefinition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agent: Partial<AgentDefinition>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const insertData: Record<string, unknown> = {
        slug: agent.slug,
        name: agent.name,
        domain: agent.domain,
        type: agent.type || 'monitoring',
        description: agent.description,
        icon: agent.icon || 'Bot',
        inputs: agent.inputs || [],
        outputs: agent.outputs || [],
        tools: agent.tools || [],
        kpi_bindings: agent.kpiBindings || [],
        safety_rules: agent.safetyRules || [],
        runtime_config: agent.runtimeConfig || {},
        owner_id: user.id,
        is_system_default: false,
      };
      
      const { data, error } = await supabase
        .from('agent_definitions')
        .insert(insertData as any)
        .select()
        .single();
      
      if (error) throw error;
      return transformAgent(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] });
      toast.success('Agent created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create agent: ${error.message}`);
    },
  });
}

// Update agent definition
export function useUpdateAgentDefinition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AgentDefinition> }) => {
      const updateData: AgentDefinitionUpdate = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.inputs !== undefined) updateData.inputs = updates.inputs as unknown as Json;
      if (updates.outputs !== undefined) updateData.outputs = updates.outputs as unknown as Json;
      if (updates.tools !== undefined) updateData.tools = updates.tools as unknown as Json;
      if (updates.kpiBindings !== undefined) updateData.kpi_bindings = updates.kpiBindings as unknown as Json;
      if (updates.safetyRules !== undefined) updateData.safety_rules = updates.safetyRules as Json;
      if (updates.runtimeConfig !== undefined) updateData.runtime_config = updates.runtimeConfig as Json;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      const { data, error } = await supabase
        .from('agent_definitions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformAgent(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['agent-definition', variables.id] });
      toast.success('Agent updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update agent: ${error.message}`);
    },
  });
}

// Delete agent definition
export function useDeleteAgentDefinition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_definitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] });
      toast.success('Agent deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete agent: ${error.message}`);
    },
  });
}

// Get agent stats summary
export function useAgentDefinitionsStats() {
  return useQuery({
    queryKey: ['agent-definitions-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_definitions')
        .select('domain, type, is_active, total_runs, success_rate');
      
      if (error) throw error;
      
      const agents = data || [];
      return {
        total: agents.length,
        active: agents.filter(a => a.is_active).length,
        byDomain: agents.reduce((acc, a) => {
          acc[a.domain] = (acc[a.domain] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byType: agents.reduce((acc, a) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalRuns: agents.reduce((sum, a) => sum + (a.total_runs || 0), 0),
        avgSuccessRate: agents.length > 0 
          ? agents.reduce((sum, a) => sum + parseFloat(String(a.success_rate || '0')), 0) / agents.length 
          : 0,
      };
    },
  });
}
