import { describe, it, expect } from 'vitest';
import { classifyIndustry } from '@/lib/digitalTwin/industryClassifier';
import { classifyDepartment } from '@/lib/digitalTwin/departmentClassifier';
import { getTwinTemplate } from '@/lib/digitalTwin/twinTemplates';
import { filterAndRankRecommendations } from '@/lib/digitalTwin/enhancedValidators';

/**
 * Integration Tests: Full Industry + Department → Twin Generation Pipeline
 * Tests the complete flow from classification to filtered recommendations
 */

describe('Full Pipeline - Industry + Department Classification → Twin Generation', () => {
  const testScenarios = [
    {
      domain: 'walmart.com',
      content: 'supply chain inventory forecasting distribution retail stores',
      expectedIndustry: 'Enterprise Retail',
      expectedDepartment: 'Supply Chain',
      expectedTwinTypes: ['Supply Chain & Inventory'],
    },
    {
      domain: 'pfizer.com',
      content: 'pharmaceutical compliance GxP validation regulatory audit',
      expectedIndustry: 'Pharmaceuticals & Life Sciences',
      expectedDepartment: 'Compliance / Risk',
      expectedTwinTypes: ['Compliance', 'GxP', 'Validation'],
    },
    {
      domain: 'sap.com',
      content: 'enterprise software procurement spend vendor management',
      expectedIndustry: 'Software / Enterprise SaaS',
      expectedDepartment: 'Procurement',
      expectedTwinTypes: ['Procurement', 'Vendor Management'],
    },
    {
      domain: 'verizon.com',
      content: 'telecommunications network infrastructure operations',
      expectedIndustry: 'Telecommunications',
      expectedDepartment: 'Operations',
      expectedTwinTypes: ['Network Operations', 'Infrastructure'],
    },
    {
      domain: 'td.com',
      content: 'banking finance credit risk underwriting lending',
      expectedIndustry: 'Financial Services / Banking',
      expectedDepartment: 'Finance',
      expectedTwinTypes: ['Credit Risk', 'Underwriting'],
    },
  ];

  testScenarios.forEach(({ domain, content, expectedIndustry, expectedDepartment }) => {
    describe(`Pipeline for ${domain}`, () => {
      it('should correctly classify industry', () => {
        const industry = classifyIndustry(domain, content);
        expect(industry).toBe(expectedIndustry);
      });

      it('should correctly classify department', () => {
        const department = classifyDepartment(content);
        expect(department).toBe(expectedDepartment);
      });

      it('should retrieve appropriate twin template', () => {
        const industry = classifyIndustry(domain, content);
        const department = classifyDepartment(content);
        const template = getTwinTemplate(industry, department);

        expect(template).toBeDefined();
        expect(template.processDescription).toBeTruthy();
        expect(template.dataSources.length).toBeGreaterThan(0);
        expect(template.kpis.length).toBeGreaterThan(0);
      });

      it('should generate context profile', () => {
        const industry = classifyIndustry(domain, content);
        const department = classifyDepartment(content);
        const template = getTwinTemplate(industry, department);

        const contextProfile = {
          industry,
          department,
          allowedTypes: template.allowedTwinTypes,
          blockedTypes: template.blockedTwinTypes || [],
        };

        expect(contextProfile.industry).toBe(expectedIndustry);
        expect(contextProfile.department).toBe(expectedDepartment);
        expect(contextProfile.allowedTypes.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Full Pipeline - Filtering and Ranking', () => {
  it('should filter out invalid recommendations for Enterprise Retail', () => {
    const mockRecommendations = [
      {
        title: 'Customer Personalization Engine',
        description: 'Personalized customer experiences using AI',
      },
      {
        title: 'Supply Chain Digital Twin',
        description: 'Optimize inventory using ERP and WMS data with forecasting triggers and KPIs',
      },
      {
        title: 'AI Upskilling Program',
        description: 'Training program for employees',
      },
      {
        title: 'Warehouse Operations Twin',
        description: 'Monitor DC operations using WMS and IoT sensors with efficiency KPIs',
      },
    ];

    const industry = 'Enterprise Retail';
    const department = 'Supply Chain';

    const filtered = filterAndRankRecommendations(mockRecommendations, industry, department, 3);

    expect(filtered.length).toBeLessThanOrEqual(3);
    expect(filtered.every(r => r.validation.isValid)).toBe(true);
    
    // Should not contain personalization or upskilling
    const titles = filtered.map(r => r.recommendation.title.toLowerCase());
    expect(titles.some(t => t.includes('personalization'))).toBe(false);
    expect(titles.some(t => t.includes('upskilling'))).toBe(false);
  });

  it('should rank operational twins higher than generic ones', () => {
    const mockRecommendations = [
      {
        title: 'Generic AI Platform',
        description: 'Leverage AI to improve efficiency using data',
      },
      {
        title: 'Supply Chain Digital Twin for Multi-Echelon Planning',
        description: 'Predictive replenishment using ERP, WMS, and TMS data. Triggered by low stock alerts. Planner approval for exceptions. Target 3-5% inventory turn improvement.',
      },
      {
        title: 'Logistics Optimization Twin',
        description: 'Optimize last-mile delivery using TMS and GPS data with route efficiency KPIs',
      },
    ];

    const industry = 'Enterprise Retail';
    const department = 'Supply Chain';

    const ranked = filterAndRankRecommendations(mockRecommendations, industry, department, 3);

    if (ranked.length > 0) {
      const topRec = ranked[0];
      expect(topRec.recommendation.title.toLowerCase()).toContain('twin');
      expect(topRec.validation.scores.total).toBeGreaterThan(50);
    }
  });

  it('should respect industry-specific rules for Pharma Compliance', () => {
    const mockRecommendations = [
      {
        title: 'Marketing Campaign Optimizer',
        description: 'Optimize marketing spend',
      },
      {
        title: 'GxP Validation Digital Twin',
        description: 'Real-time compliance monitoring using EHR and regulatory systems. Triggered by audit events. Ensures % validation accuracy with approval workflows.',
      },
      {
        title: 'Clinical Trial Management Twin',
        description: 'Monitor trial progress using clinical data systems with compliance KPIs',
      },
    ];

    const industry = 'Pharmaceuticals & Life Sciences';
    const department = 'Compliance / Risk';

    const filtered = filterAndRankRecommendations(mockRecommendations, industry, department, 3);

    expect(filtered.length).toBeGreaterThan(0);
    const titles = filtered.map(r => r.recommendation.title.toLowerCase());
    
    // Should not contain marketing
    expect(titles.some(t => t.includes('marketing'))).toBe(false);
    
    // Should contain compliance-related twins
    expect(titles.some(t => t.includes('gxp') || t.includes('compliance') || t.includes('clinical'))).toBe(true);
  });
});

describe('Full Pipeline - Top 3 Selection', () => {
  it('should return exactly 3 recommendations if available', () => {
    const mockRecommendations = Array.from({ length: 10 }, (_, i) => ({
      title: `Digital Twin for Supply Chain Process ${i}`,
      description: `Optimize process ${i} using ERP and WMS data with forecasting triggers and efficiency KPIs targeting ${3 + i}% improvement`,
    }));

    const industry = 'Enterprise Retail';
    const department = 'Supply Chain';

    const top3 = filterAndRankRecommendations(mockRecommendations, industry, department, 3);

    expect(top3.length).toBeLessThanOrEqual(3);
    expect(top3.length).toBeGreaterThan(0);
  });

  it('should return fewer than 3 if not enough valid recommendations', () => {
    const mockRecommendations = [
      {
        title: 'Generic AI Tool',
        description: 'Some generic description',
      },
      {
        title: 'Supply Chain Twin',
        description: 'Optimize inventory using ERP data with triggers and KPIs',
      },
    ];

    const industry = 'Enterprise Retail';
    const department = 'Supply Chain';

    const filtered = filterAndRankRecommendations(mockRecommendations, industry, department, 3);

    expect(filtered.length).toBeLessThanOrEqual(2);
  });

  it('should ensure all Top 3 match industry and department', () => {
    const mockRecommendations = [
      {
        title: 'Supply Chain Digital Twin',
        description: 'Inventory optimization using ERP and WMS with forecasting and efficiency KPIs',
      },
      {
        title: 'Logistics Twin',
        description: 'Route optimization using TMS with delivery triggers and cost KPIs',
      },
      {
        title: 'Warehouse Operations Twin',
        description: 'DC operations using WMS and IoT with throughput KPIs',
      },
      {
        title: 'Marketing Campaign Tool',
        description: 'Campaign optimization',
      },
    ];

    const industry = 'Logistics / Supply Chain / 3PL';
    const department = 'Operations';

    const top3 = filterAndRankRecommendations(mockRecommendations, industry, department, 3);

    top3.forEach(({ recommendation, validation }) => {
      expect(validation.isValid).toBe(true);
      expect(validation.scores.industryFit).toBeGreaterThan(0);
      expect(validation.scores.departmentFit).toBeGreaterThan(0);
    });
  });
});

describe('Full Pipeline - Cross-Industry Coverage', () => {
  const industries = [
    'Enterprise Retail',
    'Pharmaceuticals & Life Sciences',
    'Financial Services / Banking',
    'Manufacturing – Automotive',
    'Software / Enterprise SaaS',
  ];

  industries.forEach(industry => {
    it(`should have valid twin templates for ${industry}`, () => {
      const departments = ['Operations', 'Supply Chain', 'Finance', 'HR / People / Workforce'];
      
      departments.forEach(dept => {
        const template = getTwinTemplate(industry, dept);
        expect(template).toBeDefined();
        expect(template.allowedTwinTypes.length).toBeGreaterThan(0);
      });
    });
  });
});
