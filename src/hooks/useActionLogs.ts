import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useActionLogs(agentId: string, limit = 100) {
  return useQuery({
    queryKey: ['action-logs', agentId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_action_logs')
        .select('*')
        .eq('system_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for near real-time
  });
}
