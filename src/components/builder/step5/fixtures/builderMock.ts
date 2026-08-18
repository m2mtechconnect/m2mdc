/**
 * Mock Simulation Engine - Preview Data Generator
 * Uses simulation_preview_config from template to show realistic simulations
 * Falls back to this when no real backend endpoint is configured
 */

type SpeedFactor = 1 | 2 | 4;

export interface SimulationEvent {
  id: string;
  timestamp: string;
  type: 'detect' | 'decision' | 'action' | 'resolved' | 'alert' | 'info';
  message: string;
  severity?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface SimulationPreviewConfig {
  baseline_metrics: {
    [key: string]: number;
  };
  scenarios: {
    [id: string]: {
      label: string;
      duration_seconds: number;
      ticks: Array<{
        t: number;
        [key: string]: number;
      }>;
      events: string[];
    };
  };
}

interface MockSimulationEngineConfig {
  scenario: any;
  previewConfig: SimulationPreviewConfig;
  speed: SpeedFactor;
}

type EventListener = (event: SimulationEvent) => void;
type KPIListener = (data: any) => void;
type CompleteListener = () => void;

export class MockSimulationEngine {
  private config: MockSimulationEngineConfig;
  private intervalId: number | null = null;
  private tick: number = 0;
  private baseTickInterval = 1000; // 1 second base interval
  private events: SimulationEvent[] = [];
  private listeners: Map<string, ((...args: never[]) => void)[]> = new Map();
  private currentScenarioData: any;
  private eventIndex = 0;

  constructor(config: MockSimulationEngineConfig) {
    this.config = config;
    this.currentScenarioData = this.getScenarioData(config.scenario);
  }

  private getScenarioData(scenario: any) {
    const scenarios = this.config.previewConfig?.scenarios || {};
    const scenarioKeys = Object.keys(scenarios);
    
    if (scenarioKeys.length === 0) {
      // Return a default fallback scenario
      return {
        label: 'Default Scenario',
        duration_seconds: 30,
        ticks: [{ t: 0 }],
        events: ['Simulation started', 'Processing data...', 'Simulation complete']
      };
    }
    
    const scenarioId = scenario?.id || scenarioKeys[0];
    return scenarios[scenarioId] || Object.values(scenarios)[0];
  }

  // Event emitter methods
  on(event: 'event', callback: EventListener): void;
  on(event: 'kpi-update', callback: KPIListener): void;
  on(event: 'complete' | 'error', callback: CompleteListener): void;
  on(event: string, callback: (...args: never[]) => void): void {
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

      // Complete when reaching scenario duration
      if (this.tick >= this.currentScenarioData.duration_seconds) {
        this.complete();
      }
    }, interval);

    // Emit initial baseline
    this.generateKPIUpdate();
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
    this.eventIndex = 0;
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
    
    const summaryEvent: SimulationEvent = {
      id: `event-${Date.now()}`,
      timestamp: this.formatTimestamp(this.tick),
      type: 'resolved',
      message: 'Simulation completed successfully.',
      severity: 'low'
    };
    this.emit('event', summaryEvent);
  }

  private runTick(): void {
    // Generate KPI update every tick
    this.generateKPIUpdate();

    // Generate events based on scenario timeline
    this.generateEvent();
  }

  private generateKPIUpdate(): void {
    const baseline_metrics = this.config.previewConfig?.baseline_metrics || {};
    const ticks = this.currentScenarioData?.ticks || [];
    
    if (Object.keys(baseline_metrics).length === 0) {
      // No baseline metrics to update
      return;
    }
    
    const currentTick = ticks.find((t: any) => t.t === this.tick);
    const nextTick = ticks.find((t: any) => t.t > this.tick);
    const prevTick = [...ticks].reverse().find((t: any) => t.t < this.tick);

    // Interpolate values between ticks
    const metrics = Object.keys(baseline_metrics).map(key => {
      let value = baseline_metrics[key];
      
      if (currentTick && currentTick[key] !== undefined) {
        value = currentTick[key];
      } else if (prevTick && nextTick) {
        const prevValue = prevTick[key] !== undefined ? prevTick[key] : baseline_metrics[key];
        const nextValue = nextTick[key] !== undefined ? nextTick[key] : baseline_metrics[key];
        const progress = (this.tick - prevTick.t) / (nextTick.t - prevTick.t);
        value = prevValue + (nextValue - prevValue) * progress;
      } else if (prevTick && prevTick[key] !== undefined) {
        value = prevTick[key];
      }

      // Format based on metric type
      const unit = this.getMetricUnit(key);
      const displayValue = unit === '%' ? value : Math.round(value * 10) / 10;

      return {
        label: this.formatMetricLabel(key),
        value: displayValue,
        unit,
        timestamp: this.formatTimestamp(this.tick)
      };
    });

    this.emit('kpi-update', {
      timestamp: this.formatTimestamp(this.tick),
      metrics
    });
  }

  private generateEvent(): void {
    const events = this.currentScenarioData?.events || [];
    const duration = this.currentScenarioData?.duration_seconds || 30;
    
    if (events.length === 0) return;
    
    const eventsPerSecond = events.length / duration;
    const shouldEmitEvent = Math.random() < eventsPerSecond;

    if (shouldEmitEvent && this.eventIndex < events.length) {
      const message = events[this.eventIndex];
      this.eventIndex++;

      const event: SimulationEvent = {
        id: `event-${Date.now()}-${Math.random()}`,
        timestamp: this.formatTimestamp(this.tick),
        type: this.getEventType(message),
        message,
        severity: this.getEventSeverity(message)
      };

      this.events.push(event);
      this.emit('event', event);
    }
  }

  private getEventType(message: string): SimulationEvent['type'] {
    if (message.toLowerCase().includes('detected') || message.toLowerCase().includes('alert')) {
      return 'detect';
    } else if (message.toLowerCase().includes('analyzing') || message.toLowerCase().includes('evaluating')) {
      return 'decision';
    } else if (message.toLowerCase().includes('dispatched') || message.toLowerCase().includes('assigned')) {
      return 'action';
    } else if (message.toLowerCase().includes('resolved') || message.toLowerCase().includes('completed')) {
      return 'resolved';
    } else if (message.toLowerCase().includes('warning')) {
      return 'alert';
    }
    return 'info';
  }

  private getEventSeverity(message: string): SimulationEvent['severity'] {
    if (message.toLowerCase().includes('critical') || message.toLowerCase().includes('emergency')) {
      return 'high';
    } else if (message.toLowerCase().includes('warning') || message.toLowerCase().includes('delay')) {
      return 'medium';
    }
    return 'low';
  }

  private formatMetricLabel(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getMetricUnit(key: string): string {
    if (key.includes('performance') || key.includes('accuracy') || key.includes('utilization') || key.includes('rate')) {
      return '%';
    } else if (key.includes('time') || key.includes('wait') || key.includes('turnaround')) {
      return 'minutes';
    } else if (key.includes('count') || key.includes('number')) {
      return '';
    }
    return '';
  }

  private formatTimestamp(tick: number): string {
    const minutes = Math.floor(tick / 60);
    const seconds = tick % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getBaselineMetrics() {
    const baselineMetrics = this.config.previewConfig?.baseline_metrics || {};
    return Object.keys(baselineMetrics).map(key => ({
      label: this.formatMetricLabel(key),
      value: baselineMetrics[key],
      unit: this.getMetricUnit(key)
    }));
  }
}
