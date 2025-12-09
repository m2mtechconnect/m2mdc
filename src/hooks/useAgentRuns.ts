import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAgentRuns(agentId: string, limit = 50) {
  return useQuery({
    queryKey: ['agent-runs', agentId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
