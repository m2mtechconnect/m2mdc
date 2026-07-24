import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAgentMetrics(agentId: string, timeRange: '1h' | '24h' | '7d' | '30d' = '24h') {
  const useMock = false /* PR-0.1 B7: VITE_USE_MOCK_AOC removed from allowlist */;

  return useQuery({
    queryKey: ['agent-metrics', agentId, timeRange],
    queryFn: async () => {
      if (useMock) {
        const { mockAgentRuns } = await import('@/lib/mock/aocMockData');
        const totalRuns = mockAgentRuns.length;
        const successfulRuns = mockAgentRuns.filter(r => r.status === 'completed').length;
        const failedRuns = mockAgentRuns.filter(r => r.status === 'failed').length;
        const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
        const durations = mockAgentRuns.filter(r => r.duration_ms).map(r => r.duration_ms!);
        const avgDuration = durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

        return {
          totalRuns,
          successfulRuns,
          failedRuns,
          successRate: Math.round(successRate * 10) / 10,
          avgDuration: Math.round(avgDuration),
          timeRange,
        };
      }

      const now = new Date();
      const timeRanges = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30,
      };
      
      const hoursAgo = timeRanges[timeRange];
      const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();

      // Fetch runs in time range
      const { data: runs, error } = await supabase
        .from('agent_runs')
        .select('status, duration_ms, created_at')
        .eq('agent_id', agentId)
        .gte('created_at', startTime)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Dev fallback
      if ((!runs || runs.length === 0) && import.meta.env.DEV) {
        console.warn('[AOC Demo] No runs found – falling back to mock metrics');
        const { mockAgentRuns } = await import('@/lib/mock/aocMockData');
        const totalRuns = mockAgentRuns.length;
        const successfulRuns = mockAgentRuns.filter(r => r.status === 'completed').length;
        const failedRuns = mockAgentRuns.filter(r => r.status === 'failed').length;
        const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
        const durations = mockAgentRuns.filter(r => r.duration_ms).map(r => r.duration_ms!);
        const avgDuration = durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

        return {
          totalRuns,
          successfulRuns,
          failedRuns,
          successRate: Math.round(successRate * 10) / 10,
          avgDuration: Math.round(avgDuration),
          timeRange,
        };
      }

      // Calculate metrics
      const totalRuns = runs?.length || 0;
      const successfulRuns = runs?.filter(r => r.status === 'completed').length || 0;
      const failedRuns = runs?.filter(r => r.status === 'error').length || 0;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
      
      const durations = runs?.filter(r => r.duration_ms).map(r => r.duration_ms!) || [];
      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;

      return {
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate: Math.round(successRate * 10) / 10,
        avgDuration: Math.round(avgDuration),
        timeRange,
      };
    },
    refetchInterval: 30000,
  });
}
