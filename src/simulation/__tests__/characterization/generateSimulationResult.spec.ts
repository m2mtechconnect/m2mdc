/**
 * Phase 1B.2 characterization — `generateSimulationResult` and
 * `generateRackMetrics` in `src/simulation/generateSimulationResult.ts`.
 *
 * This function is the panel-completion seam the facade
 * (`generatePanelResult`) already wraps. We pin its output shape and
 * document its current dependency on `Math.random` (which is exactly
 * what motivates the Phase 1A.3.b seeded-PRNG remediation).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  generateRackMetrics,
  generateSimulationResult,
} from '../../generateSimulationResult';
import type { RackMetrics, SimulationEvent } from '../../types';

const baseline = {
  avgGpuUtilization: 60,
  thermalStabilityScore: 90,
  effectivePue: 1.25,
  coolingEfficiencyIndex: 80,
};

const finalKpis = {
  avgGpuUtilization: 78,
  thermalStabilityScore: 82,
  effectivePue: 1.32,
  coolingEfficiencyIndex: 74,
};

describe('generateSimulationResult — characterization', () => {
  let randSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    // Pin the non-determinism so `actualVsExpected` is reproducible.
    randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => randSpy.mockRestore());

  it('typed outcome: returns SimulationResultSummary with canonical keys', () => {
    const result = generateSimulationResult(null, [], baseline, finalKpis, 300);
    expect(result).toEqual(
      expect.objectContaining({
        durationSec: 300,
        scenarioId: 'unknown',
        scenarioName: 'Custom Simulation',
        kpiDeltas: expect.any(Array),
        events: [],
        rcaMarkdown: expect.any(String),
        recommendationsMarkdown: expect.any(String),
        actualVsExpected: expect.any(Array),
      }),
    );
  });

  it('typed outcome: kpiDeltas entries carry {id,label,unit,before,after,trend,isGood}', () => {
    const result = generateSimulationResult(null, [], baseline, finalKpis, 60);
    expect(result.kpiDeltas.length).toBeGreaterThan(0);
    for (const delta of result.kpiDeltas) {
      expect(delta).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          unit: expect.any(String),
          before: expect.any(Number),
          after: expect.any(Number),
          trend: expect.stringMatching(/^(up|down|stable)$/),
          isGood: expect.any(Boolean),
        }),
      );
    }
  });

  it('typed outcome: actualVsExpected is capped at 4 rows', () => {
    const result = generateSimulationResult(null, [], baseline, finalKpis, 60);
    expect(result.actualVsExpected.length).toBeLessThanOrEqual(4);
    for (const row of result.actualVsExpected) {
      expect(row).toEqual(
        expect.objectContaining({
          metric: expect.any(String),
          expected: expect.stringMatching(/%$/),
          actual: expect.stringMatching(/%$/),
          withinRange: expect.any(Boolean),
        }),
      );
    }
  });

  it('provenance: raw engine output declares no provenance field (facade adds it)', () => {
    const result = generateSimulationResult(null, [], baseline, finalKpis, 60);
    expect(result as Record<string, unknown>).not.toHaveProperty('provenance');
  });

  it('cancellation: pure function — no side effect after invocation', () => {
    // Characterization: `generateSimulationResult` is synchronous with no
    // in-flight state; cancellation is handled by the facade layer via
    // AbortSignal (see `useSimulationCompletion`). This test guards
    // against a future regression where the engine acquires hidden
    // module-scoped state.
    const before = generateSimulationResult(null, [], baseline, finalKpis, 60);
    const after = generateSimulationResult(null, [], baseline, finalKpis, 60);
    expect(after).toEqual(before);
  });
});

describe('generateRackMetrics — characterization', () => {
  let randSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => randSpy.mockRestore());

  const baseRacks: RackMetrics[] = Array.from({ length: 3 }, (_, i) => ({
    rackId: `Rack-${i + 1}`,
    tempC: 22,
    powerKw: 8,
    gpuUtilPct: 70,
    alertLevel: 'normal' as const,
  }));

  it('typed outcome: preserves rack cardinality and shape', () => {
    const out = generateRackMetrics(baseRacks, [], 0);
    expect(out).toHaveLength(3);
    for (const rack of out) {
      expect(rack).toEqual(
        expect.objectContaining({
          rackId: expect.any(String),
          tempC: expect.any(Number),
          powerKw: expect.any(Number),
          gpuUtilPct: expect.any(Number),
          alertLevel: expect.stringMatching(/^(normal|warning|critical)$/),
        }),
      );
      // Clamp invariants
      expect(rack.tempC).toBeGreaterThanOrEqual(18);
      expect(rack.tempC).toBeLessThanOrEqual(45);
      expect(rack.gpuUtilPct).toBeGreaterThanOrEqual(0);
      expect(rack.gpuUtilPct).toBeLessThanOrEqual(100);
      expect(rack.powerKw).toBeGreaterThanOrEqual(1);
      expect(rack.powerKw).toBeLessThanOrEqual(20);
    }
  });

  it('typed outcome: thermal event escalates at least one rack alertLevel', () => {
    const thermalEvents = [
      {
        id: 'e1',
        type: 'ALERT',
        domain: 'thermal_hardware',
        severity: 'critical',
        title: 'x',
        description: 'x',
        timestamp: 0,
      } as unknown as SimulationEvent,
    ];
    // Force temp deltas to bias toward hotter racks.
    randSpy.mockReturnValue(0.99);
    const out = generateRackMetrics(baseRacks, thermalEvents, 5);
    const hot = out.some((r) => r.alertLevel !== 'normal');
    expect(hot).toBe(true);
  });
});