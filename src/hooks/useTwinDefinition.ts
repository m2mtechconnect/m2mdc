/**
 * useTwinDefinition - Unified hook for twin configuration
 * Reads from dcTwinBuilderStore (draft mode) or data_centre_twins table (persisted)
 * Single source of truth for twin region, industry, agents, KPIs
 */

import { useMemo } from 'react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { AgentId, mapArchetypeAgentId } from '@/domain/greenDc/agentsCatalog';
import { KPIKey } from '@/domain/greenDc/kpiCatalog';

export interface TwinDefinition {
  // Identity
  twinId: string | null;
  twinName: string;
  customerName: string;
  
  // Location & Industry
  region: string;
  city: string;
  country: string;
  industry: string;
  industries: string[];
  
  // Capacity & Tier
  capacityKw: number;
  tier: string;
  
  // Sovereignty
  sovereigntyLevel: string;
  sovereignCompliance: boolean;
  
  // Agents & KPIs (normalized IDs)
  enabledAgentIds: AgentId[];
  enabledKpiKeys: KPIKey[];
  
  // Renewable & Carbon
  renewablePercent: number;
  carbonIntensity: number;
  
  // Status
  isDeployed: boolean;
  isDraft: boolean;
  loading: boolean;
}

/**
 * Hook to get unified twin definition from store or database
 * @param twinId - Optional twin ID. If not provided, uses builder store or active twin context
 */
export function useTwinDefinition(twinId?: string): TwinDefinition {
  const { twin: activeTwin, isLoading: twinLoading } = useActiveTwin();
  const builderStore = useDCTwinBuilderStore();
  
  // Determine which source to use
  const effectiveTwinId = twinId || activeTwin?.id || builderStore.overview.deployedTwinId;
  
  return useMemo(() => {
    // If we have an active twin from context, use it
    if (activeTwin && (effectiveTwinId === activeTwin.id)) {
      // Parse metadata for additional config
      const metadata = (activeTwin.metadata as Record<string, any>) || {};
      
      return {
        twinId: activeTwin.id,
        twinName: activeTwin.name,
        customerName: metadata.customerName || activeTwin.name.replace(' Sovereign Green AI Data Centre Twin', ''),
        
        region: activeTwin.region_code || 'ca-central-1',
        city: activeTwin.city,
        country: metadata.country || 'Canada',
        industry: activeTwin.industry || 'data_centre',
        industries: metadata.industries || [activeTwin.industry || 'data_centre'],
        
        capacityKw: activeTwin.capacity_kw,
        tier: activeTwin.tier,
        
        sovereigntyLevel: activeTwin.sovereignty_level || 'standard',
        sovereignCompliance: !!activeTwin.sovereignty_level,
        
        enabledAgentIds: (metadata.enabledAgents || []).map((id: string) => mapArchetypeAgentId(id)),
        enabledKpiKeys: (metadata.enabledKpis || []) as KPIKey[],
        
        renewablePercent: activeTwin.renewable_target_pct || 50,
        carbonIntensity: activeTwin.carbon_intensity || 30,
        
        isDeployed: !!metadata.deployedAt || !!activeTwin.created_at,
        isDraft: false,
        loading: twinLoading,
      };
    }
    
    // Otherwise, use builder store (draft mode)
    const overview = builderStore.overview;
    const agents = builderStore.agents;
    const kpis = builderStore.kpis;
    
    // Map agent IDs to AgentId enum
    const enabledAgentIds = agents
      .filter(a => a.enabled)
      .map(a => mapArchetypeAgentId(a.id));
    
    // Map KPI IDs to KPIKey enum
    const enabledKpiKeys = kpis
      .filter(k => k.enabled)
      .map(k => k.id as KPIKey);
    
    // Extract region from deployment config
    const region = builderStore.deployment.targetDeploymentRegion || 'ca-central-1';
    
    return {
      twinId: overview.deployedTwinId || null,
      twinName: overview.twinName,
      customerName: overview.customerName || '',
      
      region,
      city: overview.facilityLocation || 'Montreal',
      country: 'Canada', // Default to Canada for now
      industry: overview.industry || 'data_centre',
      industries: overview.industries || ['data_centre'],
      
      capacityKw: overview.capacityKw,
      tier: overview.tier,
      
      sovereigntyLevel: overview.sovereignCompliance ? 'sovereign' : 'standard',
      sovereignCompliance: overview.sovereignCompliance || false,
      
      enabledAgentIds,
      enabledKpiKeys,
      
      renewablePercent: overview.renewablePercent || 50,
      carbonIntensity: 30, // Default for Canadian grid
      
      isDeployed: !!overview.deployedTwinId,
      isDraft: !overview.deployedTwinId,
      loading: builderStore.isLoading,
    };
  }, [activeTwin, effectiveTwinId, builderStore, twinLoading]);
}

/**
 * Helper to check if twin matches a specific region pattern
 */
export function matchesRegion(twinRegion: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('-*')) {
    const prefix = pattern.slice(0, -1); // 'CA-' from 'CA-*'
    return twinRegion.toUpperCase().startsWith(prefix.toUpperCase());
  }
  return twinRegion.toLowerCase() === pattern.toLowerCase();
}

/**
 * Helper to check if twin matches a specific industry
 */
export function matchesIndustry(twinIndustries: string[], pattern: string): boolean {
  if (pattern === '*') return true;
  return twinIndustries.some(ind => 
    ind.toLowerCase() === pattern.toLowerCase() ||
    ind.toLowerCase().includes(pattern.toLowerCase())
  );
}
