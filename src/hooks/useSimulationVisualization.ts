/**
 * useSimulationVisualization - Bridge between Simulation Engine and 3D Visualization
 * 
 * CRITICAL: This hook connects the SimulationEngine tick events to the visualization layer,
 * ensuring racks animate based on scenario events and KPI changes propagate to 3D.
 * 
 * Data Flow:
 * 1. SimulationEngine emits tick/event-emitted events
 * 2. This hook receives those events and transforms them into visual updates
 * 3. Racks, thermal zones, and power segments update in real-time
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSimulationEngine } from '@/simulation/SimulationEngine';
import type { SimulationEvent, SimulationEngineEvent, KPISnapshot } from '@/simulation/types';
import type { RackVisual, ThermalZoneVisual, PowerSegmentVisual } from '@/components/twin-visualization/types';
import { getKpiValue } from '@/lib/kpiKeyMap';

export interface SimulationVisualizationState {
  /** Whether simulation is actively running */
  isSimulating: boolean;
  
  /** Current simulation time in seconds */
  currentTime: number;
  
  /** Current simulation progress (0-1) */
  progress: number;
  
  /** Active scenario ID */
  activeScenarioId: string | null;
  
  /** Rack IDs currently affected by simulation events */
  affectedRackIds: Set<string>;
  
  /** Zone IDs currently affected by thermal events */
  affectedZoneIds: Set<string>;
  
  /** Current KPI values from simulation */
  currentKpis: Record<string, number>;
  
  /** Simulation events for timeline */
  events: SimulationEvent[];
  
  /** KPI snapshots for charts */
  kpiSnapshots: KPISnapshot[];
  
  /** Last tick timestamp for interpolation */
  lastTickTime: number;
  
  /** GPU load delta for rack visualization */
  gpuLoadDelta: number;
  
  /** Thermal delta for zone visualization */
  thermalDelta: number;
  
  /** Power delta for power flow visualization */
  powerDelta: number;
}

export interface UseSimulationVisualizationReturn extends SimulationVisualizationState {
  /** Apply simulation effects to rack visuals */
  applyRackEffects: (racks: RackVisual[]) => RackVisual[];
  
  /** Apply simulation effects to thermal zones */
  applyThermalEffects: (zones: ThermalZoneVisual[]) => ThermalZoneVisual[];
  
  /** Apply simulation effects to power segments */
  applyPowerEffects: (segments: PowerSegmentVisual[]) => PowerSegmentVisual[];
  
  /** Seek simulation to specific time */
  seekToTime: (timeSeconds: number) => void;
}

const DEFAULT_STATE: SimulationVisualizationState = {
  isSimulating: false,
  currentTime: 0,
  progress: 0,
  activeScenarioId: null,
  affectedRackIds: new Set(),
  affectedZoneIds: new Set(),
  currentKpis: {},
  events: [],
  kpiSnapshots: [],
  lastTickTime: 0,
  gpuLoadDelta: 0,
  thermalDelta: 0,
  powerDelta: 0,
};

export function useSimulationVisualization(): UseSimulationVisualizationReturn {
  const [state, setState] = useState<SimulationVisualizationState>(DEFAULT_STATE);
  
  // Subscribe to simulation engine events
  useEffect(() => {
    const engine = getSimulationEngine();
    
    const handleEvent = (event: SimulationEngineEvent) => {
      if (event.type === 'tick') {
        const payload = event.payload as {
          currentTime: number;
          progress: number;
          currentKpis: Record<string, number>;
        };
        
        setState(prev => ({
          ...prev,
          isSimulating: true,
          currentTime: payload.currentTime,
          progress: payload.progress,
          currentKpis: payload.currentKpis,
          lastTickTime: Date.now(),
          // Calculate deltas for visualization effects using centralized key mapping
          gpuLoadDelta: getKpiValue(payload.currentKpis, 'gpuUtilization', 0) - 
                       getKpiValue(prev.currentKpis, 'gpuUtilization', 0),
          thermalDelta: getKpiValue(payload.currentKpis, 'thermalStabilityScore', 0) - 
                       getKpiValue(prev.currentKpis, 'thermalStabilityScore', 0),
          powerDelta: getKpiValue(payload.currentKpis, 'pue', 0) - 
                     getKpiValue(prev.currentKpis, 'pue', 0),
        }));
      }
      
      if (event.type === 'event-emitted') {
        const simEvent = event.payload as SimulationEvent;
        
        setState(prev => {
          const newAffectedRacks = new Set(prev.affectedRackIds);
          const newAffectedZones = new Set(prev.affectedZoneIds);
          
          // Add affected racks from this event
          simEvent.affectedRacks?.forEach(rackId => newAffectedRacks.add(rackId));
          simEvent.affectedZones?.forEach(zoneId => newAffectedZones.add(zoneId));
          
          return {
            ...prev,
            affectedRackIds: newAffectedRacks,
            affectedZoneIds: newAffectedZones,
            events: [...prev.events, simEvent],
          };
        });
      }
      
      if (event.type === 'state-change') {
        const engineState = engine.getState();
        
        setState(prev => ({
          ...prev,
          isSimulating: engineState.status === 'running',
          activeScenarioId: engineState.activeScenarioId,
          events: engineState.events,
          kpiSnapshots: engineState.kpiSnapshots,
        }));
      }
      
      if (event.type === 'scenario-start') {
        const payload = event.payload as { scenarioId: string };
        
        setState(prev => ({
          ...prev,
          isSimulating: true,
          activeScenarioId: payload.scenarioId,
          affectedRackIds: new Set(),
          affectedZoneIds: new Set(),
          events: [],
          kpiSnapshots: [],
          currentTime: 0,
          progress: 0,
        }));
      }
      
      if (event.type === 'scenario-complete') {
        setState(prev => ({
          ...prev,
          isSimulating: false,
          progress: 1,
        }));
      }
    };
    
    const unsubscribe = engine.subscribe(handleEvent);
    
    // Sync initial state
    const initialState = engine.getState();
    setState(prev => ({
      ...prev,
      isSimulating: initialState.status === 'running',
      activeScenarioId: initialState.activeScenarioId,
      currentKpis: initialState.currentKpis,
      events: initialState.events,
      kpiSnapshots: initialState.kpiSnapshots,
      currentTime: initialState.currentTime,
    }));
    
    return unsubscribe;
  }, []);
  
  // Apply simulation effects to rack visuals
  const applyRackEffects = useCallback((racks: RackVisual[]): RackVisual[] => {
    if (!state.isSimulating) return racks;
    
    return racks.map(rack => {
      const isAffected = state.affectedRackIds.has(rack.id);
      
      // Calculate effect based on KPI changes
      const utilizationBoost = state.gpuLoadDelta > 0 ? state.gpuLoadDelta * 0.5 : 0;
      const thermalBoost = state.thermalDelta < 0 ? Math.abs(state.thermalDelta) * 0.3 : 0;
      
      return {
        ...rack,
        isAffected,
        utilizationPercent: Math.min(100, rack.utilizationPercent + (isAffected ? utilizationBoost + 15 : utilizationBoost)),
        thermalCelsius: rack.thermalCelsius + (isAffected ? thermalBoost + 3 : thermalBoost),
        isCritical: rack.isCritical || (isAffected && state.thermalDelta < -5),
      };
    });
  }, [state.isSimulating, state.affectedRackIds, state.gpuLoadDelta, state.thermalDelta]);
  
  // Apply simulation effects to thermal zones
  const applyThermalEffects = useCallback((zones: ThermalZoneVisual[]): ThermalZoneVisual[] => {
    if (!state.isSimulating) return zones;
    
    return zones.map(zone => {
      const isAffected = state.affectedZoneIds.has(zone.id);
      const thermalBoost = state.thermalDelta < 0 ? Math.abs(state.thermalDelta) * 0.2 : 0;
      
      return {
        ...zone,
        avgCelsius: zone.avgCelsius + (isAffected ? thermalBoost + 2 : thermalBoost),
        hotspot: zone.hotspot || (isAffected && zone.avgCelsius > 26),
      };
    });
  }, [state.isSimulating, state.affectedZoneIds, state.thermalDelta]);
  
  // Apply simulation effects to power segments
  const applyPowerEffects = useCallback((segments: PowerSegmentVisual[]): PowerSegmentVisual[] => {
    if (!state.isSimulating) return segments;
    
    // Use centralized key mapping for PUE lookup
    const pueEffect = getKpiValue(state.currentKpis, 'pue', 1.3);
    const powerLoadMultiplier = 1 + (pueEffect - 1.3) * 0.5;
    
    return segments.map(segment => ({
      ...segment,
      loadKw: segment.loadKw * powerLoadMultiplier,
      isDegraded: segment.isDegraded || (pueEffect > 1.5),
    }));
  }, [state.isSimulating, state.currentKpis]);
  
  // Seek to specific time
  const seekToTime = useCallback((timeSeconds: number) => {
    const engine = getSimulationEngine();
    engine.seekTo(timeSeconds);
  }, []);
  
  return {
    ...state,
    applyRackEffects,
    applyThermalEffects,
    applyPowerEffects,
    seekToTime,
  };
}
