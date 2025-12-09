import { describe, it, expect } from 'vitest';
import { 
  getSimulationTemplateForIndustry, 
  getIndustryLabel,
  SIMULATION_TEMPLATES,
  type TwinIndustry
} from '../simulationTemplates';

describe('simulationTemplates', () => {
  describe('SIMULATION_TEMPLATES', () => {
    it('should have all 12 industries plus generic', () => {
      const industries: (TwinIndustry | 'generic')[] = [
        'banking', 'insurance', 'retail', 'manufacturing', 'supply_chain',
        'healthcare', 'telecom', 'energy_utilities', 'public_sector',
        'education', 'real_estate', 'travel_hospitality', 'generic'
      ];
      
      industries.forEach(industry => {
        expect(SIMULATION_TEMPLATES[industry]).toBeDefined();
      });
    });

    it('each template should have required fields', () => {
      Object.entries(SIMULATION_TEMPLATES).forEach(([industry, template]) => {
        expect(template.industry).toBe(industry);
        expect(template.title).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.defaultQuery).toBeTruthy();
        expect(template.scenarioSummary).toBeTruthy();
        expect(template.kpis).toHaveLength(3);
        expect(template.events.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('each KPI should have required fields', () => {
      Object.values(SIMULATION_TEMPLATES).forEach(template => {
        template.kpis.forEach(kpi => {
          expect(kpi.code).toBeTruthy();
          expect(kpi.label).toBeTruthy();
          expect(kpi.unit).toBeTruthy();
          expect(typeof kpi.baseline).toBe('number');
          expect(typeof kpi.simulated).toBe('number');
        });
      });
    });

    it('each event should have required fields', () => {
      Object.values(SIMULATION_TEMPLATES).forEach(template => {
        template.events.forEach(event => {
          expect(typeof event.timestampOffsetMin).toBe('number');
          expect(event.type).toBeTruthy();
          expect(event.label).toBeTruthy();
          expect(event.details).toBeDefined();
          if (event.severity) {
            expect(['low', 'medium', 'high', 'critical']).toContain(event.severity);
          }
        });
      });
    });
  });

  describe('getSimulationTemplateForIndustry', () => {
    it('should return correct template for exact match', () => {
      expect(getSimulationTemplateForIndustry('banking').industry).toBe('banking');
      expect(getSimulationTemplateForIndustry('healthcare').industry).toBe('healthcare');
      expect(getSimulationTemplateForIndustry('retail').industry).toBe('retail');
    });

    it('should handle case-insensitive matching', () => {
      expect(getSimulationTemplateForIndustry('BANKING').industry).toBe('banking');
      expect(getSimulationTemplateForIndustry('Healthcare').industry).toBe('healthcare');
    });

    it('should handle loose matching for common variations', () => {
      expect(getSimulationTemplateForIndustry('finance').industry).toBe('banking');
      expect(getSimulationTemplateForIndustry('financial_services').industry).toBe('banking');
      expect(getSimulationTemplateForIndustry('ecommerce').industry).toBe('retail');
      expect(getSimulationTemplateForIndustry('logistics').industry).toBe('supply_chain');
      expect(getSimulationTemplateForIndustry('hospital').industry).toBe('healthcare');
      expect(getSimulationTemplateForIndustry('hotel').industry).toBe('travel_hospitality');
      expect(getSimulationTemplateForIndustry('aviation').industry).toBe('travel_hospitality');
      expect(getSimulationTemplateForIndustry('airport').industry).toBe('travel_hospitality');
    });

    it('should return generic template for null/undefined', () => {
      expect(getSimulationTemplateForIndustry(null).industry).toBe('generic');
      expect(getSimulationTemplateForIndustry(undefined).industry).toBe('generic');
    });

    it('should return generic template for unknown industry', () => {
      expect(getSimulationTemplateForIndustry('xyz_unknown').industry).toBe('generic');
      expect(getSimulationTemplateForIndustry('foo_bar').industry).toBe('generic');
    });
  });

  describe('getIndustryLabel', () => {
    it('should return correct label for known industries', () => {
      expect(getIndustryLabel('banking')).toBe('Banking & Financial Services');
      expect(getIndustryLabel('healthcare')).toBe('Healthcare');
      expect(getIndustryLabel('retail')).toBe('Retail & E-Commerce');
    });

    it('should return default for null/undefined', () => {
      expect(getIndustryLabel(null)).toBe('General Operations');
      expect(getIndustryLabel(undefined)).toBe('General Operations');
    });

    it('should return the original string for unknown industry', () => {
      expect(getIndustryLabel('unknown_industry')).toBe('unknown_industry');
    });
  });
});
