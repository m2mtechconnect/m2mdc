/**
 * CoPilot Simulation Context Hook
 * Provides rich context for CoPilot when in Simulation mode
 * 
 * CRITICAL: Prioritizes ActiveTwinContext (header dropdown) as source of truth
 * Falls back to builder store only for preview/sandbox modes
 */

import { useMemo } from 'react';
import { useTwinContext } from '@/hooks/useTwinContext';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';

interface SimulationState {
  isRunning: boolean;
  activeScenarioKey: string | null;
  activeScenarioName?: string;
  currentTime: number;
  progress: number;
  currentKpis: Record<string, number>;
  baselineKpis: Record<string, number>;
  events: Array<{
    id: string;
    timestamp: number;
    type: string;
    severity: string;
    title: string;
  }>;
}

interface UseCoPilotSimulationContextOptions {
  simulationState?: SimulationState;
  runId?: string;
}

export function useCoPilotSimulationContext(options: UseCoPilotSimulationContextOptions = {}) {
  const { simulationState, runId } = options;
  const { activeTwin, activeTwinId, isPreviewMode, recommendation } = useTwinContext();
  
  const overview = useDCTwinBuilderStore((s) => s.overview);
  const scenarios = useDCTwinBuilderStore((s) => s.scenarios);
  const kpis = useDCTwinBuilderStore((s) => s.kpis);
  const agents = useDCTwinBuilderStore((s) => s.agents);

  const hasSimulationContext = !!simulationState?.activeScenarioKey;

  // Derive twin name using priority: activeTwin > recommendation preview > builder store
  const effectiveTwinName = useMemo(() => {
    if (activeTwin?.name) return activeTwin.name;
    if (isPreviewMode && recommendation?.companyName) {
      return `${recommendation.companyName} Sovereign Green AI Data Centre Twin`;
    }
    return overview?.twinName || 'Data Centre Twin';
  }, [activeTwin, isPreviewMode, recommendation, overview]);

  const effectiveIndustry = useMemo(() => {
    if (activeTwin?.industry) return activeTwin.industry;
    if (isPreviewMode && recommendation?.industry) return recommendation.industry;
    return overview?.industry || undefined;
  }, [activeTwin, isPreviewMode, recommendation, overview]);

  const effectiveRegion = useMemo(() => {
    if (activeTwin?.region_code) return activeTwin.region_code;
    if (isPreviewMode && recommendation?.regions?.[0]) return recommendation.regions[0];
    return overview?.regionCode;
  }, [activeTwin, isPreviewMode, recommendation, overview]);

  const contextSummary = useMemo(() => {
    if (!simulationState?.activeScenarioKey) return null;
    
    const scenario = scenarios.find(s => s.id === simulationState.activeScenarioKey);
    const progress = Math.round(simulationState.progress * 100);
    
    return {
      scenarioName: scenario?.name || simulationState.activeScenarioKey,
      progress,
      isRunning: simulationState.isRunning,
      eventCount: simulationState.events.length,
      criticalCount: simulationState.events.filter(e => e.severity === 'critical').length,
    };
  }, [simulationState, scenarios]);

  // Build a simplified context object for CoPilot
  const simulationContextPayload = useMemo(() => {
    if (!simulationState) return null;

    const activeScenario = scenarios.find(s => s.id === simulationState.activeScenarioKey);

    return {
      mode: 'simulation' as const,
      twinId: activeTwinId || '',
      twinName: effectiveTwinName,
      industry: effectiveIndustry,
      region: effectiveRegion,
      activeScenarioId: simulationState.activeScenarioKey,
      activeScenarioName: activeScenario?.name,
      progress: simulationState.progress,
      currentTime: simulationState.currentTime,
      isRunning: simulationState.isRunning,
      currentKpis: simulationState.currentKpis,
      baselineKpis: simulationState.baselineKpis,
      recentEvents: simulationState.events.slice(-10),
      enabledAgents: agents.filter(a => a.enabled).map(a => ({ id: a.id, name: a.name })),
      enabledKpis: kpis.filter(k => k.enabled).map(k => ({ id: k.id, name: k.name })),
    };
  }, [simulationState, activeTwinId, effectiveTwinName, effectiveIndustry, effectiveRegion, scenarios, kpis, agents]);

  return {
    simulationContextPayload,
    hasSimulationContext,
    contextSummary,
    twinId: activeTwinId,
    twinName: effectiveTwinName,
  };
}
