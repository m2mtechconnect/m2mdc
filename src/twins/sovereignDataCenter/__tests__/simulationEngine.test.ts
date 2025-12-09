import { describe, it, expect } from 'vitest';
import { 
  runSimulation, 
  createSimulationRun, 
  getScenarioSuggestions 
} from '../simulationEngine';
import { telusSovereignFacility } from '../mockData';
import type { SovereignKpis } from '@/types/sovereignDataCenterTwin';

const baseKpis: SovereignKpis = {
  sovereignComputeRatioPct: 85,
  effectiveAiPue: 1.25,
  gco2PerGpuHour: 42,
  sovereignRiskScore: 15,
  economicEfficiencyScore: 78,
  renewableRatioPct: 95,
  carbonIntensityKgPerMwh: 35,
  totalGpuCount: 2400,
  activeWorkloads: 156
};

describe('Sovereign DC Simulation Engine', () => {
  describe('runSimulation', () => {
    it('handles gpu_overload scenario', () => {
      const result = runSimulation(baseKpis, 'gpu_overload');
      
      expect(result.kpiDeltas).toBeDefined();
      expect(result.resultsSummary).toContain('GPU');
      expect(result.kpiDeltas.effectiveAiPue).toBeGreaterThan(0);
    });

    it('handles cooling_failure scenario', () => {
      const result = runSimulation(baseKpis, 'cooling_failure');
      
      expect(result.kpiDeltas.effectiveAiPue).toBeGreaterThan(0);
      expect(result.kpiDeltas.gco2PerGpuHour).toBeGreaterThan(0);
      expect(result.resultsSummary.toLowerCase()).toContain('cooling');
    });

    it('handles carbon_price_shock scenario', () => {
      const result = runSimulation(baseKpis, 'carbon_price_shock');
      
      expect(result.kpiDeltas.economicEfficiencyScore).toBeDefined();
      expect(result.resultsSummary.toLowerCase()).toContain('carbon');
    });

    it('handles new_tenant_onboarding scenario', () => {
      const result = runSimulation(baseKpis, 'new_tenant_onboarding', { newTenantSovereign: true });
      
      expect(result.kpiDeltas.sovereignComputeRatioPct).toBeGreaterThan(0);
      expect(result.resultsSummary.toLowerCase()).toContain('tenant');
    });

    it('handles sovereignty_violation scenario', () => {
      const result = runSimulation(baseKpis, 'sovereignty_violation');
      
      expect(result.kpiDeltas.sovereignRiskScore).toBeGreaterThan(0);
      expect(result.kpiDeltas.sovereignComputeRatioPct).toBeLessThan(0);
    });

    it('handles power_grid_outage scenario', () => {
      const result = runSimulation(baseKpis, 'power_grid_outage');
      
      expect(result.kpiDeltas.effectiveAiPue).toBeGreaterThan(0);
      expect(result.resultsSummary.toLowerCase()).toContain('grid');
    });

    it('returns default deltas for mixed_custom scenario', () => {
      const result = runSimulation(baseKpis, 'mixed_custom');
      
      expect(result.kpiDeltas).toBeDefined();
      expect(result.resultsSummary).toBeTruthy();
    });
  });

  describe('createSimulationRun', () => {
    it('creates a valid simulation run object', () => {
      const result = runSimulation(baseKpis, 'gpu_overload', { gpuUtilizationIncrease: 30 });
      const run = createSimulationRun(
        'facility-123',
        'gpu_overload',
        { gpuUtilizationIncrease: 30 },
        result
      );

      expect(run.id).toBeDefined();
      expect(run.facilityId).toBe('facility-123');
      expect(run.name).toBe('GPU Overload Scenario');
      expect(run.type).toBe('gpu_overload');
      expect(run.resultsSummary).toBe(result.resultsSummary);
      expect(run.kpiDeltas).toEqual(result.kpiDeltas);
      expect(run.createdAt).toBeDefined();
      expect(run.status).toBe('completed');
    });
  });

  describe('getScenarioSuggestions', () => {
    it('returns scenario suggestions for a facility', () => {
      const suggestions = getScenarioSuggestions(telusSovereignFacility);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.type).toBeDefined();
        expect(suggestion.label).toBeDefined();
        expect(suggestion.description).toBeDefined();
      });
    });

    it('includes QC vs AB comparison for green facilities', () => {
      const suggestions = getScenarioSuggestions(telusSovereignFacility);
      
      const comparisonScenario = suggestions.find(s => s.type === 'emissions_vs_sovereignty');
      expect(comparisonScenario).toBeDefined();
    });

    it('returns base scenarios without facility', () => {
      const suggestions = getScenarioSuggestions(undefined);
      
      expect(suggestions.length).toBeGreaterThanOrEqual(5);
      expect(suggestions.find(s => s.type === 'gpu_overload')).toBeDefined();
      expect(suggestions.find(s => s.type === 'cooling_failure')).toBeDefined();
    });
  });
});
