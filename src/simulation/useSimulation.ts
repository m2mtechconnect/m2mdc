/**
 * useSimulation React Hook
 * Provides reactive access to the Data Centre Simulation Engine
 * Now supports Blueprint scenarios as authoritative source
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  SimulationEngine, 
  getSimulationEngine, 
} from './SimulationEngine';
import { 
  getScenarioById, 
  PRESET_SCENARIOS,
  registerScenario,
} from './scenarioRegistry';
import { createCustomScenario } from './customScenarioBuilder';
import { convertAllBlueprintScenarios } from './blueprintScenarioAdapter';
import type { 
  SimulationState, 
  SimulationEvent, 
  KPISnapshot,
  SimulationStatus,
  ScenarioDefinition,
  CustomScenarioConfig,
} from './types';
import type { SimulationScenarioBlueprint } from '@/types/dataCentreBlueprint';

// Default baseline KPIs for Data Centre simulation
const DEFAULT_BASELINE_KPIS: Record<string, number> = {
  pue: 1.38,
  gpuUtilization: 72,
  thermalStabilityScore: 94,
  powerReliabilityScore: 98,
  sovereignComplianceScore: 100,
  emissionsVsTarget: 8,
  coolingEfficiencyIndex: 87,
  networkIntegrityScore: 99,
  environmentalSafetyScore: 96,
  avgUpsRuntime: 45,
};

export interface UseSimulationOptions {
  /** Blueprint scenarios to merge with presets */
  blueprintScenarios?: SimulationScenarioBlueprint[];
}

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
  blueprintScenarios: ScenarioDefinition[];
  customScenarios: ScenarioDefinition[];
  allScenarios: ScenarioDefinition[];
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

export function useSimulation(options: UseSimulationOptions = {}): UseSimulationReturn {
  const { blueprintScenarios: blueprintScenariosRaw = [] } = options;
  
  const engineRef = useRef<SimulationEngine | null>(null);
  const [state, setState] = useState<SimulationState>({
    status: 'idle',
    currentTime: 0,
    timeScale: 1,
    activeScenarioId: null,
    events: [],
    kpiSnapshots: [],
    baselineKpis: DEFAULT_BASELINE_KPIS,
    currentKpis: { ...DEFAULT_BASELINE_KPIS },
  });
  
  const [customScenarios, setCustomScenarios] = useState<ScenarioDefinition[]>([]);
  const presetScenarios = PRESET_SCENARIOS;
  
  // Convert Blueprint scenarios to Simulation format
  const blueprintScenarios = useMemo(() => {
    return convertAllBlueprintScenarios(blueprintScenariosRaw);
  }, [blueprintScenariosRaw]);
  
  // Register Blueprint scenarios with the engine
  useEffect(() => {
    blueprintScenarios.forEach(scenario => {
      registerScenario(scenario);
    });
  }, [blueprintScenarios]);
  
  // Combine all scenarios
  const allScenarios = useMemo(() => {
    const combined = [...presetScenarios, ...blueprintScenarios, ...customScenarios];
    // Deduplicate by ID (Blueprint scenarios override presets with same ID)
    const uniqueMap = new Map<string, ScenarioDefinition>();
    combined.forEach(s => uniqueMap.set(s.id, s));
    return Array.from(uniqueMap.values());
  }, [presetScenarios, blueprintScenarios, customScenarios]);
  
  // Initialize engine with baseline KPIs
  useEffect(() => {
    engineRef.current = getSimulationEngine(DEFAULT_BASELINE_KPIS);
    
    const unsubscribe = engineRef.current.subscribe((event) => {
      if (event.type === 'state-change' || event.type === 'tick') {
        setState(engineRef.current!.getState());
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Get active scenario from all available scenarios
  const activeScenario = state.activeScenarioId 
    ? allScenarios.find(s => s.id === state.activeScenarioId) || null
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
    blueprintScenarios,
    customScenarios,
    allScenarios,
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
