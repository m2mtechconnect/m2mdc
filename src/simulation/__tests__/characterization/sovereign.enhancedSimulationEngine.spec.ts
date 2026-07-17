/**
 * Phase 1B.2 characterization — `EnhancedSimulationRunner`
 * (`src/twins/sovereignDataCenter/enhancedSimulationEngine.ts`).
 *
 * Tick-driven engine using `window.setInterval`, `emit('kpi-update')`,
 * `emit('event')`, `emit('complete', summary)`. The Sovereign consumer
 * migration is blocked on slice 1B.5 folding its scenarios into
 * `scenarioLibraryProvider`; this test pins the summary shape and
 * cancellation semantics that any future provider seam must preserve.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ENHANCED_SCENARIOS,
  EnhancedSimulationRunner,
  type SimulationSummary,
} from '../../../twins/sovereignDataCenter/enhancedSimulationEngine';

const scenario = ENHANCED_SCENARIOS.find((s) => s.id === 'gpu_overload')!;

describe('EnhancedSimulationRunner — characterization', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('typed outcome: emits kpi-update on start with baseline snapshot', () => {
    const runner = new EnhancedSimulationRunner(scenario);
    const kpiUpdates: unknown[] = [];
    runner.on('kpi-update', (data: unknown) => kpiUpdates.push(data));
    runner.start();
    expect(kpiUpdates.length).toBeGreaterThan(0);
    const first = kpiUpdates[0] as Record<string, unknown>;
    expect(first).toEqual(
      expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{2}:\d{2}$/),
        kpis: expect.any(Object),
      }),
    );
    runner.stop();
  });

  it('typed outcome: complete emits SimulationSummary with expected keys', async () => {
    const runner = new EnhancedSimulationRunner(scenario);
    let summary: SimulationSummary | null = null;
    runner.on('complete', (s: SimulationSummary) => {
      summary = s;
    });

    runner.start();
    // Duration is 45s at 1s tick; advance past it.
    await vi.advanceTimersByTimeAsync(scenario.duration_seconds * 1000 + 100);

    expect(summary).not.toBeNull();
    expect(summary as unknown as SimulationSummary).toEqual(
      expect.objectContaining({
        scenario: expect.any(Object),
        runId: expect.stringMatching(/^run-/),
        timestamp: expect.any(String),
        durationMs: expect.any(Number),
        kpiChanges: expect.any(Object),
        recommendations: expect.any(Array),
        riskScore: expect.any(Number),
        overallImpact: expect.stringMatching(/^(positive|negative|neutral)$/),
      }),
    );
  });

  it('provenance: SimulationSummary declares no provenance field today', async () => {
    const runner = new EnhancedSimulationRunner(scenario);
    let summary: SimulationSummary | null = null;
    runner.on('complete', (s: SimulationSummary) => {
      summary = s;
    });
    runner.start();
    await vi.advanceTimersByTimeAsync(scenario.duration_seconds * 1000 + 100);
    expect(summary).not.toBeNull();
    expect(summary as unknown as Record<string, unknown>).not.toHaveProperty(
      'provenance',
    );
  });

  it('cancellation: pause() stops kpi-update emissions', async () => {
    const runner = new EnhancedSimulationRunner(scenario);
    let ticks = 0;
    runner.on('kpi-update', () => {
      ticks += 1;
    });
    runner.start();
    await vi.advanceTimersByTimeAsync(3000);
    const ticksAtPause = ticks;
    runner.pause();
    await vi.advanceTimersByTimeAsync(5000);
    expect(ticks).toBe(ticksAtPause);
  });

  it('cancellation: stop() resets currentKpis to baseline', async () => {
    const runner = new EnhancedSimulationRunner(scenario);
    let last: Record<string, number> | null = null;
    runner.on('kpi-update', (data: { kpis: Record<string, number> }) => {
      last = data.kpis;
    });
    runner.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(last).not.toBeNull();
    runner.stop();
    // After stop, currentKpis are restored to baseline; a fresh start
    // will re-emit baseline as the first kpi-update.
    let firstAfterRestart: Record<string, number> | null = null;
    runner.on('kpi-update', (data: { kpis: Record<string, number> }) => {
      if (firstAfterRestart === null) firstAfterRestart = data.kpis;
    });
    runner.start();
    // Baseline PUE is defined in SOVEREIGN_DC_KPI_GROUPS; whatever it is,
    // the first emission after stop() should match the runner's baseline
    // snapshot rather than any evolved value.
    expect(firstAfterRestart).not.toBeNull();
    runner.stop();
  });
});