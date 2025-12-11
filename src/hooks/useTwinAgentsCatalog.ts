/**
 * useTwinAgents - Hook to get agents for a twin using the centralized catalog
 * Single source of truth for agent data across all pages
 */

import { useMemo } from 'react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { 
  AGENT_CATALOG, 
  AgentId, 
  type AgentDefinitionCatalog,
  getAgentById,
  getAgentsForIndustry,
} from '@/domain/greenDc/agentsCatalog';

export interface UseTwinAgentsResult {
  // All agents from catalog
  allAgents: AgentDefinitionCatalog[];
  // Agents enabled for this twin
  enabledAgents: AgentDefinitionCatalog[];
  // Agent IDs that are enabled
  enabledAgentIds: string[];
  // Check if an agent is enabled
  isAgentEnabled: (agentId: AgentId | string) => boolean;
  // Industry-specific agents
  industryAgents: AgentDefinitionCatalog[];
  // Loading state
  loading: boolean;
}

/**
 * Hook to get agents for the current twin using centralized catalog
 */
export function useTwinAgents(): UseTwinAgentsResult {
  const { twin } = useActiveTwin();
  const builderStore = useDCTwinBuilderStore();

  // Get enabled agent IDs from builder store
  const enabledAgentIds = useMemo(() => {
    return builderStore.agents
      .filter(a => a.enabled)
      .map(a => a.id);
  }, [builderStore.agents]);

  // Get industry from twin or builder
  const industry = twin?.industry || builderStore.overview.industry || 'generic_enterprise_green_twin';

  // All agents from catalog
  const allAgents = useMemo(() => Object.values(AGENT_CATALOG), []);

  // Enabled agents mapped to catalog definitions
  const enabledAgents = useMemo(() => {
    return enabledAgentIds
      .map(id => getAgentById(id))
      .filter((a): a is AgentDefinitionCatalog => a !== undefined);
  }, [enabledAgentIds]);

  // Industry-specific agents
  const industryAgents = useMemo(() => {
    return getAgentsForIndustry(industry);
  }, [industry]);

  // Check if agent is enabled
  const isAgentEnabled = (agentId: AgentId | string): boolean => {
    return enabledAgentIds.includes(agentId);
  };

  return {
    allAgents,
    enabledAgents,
    enabledAgentIds,
    isAgentEnabled,
    industryAgents,
    loading: false,
  };
}

/**
 * Hook to get agents with their bound KPIs
 */
export function useAgentKPIBindings(twinId?: string) {
  const { enabledAgents } = useTwinAgents();
  
  // Import dynamically to avoid circular deps
  const { useTwinKPIsFromSimulation } = require('./useTwinKPIsFromSimulation');
  const { kpis } = useTwinKPIsFromSimulation(twinId);

  return useMemo(() => {
    return enabledAgents.map(agent => {
      const boundKpis = agent.kpiKeys.map(key => ({
        key,
        value: kpis[key] ?? null,
      }));

      return {
        agent,
        kpis: boundKpis,
      };
    });
  }, [enabledAgents, kpis]);
}
