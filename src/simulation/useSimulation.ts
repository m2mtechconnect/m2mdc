/**
 * useSimulation React Hook
 * Provides reactive access to the Data Centre Simulation Engine
 * Now supports Blueprint scenarios as authoritative source
 * Includes performance instrumentation for simulationLoopTime tracking
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
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import type { 
  SimulationState, 
  SimulationEvent, 
  KPISnapshot,
  SimulationStatus,
  ScenarioDefinition,
  CustomScenarioConfig,
} from './types';
import type { SimulationScenarioBlueprint } from '@/types/dataCentreBlueprint';

// Industry-accurate baseline KPIs for Sovereign Green AI Data Centre
// Sources: Uptime Institute, ASHRAE, NRCan, Hydro-Québec carbon data
const DEFAULT_BASELINE_KPIS: Record<string, number> = {
  // PUE: Uptime Institute avg 1.57, best-in-class <1.2, our target 1.25 for AI workloads
  pue: 1.25,
  // GPU Utilization: Industry avg 40-60%, well-managed 70-85%, our target 76%
  gpuUtilization: 76,
  // Thermal Stability: Based on ASHRAE A1 compliance (18-27°C), our score 91%
  thermalStabilityScore: 91,
  // Power Reliability: Tier III 99.982%, our UPS/generator redundancy score 97%
  powerReliabilityScore: 97,
  // Sovereignty: 100% Canadian compute (PIPEDA compliant)
  sovereignComplianceScore: 100,
  // Emissions: Quebec hydro ~1.2 gCO₂/kWh vs target, currently 6% under target
  emissionsVsTarget: -6,
  // Cooling Efficiency: ASHRAE best practice 82-88%, our target 84%
  coolingEfficiencyIndex: 84,
  // Network Integrity: Tier III target 99.98%, our redundant fabric 98.5%
  networkIntegrityScore: 98.5,
  // Environmental Safety: ISO 22237 compliance score 94%
  environmentalSafetyScore: 94,
  // UPS Runtime: Tier III requires 15 min, our battery bank provides 22 min
  avgUpsRuntime: 22,
  // Carbon per GPU-hour: Quebec hydro enables 28g vs industry avg 120g
  gCo2PerGpuHour: 28,
  // Economic Efficiency: Combined energy/carbon/utilization score 86%
  economicEfficiencyScore: 86,
  // Renewable percentage: Quebec grid 97% hydro
  renewablePct: 97,
  // Sovereignty Risk Score: 0 = fully compliant (lower is better)
  sovereigntyRiskScore: 0,
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
  
  // Performance monitoring for simulation loop
  const { startTiming, endTiming, measureSync } = usePerformanceMonitor('SimulationEngine');
  
  const engineRef = useRef<SimulationEngine | null>(null);
  const tickTimingRef = useRef<number | null>(null);
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
  // Note: measureSync is for instrumentation only, not a reactive dependency
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
  
  // Initialize engine with baseline KPIs and performance instrumentation
  useEffect(() => {
    engineRef.current = getSimulationEngine(DEFAULT_BASELINE_KPIS);
    
    const unsubscribe = engineRef.current.subscribe((event) => {
      // Track simulation loop time on each tick
      if (event.type === 'tick') {
        if (tickTimingRef.current !== null) {
          endTiming(tickTimingRef.current);
        }
        tickTimingRef.current = startTiming('simulationLoopTime', 'simulation');
      }
      
      if (event.type === 'state-change' || event.type === 'tick') {
        setState(engineRef.current!.getState());
      }
      
      // End timing on simulation complete
      if (event.type === 'scenario-complete') {
        if (tickTimingRef.current !== null) {
          endTiming(tickTimingRef.current);
          tickTimingRef.current = null;
        }
      }
    });
    
    return () => {
      unsubscribe();
      if (tickTimingRef.current !== null) {
        endTiming(tickTimingRef.current);
        tickTimingRef.current = null;
      }
    };
    // startTiming and endTiming are now stable, no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
