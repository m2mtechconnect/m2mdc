/**
 * Simulation Guards - Protection layer for simulation integrity
 * 
 * Prevents:
 * - Twin switching during active simulation
 * - Starting simulation without required data
 * - Builder/recommendation store leakage into simulation
 */

import { useCallback, useEffect, useRef } from 'react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { getSimulationEngine, resetSimulationEngine } from './SimulationEngine';
import type { SimulationStatus } from './types';

export interface SimulationPreflightResult {
  canStart: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate simulation can start with current state
 */
export function useSimulationPreflight(): {
  validate: () => SimulationPreflightResult;
  isValid: boolean;
} {
  const { twin, activeTwinId } = useActiveTwin();
  
  const validate = useCallback((): SimulationPreflightResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Critical checks
    if (!activeTwinId) {
      errors.push('No twin selected - please select a Data Centre Twin from the header dropdown');
    }
    
    if (!twin) {
      errors.push('Twin data not loaded - please wait for initialization');
    }
    
    // Check for demo mode
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    if (!twin && !isDemo) {
      errors.push('Cannot start simulation without a twin or demo mode');
    }
    
    // Warning checks
    if (twin && !twin.capacity_kw) {
      warnings.push('Twin has no capacity defined - using defaults');
    }
    
    if (twin && !twin.pue_target) {
      warnings.push('No PUE target defined - using industry average');
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

/**
 * Guard against twin switching during simulation
 */
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
  
  // Detect twin switch during simulation
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

/**
 * Ensure simulation uses only twin data, not builder/recommendation stores
 */
export function useSimulationDataIsolation() {
  const { twin, activeTwinId } = useActiveTwin();
  const isPreviewMode = useRecommendationStore((s) => s.recommendation !== null);
  const builderTwinId = useDCTwinBuilderStore((s) => s.overview?.deployedTwinId);
  
  // Get clean baseline KPIs from twin only
  const getIsolatedBaseline = useCallback((): Record<string, number> => {
    // Demo mode fallback
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    
    if (isDemo && !twin) {
      // Use demo defaults
      return {
        effectivePue: 1.35,
        avgGpuUtilization: 72,
        thermalStabilityScore: 88,
        powerReliabilityScore: 95,
        sovereigntyRiskScore: 5,
        carbonNeutralProgress: 65,
        coolingEfficiencyIndex: 82,
        networkIntegrityScore: 94,
        environmentalSafetyScore: 91,
        avgUpsRuntime: 28,
        greenEnergyPct: 78,
        dataSovereigntyScore: 95,
        gpuClusterEfficiency: 85,
        coolantTempDelta: 8.5,
        rackDensityUtilization: 72,
      };
    }
    
    if (!twin) {
      console.warn('[SimulationDataIsolation] No twin available - returning empty baseline');
      return {};
    }
    
    // Build baseline from twin metadata
    const metadata = twin.metadata as Record<string, unknown> || {};
    const kpis = (metadata.kpis as Record<string, number>) || {};
    
    return {
      effectivePue: twin.pue_target || 1.35,
      avgGpuUtilization: (kpis.gpuUtilization as number) || 75,
      thermalStabilityScore: (kpis.thermalStability as number) || 85,
      powerReliabilityScore: (kpis.powerReliability as number) || 95,
      sovereigntyRiskScore: (kpis.sovereigntyRisk as number) || 10,
      carbonNeutralProgress: (kpis.carbonProgress as number) || 60,
      coolingEfficiencyIndex: (kpis.coolingEfficiency as number) || 80,
      networkIntegrityScore: (kpis.networkIntegrity as number) || 95,
      environmentalSafetyScore: (kpis.environmentalSafety as number) || 92,
      avgUpsRuntime: (kpis.upsRuntime as number) || 25,
      greenEnergyPct: twin.renewable_target_pct || 80,
      dataSovereigntyScore: (kpis.dataSovereignty as number) || 95,
      gpuClusterEfficiency: (kpis.gpuEfficiency as number) || 85,
      coolantTempDelta: (kpis.coolantDelta as number) || 8,
      rackDensityUtilization: (kpis.rackDensity as number) || 70,
      ...kpis,
    };
  }, [twin]);
  
  return {
    isPreviewMode,
    isBuilderActive: builderTwinId !== undefined && builderTwinId !== activeTwinId,
    getIsolatedBaseline,
    twinId: activeTwinId,
    twin,
  };
}

/**
 * Combined simulation protection hook
 */
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
    
    if (dataIsolation.isPreviewMode) {
      if (showWarnings) {
        console.warn('[SimulationProtection] In preview mode - simulation will use recommendation data');
      }
      // Allow but warn
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
