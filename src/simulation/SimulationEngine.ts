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

  constructor(baselineKpis: Record<string, number> = {}) {
    this.state = {
      ...createDefaultState(),
      baselineKpis,
      currentKpis: { ...baselineKpis },
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Start a scenario by ID
   */
  startScenario(scenarioId: string): boolean {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      console.error(`Scenario not found: ${scenarioId}`);
      return false;
    }

    // Reset state for new scenario
    this.reset();
    this.activeScenario = scenario;
    this.processedStepIndices.clear();

    // Update state
    this.state.status = 'running';
    this.state.activeScenarioId = scenarioId;
    this.state.currentKpis = { ...this.state.baselineKpis };

    // Start tick loop
    this.startTickLoop();

    // Emit start event
    this.emit({
      type: 'scenario-start',
      payload: { scenarioId, scenario },
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
    
    const baseline = this.state.baselineKpis;
    this.state = {
      ...createDefaultState(),
      baselineKpis: baseline,
      currentKpis: { ...baseline },
    };
    
    this.activeScenario = null;
    this.processedStepIndices.clear();
    
    this.notifyStateChange();
  }

  /**
   * Advance simulation by deltaMs
   */
  tick(deltaMs: number): void {
    if (this.state.status !== 'running' || !this.activeScenario) return;

    const deltaSeconds = (deltaMs / 1000) * this.state.timeScale;
    this.state.currentTime += deltaSeconds;

    // Check if simulation is complete
    if (this.state.currentTime >= this.activeScenario.durationSeconds) {
      this.completeSimulation();
      return;
    }

    // Process timeline steps
    this.processTimelineSteps();

    // Take KPI snapshot periodically (every 5 simulated seconds)
    if (Math.floor(this.state.currentTime) % 5 === 0) {
      this.takeKpiSnapshot();
    }

    // Emit tick event
    this.emit({
      type: 'tick',
      payload: {
        currentTime: this.state.currentTime,
        progress: this.getProgress(),
        currentKpis: this.state.currentKpis,
      },
      timestamp: Date.now(),
    });
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
   */
  getState(): Readonly<SimulationState> {
    return { ...this.state };
  }

  /**
   * Get progress (0-1)
   */
  getProgress(): number {
    if (!this.activeScenario) return 0;
    return Math.min(1, this.state.currentTime / this.activeScenario.durationSeconds);
  }

  /**
   * Update baseline KPIs
   */
  setBaselineKpis(kpis: Record<string, number>): void {
    this.state.baselineKpis = { ...kpis };
    if (this.state.status === 'idle') {
      this.state.currentKpis = { ...kpis };
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
    
    // Use 60fps tick rate
    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - this.lastTickTime;
      this.lastTickTime = now;
      this.tick(deltaMs);
    }, 1000 / 60);
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

    // Apply KPI deltas
    Object.entries(step.kpiDeltas).forEach(([key, delta]) => {
      if (delta !== undefined && key in this.state.currentKpis) {
        this.state.currentKpis[key] = (this.state.currentKpis[key] || 0) + delta;
        
        // Clamp percentage values
        if (key.includes('Pct') || key.includes('Score') || key.includes('Index') || key.includes('Progress')) {
          this.state.currentKpis[key] = Math.max(0, Math.min(100, this.state.currentKpis[key]));
        }
      }
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
    const snapshot: KPISnapshot = {
      timestamp: this.state.currentTime,
      pue: this.state.currentKpis.effectivePue || 1.35,
      gpuUtilization: this.state.currentKpis.avgGpuUtilization || 75,
      thermalStabilityScore: this.state.currentKpis.thermalStabilityScore || 85,
      powerReliabilityScore: this.state.currentKpis.powerReliabilityScore || 95,
      sovereignComplianceScore: 100 - (this.state.currentKpis.sovereigntyRiskScore || 10),
      emissionsVsTarget: this.state.currentKpis.carbonNeutralProgress || 60,
      coolingEfficiencyIndex: this.state.currentKpis.coolingEfficiencyIndex || 80,
      networkIntegrityScore: this.state.currentKpis.networkIntegrityScore || 95,
      environmentalSafetyScore: this.state.currentKpis.environmentalSafetyScore || 92,
      avgUpsRuntime: this.state.currentKpis.avgUpsRuntime || 25,
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
// SINGLETON INSTANCE (optional)
// ============================================================================

let engineInstance: SimulationEngine | null = null;

export function getSimulationEngine(baselineKpis?: Record<string, number>): SimulationEngine {
  if (!engineInstance) {
    engineInstance = new SimulationEngine(baselineKpis);
  } else if (baselineKpis) {
    engineInstance.setBaselineKpis(baselineKpis);
  }
  return engineInstance;
}

export function resetSimulationEngine(): void {
  if (engineInstance) {
    engineInstance.reset();
  }
  engineInstance = null;
}
