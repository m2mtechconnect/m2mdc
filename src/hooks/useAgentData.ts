import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAgentData(agentId: string) {
  const useMock = false /* PR-0.1 B7: VITE_USE_MOCK_AOC removed from allowlist */;

  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      if (useMock) {
        const { mockAgentRuntimeStatus } = await import('@/lib/mock/aocMockData');
        return {
          id: agentId,
          name: 'Compliance Digital Twin',
          description: 'This Digital Twin mirrors the bank\'s regulatory compliance processes',
          owner_id: 'mock-user',
          status: 'active',
          version: 'vv0',
          config: mockAgentRuntimeStatus.metadata,
          deployments: [],
        };
      }

      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          deployments(*)
        `)
        .eq('id', agentId)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
}
