/**
 * Hook for managing Sovereign DC Twin state and operations
 */

import { useState, useCallback, useMemo } from 'react';
import type { 
  SovereignDCFacility, 
  SimulationRun, 
  SimulationType,
  SovereignKpis 
} from '@/types/sovereignDataCenterTwin';
import { 
  runSimulation, 
  createSimulationRun 
} from '../simulationEngine';
import { 
  getDemoFacilityById, 
  getDemoSimulationRuns,
  telusSovereignFacility
} from '../mockData';
import { useAnalytics } from '@/hooks/useAnalytics';

interface UseSovereignDCTwinOptions {
  facilityId?: string;
  useMockData?: boolean;
}

export function useSovereignDCTwin(options: UseSovereignDCTwinOptions = {}) {
  const { facilityId, useMockData = true } = options;
  const { trackEvent } = useAnalytics();

  // State
  const [facility, setFacility] = useState<SovereignDCFacility | null>(() => {
    if (useMockData) {
      return getDemoFacilityById(facilityId || telusSovereignFacility.id) || null;
    }
    return null;
  });

  const [simulationRuns, setSimulationRuns] = useState<SimulationRun[]>(() => {
    if (useMockData && facility) {
      return getDemoSimulationRuns(facility.id);
    }
    return [];
  });

  const [currentKpis, setCurrentKpis] = useState<SovereignKpis | null>(
    facility?.baseKpis || null
  );
  const [previousKpis, setPreviousKpis] = useState<SovereignKpis | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeScenario, setActiveScenario] = useState<SimulationType | null>(null);

  // Run a simulation scenario
  const runScenario = useCallback(async (type: SimulationType, params?: Record<string, any>) => {
    if (!facility || !currentKpis) return;

    setIsSimulating(true);
    setActiveScenario(type);
    setPreviousKpis(currentKpis);

    // Track analytics
    trackEvent('simulation_run', {
      agentId: facility.id,
      action: 'sovereign_dc_simulation_run',
      environment: 'simulation',
      duration: 0,
      simulationType: type
    });

    // Simulate delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Run simulation
    const result = runSimulation(currentKpis, type, params, facility);
    
    // Apply deltas to KPIs
    const newKpis: SovereignKpis = {
      sovereignComputeRatioPct: currentKpis.sovereignComputeRatioPct + (result.kpiDeltas.sovereignComputeRatioPct || 0),
      effectiveAiPue: currentKpis.effectiveAiPue + (result.kpiDeltas.effectiveAiPue || 0),
      gco2PerGpuHour: currentKpis.gco2PerGpuHour + (result.kpiDeltas.gco2PerGpuHour || 0),
      sovereignRiskScore: currentKpis.sovereignRiskScore + (result.kpiDeltas.sovereignRiskScore || 0),
      economicEfficiencyScore: currentKpis.economicEfficiencyScore + (result.kpiDeltas.economicEfficiencyScore || 0),
      renewableRatioPct: currentKpis.renewableRatioPct,
      carbonIntensityKgPerMwh: currentKpis.carbonIntensityKgPerMwh,
      totalGpuCount: currentKpis.totalGpuCount,
      activeWorkloads: currentKpis.activeWorkloads
    };

    setCurrentKpis(newKpis);

    // Create simulation run record
    const newRun = createSimulationRun(facility.id, type, params || {}, result);
    setSimulationRuns(prev => [newRun, ...prev]);

    setIsSimulating(false);
    setActiveScenario(null);

    return { newKpis, run: newRun };
  }, [facility, currentKpis, trackEvent]);

  // Reset to baseline
  const resetToBaseline = useCallback(() => {
    if (facility) {
      setPreviousKpis(currentKpis);
      setCurrentKpis(facility.baseKpis);
    }
  }, [facility, currentKpis]);

  // Switch facility
  const switchFacility = useCallback((newFacilityId: string) => {
    const newFacility = getDemoFacilityById(newFacilityId);
    if (newFacility) {
      setFacility(newFacility);
      setCurrentKpis(newFacility.baseKpis);
      setPreviousKpis(null);
      setSimulationRuns(getDemoSimulationRuns(newFacility.id));
    }
  }, []);

  // Computed values
  const facilityStats = useMemo(() => {
    if (!facility) return null;
    
    const totalGpus = facility.gpuClusters.reduce((sum, c) => sum + c.gpuCount, 0);
    const sovereignGpus = facility.gpuClusters
      .filter(c => c.isSovereign)
      .reduce((sum, c) => sum + c.gpuCount, 0);
    const avgUtilization = facility.gpuClusters.reduce((sum, c) => sum + c.avgUtilizationPct, 0) / facility.gpuClusters.length;

    return {
      totalGpus,
      sovereignGpus,
      avgUtilization,
      totalDataFlows: facility.dataFlows.length,
      sovereignDataFlows: facility.dataFlows.filter(f => f.sovereign).length,
      incidentCount: facility.incidentScenarios.length
    };
  }, [facility]);

  return {
    // Data
    facility,
    currentKpis,
    previousKpis,
    simulationRuns,
    facilityStats,
    
    // State
    isSimulating,
    activeScenario,
    
    // Actions
    runScenario,
    resetToBaseline,
    switchFacility
  };
}
