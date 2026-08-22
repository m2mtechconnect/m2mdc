/**
 * useSimulation React Hook
 * Provides reactive access to the Data Centre Simulation Engine.
 *
 * POST-REMEDIATION FIDELITY RULES:
 * - Blueprint/preset scenarios are AURA deterministic scenario models; they
 *   are not calibrated physics merely because the DSX asset model is correct.
 * - Non-demo runs require a loaded twin/facility baseline. We do not silently
 *   manufacture a full facility baseline when no twin exists.
 * - Demo mode may use the bundled baseline, and is explicitly classified as
 *   demonstration evidence by the fidelity contract.
 *
 * CRITICAL: Uses activeTwin as primary data source, NOT builder store.
 * Uses centralized KPI key mapping for consistent alias resolution.
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
import { useSimulationDataIsolation } from './useSimulationGuards';
import { normalizeKpiRecord } from '@/lib/kpiKeyMap';
import {
  assessSimulationFidelity,
  type SimulationFidelityAssessment,
} from './fidelity';
import type {
  SimulationState,
  SimulationEvent,
  KPISnapshot,
  SimulationStatus,
  ScenarioDefinition,
  CustomScenarioConfig,
} from './types';
import type { SimulationScenarioBlueprint } from '@/types/dataCentreBlueprint';

// Bundled demonstration/engineering defaults. These values are useful for
// preview/demo continuity but are NOT measured facility observations and are
// never sufficient evidence for a calibrated-physics claim.
const DEFAULT_DEMO_BASELINE_KPIS: Record<string, number> = {
  pue: 1.25,
  effectivePue: 1.25,
  gpuUtilization: 76,
  avgGpuUtilization: 76,
  thermalStabilityScore: 91,
  powerReliabilityScore: 97,
  sovereignComplianceScore: 100,
  emissionsVsTarget: -6,
  carbonNeutralProgress: 65,
  coolingEfficiencyIndex: 84,
  networkIntegrityScore: 98.5,
  environmentalSafetyScore: 94,
  avgUpsRuntime: 22,
  gCo2PerGpuHour: 28,
  economicEfficiencyScore: 86,
  renewablePct: 97,
  greenEnergyPct: 97,
  sovereigntyRiskScore: 0,
  dataSovereigntyScore: 100,
};

const BASELINE_FIDELITY_KEYS = Object.freeze(Object.keys(DEFAULT_DEMO_BASELINE_KPIS));

export interface UseSimulationOptions {
  /** Blueprint scenarios to merge with presets */
  blueprintScenarios?: SimulationScenarioBlueprint[];
  /** Twin ID for context tracking */
  twinId?: string;
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
  /** Claims boundary for the current AURA simulation path. */
  fidelity: SimulationFidelityAssessment;

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
  const { blueprintScenarios: blueprintScenariosRaw = [], twinId } = options;

  // Get isolated baseline from twin context (NOT builder store).
  const {
    getIsolatedBaseline,
    twinId: contextTwinId,
    twin,
  } = useSimulationDataIsolation();
  const effectiveTwinId = twinId || contextTwinId || undefined;
  const isDemoMode = useMemo(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('demo') === 'true',
    [],
  );

  // Performance monitoring for simulation loop
  const { startTiming, endTiming } = usePerformanceMonitor('SimulationEngine');

  const engineRef = useRef<SimulationEngine | null>(null);
  const tickTimingRef = useRef<number | null>(null);

  const baselineResolution = useMemo(() => {
    const twinBaseline = getIsolatedBaseline();
    const hasTwinBaseline = Boolean(twin) && Object.keys(twinBaseline).length > 0;

    // Fail closed when there is no facility baseline outside explicit demo mode.
    if (!hasTwinBaseline && !isDemoMode) {
      return {
        values: {} as Record<string, number>,
        hasFacilityBaseline: false,
        usesFallbackDefaults: false,
      };
    }

    if (!hasTwinBaseline && isDemoMode) {
      return {
        values: normalizeKpiRecord(DEFAULT_DEMO_BASELINE_KPIS),
        hasFacilityBaseline: false,
        usesFallbackDefaults: true,
      };
    }

    // Preserve backwards-compatible coverage for partially populated twins,
    // but record whether bundled assumptions were required. Fidelity remains
    // an engineering estimate whenever any material baseline field falls back.
    const usesFallbackDefaults = BASELINE_FIDELITY_KEYS.some(
      (key) => typeof twinBaseline[key] !== 'number' || !Number.isFinite(twinBaseline[key]),
    );
    const merged = usesFallbackDefaults
      ? { ...DEFAULT_DEMO_BASELINE_KPIS, ...twinBaseline }
      : twinBaseline;

    return {
      values: normalizeKpiRecord(merged),
      hasFacilityBaseline: true,
      usesFallbackDefaults,
    };
  }, [getIsolatedBaseline, twin, isDemoMode]);

  const baselineKpis = baselineResolution.values;

  const fidelity = useMemo(
    () =>
      assessSimulationFidelity({
        executionClass: 'aura-deterministic',
        verificationLevel: 'unverified',
        provenance: isDemoMode ? 'demo' : 'simulated',
        intent: 'preview',
        nvidiaIntegrated: false,
        hasFacilityBaseline: baselineResolution.hasFacilityBaseline,
        usesFallbackDefaults: baselineResolution.usesFallbackDefaults,
        calibrationState: 'not-calibrated',
      }),
    [baselineResolution.hasFacilityBaseline, baselineResolution.usesFallbackDefaults, isDemoMode],
  );

  const [state, setState] = useState<SimulationState>({
    status: 'idle',
    currentTime: 0,
    timeScale: 1,
    activeScenarioId: null,
    events: [],
    kpiSnapshots: [],
    baselineKpis,
    currentKpis: { ...baselineKpis },
  });

  const [customScenarios, setCustomScenarios] = useState<ScenarioDefinition[]>([]);
  const presetScenarios = PRESET_SCENARIOS;

  const blueprintScenarios = useMemo(() => {
    return convertAllBlueprintScenarios(blueprintScenariosRaw);
  }, [blueprintScenariosRaw]);

  useEffect(() => {
    blueprintScenarios.forEach((scenario) => {
      registerScenario(scenario);
    });
  }, [blueprintScenarios]);

  const allScenarios = useMemo(() => {
    const combined = [...presetScenarios, ...blueprintScenarios, ...customScenarios];
    const uniqueMap = new Map<string, ScenarioDefinition>();
    combined.forEach((s) => uniqueMap.set(s.id, s));
    return Array.from(uniqueMap.values());
  }, [presetScenarios, blueprintScenarios, customScenarios]);

  // Initialize/rebind the canonical tick engine whenever the qualified
  // baseline changes. Empty baseline is intentional outside demo mode and is
  // additionally blocked by startScenario below.
  useEffect(() => {
    engineRef.current = getSimulationEngine(baselineKpis, effectiveTwinId);
    engineRef.current.setBaselineKpis(baselineKpis);

    const unsubscribe = engineRef.current.subscribe((event) => {
      if (event.type === 'tick') {
        if (tickTimingRef.current !== null) {
          endTiming(tickTimingRef.current);
        }
        tickTimingRef.current = startTiming('simulationLoopTime', 'simulation');
      }

      if (event.type === 'state-change' || event.type === 'tick') {
        setState(engineRef.current!.getState());
      }

      if (event.type === 'scenario-complete') {
        if (tickTimingRef.current !== null) {
          endTiming(tickTimingRef.current);
          tickTimingRef.current = null;
        }
      }
    });

    setState(engineRef.current.getState());

    return () => {
      unsubscribe();
      if (tickTimingRef.current !== null) {
        endTiming(tickTimingRef.current);
        tickTimingRef.current = null;
      }
    };
    // Instrumentation callbacks are stable for the monitor instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTwinId, baselineKpis]);

  const activeScenario = state.activeScenarioId
    ? allScenarios.find((s) => s.id === state.activeScenarioId) || null
    : null;

  const scenarioDuration = activeScenario?.durationSeconds || 1;
  const progress = Math.min(100, (state.currentTime / scenarioDuration) * 100);
  const elapsedTime = state.currentTime;
  const remainingTime = Math.max(0, scenarioDuration - state.currentTime);

  const startScenario = useCallback((scenarioId: string) => {
    if (!engineRef.current) return;

    if (Object.keys(engineRef.current.getState().baselineKpis).length === 0) {
      console.error(
        '[SimulationFidelity] AURA_SIM_BASELINE_REQUIRED: refusing non-demo simulation without a loaded twin/facility baseline',
      );
      return;
    }

    engineRef.current.startScenario(scenarioId);
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const setTimeScale = useCallback((scale: 1 | 2 | 5 | 10) => {
    engineRef.current?.setTimeScale(scale);
  }, []);

  const handleCreateCustomScenario = useCallback((config: CustomScenarioConfig): ScenarioDefinition => {
    return createCustomScenario(config);
  }, []);

  const addCustomScenario = useCallback((scenario: ScenarioDefinition) => {
    setCustomScenarios((prev) => [...prev, { ...scenario, isCustom: true }]);
  }, []);

  return {
    status: state.status,
    currentTime: state.currentTime,
    timeScale: state.timeScale,
    activeScenarioId: state.activeScenarioId,
    events: state.events,
    kpiSnapshots: state.kpiSnapshots,
    currentKpis: state.currentKpis,
    baselineKpis: state.baselineKpis,
    fidelity,

    presetScenarios,
    blueprintScenarios,
    customScenarios,
    allScenarios,
    activeScenario,

    startScenario,
    pause,
    resume,
    reset,
    setTimeScale,
    createCustomScenario: handleCreateCustomScenario,
    addCustomScenario,

    progress,
    remainingTime,
    elapsedTime,
  };
}
