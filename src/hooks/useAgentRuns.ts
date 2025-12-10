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
      
      // Simulate agent execution (in a real app, this would trigger an edge function)
      setTimeout(async () => {
        const completed = Math.random() > 0.1; // 90% success rate
        const duration = Math.floor(Math.random() * 3000) + 500;
        
        await supabase
          .from('agent_definition_runs')
          .update({
            status: completed ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
            output_data: completed ? { result: 'Agent completed successfully' } : null,
            error_message: completed ? null : 'Simulated failure',
            metrics: { tokensUsed: Math.floor(Math.random() * 1000) + 100 },
          })
          .eq('id', data.id);
        
        queryClient.invalidateQueries({ queryKey: ['agent-runs', agentDefinitionId] });
      }, 2000);
      
      return transformRun(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-runs', variables.agentDefinitionId] });
    },
  });
}
