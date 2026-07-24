import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAgentSimulations(agentId: string, templateId?: string | null) {
  const useMock = false /* PR-0.1 B7: VITE_USE_MOCK_AOC removed from allowlist */;

  return useQuery({
    queryKey: ['agent-simulations', agentId, templateId] as const,
    queryFn: async () => {
      if (useMock) {
        const { getMockSimulations } = await import('@/lib/mock/simulationMockData');
        return getMockSimulations(agentId, templateId || undefined);
      }

      const result = await (supabase
        .from('agent_runs')
        .select('*') as any)
        .eq('agent_id', agentId)
        .eq('run_type', 'simulation')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data, error } = result;

      if (error) throw error;

      if ((!data || data.length === 0) && import.meta.env.DEV) {
        console.warn('[AOC Demo] No simulation runs found – falling back to mock');
        const mod = await import('@/lib/mock/simulationMockData');
        return mod.getMockSimulations(agentId, templateId || undefined);
      }

      return data || [];
    },
    refetchInterval: 30000,
    enabled: !!agentId,
  });
}

export function getSimulationSuggestions(agent: { 
  name: string; 
  description?: string | null;
  template_id?: string | null;
}): string[] {
  const name = agent.name?.toLowerCase() || '';
  const description = agent.description?.toLowerCase() || '';
  const templateId = agent.template_id?.toLowerCase() || '';
  
  // Data Centre specific suggestions
  const isDataCentre = templateId.includes('data_centre') || templateId.includes('data_center') ||
                       name.includes('data cent') || name.includes('datacent') ||
                       description.includes('data cent') || description.includes('pue') ||
                       description.includes('gpu') || description.includes('cooling');
  
  if (isDataCentre) {
    return [
      'Simulate a GPU cluster thermal spike and cooling response',
      'Show power chain failover from grid to UPS to generator',
      'Analyze carbon price shock impact on operational costs',
      'Model sovereignty violation from cross-border data transfer',
      'Simulate cooling system failure cascade across zones',
    ];
  }
  
  // Transport Canada specific suggestions
  const isTransportCanada = templateId.includes('transport_canada') || 
                            name.includes('transport canada') ||
                            description.includes('multimodal') ||
                            (description.includes('aviation') && description.includes('marine'));
  
  if (isTransportCanada) {
    return [
      'Simulate a coastal storm impacting major airports and ports',
      'Show derailment risk for western freight corridors',
      'Analyze border crossing delays at Windsor-Detroit',
      'Model CO₂ reduction from freight modal shift to rail',
      'Simulate national holiday travel surge across all modes',
    ];
  }
  
  const isBanking = name.includes('bank') || name.includes('financ') || name.includes('credit') || 
                    description.includes('bank') || description.includes('financ') || 
                    templateId.includes('bank') || templateId.includes('financ');
  
  const isCompliance = name.includes('complian') || name.includes('regulat') || name.includes('aml') ||
                       description.includes('complian') || description.includes('regulat');
  
  const isRisk = name.includes('risk') || name.includes('credit') || description.includes('risk');

  if (isBanking && isCompliance) {
    return [
      'Simulate a suspicious cross-border transfer and show how the twin flags and escalates it',
      'Run a stress test on our retail portfolio and list top 5 clients at risk of non-compliance',
      'Simulate onboarding a high-risk client and generate the KYC checklist and risk score',
      'Backtest last quarter\'s transactions to detect potential regulatory breaches',
      'Simulate a batch sanctions screening and show hit rate and false positive analysis',
    ];
  }

  if (isBanking && isRisk) {
    return [
      'Run a portfolio stress test with unemployment +15% and rates +2%',
      'Simulate evaluating a credit application from a high-risk applicant',
      'Detect fraud patterns across 1000 recent credit applications',
    ];
  }

  return [
    'Run a comprehensive stress test on this agent\'s core capabilities',
    'Simulate a complex multi-step workflow and summarize the decision path',
    'Backtest the agent\'s performance against historical data from last month',
  ];
}
