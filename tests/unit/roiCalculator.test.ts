import { describe, it, expect } from 'vitest';

// ROI Calculator utility
function calculateROI(params: {
  timeSavedPerRun: number; // minutes
  runsPerWeek: number;
  costPerHour: number;
  accuracyImprovement: number; // percentage
  costPerError: number;
}) {
  const { timeSavedPerRun, runsPerWeek, costPerHour, accuracyImprovement, costPerError } = params;
  
  // Time savings
  const minutesSavedPerWeek = timeSavedPerRun * runsPerWeek;
  const hoursSavedPerWeek = minutesSavedPerWeek / 60;
  const timeSavingsPerYear = hoursSavedPerWeek * 52 * costPerHour;
  
  // Error savings (assuming accuracy improvement reduces errors)
  const errorsSavedPerWeek = runsPerWeek * (accuracyImprovement / 100);
  const errorSavingsPerYear = errorsSavedPerWeek * 52 * costPerError;
  
  // Total savings
  const annualSavings = timeSavingsPerYear + errorSavingsPerYear;
  
  // Assume implementation cost is 20% of first year savings
  const implementationCost = annualSavings * 0.2;
  
  const roi = ((annualSavings - implementationCost) / implementationCost) * 100;
  
  return {
    annualSavings: Math.round(annualSavings),
    timeSavingsPerYear: Math.round(timeSavingsPerYear),
    errorSavingsPerYear: Math.round(errorSavingsPerYear),
    hoursSavedPerWeek: Math.round(hoursSavedPerWeek * 10) / 10,
    roi: Math.round(roi),
  };
}

describe('ROI Calculator', () => {
  it('should calculate basic ROI projection', () => {
    const result = calculateROI({
      timeSavedPerRun: 30,
      runsPerWeek: 40,
      costPerHour: 75,
      accuracyImprovement: 35,
      costPerError: 500,
    });
    
    expect(result.annualSavings).toBeGreaterThan(0);
    expect(result.timeSavingsPerYear).toBeGreaterThan(0);
    expect(result.errorSavingsPerYear).toBeGreaterThan(0);
    expect(result.roi).toBeGreaterThan(0);
  });

  it('should handle zero time savings', () => {
    const result = calculateROI({
      timeSavedPerRun: 0,
      runsPerWeek: 40,
      costPerHour: 75,
      accuracyImprovement: 35,
      costPerError: 500,
    });
    
    expect(result.timeSavingsPerYear).toBe(0);
    expect(result.errorSavingsPerYear).toBeGreaterThan(0);
  });

  it('should calculate hours saved per week correctly', () => {
    const result = calculateROI({
      timeSavedPerRun: 30,
      runsPerWeek: 40,
      costPerHour: 75,
      accuracyImprovement: 0,
      costPerError: 0,
    });
    
    expect(result.hoursSavedPerWeek).toBe(20); // 30min * 40 runs / 60 = 20 hours
  });

  it('should scale with number of runs', () => {
    const lowRuns = calculateROI({
      timeSavedPerRun: 30,
      runsPerWeek: 10,
      costPerHour: 75,
      accuracyImprovement: 35,
      costPerError: 500,
    });
    
    const highRuns = calculateROI({
      timeSavedPerRun: 30,
      runsPerWeek: 100,
      costPerHour: 75,
      accuracyImprovement: 35,
      costPerError: 500,
    });
    
    expect(highRuns.annualSavings).toBeGreaterThan(lowRuns.annualSavings);
  });

  it('should handle high accuracy improvements', () => {
    const result = calculateROI({
      timeSavedPerRun: 30,
      runsPerWeek: 40,
      costPerHour: 75,
      accuracyImprovement: 80,
      costPerError: 1000,
    });
    
    expect(result.errorSavingsPerYear).toBeGreaterThan(1000000);
  });

  it('should return positive ROI for typical scenarios', () => {
    const result = calculateROI({
      timeSavedPerRun: 30,
      runsPerWeek: 40,
      costPerHour: 75,
      accuracyImprovement: 35,
      costPerError: 500,
    });
    
    expect(result.roi).toBeGreaterThan(100);
  });
});
