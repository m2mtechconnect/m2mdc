import { describe, expect, it } from 'vitest';
import {
  BASELINE_REFERENCE_PUE,
  ESTIMATOR_DEFAULTS,
  estimatePue,
  runBlueprintEstimate,
} from '../publicBlueprintEstimator';

describe('publicBlueprintEstimator', () => {
  it('rewards liquid cooling over air cooling at the same design point', () => {
    const air = estimatePue({ ...ESTIMATOR_DEFAULTS, coolingTopology: 'air' });
    const liquid = estimatePue({ ...ESTIMATOR_DEFAULTS, coolingTopology: 'direct-liquid' });
    expect(liquid.pue).toBeLessThan(air.pue);
  });

  it('penalises air cooling pushed past its comfort density', () => {
    const low = estimatePue({ ...ESTIMATOR_DEFAULTS, coolingTopology: 'air', rackDensityKw: 10 });
    const high = estimatePue({ ...ESTIMATOR_DEFAULTS, coolingTopology: 'air', rackDensityKw: 60 });
    expect(high.pue).toBeGreaterThan(low.pue);
  });

  it('keeps PUE within a physically plausible band', () => {
    const worst = estimatePue({
      ...ESTIMATOR_DEFAULTS,
      coolingTopology: 'air',
      climate: 'hot',
      rackDensityKw: 200,
      utilisationPct: 5,
    });
    expect(worst.pue).toBeGreaterThan(1.03);
    expect(worst.pue).toBeLessThanOrEqual(2.5);
  });

  it('derives facility load, energy and cost consistently from the inputs', () => {
    const result = runBlueprintEstimate(ESTIMATOR_DEFAULTS);

    expect(result.itLoadKw).toBeCloseTo(5 * 1000 * 0.7, 1);
    expect(result.facilityLoadKw).toBeCloseTo(result.itLoadKw * result.pue, 0);
    expect(result.annualFacilityMwh).toBeCloseTo((result.facilityLoadKw * 8760) / 1000, 0);
    expect(result.annualEnergyCost).toBeCloseTo(
      result.annualFacilityMwh * 1000 * ESTIMATOR_DEFAULTS.electricityPricePerKwh,
      -1,
    );
    expect(result.annualTotalCost).toBeCloseTo(
      result.annualEnergyCost +
        result.annualCarbonCost +
        result.annualMaintenanceCost +
        result.annualAmortisedCapex,
      0,
    );
  });

  it('reports a low-carbon grid as low carbon and a fossil grid as high carbon', () => {
    const quebec = runBlueprintEstimate({ ...ESTIMATOR_DEFAULTS, region: 'CA-QC' });
    const alberta = runBlueprintEstimate({ ...ESTIMATOR_DEFAULTS, region: 'CA-AB' });
    expect(alberta.annualTonnesCo2e).toBeGreaterThan(quebec.annualTonnesCo2e * 50);
    expect(quebec.gridRenewablePct).toBeGreaterThan(alberta.gridRenewablePct);
  });

  it('compares against the air-cooled reference design', () => {
    const result = runBlueprintEstimate(ESTIMATOR_DEFAULTS);
    expect(result.baselinePue).toBe(BASELINE_REFERENCE_PUE);
    expect(result.annualEnergySavedMwh).toBeGreaterThan(0);
    expect(result.annualCostSaved).toBeGreaterThan(0);
  });

  it('returns zeroed intensities when no load is specified', () => {
    const result = runBlueprintEstimate({ ...ESTIMATOR_DEFAULTS, itLoadMw: 0 });
    expect(result.annualTotalCost).toBe(0);
    expect(result.costPerItMwh).toBe(0);
    expect(result.tonnesPerMwOfIt).toBe(0);
  });
});
