/**
 * Phase 1B.2 characterization — legacy DC engine
 * Canonical implementation now at
 * `src/simulation/compat/dataCenterEngine.ts` (Phase 1B.6).
 *
 * Exports pure functions rather than a class. There is no in-flight
 * state to cancel; the "cancellation" characterization here pins the
 * pure-function contract, which is what makes this engine a candidate
 * for slice 1B.6 deletion behind a `compat/*` re-export.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyScenarioDeltas,
  calculateBaseKpis,
  createSimulationRun,
  generateScenarioEvents,
  updateSimulationRun,
} from '../../compat/dataCenterEngine';
import { montrealSovereignDC } from '../../../twins/dataCenter/mockData';
import { SIMULATION_SCENARIOS } from '../../../twins/dataCenter/simulationScenarios';

const scenario = SIMULATION_SCENARIOS[0]!;

describe('simulation/compat/dataCenterEngine — characterization', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-07-17T00:00:00Z')));
  afterEach(() => vi.useRealTimers());

  it('typed outcome: calculateBaseKpis returns a flat Record<string, number>', () => {
    const kpis = calculateBaseKpis(montrealSovereignDC);
    expect(kpis).toEqual(expect.any(Object));
    for (const [k, v] of Object.entries(kpis)) {
      expect(typeof k).toBe('string');
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }
    // Anchor a few canonical keys.
    expect(kpis.effectivePue).toBeGreaterThan(0);
    expect(kpis.avgGpuUtilization).toBeGreaterThanOrEqual(0);
  });

  it('typed outcome: applyScenarioDeltas returns a new object and clamps % keys 0..100', () => {
    const base = calculateBaseKpis(montrealSovereignDC);
    const out = applyScenarioDeltas(base, scenario, 0.5);
    expect(out).not.toBe(base);
    for (const key of Object.keys(out)) {
      if (
        key.includes('Pct') ||
        key.includes('Score') ||
        key.includes('Index')
      ) {
        expect(out[key]).toBeGreaterThanOrEqual(0);
        expect(out[key]).toBeLessThanOrEqual(100);
      }
    }
  });

  it('typed outcome: generateScenarioEvents emits start + end bookends', () => {
    const events = generateScenarioEvents(scenario, 'run-1');
    expect(events[0]).toEqual(
      expect.objectContaining({
        id: 'run-1-event-start',
        eventType: 'start',
        scenarioId: scenario.id,
      }),
    );
    expect(events[events.length - 1]).toEqual(
      expect.objectContaining({ eventType: 'end', scenarioId: scenario.id }),
    );
    // Every event has a Date timestamp today.
    for (const e of events) expect(e.timestamp).toBeInstanceOf(Date);
  });

  it('provenance: engine outputs declare no provenance field', () => {
    const run = createSimulationRun(montrealSovereignDC.id, scenario);
    expect(run as unknown as Record<string, unknown>).not.toHaveProperty(
      'provenance',
    );
  });

  it('cancellation: updateSimulationRun with progress >= 1 marks completed', () => {
    const run = createSimulationRun(montrealSovereignDC.id, scenario);
    const base = calculateBaseKpis(montrealSovereignDC);
    const finished = updateSimulationRun(run, scenario.duration + 10, base);
    expect(finished.status).toBe('completed');
    expect(finished.endTime).toBeInstanceOf(Date);
  });

  it('cancellation: updateSimulationRun with partial progress stays running', () => {
    const run = createSimulationRun(montrealSovereignDC.id, scenario);
    const base = calculateBaseKpis(montrealSovereignDC);
    const midway = updateSimulationRun(run, scenario.duration / 2, base);
    expect(midway.status).toBe('running');
    expect(midway.endTime).toBeUndefined();
  });
});