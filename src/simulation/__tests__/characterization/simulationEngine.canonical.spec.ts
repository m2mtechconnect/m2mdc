/**
 * Phase 1B.2 characterization — canonical `SimulationEngine`
 * (`src/simulation/SimulationEngine.ts`).
 *
 * Pins current, observable behaviour only. No engine source is modified
 * by this slice.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimulationEngine } from '../../SimulationEngine';
import { PRESET_SCENARIOS } from '../../scenarioRegistry';

const baseline: Record<string, number> = {
  avgGpuUtilization: 60,
  thermalStabilityScore: 90,
  effectivePue: 1.25,
  coolingEfficiencyIndex: 80,
  hotspotRiskProbability: 10,
};

function firstScenarioId(): string {
  const s = PRESET_SCENARIOS[0];
  if (!s) throw new Error('PRESET_SCENARIOS is empty; fixture drift');
  return s.id;
}

describe('SimulationEngine (canonical) — characterization', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('typed outcome: initial getState() shape', () => {
    const engine = new SimulationEngine(baseline, 'twin-A');
    const state = engine.getState();

    expect(state.status).toBe('idle');
    expect(state.currentTime).toBe(0);
    expect(state.activeScenarioId).toBeNull();
    expect(Array.isArray(state.events)).toBe(true);
    expect(Array.isArray(state.kpiSnapshots)).toBe(true);
    // baseline is copied, not aliased
    expect(state.baselineKpis).not.toBe(baseline);
    expect(state.baselineKpis.effectivePue).toBe(1.25);
  });

  it('typed outcome: startScenario returns boolean and transitions status', () => {
    const engine = new SimulationEngine(baseline, 'twin-A');
    const started = engine.startScenario(firstScenarioId());
    expect(started).toBe(true);
    expect(engine.getState().status).toBe('running');

    const bad = engine.startScenario('does-not-exist');
    expect(bad).toBe(false);
  });

  it('provenance: engine emits no provenance tag on events (facade wraps this today)', () => {
    const engine = new SimulationEngine(baseline, 'twin-A');
    const seen: unknown[] = [];
    engine.subscribe((evt) => seen.push(evt));
    engine.startScenario(firstScenarioId());

    // At least one event has been emitted (scenario-start, state-change).
    expect(seen.length).toBeGreaterThan(0);
    for (const evt of seen) {
      // Characterizing absence: no `provenance` key today.
      expect(evt as Record<string, unknown>).not.toHaveProperty('provenance');
    }
  });

  it('cancellation: pause() halts the tick loop', () => {
    const engine = new SimulationEngine(baseline, 'twin-A');
    engine.startScenario(firstScenarioId());

    vi.advanceTimersByTime(200);
    const timeAtPause = engine.getState().currentTime;
    engine.pause();
    expect(engine.getState().status).toBe('paused');

    vi.advanceTimersByTime(1000);
    // currentTime does not advance while paused
    expect(engine.getState().currentTime).toBe(timeAtPause);
  });

  it('cancellation: reset() returns to idle with baseline restored', () => {
    const engine = new SimulationEngine(baseline, 'twin-A');
    engine.startScenario(firstScenarioId());
    vi.advanceTimersByTime(500);

    engine.reset();
    const s = engine.getState();
    expect(s.status).toBe('idle');
    expect(s.currentTime).toBe(0);
    expect(s.events).toHaveLength(0);
    expect(s.kpiSnapshots).toHaveLength(0);
    expect(s.activeScenarioId).toBeNull();
    expect(s.currentKpis.effectivePue).toBe(1.25);
  });

  it('cancellation: subscribe unsubscribe removes the listener', () => {
    const engine = new SimulationEngine(baseline, 'twin-A');
    const listener = vi.fn();
    const unsub = engine.subscribe(listener);
    engine.startScenario(firstScenarioId());
    const before = listener.mock.calls.length;
    unsub();
    engine.pause();
    engine.resume();
    engine.pause();
    // No new invocations after unsubscribe.
    expect(listener.mock.calls.length).toBe(before);
  });
});