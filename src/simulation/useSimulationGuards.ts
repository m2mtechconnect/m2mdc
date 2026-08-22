/**
 * Simulation Guards - protection layer for simulation integrity.
 *
 * Prevents:
 * - Twin switching during active simulation
 * - Starting a non-demo simulation without required twin data
 * - Builder/recommendation store leakage into simulation
 *
 * Explicit `?demo=true` is the only path allowed to use a bundled baseline.
 * Demo output remains non-authoritative and is classified separately by the
 * simulation fidelity contract.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { getSimulationEngine, resetSimulationEngine } from './SimulationEngine';
import { normalizeKpiRecord } from '@/lib/kpiKeyMap';

export interface SimulationPreflightResult {
  canStart: boolean;
  errors: string[];
  warnings: string[];
}

function isExplicitDemoMode(): boolean {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('demo') === 'true'
  );
}

/** Validate simulation can start with current state. */
export function useSimulationPreflight(): {
  validate: () => SimulationPreflightResult;
  isValid: boolean;
} {
  const { twin, activeTwinId } = useActiveTwin();

  const validate = useCallback((): SimulationPreflightResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const isDemo = isExplicitDemoMode();

    if (!isDemo) {
      if (!activeTwinId) {
        errors.push('No twin selected - please select a Data Centre Twin from the header dropdown');
      }

      if (!twin) {
        errors.push('Twin data not loaded - please wait for initialization');
      }
    } else {
      warnings.push('Demo mode uses a bundled non-authoritative baseline; results are not runs of record');
    }

    if (twin && !twin.capacity_kw) {
      warnings.push('Twin has no capacity defined - model may use an engineering fallback');
    }

    if (twin && !twin.pue_target) {
      warnings.push('Twin has no PUE target defined - model may use an engineering fallback');
    }

    return {
      canStart: errors.length === 0,
      errors,
      warnings,
    };
  }, [twin, activeTwinId]);

  const result = validate();

  return {
    validate,
    isValid: result.canStart,
  };
}

/** Guard against twin switching during simulation. */
export function useTwinSwitchGuard(): {
  isLocked: boolean;
  lockReason: string | null;
  forceUnlock: () => void;
} {
  const { activeTwinId } = useActiveTwin();
  const lockedTwinId = useRef<string | null>(null);
  const isRunning = useRef(false);

  useEffect(() => {
    const engine = getSimulationEngine();

    const unsubscribe = engine.subscribe((event) => {
      if (event.type === 'scenario-start') {
        lockedTwinId.current = activeTwinId;
        isRunning.current = true;
      }

      if (event.type === 'scenario-complete' || event.type === 'state-change') {
        const state = engine.getState();
        if (state.status === 'idle' || state.status === 'completed') {
          lockedTwinId.current = null;
          isRunning.current = false;
        }
      }
    });

    return unsubscribe;
  }, [activeTwinId]);

  useEffect(() => {
    if (isRunning.current && lockedTwinId.current && activeTwinId !== lockedTwinId.current) {
      console.warn('[SimulationGuard] Twin switched during active simulation - resetting engine');
      resetSimulationEngine();
      lockedTwinId.current = null;
      isRunning.current = false;
    }
  }, [activeTwinId]);

  const forceUnlock = useCallback(() => {
    resetSimulationEngine();
    lockedTwinId.current = null;
    isRunning.current = false;
  }, []);

  return {
    isLocked: isRunning.current && lockedTwinId.current !== null,
    lockReason: isRunning.current ? 'Simulation in progress' : null,
    forceUnlock,
  };
}

/** Ensure simulation uses only twin data, not builder/recommendation stores. */
export function useSimulationDataIsolation() {
  const { twin, activeTwinId } = useActiveTwin();
  const isPreviewMode = useRecommendationStore((s) => s.recommendation !== null);
  const builderTwinId = useDCTwinBuilderStore((s) => s.overview?.deployedTwinId);

  const getIsolatedBaseline = useCallback((): Record<string, number> => {
    const isDemo = isExplicitDemoMode();

    if (isDemo && !twin) {
      return normalizeKpiRecord({
        pue: 1.35,
        gpuUtilization: 72,
        thermalStabilityScore: 88,
        powerReliabilityScore: 95,
        sovereigntyRiskScore: 5,
        carbonNeutralProgress: 65,
        coolingEfficiencyIndex: 82,
        networkIntegrityScore: 94,
        environmentalSafetyScore: 91,
        avgUpsRuntime: 28,
        renewablePct: 78,
        dataSovereigntyScore: 95,
        gpuClusterEfficiency: 85,
        coolantTempDelta: 8.5,
        rackDensityUtilization: 72,
      });
    }

    if (!twin) {
      // Fail closed. The caller decides how to surface AURA_SIM_BASELINE_REQUIRED.
      return {};
    }

    const metadata = (twin.metadata as Record<string, unknown>) || {};
    const kpis = (metadata.kpis as Record<string, number>) || {};

    // These fallbacks preserve existing scenario compatibility for partially
    // populated twins. The fidelity layer marks such runs as engineering
    // estimates until complete, verified facility inputs are available.
    return normalizeKpiRecord({
      pue: twin.pue_target || 1.35,
      gpuUtilization: (kpis.gpuUtilization as number) || 75,
      thermalStabilityScore: (kpis.thermalStability as number) || 85,
      powerReliabilityScore: (kpis.powerReliability as number) || 95,
      sovereigntyRiskScore: (kpis.sovereigntyRisk as number) || 10,
      carbonNeutralProgress: (kpis.carbonProgress as number) || 60,
      coolingEfficiencyIndex: (kpis.coolingEfficiency as number) || 80,
      networkIntegrityScore: (kpis.networkIntegrity as number) || 95,
      environmentalSafetyScore: (kpis.environmentalSafety as number) || 92,
      avgUpsRuntime: (kpis.upsRuntime as number) || 25,
      renewablePct: twin.renewable_target_pct || 80,
      dataSovereigntyScore: (kpis.dataSovereignty as number) || 95,
      gpuClusterEfficiency: (kpis.gpuEfficiency as number) || 85,
      coolantTempDelta: (kpis.coolantDelta as number) || 8,
      rackDensityUtilization: (kpis.rackDensity as number) || 70,
      ...kpis,
    });
  }, [twin]);

  return {
    isPreviewMode,
    isBuilderActive: builderTwinId !== undefined && builderTwinId !== activeTwinId,
    getIsolatedBaseline,
    twinId: activeTwinId,
    twin,
  };
}

/** Combined simulation protection hook. */
export function useSimulationProtection() {
  const preflight = useSimulationPreflight();
  const switchGuard = useTwinSwitchGuard();
  const dataIsolation = useSimulationDataIsolation();

  const canStartSimulation = useCallback((showWarnings = false): boolean => {
    const result = preflight.validate();

    if (!result.canStart) {
      if (showWarnings) {
        console.error('[SimulationProtection] Cannot start:', result.errors);
      }
      return false;
    }

    if (dataIsolation.isPreviewMode && showWarnings) {
      console.warn(
        '[SimulationProtection] Recommendation preview is non-authoritative; simulation data remains isolated from the recommendation store',
      );
    }

    if (result.warnings.length > 0 && showWarnings) {
      console.warn('[SimulationProtection] Warnings:', result.warnings);
    }

    return true;
  }, [preflight, dataIsolation]);

  return {
    preflight,
    switchGuard,
    dataIsolation,
    canStartSimulation,
  };
}
