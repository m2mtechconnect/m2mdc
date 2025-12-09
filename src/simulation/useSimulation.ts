/**
 * useSimulation React Hook
 * Provides reactive access to the Data Centre Simulation Engine
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SimulationEngine, 
  getSimulationEngine, 
} from './SimulationEngine';
import { 
  getScenarioById, 
  PRESET_SCENARIOS,
} from './scenarioRegistry';
import { createCustomScenario } from './customScenarioBuilder';
import type { 
  SimulationState, 
  SimulationEvent, 
  KPISnapshot,
  SimulationStatus,
  ScenarioDefinition,
  CustomScenarioConfig,
} from './types';

export interface UseSimulationReturn {
  // State
  status: SimulationStatus;
  currentTime: number;
  timeScale: 1 | 2 | 5 | 10;
  activeScenarioId: string | null;
  events: SimulationEvent[];
  kpiSnapshots: KPISnapshot[];
  currentKpis: Record<string, number>;
  baselineKpis: Record<string, number>;
  
  // Scenarios
  presetScenarios: ScenarioDefinition[];
  customScenarios: ScenarioDefinition[];
  activeScenario: ScenarioDefinition | null;
  
  // Actions
  startScenario: (scenarioId: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setTimeScale: (scale: 1 | 2 | 5 | 10) => void;
  createCustomScenario: (config: CustomScenarioConfig) => ScenarioDefinition;
  addCustomScenario: (scenario: ScenarioDefinition) => void;
  
  // Progress
  progress: number; // 0-100
  remainingTime: number; // seconds
  elapsedTime: number; // seconds
}

export function useSimulation(): UseSimulationReturn {
  const engineRef = useRef<SimulationEngine | null>(null);
  const [state, setState] = useState<SimulationState>({
    status: 'idle',
    currentTime: 0,
    timeScale: 1,
    activeScenarioId: null,
    events: [],
    kpiSnapshots: [],
    baselineKpis: {},
    currentKpis: {},
  });
  
  const [customScenarios, setCustomScenarios] = useState<ScenarioDefinition[]>([]);
  const presetScenarios = PRESET_SCENARIOS;
  
  // Initialize engine
  useEffect(() => {
    engineRef.current = getSimulationEngine();
    
    const unsubscribe = engineRef.current.subscribe((event) => {
      if (event.type === 'state-change' || event.type === 'tick') {
        setState(engineRef.current!.getState());
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Get active scenario
  const activeScenario = state.activeScenarioId 
    ? getScenarioById(state.activeScenarioId) || customScenarios.find(s => s.id === state.activeScenarioId) || null
    : null;
  
  // Calculate progress
  const scenarioDuration = activeScenario?.durationSeconds || 1;
  const progress = Math.min(100, (state.currentTime / scenarioDuration) * 100);
  const elapsedTime = state.currentTime;
  const remainingTime = Math.max(0, scenarioDuration - state.currentTime);
  
  // Actions
  const startScenario = useCallback((scenarioId: string) => {
    if (engineRef.current) {
      engineRef.current.startScenario(scenarioId);
    }
  }, []);
  
  const pause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
  }, []);
  
  const resume = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
    }
  }, []);
  
  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
  }, []);
  
  const setTimeScale = useCallback((scale: 1 | 2 | 5 | 10) => {
    if (engineRef.current) {
      engineRef.current.setTimeScale(scale);
    }
  }, []);
  
  const handleCreateCustomScenario = useCallback((config: CustomScenarioConfig): ScenarioDefinition => {
    return createCustomScenario(config);
  }, []);
  
  const addCustomScenario = useCallback((scenario: ScenarioDefinition) => {
    setCustomScenarios(prev => [...prev, { ...scenario, isCustom: true }]);
  }, []);
  
  return {
    // State
    status: state.status,
    currentTime: state.currentTime,
    timeScale: state.timeScale,
    activeScenarioId: state.activeScenarioId,
    events: state.events,
    kpiSnapshots: state.kpiSnapshots,
    currentKpis: state.currentKpis,
    baselineKpis: state.baselineKpis,
    
    // Scenarios
    presetScenarios,
    customScenarios,
    activeScenario,
    
    // Actions
    startScenario,
    pause,
    resume,
    reset,
    setTimeScale,
    createCustomScenario: handleCreateCustomScenario,
    addCustomScenario,
    
    // Progress
    progress,
    remainingTime,
    elapsedTime,
  };
}
