/**
 * useBlueprintAgents - Hook to Fetch Agents from Data Centre Twin Blueprint
 * Ensures Subsystem Agents page always mirrors the Blueprint → Agents tab
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * DATA CENTER AGENT ARCHITECTURES:
 * - NVIDIA DGX Cloud Agent-Based Monitoring
 *   https://docs.nvidia.com/dgx-cloud/
 * - Schneider Electric EcoStruxure IT Expert
 *   https://www.se.com/ww/en/work/solutions/for-business/data-centers-and-networks/discover-ecostruxure-it/
 * - Vertiv Trellis Platform Agent Architecture
 *   https://www.vertiv.com/en-us/products-catalog/monitoring-control-and-management/software/
 * 
 * SUBSYSTEM AGENT DOMAINS:
 * - Thermal: ASHRAE TC 9.9 Thermal Guidelines
 *   https://tc0909.ashraetcs.org/documents.php
 * - Power: IEEE 493 Industrial Power Systems
 *   https://standards.ieee.org/standard/493-2007.html
 * - Cooling: ASHRAE Handbook - HVAC Applications (Data Centers Chapter)
 *   https://www.ashrae.org/technical-resources/ashrae-handbook
 * - Network: Cisco Data Center Network Design Guide
 *   https://www.cisco.com/c/en/us/td/docs/solutions/Enterprise/Data_Center/DC_3_0/DC-3_0_Design.html
 * - Sovereignty: PIPEDA & Canadian Data Residency Requirements
 *   https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/
 * 
 * AGENT STATUS & LIFECYCLE:
 * - ITIL Agent Management Best Practices
 *   https://www.axelos.com/certifications/itil-service-management
 * - Prometheus Service Discovery Patterns
 *   https://prometheus.io/docs/prometheus/latest/configuration/configuration/#service_discovery
 * 
 * REACT PATTERNS:
 * - React useMemo for Expensive Transformations
 *   https://react.dev/reference/react/useMemo
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { generateDefaultBlueprint } from '@/data/defaultBlueprint';
import type { AgentBlueprint } from '@/types/dataCentreBlueprint';
import type { Agent } from '@/components/agents/AgentsGrid';
import type { UnifiedItem } from '@/components/unified-dashboard/UnifiedItemCard';

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
    grounding: true,
    roi: 0,
    lastActivity: new Date().toISOString(),
    totalRuns: 0,
    successRate: 100,
    version: '1.0.0',
    type: 'agent',
    twinType: 'twin',
  };
}

/**
 * Transform blueprint agents to UnifiedItem format for Dashboard
 */
function transformToUnifiedItem(agent: AgentBlueprint): UnifiedItem {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    department: domainToDepartment[agent.domain] || agent.domain,
    category: typeToCategory[agent.type] || agent.type,
    status: agent.status || 'active',
    grounding: true,
    roi: 0,
    lastActivity: new Date().toISOString(),
    totalRuns: 0,
    successRate: 100,
    version: '1.0.0',
    type: 'agent',
  };
}

export interface BlueprintAgentsResult {
  agents: Agent[];
  unifiedItems: UnifiedItem[];
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
      const blueprint = generateDefaultBlueprint(twinId || 'default');
      const agents = blueprint.agents.map(transformBlueprintAgent);
      const unifiedItems = blueprint.agents.map(transformToUnifiedItem);
      
      const activeCount = agents.filter(a => a.status === 'active').length;
      const draftCount = agents.filter(a => a.status === 'draft').length;
      const archivedCount = agents.filter(a => a.status === 'archived').length;
      
      return {
        agents,
        unifiedItems,
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
        unifiedItems: [],
        stats: { total: 0, active: 0, draft: 0, archived: 0, avgRoi: 0 },
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load blueprint agents',
      };
    }
  }, [twinId]);
  
  return result;
}
