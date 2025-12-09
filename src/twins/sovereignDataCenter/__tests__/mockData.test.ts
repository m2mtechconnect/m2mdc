import { describe, it, expect } from 'vitest';
import { 
  telusSovereignFacility, 
  prairieMegaFacility, 
  getDemoSimulationRuns,
  getDemoFacilityById,
  getAllDemoFacilities
} from '../mockData';

describe('Sovereign DC Mock Data', () => {
  describe('telusSovereignFacility', () => {
    it('has required facility properties', () => {
      expect(telusSovereignFacility.id).toBeDefined();
      expect(telusSovereignFacility.name).toBeTruthy();
      expect(telusSovereignFacility.region).toBe('QC');
    });

    it('has valid energy mix', () => {
      const { energyMix } = telusSovereignFacility;
      expect(energyMix.renewable).toBeGreaterThanOrEqual(0);
      expect(energyMix.renewable).toBeLessThanOrEqual(1);
      expect(energyMix.naturalGas).toBeGreaterThanOrEqual(0);
    });

    it('has GPU clusters', () => {
      expect(telusSovereignFacility.gpuClusters.length).toBeGreaterThan(0);
      
      telusSovereignFacility.gpuClusters.forEach(cluster => {
        expect(cluster.id).toBeDefined();
        expect(cluster.gpuCount).toBeGreaterThan(0);
        expect(['H100', 'A100', 'L40S', 'Other']).toContain(cluster.gpuType);
      });
    });

    it('has data flows', () => {
      expect(telusSovereignFacility.dataFlows.length).toBeGreaterThan(0);
      
      telusSovereignFacility.dataFlows.forEach(flow => {
        expect(flow.id).toBeDefined();
        expect(flow.jurisdiction).toBeTruthy();
        expect(typeof flow.sovereign).toBe('boolean');
      });
    });

    it('has incident scenarios', () => {
      expect(telusSovereignFacility.incidentScenarios.length).toBeGreaterThan(0);
      
      telusSovereignFacility.incidentScenarios.forEach(incident => {
        expect(incident.id).toBeDefined();
        expect(incident.category).toBeTruthy();
        expect(incident.mttrMinutes).toBeGreaterThan(0);
      });
    });

    it('has base KPIs', () => {
      const { baseKpis } = telusSovereignFacility;
      expect(baseKpis.sovereignComputeRatioPct).toBeDefined();
      expect(baseKpis.effectiveAiPue).toBeDefined();
      expect(baseKpis.gco2PerGpuHour).toBeDefined();
      expect(baseKpis.sovereignRiskScore).toBeDefined();
      expect(baseKpis.economicEfficiencyScore).toBeDefined();
    });
  });

  describe('prairieMegaFacility', () => {
    it('has different characteristics from TELUS facility', () => {
      expect(prairieMegaFacility.region).toBe('AB');
      expect(prairieMegaFacility.energyMix.naturalGas).toBeGreaterThan(
        telusSovereignFacility.energyMix.naturalGas
      );
    });

    it('has higher carbon intensity', () => {
      expect(prairieMegaFacility.baseKpis.gco2PerGpuHour).toBeGreaterThan(
        telusSovereignFacility.baseKpis.gco2PerGpuHour
      );
    });
  });

  describe('getDemoSimulationRuns', () => {
    it('returns simulation runs for TELUS facility', () => {
      const runs = getDemoSimulationRuns(telusSovereignFacility.id);
      
      expect(runs.length).toBeGreaterThan(0);
      runs.forEach(run => {
        expect(run.facilityId).toBe(telusSovereignFacility.id);
        expect(run.type).toBeDefined();
        expect(run.resultsSummary).toBeTruthy();
      });
    });

    it('returns simulation runs for Prairie facility', () => {
      const runs = getDemoSimulationRuns(prairieMegaFacility.id);
      
      expect(runs.length).toBeGreaterThan(0);
      runs.forEach(run => {
        expect(run.facilityId).toBe(prairieMegaFacility.id);
      });
    });

    it('returns empty array for unknown facility', () => {
      const runs = getDemoSimulationRuns('unknown-facility');
      expect(runs).toEqual([]);
    });
  });

  describe('getDemoFacilityById', () => {
    it('returns TELUS facility by ID', () => {
      const facility = getDemoFacilityById(telusSovereignFacility.id);
      expect(facility).toBe(telusSovereignFacility);
    });

    it('returns Prairie facility by ID', () => {
      const facility = getDemoFacilityById(prairieMegaFacility.id);
      expect(facility).toBe(prairieMegaFacility);
    });

    it('returns undefined for unknown ID', () => {
      const facility = getDemoFacilityById('unknown');
      expect(facility).toBeUndefined();
    });
  });

  describe('getAllDemoFacilities', () => {
    it('returns all demo facilities', () => {
      const facilities = getAllDemoFacilities();
      
      expect(facilities.length).toBe(2);
      expect(facilities).toContain(telusSovereignFacility);
      expect(facilities).toContain(prairieMegaFacility);
    });
  });
});
