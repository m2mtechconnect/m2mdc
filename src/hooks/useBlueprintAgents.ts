/**
 * Hook to fetch agents from the Data Centre Twin Blueprint
 * Ensures Subsystem Agents page always mirrors the Blueprint → Agents tab
 */

import { useMemo } from 'react';
import { generateDefaultBlueprint } from '@/data/defaultBlueprint';
import type { AgentBlueprint } from '@/types/dataCentreBlueprint';
import type { Agent } from '@/components/agents/AgentsGrid';

// Map domain types to department display names
const domainToDepartment: Record<string, string> = {
  thermal_hardware: 'Thermal & Hardware',
  power_ups: 'Power & UPS',
  cooling: 'Cooling',
  network: 'Network',
  facility_safety: 'Facility & Safety',
  workload_gpu: 'Workload & GPU',
  sovereignty: 'Sovereignty',
  financial_carbon: 'Financial & Carbon',
};

// Map agent types to categories
const typeToCategory: Record<string, string> = {
  monitoring: 'Monitoring',
  control: 'Control',
  analytics: 'Analytics',
  incident: 'Incident Response',
};

/**
 * Transform blueprint agents to AgentsGrid-compatible format
 */
function transformBlueprintAgent(agent: AgentBlueprint): Agent {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    department: domainToDepartment[agent.domain] || agent.domain,
    category: typeToCategory[agent.type] || agent.type,
    status: agent.status || 'active',
    grounding: true, // Blueprint agents are grounded by default
    roi: 0, // Will be calculated from real data
    lastActivity: new Date().toISOString(),
    totalRuns: 0,
    successRate: 100,
    version: '1.0.0',
    type: 'agent',
    twinType: 'twin',
  };
}

export interface BlueprintAgentsResult {
  agents: Agent[];
  stats: {
    total: number;
    active: number;
    draft: number;
    archived: number;
    avgRoi: number;
  };
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to get agents synced with the Data Centre Twin Blueprint
 */
export function useBlueprintAgents(twinId?: string): BlueprintAgentsResult {
  const result = useMemo(() => {
    try {
      // Generate the default blueprint (or fetch by twinId in future)
      const blueprint = generateDefaultBlueprint(twinId || 'default');
      
      // Transform blueprint agents to grid-compatible format
      const agents = blueprint.agents.map(transformBlueprintAgent);
      
      // Calculate stats
      const activeCount = agents.filter(a => a.status === 'active').length;
      const draftCount = agents.filter(a => a.status === 'draft').length;
      const archivedCount = agents.filter(a => a.status === 'archived').length;
      
      return {
        agents,
        stats: {
          total: agents.length,
          active: activeCount,
          draft: draftCount,
          archived: archivedCount,
          avgRoi: 0,
        },
        isLoading: false,
        error: null,
      };
    } catch (error) {
      return {
        agents: [],
        stats: { total: 0, active: 0, draft: 0, archived: 0, avgRoi: 0 },
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load blueprint agents',
      };
    }
  }, [twinId]);
  
  return result;
}
