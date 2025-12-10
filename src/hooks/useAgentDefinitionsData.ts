/**
 * Hook to fetch agent definitions from the database
 * Supports twin-scoped queries when twinId is provided
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Agent } from '@/components/agents/AgentsGrid';
import { DOMAIN_INFO } from '@/types/agentDefinition';

interface AgentDefinitionsStats {
  total: number;
  active: number;
  draft: number;
  archived: number;
  avgRoi: number;
}

export function useAgentDefinitionsData(twinId?: string) {
  const query = useQuery({
    queryKey: ['agent-definitions-grid', twinId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('agent_definitions')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Scope to twin if twinId provided
      if (twinId) {
        queryBuilder = queryBuilder.eq('twin_id', twinId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data || [];
    },
  });

  // Transform to Agent format for AgentsGrid
  const agents: Agent[] = (query.data || []).map(def => {
    const domainInfo = DOMAIN_INFO[def.domain as keyof typeof DOMAIN_INFO];
    return {
      id: def.id,
      name: def.name,
      status: def.is_active ? 'active' : 'draft',
      description: def.description || '',
      domain: def.domain,
      type: def.type,
      icon: def.icon || 'Bot',
      totalRuns: def.total_runs || 0,
      successRate: def.success_rate || 0,
      avgDurationMs: def.avg_duration_ms || 0,
      lastRunAt: def.last_run_at,
      isSystemDefault: def.is_system_default || false,
      domainLabel: domainInfo?.label || def.domain,
      slug: def.slug,
      // Legacy fields for compatibility
      department: domainInfo?.label || def.domain,
      category: def.type,
      grounding: false,
      roi: def.success_rate || 0,
      lastActivity: def.last_run_at || def.updated_at || '',
      version: `v${def.version || 1}`,
    };
  });

  // Calculate stats
  const stats: AgentDefinitionsStats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    draft: agents.filter(a => a.status === 'draft').length,
    archived: agents.filter(a => a.status === 'archived').length,
    avgRoi: agents.length > 0 
      ? Math.round(agents.reduce((sum, a) => sum + (a.successRate || 0), 0) / agents.length)
      : 0,
  };

  return {
    agents,
    stats,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
