import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeActionLogs(agentId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`action-logs-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_action_logs',
          filter: `system_id=eq.${agentId}`,
        },
        () => {
          // Invalidate and refetch action logs when new log is inserted
          queryClient.invalidateQueries({ queryKey: ['action-logs', agentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, queryClient]);
}
