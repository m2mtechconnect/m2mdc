/**
 * Data Centre Simulation Engine
 * Core engine for running scenarios with tick-based updates
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * DIGITAL TWIN SIMULATION STANDARDS:
 * - ISO 23247:2021 Digital Twin Framework for Manufacturing
 *   https://www.iso.org/standard/75066.html
 * - NVIDIA Omniverse Digital Twin Platform (Real-time simulation architecture)
 *   https://developer.nvidia.com/omniverse
 * - Microsoft Azure Digital Twins (Event-driven twin modeling)
 *   https://learn.microsoft.com/en-us/azure/digital-twins/
 * 
 * DATA CENTER SIMULATION METHODOLOGIES:
 * - Uptime Institute M&O Stamp - Scenario Testing Requirements
 *   https://uptimeinstitute.com/tier-certification/management-operations
 * - Schneider Electric Data Center Simulation Best Practices (White Paper 142)
 *   https://www.se.com/ww/en/download/document/SPD_VAVR-5WKLPK_EN/
 * - ASHRAE TC 9.9 Thermal Guidelines for Data Processing Environments
 *   https://tc0909.ashraetcs.org/documents.php
 * 
 * TICK-BASED SIMULATION PATTERNS:
 * - Game Engine Architecture - Tick/Update Loop Design (Jason Gregory)
 *   ISBN: 978-1138035454
 * - Real-Time Systems Design Principles (Hermann Kopetz)
 *   ISBN: 978-1441982360
 * - Discrete Event Simulation Modeling (Jerry Banks)
 *   ISBN: 978-0131446793
 * 
 * KPI SNAPSHOT & TIME-SERIES DATA:
 * - Prometheus Monitoring System - Time-Series Best Practices
 *   https://prometheus.io/docs/practices/naming/
 * - InfluxDB Time Series Data Modeling
 *   https://docs.influxdata.com/influxdb/v2.0/write-data/best-practices/
 * - OpenTelemetry Metrics Specification
 *   https://opentelemetry.io/docs/specs/otel/metrics/
 * 
 * SCENARIO EXECUTION & STATE MANAGEMENT:
 * - State Pattern (Gang of Four Design Patterns)
 *   ISBN: 978-0201633610
 * - Redux State Management Architecture
 *   https://redux.js.org/understanding/thinking-in-redux/three-principles
 * - XState Finite State Machines
 *   https://xstate.js.org/docs/
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  SimulationState,
  SimulationEvent,
  KPISnapshot,
  SimulationStatus,
  SimulationListener,
  SimulationEngineEvent,
  ScenarioDefinition,
} from './types';
import { getScenarioById } from './scenarioRegistry';
import { 
  normalizeKpiKey, 
  expandKpiKey, 
  getKpiValue,
  normalizeKpiRecord,
  deepCloneState,
} from '@/lib/kpiKeyMap';

// ============================================================================
// DEFAULT STATE
// ============================================================================

const createDefaultState = (): SimulationState => ({
  status: 'idle',
  currentTime: 0,
  timeScale: 1,
  activeScenarioId: null,
  events: [],
  kpiSnapshots: [],
  baselineKpis: {},
  currentKpis: {},
});

// ============================================================================
// SIMULATION ENGINE CLASS
// ============================================================================

export class SimulationEngine {
  private state: SimulationState;
  private listeners: Set<SimulationListener> = new Set();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;
  private activeScenario: ScenarioDefinition | null = null;
  private processedStepIndices: Set<number> = new Set();
  private twinId: string | null = null;
  private tickCount: number = 0;
  private readonly TICK_THROTTLE = 2; // Emit every 2nd tick at 30fps = 15fps visual updates

  constructor(baselineKpis: Record<string, number> = {}, twinId?: string) {
    // Normalize baseline KPIs to ensure all aliases are populated
    const normalizedBaseline = normalizeKpiRecord(baselineKpis);
    this.state = {
      ...createDefaultState(),
      baselineKpis: normalizedBaseline,
      currentKpis: { ...normalizedBaseline },
    };
    this.twinId = twinId || null;
  }

  /**
   * Set the twin ID for context tracking
   */
  setTwinId(twinId: string | null): void {
    // If changing twin during simulation, reset
    if (this.twinId && twinId !== this.twinId && this.state.status === 'running') {
      console.warn('[SimulationEngine] Twin changed during simulation - resetting');
      this.reset();
    }
    this.twinId = twinId;
  }

  /**
   * Get current twin ID
   */
  getTwinId(): string | null {
    return this.twinId;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Validate before starting simulation
   */
  private validatePrestart(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check baseline KPIs exist
    if (Object.keys(this.state.baselineKpis).length === 0) {
      errors.push('No baseline KPIs configured');
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Start a scenario by ID
   */
  startScenario(scenarioId: string): boolean {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      console.error(`[SimulationEngine] Scenario not found: ${scenarioId}`);
      return false;
    }

    // Run preflight validation
    const validation = this.validatePrestart();
    if (!validation.valid) {
      console.warn('[SimulationEngine] Preflight warnings:', validation.errors);
      // Continue with defaults but log warnings
    }

    // Reset state for new scenario
    this.reset();
    this.activeScenario = scenario;
    this.processedStepIndices.clear();

    // Update state - ensure deep copy of baseline
    this.state.status = 'running';
    this.state.activeScenarioId = scenarioId;
    // Deep copy baseline to current, ensuring all aliases are populated
    this.state.currentKpis = normalizeKpiRecord(this.state.baselineKpis);

    // Start tick loop
    this.startTickLoop();

    // Emit start event with twinId context
    this.emit({
      type: 'scenario-start',
      payload: { scenarioId, scenario, twinId: this.twinId },
      timestamp: Date.now(),
    });

    this.notifyStateChange();
    return true;
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (this.state.status !== 'running') return;
    
    this.state.status = 'paused';
    this.stopTickLoop();
    this.notifyStateChange();
  }

  /**
   * Resume a paused simulation
   */
  resume(): void {
    if (this.state.status !== 'paused') return;
    
    this.state.status = 'running';
    this.startTickLoop();
    this.notifyStateChange();
  }

  /**
   * Reset the simulation to initial state
   */
  reset(): void {
    this.stopTickLoop();
    
    // Deep copy baseline to ensure isolation
    const baseline = { ...this.state.baselineKpis };
    this.state = {
      ...createDefaultState(),
      baselineKpis: baseline,
      currentKpis: normalizeKpiRecord(baseline),
    };
    
    this.activeScenario = null;
    this.processedStepIndices.clear();
    
    this.notifyStateChange();
  }

  /**
   * Advance simulation by deltaMs
   * Throttled to reduce event emissions for performance
   */
  tick(deltaMs: number): void {
    if (this.state.status !== 'running' || !this.activeScenario) return;

    this.tickCount++;
    const deltaSeconds = (deltaMs / 1000) * this.state.timeScale;
    this.state.currentTime += deltaSeconds;

    // Check if simulation is complete
    if (this.state.currentTime >= this.activeScenario.durationSeconds) {
      this.completeSimulation();
      return;
    }

    // Process timeline steps (always, for accuracy)
    this.processTimelineSteps();

    // Throttle emissions for performance (emit every 3rd tick = ~20fps visual updates)
    const shouldEmit = this.tickCount % this.TICK_THROTTLE === 0;

    // Take KPI snapshot periodically (every 5 simulated seconds)
    if (Math.floor(this.state.currentTime) % 5 === 0 && shouldEmit) {
      this.takeKpiSnapshot();
    }

    // Emit tick event (throttled)
    if (shouldEmit) {
      this.emit({
        type: 'tick',
        payload: {
          currentTime: this.state.currentTime,
          progress: this.getProgress(),
          currentKpis: this.state.currentKpis,
          twinId: this.twinId,
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Set simulation time scale
   */
  setTimeScale(scale: 1 | 2 | 5 | 10): void {
    this.state.timeScale = scale;
    this.notifyStateChange();
  }

  /**
   * Seek to a specific time
   */
  seekTo(timeSeconds: number): void {
    if (!this.activeScenario) return;
    
    const targetTime = Math.max(0, Math.min(timeSeconds, this.activeScenario.durationSeconds));
    
    // Reset and replay to target time
    this.state.currentTime = 0;
    this.state.currentKpis = { ...this.state.baselineKpis };
    this.state.events = [];
    this.state.kpiSnapshots = [];
    this.processedStepIndices.clear();
    
    // Process all steps up to target time
    this.activeScenario.timeline.forEach((step, index) => {
      if (step.at <= targetTime) {
        this.processStep(step, index);
      }
    });
    
    this.state.currentTime = targetTime;
    this.takeKpiSnapshot();
    this.notifyStateChange();
  }

  /**
   * Subscribe to engine events
   */
  subscribe(listener: SimulationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state (readonly)
   * Returns a DEEP CLONE to ensure React state updates trigger re-renders
   * Optimized: Uses spread operators instead of JSON.parse/stringify for performance
   */
  getState(): Readonly<SimulationState> {
    // Spread-based cloning - faster than JSON.parse/stringify
    return {
      status: this.state.status,
      currentTime: this.state.currentTime,
      timeScale: this.state.timeScale,
      activeScenarioId: this.state.activeScenarioId,
      // Shallow clone objects - React will detect these as new references
      baselineKpis: { ...this.state.baselineKpis },
      currentKpis: { ...this.state.currentKpis },
      events: [...this.state.events],
      kpiSnapshots: [...this.state.kpiSnapshots],
    };
  }

  /**
   * Get progress (0-1)
   */
  getProgress(): number {
    if (!this.activeScenario) return 0;
    return Math.min(1, this.state.currentTime / this.activeScenario.durationSeconds);
  }

  /**
   * Update baseline KPIs - normalizes all keys and populates aliases
   */
  setBaselineKpis(kpis: Record<string, number>): void {
    const normalizedKpis = normalizeKpiRecord(kpis);
    this.state.baselineKpis = normalizedKpis;
    if (this.state.status === 'idle') {
      this.state.currentKpis = { ...normalizedKpis };
    }
  }

  /**
   * Get active scenario
   */
  getActiveScenario(): ScenarioDefinition | null {
    return this.activeScenario;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private startTickLoop(): void {
    this.stopTickLoop();
    this.lastTickTime = Date.now();
    
    // Use 30fps tick rate for better performance (instead of 60fps)
    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - this.lastTickTime;
      this.lastTickTime = now;
      this.tick(deltaMs);
    }, 1000 / 30);
  }

  private stopTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private processTimelineSteps(): void {
    if (!this.activeScenario) return;

    this.activeScenario.timeline.forEach((step, index) => {
      if (step.at <= this.state.currentTime && !this.processedStepIndices.has(index)) {
        this.processStep(step, index);
      }
    });
  }

  private processStep(step: ScenarioDefinition['timeline'][0], index: number): void {
    this.processedStepIndices.add(index);

    // Apply KPI deltas using centralized key mapping
    Object.entries(step.kpiDeltas).forEach(([key, deltaValue]) => {
      if (deltaValue === undefined || deltaValue === null) return;
      
      // Normalize the key to canonical form
      const canonical = normalizeKpiKey(key);
      
      // Get all equivalent keys (canonical + aliases)
      const allKeys = expandKpiKey(canonical);
      
      // Determine delta type and value
      // Support both simple number deltas and { type, value } objects
      let delta: number;
      let isAbsolute = false;
      
      if (typeof deltaValue === 'object') {
        const deltaObj = deltaValue as { value: number; type?: string };
        delta = deltaObj.value ?? 0;
        isAbsolute = deltaObj.type === 'absolute';
      } else {
        delta = Number(deltaValue) || 0;
      }
      
      // Apply delta to ALL equivalent keys to ensure consistency
      allKeys.forEach(k => {
        const beforeValue = getKpiValue(this.state.currentKpis, k, 0) || 
                           getKpiValue(this.state.baselineKpis, k, 0);
        
        // Apply delta (absolute or relative)
        let newValue: number;
        if (isAbsolute) {
          newValue = delta;
        } else {
          newValue = beforeValue + delta;
        }
        
        // Clamp percentage values
        if (k.includes('Pct') || k.includes('Score') || k.includes('Index') || k.includes('Progress')) {
          newValue = Math.max(0, Math.min(100, newValue));
        }
        
        // Clamp PUE to reasonable bounds (1.0 - 3.0)
        if (k === 'pue' || k === 'effectivePue') {
          newValue = Math.max(1.0, Math.min(3.0, newValue));
        }
        
        this.state.currentKpis[k] = newValue;
      });
    });

    // Create simulation event
    const event: SimulationEvent = {
      id: `event-${Date.now()}-${index}`,
      timestamp: step.at,
      type: step.type,
      domain: step.domain,
      severity: step.severity,
      title: step.eventTitle,
      description: step.eventDescription,
      affectedRacks: step.affectedRacks,
      affectedZones: step.affectedZones,
      kpiSnapshot: { ...this.state.currentKpis },
    };

    this.state.events.push(event);

    // Emit event
    this.emit({
      type: 'event-emitted',
      payload: event,
      timestamp: Date.now(),
    });

    // Emit KPI update
    this.emit({
      type: 'kpi-update',
      payload: {
        kpis: this.state.currentKpis,
        deltas: step.kpiDeltas,
      },
      timestamp: Date.now(),
    });
  }

  private takeKpiSnapshot(): void {
    // Use getKpiValue which checks all aliases
    const snapshot: KPISnapshot = {
      timestamp: this.state.currentTime,
      pue: getKpiValue(this.state.currentKpis, 'pue', 1.35),
      gpuUtilization: getKpiValue(this.state.currentKpis, 'gpuUtilization', 75),
      thermalStabilityScore: getKpiValue(this.state.currentKpis, 'thermalStabilityScore', 85),
      powerReliabilityScore: getKpiValue(this.state.currentKpis, 'powerReliabilityScore', 95),
      sovereignComplianceScore: 100 - getKpiValue(this.state.currentKpis, 'sovereigntyRiskScore', 10),
      emissionsVsTarget: getKpiValue(this.state.currentKpis, 'carbonNeutralProgress', 60),
      coolingEfficiencyIndex: getKpiValue(this.state.currentKpis, 'coolingEfficiencyIndex', 80),
      networkIntegrityScore: getKpiValue(this.state.currentKpis, 'networkIntegrityScore', 95),
      environmentalSafetyScore: getKpiValue(this.state.currentKpis, 'environmentalSafetyScore', 92),
      avgUpsRuntime: getKpiValue(this.state.currentKpis, 'avgUpsRuntime', 25),
      ...this.state.currentKpis,
    };

    this.state.kpiSnapshots.push(snapshot);
  }

  private completeSimulation(): void {
    this.state.status = 'completed';
    this.state.currentTime = this.activeScenario?.durationSeconds || 0;
    this.stopTickLoop();
    
    // Take final snapshot
    this.takeKpiSnapshot();

    // Emit completion event
    this.emit({
      type: 'scenario-complete',
      payload: {
        scenarioId: this.state.activeScenarioId,
        events: this.state.events,
        kpiSnapshots: this.state.kpiSnapshots,
        finalKpis: this.state.currentKpis,
      },
      timestamp: Date.now(),
    });

    this.notifyStateChange();
  }

  private emit(event: SimulationEngineEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Simulation listener error:', error);
      }
    });
  }

  private notifyStateChange(): void {
    this.emit({
      type: 'state-change',
      payload: this.getState(),
      timestamp: Date.now(),
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE WITH TWIN CONTEXT
// ============================================================================

let engineInstance: SimulationEngine | null = null;
let currentTwinId: string | null = null;

/**
 * Get simulation engine instance
 * Automatically resets if twin changes to prevent data leakage
 */
export function getSimulationEngine(baselineKpis?: Record<string, number>, twinId?: string): SimulationEngine {
  // If twin changed, reset the engine
  if (twinId && currentTwinId && twinId !== currentTwinId) {
    console.log('[SimulationEngine] Twin changed, resetting engine');
    resetSimulationEngine();
  }
  
  if (!engineInstance) {
    engineInstance = new SimulationEngine(baselineKpis, twinId);
    currentTwinId = twinId || null;
  } else {
    if (baselineKpis) {
      engineInstance.setBaselineKpis(baselineKpis);
    }
    if (twinId && twinId !== currentTwinId) {
      engineInstance.setTwinId(twinId);
      currentTwinId = twinId;
    }
  }
  return engineInstance;
}

/**
 * Reset simulation engine and clear twin context
 */
export function resetSimulationEngine(): void {
  if (engineInstance) {
    engineInstance.reset();
  }
  engineInstance = null;
  currentTwinId = null;
}

/**
 * Get current engine twin ID for validation
 */
export function getSimulationEngineTwinId(): string | null {
  return currentTwinId;
}
