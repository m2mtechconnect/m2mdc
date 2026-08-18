import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentDefinitionRun, RunStatus } from '@/types/agentDefinition';

// Transform DB row to typed run
function transformRun(row: any): AgentDefinitionRun {
  return {
    id: row.id,
    agentDefinitionId: row.agent_definition_id,
    twinId: row.twin_id,
    userId: row.user_id,
    status: row.status as RunStatus,
    inputData: row.input_data || {},
    outputData: row.output_data || {},
    metrics: row.metrics || {},
    logs: row.logs || [],
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

export function useAgentRuns(agentId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['agent-runs', agentId, limit],
    queryFn: async () => {
      if (!agentId) return [];
      const { data, error } = await supabase
        .from('agent_definition_runs')
        .select('*')
        .eq('agent_definition_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(transformRun);
    },
    enabled: !!agentId,
    refetchInterval: 10000,
  });
}

export function useStartAgentRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ agentDefinitionId, twinId, inputData }: {
      agentDefinitionId: string;
      twinId?: string;
      inputData?: Record<string, any>;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Create a new run
      const { data, error } = await supabase
        .from('agent_definition_runs')
        .insert({
          agent_definition_id: agentDefinitionId,
          twin_id: twinId,
          user_id: user.id,
          status: 'pending',
          input_data: inputData || {},
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;

      // Truth rule: no execution backend is bound to agent definitions yet, so
      // no outcome, duration or token usage may be fabricated and written to
      // the database. The run is closed immediately with an explicit,
      // truthful reason instead of a synthetic success/failure roll.
      const startedAt = new Date(data.started_at ?? new Date().toISOString()).getTime();
      const completedAt = new Date();

      const { data: closed, error: closeError } = await supabase
        .from('agent_definition_runs')
        .update({
          status: 'failed',
          completed_at: completedAt.toISOString(),
          duration_ms: Math.max(0, completedAt.getTime() - startedAt),
          output_data: {},
          error_message:
            'Not executed: no execution backend is bound to this agent definition. No work was performed and no metrics were recorded.',
          metrics: {},
        })
        .eq('id', data.id)
        .select()
        .single();

      if (closeError) throw closeError;

      return transformRun(closed ?? data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-runs', variables.agentDefinitionId] });
    },
  });
}
