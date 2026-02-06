/**
 * Carbon Engine Unit Tests
 * Comprehensive tests for carbon calculation engine
 */

import { describe, it, expect } from 'vitest';
import { CarbonEngine } from '@/engines/carbon/CarbonEngine';
import type { CarbonEngineInput } from '@/engines/carbon/types';

describe('CarbonEngine', () => {
  // Standard test input matching a typical Canadian data centre
  const baseInput: CarbonEngineInput = {
    pue: 1.3,
    powerKwh: 5000,
    carbonIntensityGPerKwh: 30, // Quebec hydro
    renewableMixPct: 80,
    activeGpuCount: 100,
    trainingWorkloadPct: 60,
  };

  describe('evaluate()', () => {
    it('should calculate hourly emissions correctly', () => {
      const result = CarbonEngine.evaluate(baseInput);
      
      // Effective intensity = 30 * (1 - 0.8) = 6 g/kWh
      // Hourly carbon = 1.3 * 5000 * 6 = 39,000 g = 39 kg
      expect(result.hourlyEmissionsKg).toBeCloseTo(39, 0);
    });

    it('should calculate daily emissions as 24x hourly', () => {
      const result = CarbonEngine.evaluate(baseInput);
      
      expect(result.dailyEmissionsKg).toBeCloseTo(result.hourlyEmissionsKg * 24, -1);
    });

    it('should calculate annual projection in tonnes', () => {
      const result = CarbonEngine.evaluate(baseInput);
      
      // Annual = hourly * 24 * 365 / 1,000,000 (g to tonnes)
      const expectedAnnual = (result.hourlyEmissionsKg * 1000 * 24 * 365) / 1_000_000;
      expect(result.projectedAnnualEmissionsTons).toBeCloseTo(expectedAnnual, 0);
    });

    it('should calculate carbon per GPU hour', () => {
      const result = CarbonEngine.evaluate(baseInput);
      
      // Per-GPU = hourly carbon / GPU count
      const hourlyCarbon = baseInput.pue * baseInput.powerKwh * 
        (baseInput.carbonIntensityGPerKwh * (1 - baseInput.renewableMixPct / 100));
      expect(result.carbonPerGpuHour).toBeCloseTo(hourlyCarbon / baseInput.activeGpuCount, 0);
    });

    it('should handle zero GPU count gracefully', () => {
      const input = { ...baseInput, activeGpuCount: 0 };
      const result = CarbonEngine.evaluate(input);
      
      expect(result.carbonPerGpuHour).toBe(0);
    });

    it('should calculate renewable offset correctly', () => {
      const result = CarbonEngine.evaluate(baseInput);
      
      expect(result.renewableOffsetPct).toBe(baseInput.renewableMixPct);
    });

    it('should calculate effective carbon intensity', () => {
      const result = CarbonEngine.evaluate(baseInput);
      
      // 30 * (1 - 0.8) = 6
      expect(result.effectiveCarbonIntensity).toBeCloseTo(6, 1);
    });

    it('should return carbon efficiency score between 0-100', () => {
      const result = CarbonEngine.evaluate(baseInput);
      
      expect(result.carbonEfficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.carbonEfficiencyScore).toBeLessThanOrEqual(100);
    });

    it('should calculate scope 2 emissions', () => {
      const result = CarbonEngine.evaluate(baseInput);
      
      // Scope 2 = pue * power * intensity / 1000
      const expectedScope2 = (baseInput.pue * baseInput.powerKwh * baseInput.carbonIntensityGPerKwh) / 1000;
      expect(result.scope2EmissionsKg).toBeCloseTo(expectedScope2, 0);
    });
  });

  describe('getRegionalIntensity()', () => {
    it('should return correct intensity for Quebec (low carbon)', () => {
      const feed = CarbonEngine.getRegionalIntensity('CA-QC');
      
      expect(feed.carbonIntensityGPerKwh).toBeLessThan(50);
      expect(feed.renewablePercentage).toBeGreaterThan(90);
    });

    it('should return correct intensity for Alberta (high carbon)', () => {
      const feed = CarbonEngine.getRegionalIntensity('CA-AB');
      
      expect(feed.carbonIntensityGPerKwh).toBeGreaterThan(400);
      expect(feed.renewablePercentage).toBeLessThan(30);
    });

    it('should return default for unknown region', () => {
      const feed = CarbonEngine.getRegionalIntensity('UNKNOWN' as any);
      
      // Should fall back to Quebec
      expect(feed).toBeDefined();
      expect(feed.carbonIntensityGPerKwh).toBeDefined();
    });
  });

  describe('compareRegions()', () => {
    it('should compare emissions between two regions', () => {
      const comparison = CarbonEngine.compareRegions(baseInput, 'CA-QC', 'CA-AB');
      
      expect(comparison.from.region).toBe('CA-QC');
      expect(comparison.to.region).toBe('CA-AB');
      expect(comparison.from.metrics).toBeDefined();
      expect(comparison.to.metrics).toBeDefined();
    });

    it('should show higher emissions for high-carbon regions', () => {
      const comparison = CarbonEngine.compareRegions(baseInput, 'CA-QC', 'CA-AB');
      
      // Alberta should have higher emissions than Quebec
      expect(comparison.to.metrics.projectedAnnualEmissionsTons)
        .toBeGreaterThan(comparison.from.metrics.projectedAnnualEmissionsTons);
    });

    it('should calculate emissions delta correctly', () => {
      const comparison = CarbonEngine.compareRegions(baseInput, 'CA-QC', 'CA-AB');
      
      const expectedDelta = comparison.to.metrics.projectedAnnualEmissionsTons - 
        comparison.from.metrics.projectedAnnualEmissionsTons;
      expect(comparison.emissionsDelta).toBeCloseTo(expectedDelta, 1);
    });

    it('should calculate savings correctly', () => {
      const comparison = CarbonEngine.compareRegions(baseInput, 'CA-QC', 'CA-AB');
      
      // Savings = from - to (positive if moving to lower carbon region)
      expect(comparison.savings).toBe(-comparison.emissionsDelta);
    });
  });

  describe('simulateCarbonPriceShock()', () => {
    it('should calculate cost increase from carbon price hike', () => {
      const metrics = CarbonEngine.evaluate(baseInput);
      const shock = CarbonEngine.simulateCarbonPriceShock(metrics, 80, 170);
      
      expect(shock.currentPricePerTon).toBe(80);
      expect(shock.newPricePerTon).toBe(170);
      expect(shock.newAnnualCost).toBeGreaterThan(shock.currentAnnualCost);
    });

    it('should calculate percentage increase correctly', () => {
      const metrics = CarbonEngine.evaluate(baseInput);
      const shock = CarbonEngine.simulateCarbonPriceShock(metrics, 100, 150);
      
      // 50% price increase should result in 50% cost increase
      expect(shock.priceIncreasePct).toBe(50);
    });

    it('should handle edge case of zero starting price', () => {
      const metrics = CarbonEngine.evaluate(baseInput);
      const shock = CarbonEngine.simulateCarbonPriceShock(metrics, 0, 100);
      
      expect(shock.currentAnnualCost).toBe(0);
      expect(shock.newAnnualCost).toBeGreaterThan(0);
    });
  });

  describe('calculateCarbonBudget()', () => {
    it('should calculate remaining budget correctly', () => {
      const budget = CarbonEngine.calculateCarbonBudget(1000, 250, 91); // Q1
      
      expect(budget.remainingTons).toBe(750);
      expect(budget.usedTons).toBe(250);
    });

    it('should calculate run rate correctly', () => {
      const budget = CarbonEngine.calculateCarbonBudget(1000, 365, 365); // 1 ton/day
      
      expect(budget.runRateTonsPerDay).toBeCloseTo(1, 1);
    });

    it('should project annual total from run rate', () => {
      const budget = CarbonEngine.calculateCarbonBudget(1000, 100, 100);
      
      // 100 tons in 100 days = 1 ton/day * 365 = 365 tons projected
      expect(budget.projectedTotalTons).toBeCloseTo(365, 0);
    });

    it('should mark as on track when under budget', () => {
      const budget = CarbonEngine.calculateCarbonBudget(1000, 100, 100);
      
      // Projected 365 tons vs 1000 budget = on track
      expect(budget.onTrack).toBe(true);
    });

    it('should mark as over budget when exceeding', () => {
      const budget = CarbonEngine.calculateCarbonBudget(100, 100, 100);
      
      // Projected 365 tons vs 100 budget = over
      expect(budget.onTrack).toBe(false);
    });

    it('should calculate variance from budget', () => {
      const budget = CarbonEngine.calculateCarbonBudget(1000, 100, 100);
      
      // Variance = projected - budget = 365 - 1000 = -635
      expect(budget.variance).toBeLessThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 100% renewable mix', () => {
      const input = { ...baseInput, renewableMixPct: 100 };
      const result = CarbonEngine.evaluate(input);
      
      expect(result.effectiveCarbonIntensity).toBe(0);
      expect(result.hourlyEmissionsKg).toBe(0);
    });

    it('should handle 0% renewable mix', () => {
      const input = { ...baseInput, renewableMixPct: 0 };
      const result = CarbonEngine.evaluate(input);
      
      expect(result.effectiveCarbonIntensity).toBe(baseInput.carbonIntensityGPerKwh);
    });

    it('should handle very high PUE values', () => {
      const input = { ...baseInput, pue: 3.0 };
      const result = CarbonEngine.evaluate(input);
      
      expect(result.hourlyEmissionsKg).toBeGreaterThan(0);
      expect(result.carbonEfficiencyScore).toBeLessThan(50);
    });

    it('should handle very low PUE values', () => {
      const input = { ...baseInput, pue: 1.05 };
      const result = CarbonEngine.evaluate(input);
      
      // Very low PUE = more efficient, score should be reasonable
      expect(result.carbonEfficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.carbonEfficiencyScore).toBeLessThanOrEqual(100);
    });
  });
});
