import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type RuntimeAction = 'run' | 'pause' | 'stop' | 'restart';

export function useRuntimeControl(agentId: string) {
  const queryClient = useQueryClient();

  // Check permissions via RBAC
  const { data: hasPermission } = useQuery({
    queryKey: ['agent-permission', agentId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('user_can_access_agent', {
        check_user_id: user.id,
        check_agent_id: agentId,
        required_permission: 'operate'
      });

      if (error) {
        console.error('Permission check error:', error);
        return false;
      }

      return data === true;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const mutation = useMutation({
    mutationFn: async (action: RuntimeAction) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Check permission before attempting action
      if (!hasPermission) {
        throw new Error('You do not have permission to control this agent');
      }

      const { data, error } = await supabase.functions.invoke('aoc-runtime-action', {
        body: { agentId, action },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['twin-instance', agentId] });
      queryClient.invalidateQueries({ queryKey: ['runtime-status', agentId] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs', agentId] });
      
      const messages: Record<RuntimeAction, string> = {
        run: 'Agent started successfully',
        pause: 'Agent paused',
        stop: 'Agent stopped',
        restart: 'Agent restarted',
      };
      
      toast.success(messages[action]);
    },
    onError: (error: Error) => {
      toast.error(`Runtime control failed: ${error.message}`);
    },
  });

  return {
    ...mutation,
    hasPermission: hasPermission ?? false,
  };
}