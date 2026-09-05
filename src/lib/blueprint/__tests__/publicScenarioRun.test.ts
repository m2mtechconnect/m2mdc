import { describe, expect, it } from 'vitest';
import {
  ESTIMATOR_DEFAULTS,
  runBlueprintEstimate,
} from '../publicBlueprintEstimator';
import {
  PUBLIC_SCENARIO_IDS,
  deriveBaselineKpis,
  runPublicScenario,
} from '../publicScenarioRun';

const report = runBlueprintEstimate(ESTIMATOR_DEFAULTS);

describe('publicScenarioRun', () => {
  it('derives the baseline from the entered design, not a fixture', () => {
    const baseline = deriveBaselineKpis(ESTIMATOR_DEFAULTS, report);
    expect(baseline.effectivePue).toBe(report.pue);
    expect(baseline.avgGpuUtilization).toBe(ESTIMATOR_DEFAULTS.utilisationPct);

    const hotter = deriveBaselineKpis({ ...ESTIMATOR_DEFAULTS, climate: 'hot' }, report);
    expect(hotter.coolingEfficiencyIndex).toBeLessThan(baseline.coolingEfficiencyIndex);
  });

  it('returns null for an unknown scenario', () => {
    expect(runPublicScenario('not_a_scenario', ESTIMATOR_DEFAULTS, report)).toBeNull();
  });

  it.each(PUBLIC_SCENARIO_IDS)('runs %s through the engine timeline', (id) => {
    const run = runPublicScenario(id, ESTIMATOR_DEFAULTS, report);
    expect(run).not.toBeNull();
    expect(run!.scenarioId).toBe(id);
    expect(run!.events.length).toBeGreaterThan(3);
    expect(run!.peakPue).toBeGreaterThanOrEqual(run!.designPue);
    expect(run!.durationSeconds).toBeGreaterThan(0);
  });

  it('is deterministic for the same inputs', () => {
    const a = runPublicScenario('cooling_failure_hot_aisle', ESTIMATOR_DEFAULTS, report)!;
    const b = runPublicScenario('cooling_failure_hot_aisle', ESTIMATOR_DEFAULTS, report)!;
    expect(a.peakPue).toBe(b.peakPue);
    expect(a.events.map((e) => e.title)).toEqual(b.events.map((e) => e.title));
  });

  it('scales the peak overhead cost with the entered electricity price', () => {
    const cheap = runPublicScenario('gpu_spike_training_job', ESTIMATOR_DEFAULTS, report)!;
    const pricey = runPublicScenario(
      'gpu_spike_training_job',
      { ...ESTIMATOR_DEFAULTS, electricityPricePerKwh: ESTIMATOR_DEFAULTS.electricityPricePerKwh * 2 },
      report,
    )!;
    expect(pricey.peakOverheadCostPerHour).toBeCloseTo(cheap.peakOverheadCostPerHour * 2, 1);
  });
});
