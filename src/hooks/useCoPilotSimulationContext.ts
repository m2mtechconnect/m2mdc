/**
 * CoPilot Simulation Context Hook
 * Provides rich context for CoPilot when in Simulation mode
 * P0 fix: Ensures CoPilot is context-aware during simulation
 */

import { useMemo } from 'react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
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
  const { twin, activeTwinId } = useActiveTwin();
  
  const overview = useDCTwinBuilderStore((s) => s.overview);
  const scenarios = useDCTwinBuilderStore((s) => s.scenarios);
  const kpis = useDCTwinBuilderStore((s) => s.kpis);
  const agents = useDCTwinBuilderStore((s) => s.agents);

  const hasSimulationContext = !!simulationState?.activeScenarioKey;

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
      twinName: twin?.name || overview.twinName,
      industry: twin?.industry || overview.industry || undefined,
      region: twin?.region_code || overview.regionCode,
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
  }, [simulationState, activeTwinId, twin, overview, scenarios, kpis, agents]);

  return {
    simulationContextPayload,
    hasSimulationContext,
    contextSummary,
    twinId: activeTwinId,
    twinName: twin?.name || overview.twinName,
  };
}
