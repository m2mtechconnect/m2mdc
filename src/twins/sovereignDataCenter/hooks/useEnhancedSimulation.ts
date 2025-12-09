/**
 * Hook for Enhanced Sovereign DC Simulation with AI Recommendations & Multi-Run Support
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  EnhancedSimulationRunner,
  ENHANCED_SCENARIOS,
  SOVEREIGN_DC_KPI_GROUPS,
  type EnhancedSimulationType,
  type EnhancedScenario,
  type SimulationSummary
} from '../enhancedSimulationEngine';
import type { SovereignDCFacility } from '@/types/sovereignDataCenterTwin';

interface SimulationEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  severity: string;
  metadata?: Record<string, any>;
}

interface KPIUpdate {
  timestamp: string;
  kpis: Record<string, number>;
  progress?: number;
}

interface UseEnhancedSimulationOptions {
  facility?: SovereignDCFacility | null;
  onComplete?: (summary: SimulationSummary) => void;
}

export function useEnhancedSimulation(options: UseEnhancedSimulationOptions = {}) {
  const { facility, onComplete } = options;
  
  // State
  const [selectedScenario, setSelectedScenario] = useState<EnhancedScenario | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [progress, setProgress] = useState(0);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [kpiHistory, setKpiHistory] = useState<KPIUpdate[]>([]);
  const [currentKpis, setCurrentKpis] = useState<Record<string, number>>({});
  const [lastSummary, setLastSummary] = useState<SimulationSummary | null>(null);
  const [runHistory, setRunHistory] = useState<SimulationSummary[]>([]);
  
  const runnerRef = useRef<EnhancedSimulationRunner | null>(null);

  // Initialize baseline KPIs from facility or defaults
  const getBaselineKpis = useCallback(() => {
    const baseline: Record<string, number> = {};
    
    SOVEREIGN_DC_KPI_GROUPS.forEach(group => {
      group.kpis.forEach(kpi => {
        baseline[kpi.key] = kpi.baseline;
      });
    });

    // Override with facility-specific values if available
    if (facility?.baseKpis) {
      const fkpis = facility.baseKpis;
      baseline.sovereignComputeRatioPct = fkpis.sovereignComputeRatioPct;
      baseline.effectiveAiPue = fkpis.effectiveAiPue;
      baseline.gco2PerGpuHour = fkpis.gco2PerGpuHour;
      baseline.sovereignRiskScore = fkpis.sovereignRiskScore;
      baseline.economicEfficiencyScore = fkpis.economicEfficiencyScore;
      baseline.renewableMix = fkpis.renewableRatioPct;
    }

    return baseline;
  }, [facility]);

  // Start simulation
  const startSimulation = useCallback((scenarioId: EnhancedSimulationType) => {
    const scenario = ENHANCED_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    // Clean up previous runner
    if (runnerRef.current) {
      runnerRef.current.stop();
    }

    // Reset state
    setSelectedScenario(scenario);
    setEvents([]);
    setKpiHistory([]);
    setProgress(0);
    setLastSummary(null);

    // Create new runner
    const baselineKpis = getBaselineKpis();
    setCurrentKpis(baselineKpis);
    
    const runner = new EnhancedSimulationRunner(scenario, baselineKpis);
    runnerRef.current = runner;

    // Subscribe to events
    runner.on('event', (event: SimulationEvent) => {
      setEvents(prev => [...prev, event]);
    });

    runner.on('kpi-update', (update: KPIUpdate) => {
      setKpiHistory(prev => [...prev, update]);
      setCurrentKpis(update.kpis);
      if (update.progress !== undefined) {
        setProgress(update.progress);
      }
    });

    runner.on('complete', (summary: SimulationSummary) => {
      setIsRunning(false);
      setProgress(100);
      setLastSummary(summary);
      setRunHistory(prev => [...prev, summary]);
      onComplete?.(summary);
    });

    // Start
    runner.setSpeed(speed);
    runner.start();
    setIsRunning(true);
  }, [getBaselineKpis, speed, onComplete]);

  // Pause simulation
  const pauseSimulation = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.pause();
      setIsRunning(false);
    }
  }, []);

  // Resume simulation
  const resumeSimulation = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.start();
      setIsRunning(true);
    }
  }, []);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.reset();
    }
    setIsRunning(false);
    setProgress(0);
    setEvents([]);
    setKpiHistory([]);
    setLastSummary(null);
    setCurrentKpis(getBaselineKpis());
  }, [getBaselineKpis]);

  // Change speed
  const changeSpeed = useCallback((newSpeed: 1 | 2 | 4) => {
    setSpeed(newSpeed);
    if (runnerRef.current) {
      runnerRef.current.setSpeed(newSpeed);
    }
  }, []);

  // Run scenario (convenience wrapper)
  const runScenario = useCallback(async (scenarioId: EnhancedSimulationType) => {
    if (isRunning) {
      pauseSimulation();
    }
    startSimulation(scenarioId);
  }, [isRunning, pauseSimulation, startSimulation]);

  // Clear run history
  const clearHistory = useCallback(() => {
    setRunHistory([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (runnerRef.current) {
        runnerRef.current.stop();
      }
    };
  }, []);

  return {
    // Available scenarios
    scenarios: ENHANCED_SCENARIOS,
    kpiGroups: SOVEREIGN_DC_KPI_GROUPS,
    
    // Current state
    selectedScenario,
    isRunning,
    speed,
    progress,
    events,
    kpiHistory,
    currentKpis,
    
    // Results
    lastSummary,
    runHistory,
    
    // Actions
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    runScenario,
    changeSpeed,
    clearHistory,
  };
}
