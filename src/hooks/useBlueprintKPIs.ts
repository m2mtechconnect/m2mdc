/**
 * useBlueprintKPIs - Hook to get KPI definitions from Blueprint
 * Provides reactive access to blueprint KPIs with grouping and lookup utilities
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * KPI DEFINITION STANDARDS:
 * - The Green Grid Data Center Metrics Library
 *   https://www.thegreengrid.org/en/resources/library-and-tools
 *   PUE, DCiE, WUE, CUE, ERE definitions and calculation methods
 * - Uptime Institute Performance Metrics Guide
 *   https://uptimeinstitute.com/resources
 * - ISO 30134 Data Centre Key Performance Indicators
 *   https://www.iso.org/standard/62773.html
 * 
 * DOMAIN-SPECIFIC KPI BENCHMARKS:
 * - ASHRAE TC 9.9 Thermal Guidelines (Thermal KPIs)
 *   https://tc0909.ashraetcs.org/documents.php
 * - IEEE 493 Industrial Power Systems (Power KPIs)
 *   https://standards.ieee.org/standard/493-2007.html
 * - NVIDIA Data Center GPU Metrics (Workload KPIs)
 *   https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/feature-overview.html
 * 
 * REACT PATTERNS:
 * - React useMemo Optimization Patterns
 *   https://react.dev/reference/react/useMemo
 * - Custom Hooks Best Practices
 *   https://react.dev/learn/reusing-logic-with-custom-hooks
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
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
