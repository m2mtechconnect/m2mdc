
/**
 * Heterogeneous event listener. The concrete argument shapes are enforced by
 * the public `on(...)` overloads; this alias only exists for the internal
 * registry and the overload implementation signature.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- overload implementation signature
type AnyEventListener = (...args: any[]) => void;
/**
 * Builder Preview Engine (Phase 1B.7 rename of former SimulationEngine)
 * Generates synthetic KPI updates and event logs
 * Driven by workflow structure, KPI thresholds, and scenario metadata
 */

type SpeedFactor = 1 | 2 | 4;

export interface BuilderPreviewEvent {
  id: string;
  timestamp: string;
  type: 'detect' | 'decision' | 'action' | 'resolved' | 'alert' | 'info';
  message: string;
  severity?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

interface SimulationEngineConfig {
  scenario: any;
  workflows: any[];
  kpis: any[];
  template?: any;
  speed: SpeedFactor;
  /**
   * Injected by the SimulationOrchestrator. This engine is
   * `aura-stochastic-seeded`: it MUST NOT draw from `Math.random()`, so the
   * only source of randomness is this generator.
   */
  random?: SeededRandom;
  /** Stable prefix for generated event ids, so ids are reproducible. */
  runTag?: string;
}

type EventListener = (event: BuilderPreviewEvent) => void;
type KPIListener = (data: any) => void;
type CompleteListener = () => void;

export class BuilderPreviewEngine {
  private config: SimulationEngineConfig;
  private intervalId: number | null = null;
  private tick: number = 0;
  private baseTickInterval = 300; // 300ms base interval
  private events: BuilderPreviewEvent[] = [];
  private listeners: Map<string, (AnyEventListener)[]> = new Map();
  /** Seeded generator; falls back to a fixed seed, never to `Math.random()`. */
  private random: SeededRandom;
  private runTag: string;
  private eventSeq = 0;

  constructor(config: SimulationEngineConfig) {
    this.config = config;
    this.random =
      config.random ??
      mulberry32(deriveSeed(`builder-preview|${String(config.scenario?.id ?? 'unknown')}`));
    this.runTag = config.runTag ?? 'preview';
  }

  /** Reproducible event identifier: no clock, no unseeded randomness. */
  private nextEventId(): string {
    this.eventSeq += 1;
    return `event-${this.runTag}-${this.eventSeq}`;
  }

  // Event emitter methods
  on(event: 'event', callback: EventListener): void;
  on(event: 'kpi-update', callback: KPIListener): void;
  on(event: 'complete' | 'error', callback: CompleteListener): void;
  on(event: string, callback: AnyEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  start(): void {
    if (this.intervalId) return;

    const interval = this.baseTickInterval / this.config.speed;
    
    this.intervalId = window.setInterval(() => {
      this.tick++;
      this.runTick();

      // Auto-complete after 100 ticks (~30-90 seconds depending on speed)
      if (this.tick >= 100) {
        this.complete();
      }
    }, interval);
  }

  pause(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  stop(): void {
    this.pause();
    this.tick = 0;
    this.events = [];
  }

  reset(): void {
    this.stop();
  }

  setSpeed(speed: SpeedFactor): void {
    const wasRunning = this.intervalId !== null;
    this.pause();
    this.config.speed = speed;
    if (wasRunning) {
      this.start();
    }
  }

  private complete(): void {
    this.pause();
    this.emit('complete');
    
    // Final summary event
    const summaryEvent: BuilderPreviewEvent = {
      id: `event-${Date.now()}`,
      timestamp: this.formatTimestamp(this.tick),
      type: 'resolved',
      message: 'Simulation completed successfully. All scenarios executed.',
      severity: 'low'
    };
    this.emit('event', summaryEvent);
  }

  private runTick(): void {
    // Generate KPI update every tick
    this.generateKPIUpdate();

    // Generate events at specific intervals
    if (this.tick % 5 === 0) {
      this.generateEvent();
    }
  }

  private generateKPIUpdate(): void {
    const { kpis, scenario } = this.config;
    const timePoint = this.tick;

    const kpiUpdates = kpis.map((kpi: any) => {
      const baseValue = this.getKPIBaseValue(kpi);
      const variation = this.getKPIVariation(kpi, timePoint, scenario);
      
      return {
        label: kpi.label || kpi.name,
        value: baseValue + variation,
        unit: kpi.unit || '',
        timestamp: this.formatTimestamp(timePoint)
      };
    });

    this.emit('kpi-update', {
      timestamp: this.formatTimestamp(timePoint),
      metrics: kpiUpdates
    });
  }

  private generateEvent(): void {
    const { workflows, scenario } = this.config;
    
    // Pick a random workflow to simulate
    if (workflows.length === 0) {
      // Fallback: generate generic event
      this.generateFallbackEvent();
      return;
    }

    const workflow = workflows[Math.floor(this.random() * workflows.length)];
    const event = this.generateWorkflowEvent(workflow);
    
    this.events.push(event);
    this.emit('event', event);
  }

  private generateWorkflowEvent(workflow: any): BuilderPreviewEvent {
    const eventTypes: BuilderPreviewEvent['type'][] = ['detect', 'decision', 'action', 'resolved'];
    const currentPhase = this.tick % 20; // Cycle through phases
    
    let type: BuilderPreviewEvent['type'];
    let message: string;
    let severity: BuilderPreviewEvent['severity'];

    if (currentPhase < 5) {
      type = 'detect';
      message = this.generateDetectMessage(workflow);
      severity = 'high';
    } else if (currentPhase < 10) {
      type = 'decision';
      message = this.generateDecisionMessage(workflow);
      severity = 'medium';
    } else if (currentPhase < 15) {
      type = 'action';
      message = this.generateActionMessage(workflow);
      severity = 'medium';
    } else {
      type = 'resolved';
      message = this.generateResolvedMessage(workflow);
      severity = 'low';
    }

    return {
      id: this.nextEventId(),
      timestamp: this.formatTimestamp(this.tick),
      type,
      message,
      severity
    };
  }

  private generateFallbackEvent(): void {
    const messages = [
      { type: 'detect' as const, msg: 'System monitoring detected anomaly in operations', severity: 'high' as const },
      { type: 'decision' as const, msg: 'AI analyzing situation and determining optimal response', severity: 'medium' as const },
      { type: 'action' as const, msg: 'Executing recommended mitigation strategy', severity: 'medium' as const },
      { type: 'resolved' as const, msg: 'Issue resolved. System returning to normal operations', severity: 'low' as const },
      { type: 'info' as const, msg: 'Performance metrics within acceptable ranges', severity: 'low' as const },
    ];

    const selected = messages[Math.floor(this.random() * messages.length)];

    const event: BuilderPreviewEvent = {
      id: this.nextEventId(),
      timestamp: this.formatTimestamp(this.tick),
      type: selected.type,
      message: selected.msg,
      severity: selected.severity
    };

    this.events.push(event);
    this.emit('event', event);
  }

  private generateDetectMessage(workflow: any): string {
    const templates = [
      `DETECT: ${workflow.name} - threshold exceeded`,
      `DETECT: Anomaly in ${workflow.name}`,
      `DETECT: ${workflow.name} requires attention`
    ];
    return templates[Math.floor(this.random() * templates.length)];
  }

  private generateDecisionMessage(workflow: any): string {
    const templates = [
      `DECISION: AI recommending action for ${workflow.name}`,
      `DECISION: Evaluating options for ${workflow.name}`,
      `DECISION: Optimal strategy determined for ${workflow.name}`
    ];
    return templates[Math.floor(this.random() * templates.length)];
  }

  private generateActionMessage(workflow: any): string {
    const actions = workflow.actions || [];
    if (actions.length > 0) {
      const action = actions[Math.floor(this.random() * actions.length)];
      return `ACTION: Executing ${action.type || 'action'} for ${workflow.name}`;
    }
    return `ACTION: Implementing recommended changes for ${workflow.name}`;
  }

  private generateResolvedMessage(workflow: any): string {
    return `RESOLVED: ${workflow.name} completed successfully`;
  }

  private getKPIBaseValue(kpi: any): number {
    // Generate realistic base values based on KPI type
    const unit = (kpi.unit || '').toLowerCase();
    
    if (unit.includes('min') || unit.includes('time')) return 15;
    if (unit.includes('%') || unit.includes('percent')) return 85;
    if (unit.includes('co2') || unit.includes('emissions')) return 1.2;
    if (unit.includes('count')) return 100;
    
    return 50; // default
  }

  private getKPIVariation(kpi: any, timePoint: number, scenario: any): number {
    // Generate realistic variations with some randomness and trend
    const unit = (kpi.unit || '').toLowerCase();
    const amplitude = unit.includes('%') ? 5 : unit.includes('min') ? 2 : 0.5;
    
    // Sine wave with noise
    const wave = Math.sin(timePoint / 10) * amplitude;
    const noise = (this.random() - 0.5) * amplitude * 0.5;
    
    return wave + noise;
  }

  private formatTimestamp(tick: number): string {
    // Convert tick to HH:MM format starting from 06:00
    const startHour = 6;
    const minutes = tick * 3; // Each tick = ~3 minutes of simulated time
    const totalMinutes = minutes % 1440; // Wrap at 24 hours
    const hour = Math.floor(totalMinutes / 60) + startHour;
    const minute = totalMinutes % 60;
    
    return `${String(hour % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}
