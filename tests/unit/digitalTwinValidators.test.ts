import { describe, it, expect } from 'vitest';
import {
  isDigitalTwinBlueprint,
  isOperationallyRelevant,
  validateDigitalTwinRecommendation,
  filterValidDigitalTwins,
} from '@/lib/digitalTwin/validators';

describe('Digital Twin Validators', () => {
  describe('isDigitalTwinBlueprint', () => {
    it('should accept valid Digital Twin with process, data, events', () => {
      const validTwin = {
        title: 'Develop a Digital Twin for Multi-Echelon Supply Chain & Inventory Planning',
        description: 'Predictive replenishment using POS and WMS data, triggered by low-stock alerts, improves inventory accuracy by 15%',
      };
      
      const result = isDigitalTwinBlueprint(validTwin);
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(60);
      expect(result.reasons).toHaveLength(0);
    });

    it('should accept operational process without explicit "digital twin" mention', () => {
      const operationalTwin = {
        title: 'Supply Chain Optimization for Walmart',
        description: 'Automated replenishment using WMS inventory data, triggered by forecast runs, reduces stockouts by 20%',
      };
      
      const result = isDigitalTwinBlueprint(operationalTwin);
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(60);
    });

    it('should reject generic AI initiative without operational process', () => {
      const generic = {
        title: 'AI-Powered Innovation Program',
        description: 'Implement AI across the organization to drive innovation and digital transformation',
      };
      
      const result = isDigitalTwinBlueprint(generic);
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(60);
      expect(result.reasons).toContain('Does not mention digital twin or operational process');
    });

    it('should penalize recommendations without data sources', () => {
      const noData = {
        title: 'Digital Twin for Supply Chain',
        description: 'Optimize supply chain operations and improve efficiency',
      };
      
      const result = isDigitalTwinBlueprint(noData);
      
      expect(result.reasons).toContain('No data sources or systems mentioned');
    });

    it('should penalize recommendations without event triggers', () => {
      const noEvents = {
        title: 'Digital Twin using POS and WMS data',
        description: 'Track inventory and optimize replenishment',
      };
      
      const result = isDigitalTwinBlueprint(noEvents);
      
      expect(result.reasons).toContain('No event triggers mentioned');
    });

    it('should penalize recommendations without operational impact', () => {
      const noImpact = {
        title: 'Supply Chain Digital Twin',
        description: 'Monitor supply chain using WMS data triggered by alerts',
      };
      
      const result = isDigitalTwinBlueprint(noImpact);
      
      expect(result.reasons).toContain('No operational impact metrics mentioned');
    });
  });

  describe('isOperationallyRelevant', () => {
    it('should accept operational twin for enterprise retail', () => {
      const retailOps = {
        title: 'Store Operations & Workforce Digital Twin',
        description: 'Optimize workforce scheduling and task distribution in stores using HRIS data',
      };
      
      const result = isOperationallyRelevant(retailOps, 'Enterprise Retail + Global Supply Chain');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(60);
    });

    it('should reject CX personalization for enterprise retail', () => {
      const cxPersonalization = {
        title: 'Customer Experience Personalization Engine',
        description: 'Enhance customer personalization and improve shopping experience with AI recommendations',
      };
      
      const result = isOperationallyRelevant(cxPersonalization, 'Enterprise Retail + Global Supply Chain');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(60);
      expect(result.reasons.some(r => r.includes('banned B2C term'))).toBe(true);
    });

    it('should reject merchandising recommendations for retail', () => {
      const merchandising = {
        title: 'Predictive Merchandising with AI',
        description: 'Optimize customer journey and merchandising strategies',
      };
      
      const result = isOperationallyRelevant(merchandising, 'Enterprise Retail');
      
      expect(result.isValid).toBe(false);
      expect(result.reasons.some(r => r.includes('merchandising'))).toBe(true);
    });

    it('should reject generic upskilling without operational tie-in', () => {
      const genericUpskill = {
        title: 'AI Upskilling Program',
        description: 'Train employees on AI concepts and tools to improve AI literacy',
      };
      
      const result = isOperationallyRelevant(genericUpskill, 'Enterprise Retail');
      
      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Generic upskilling not tied to operational roles');
    });

    it('should accept upskilling tied to operational roles', () => {
      const opsUpskill = {
        title: 'Store Manager AI Training for Operations Twin',
        description: 'Train store managers and schedulers on workforce optimization twin',
      };
      
      const result = isOperationallyRelevant(opsUpskill, 'Enterprise Retail');
      
      expect(result.isValid).toBe(true);
    });

    it('should require operational focus for retail', () => {
      const noOps = {
        title: 'AI Marketing Automation',
        description: 'Automate marketing campaigns and customer segmentation',
      };
      
      const result = isOperationallyRelevant(noOps, 'Enterprise Retail');
      
      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('No operational focus for enterprise retail');
    });
  });

  describe('validateDigitalTwinRecommendation', () => {
    it('should validate complete Digital Twin for enterprise retail', () => {
      const completeTwin = {
        title: 'Deploy a Supply Chain & Inventory Digital Twin for Walmart',
        description: 'SKU-level forecasting using POS and WMS data, triggered by forecast runs, improves inventory turns by 15%, reduces stockouts by 20%',
      };
      
      const result = validateDigitalTwinRecommendation(completeTwin, 'Enterprise Retail + Global Supply Chain');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.reasons).toHaveLength(0);
    });

    it('should reject CX personalization for retail even if it mentions events', () => {
      const cxWithEvents = {
        title: 'Customer Personalization Engine',
        description: 'Triggered by customer behavior, uses transaction data to improve shopping experience',
      };
      
      const result = validateDigitalTwinRecommendation(cxWithEvents, 'Enterprise Retail');
      
      expect(result.isValid).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should combine twin and operational checks', () => {
      const partialTwin = {
        title: 'Generic AI Innovation',
        description: 'Drive innovation across the organization',
      };
      
      const result = validateDigitalTwinRecommendation(partialTwin, 'Enterprise Retail');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(60);
    });
  });

  describe('filterValidDigitalTwins', () => {
    it('should filter out non-Digital Twins and keep valid ones', () => {
      const recommendations = [
        {
          id: '1',
          title: 'Customer Personalization Engine',
          description: 'Enhance customer shopping experience',
        },
        {
          id: '2',
          title: 'Supply Chain Digital Twin',
          description: 'Optimize inventory using WMS data, triggered by alerts, reduces stockouts by 15%',
        },
        {
          id: '3',
          title: 'Generic AI Upskilling',
          description: 'Train employees on AI basics',
        },
        {
          id: '4',
          title: 'Warehouse Automation Twin',
          description: 'Robotics orchestration using IoT sensors, triggered by pick events, improves efficiency by 25%',
        },
      ];
      
      const { valid, rejected } = filterValidDigitalTwins(recommendations, 'Enterprise Retail');
      
      expect(valid.length).toBe(2);
      expect(valid[0].id).toBe('2');
      expect(valid[1].id).toBe('4');
      
      expect(rejected.length).toBe(2);
      expect(rejected[0].rec.id).toBe('1');
      expect(rejected[1].rec.id).toBe('3');
    });

    it('should log rejection reasons for debugging', () => {
      const recommendations = [
        {
          id: '1',
          title: 'Customer Experience Personalization',
          description: 'Improve customer journey with AI',
        },
      ];
      
      const { valid, rejected } = filterValidDigitalTwins(recommendations, 'Enterprise Retail');
      
      expect(valid.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].validation.reasons.length).toBeGreaterThan(0);
    });

    it('should accept all recommendations if no industry filter', () => {
      const recommendations = [
        {
          id: '1',
          title: 'Digital Twin for Process A',
          description: 'Uses data source X, triggered by event Y, improves metric Z',
        },
        {
          id: '2',
          title: 'Customer Personalization',
          description: 'Uses transaction data, triggered by behavior',
        },
      ];
      
      const { valid, rejected } = filterValidDigitalTwins(recommendations);
      
      // Without industry filter, only twin-check applies
      // CX might still fail if it's not a proper twin
      expect(valid.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Real-World Test Cases', () => {
    it('should accept all Walmart operational twins', () => {
      const walmartTwins = [
        {
          title: 'Develop a Digital Twin for Multi-Echelon Supply Chain & Inventory Planning',
          description: 'SKU-level forecasting using POS, WMS, and TMS data, triggered by forecast runs, improves inventory turns by 15%',
        },
        {
          title: 'Deploy a Store Operations & Workforce Digital Twin',
          description: 'Task orchestration using HRIS and IoT sensors, triggered by peak traffic alerts, improves labor efficiency by 10%',
        },
        {
          title: 'Build a Last-Mile Logistics Optimization Twin',
          description: 'Route planning using GPS and WMS data, triggered by delivery windows, reduces transportation costs by 12%',
        },
      ];
      
      const { valid, rejected } = filterValidDigitalTwins(walmartTwins, 'Enterprise Retail');
      
      expect(valid.length).toBe(3);
      expect(rejected.length).toBe(0);
    });

    it('should reject all CX/marketing twins for Walmart', () => {
      const cxTwins = [
        {
          title: 'Enhance Customer Personalization and Predictive Merchandising',
          description: 'Improve shopping experience with AI recommendations',
        },
        {
          title: 'Customer Journey Optimization',
          description: 'Map and optimize customer touchpoints',
        },
        {
          title: 'Loyalty Program Enhancement',
          description: 'Personalized promotions and rewards',
        },
      ];
      
      const { valid, rejected } = filterValidDigitalTwins(cxTwins, 'Enterprise Retail');
      
      expect(valid.length).toBe(0);
      expect(rejected.length).toBe(3);
    });
  });
});
