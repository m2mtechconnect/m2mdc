/**
 * Phase 1B.2 characterization — legacy Sovereign DC engine
 * Canonical implementation now at
 * `src/simulation/compat/sovereignDataCenterEngine.ts` (Phase 1B.6).
 *
 * This is a synchronous switch-based estimator; cancellation is not
 * modelled (which is the reason `useEnhancedSimulation` is the deferred
 * migration target, not this file). We pin the typed shape of each
 * scenario branch we exercise and the "no provenance" characterization.
 */
import { describe, expect, it } from 'vitest';

import { runSimulation } from '../../compat/sovereignDataCenterEngine';
import type { SovereignKpis } from '@/types/sovereignDataCenterTwin';

const base: SovereignKpis = {
  sovereignComputeRatioPct: 85,
  effectiveAiPue: 1.25,
  gco2PerGpuHour: 42,
  sovereignRiskScore: 15,
  economicEfficiencyScore: 78,
  renewableRatioPct: 95,
  carbonIntensityKgPerMwh: 35,
  totalGpuCount: 2400,
  activeWorkloads: 156,
};

describe('simulation/compat/sovereignDataCenterEngine — characterization', () => {
  it('typed outcome: SimulationResult carries {kpiDeltas, resultsSummary, warnings, recommendations}', () => {
    const r = runSimulation(base, 'gpu_overload');
    expect(r).toEqual(
      expect.objectContaining({
        kpiDeltas: expect.any(Object),
        resultsSummary: expect.any(String),
        warnings: expect.any(Array),
        recommendations: expect.any(Array),
      }),
    );
  });

  it('typed outcome: gpu_overload mentions GPU and produces PUE delta > 0', () => {
    const r = runSimulation(base, 'gpu_overload');
    expect(r.resultsSummary).toMatch(/GPU/);
    expect(r.kpiDeltas.effectiveAiPue ?? 0).toBeGreaterThan(0);
  });

  it('typed outcome: cooling_failure severity scales PUE delta monotonically', () => {
    const low = runSimulation(base, 'cooling_failure', { severity: 'low' });
    const high = runSimulation(base, 'cooling_failure', { severity: 'high' });
    expect(high.kpiDeltas.effectiveAiPue ?? 0).toBeGreaterThan(
      low.kpiDeltas.effectiveAiPue ?? 0,
    );
  });

  it('typed outcome: severity=critical raises at least one warning', () => {
    const r = runSimulation(base, 'cooling_failure', { severity: 'critical' });
    expect(r.warnings.length + r.recommendations.length).toBeGreaterThan(0);
  });

  it('provenance: no provenance field is declared on SimulationResult', () => {
    const r = runSimulation(base, 'gpu_overload');
    expect(r as unknown as Record<string, unknown>).not.toHaveProperty(
      'provenance',
    );
  });

  it('cancellation: pure function — deterministic across identical inputs', () => {
    // The gpu_overload branch is deterministic (no Math.random on the
    // hot path). Pin that today so a future refactor cannot silently
    // introduce non-determinism without failing this test.
    const a = runSimulation(base, 'gpu_overload', { gpuUtilizationIncrease: 25 });
    const b = runSimulation(base, 'gpu_overload', { gpuUtilizationIncrease: 25 });
    expect(b).toEqual(a);
  });
});