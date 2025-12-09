/**
 * useBlueprintKPIs - Hook to get KPI definitions from Blueprint
 */

import { useMemo } from 'react';
import { useBlueprint } from './useBlueprint';
import type { KpiBlueprint } from '@/types/dataCentreBlueprint';
import type { DomainType } from '@/types/dataCenterTwin';

interface KPIGrouped {
  domain: DomainType;
  kpis: KpiBlueprint[];
}

interface UseBlueprintKPIsReturn {
  allKpis: KpiBlueprint[];
  kpisByDomain: KPIGrouped[];
  getKpiById: (id: string) => KpiBlueprint | undefined;
  getKpisByDomain: (domain: DomainType) => KpiBlueprint[];
  getKpisByOwner: (ownerRole: string) => KpiBlueprint[];
  totalKpis: number;
  isLoading: boolean;
}

/**
 * Get KPI definitions from the Blueprint
 */
export function useBlueprintKPIs(twinId: string = 'default'): UseBlueprintKPIsReturn {
  const { blueprint, isLoading } = useBlueprint(twinId);
  
  const result = useMemo(() => {
    if (!blueprint) {
      return {
        allKpis: [],
        kpisByDomain: [],
        getKpiById: () => undefined,
        getKpisByDomain: () => [],
        getKpisByOwner: () => [],
        totalKpis: 0,
      };
    }
    
    const allKpis = blueprint.kpis;
    
    // Group KPIs by domain
    const domainMap = new Map<DomainType, KpiBlueprint[]>();
    for (const kpi of allKpis) {
      const domain = kpi.domain as DomainType;
      if (!domainMap.has(domain)) {
        domainMap.set(domain, []);
      }
      domainMap.get(domain)!.push(kpi);
    }
    
    const kpisByDomain: KPIGrouped[] = Array.from(domainMap.entries()).map(([domain, kpis]) => ({
      domain,
      kpis,
    }));
    
    // Lookup functions
    const getKpiById = (id: string) => allKpis.find(k => k.id === id);
    const getKpisByDomain = (domain: DomainType) => allKpis.filter(k => k.domain === domain);
    const getKpisByOwner = (ownerRole: string) => allKpis.filter(k => k.ownerRole === ownerRole);
    
    return {
      allKpis,
      kpisByDomain,
      getKpiById,
      getKpisByDomain,
      getKpisByOwner,
      totalKpis: allKpis.length,
    };
  }, [blueprint]);
  
  return {
    ...result,
    isLoading,
  };
}
