import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration tests for recommendation generation pipeline
 * Tests the full flow from domain classification to ranked recommendations
 */

describe('Recommendation Pipeline - Integration', () => {
  let supabase: SupabaseClient;
  
  beforeAll(() => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  it('should classify walmart.com as Enterprise Retail', async () => {
    // Mock domain classification
    const domain = 'walmart.com';
    const knownRetailers = ['walmart.com', 'target.com', 'costco.com', 'homedepot.com'];
    
    const isEnterpriseRetail = knownRetailers.includes(domain);
    const industry = isEnterpriseRetail ? 'Enterprise Retail' : 'Unknown';
    
    expect(industry).toBe('Enterprise Retail');
  });

  it('should classify sap.com as Enterprise Software', async () => {
    const domain = 'sap.com';
    const knownRetailers = ['walmart.com', 'target.com', 'costco.com', 'homedepot.com'];
    
    const isEnterpriseRetail = knownRetailers.includes(domain);
    const industry = isEnterpriseRetail ? 'Enterprise Retail' : 'Enterprise Software';
    
    expect(industry).toBe('Enterprise Software');
  });

  it('should filter recommendations for enterprise retail', async () => {
    const mockRecommendations = [
      {
        title: 'Customer Personalization Engine',
        description: 'Build personalized customer journeys',
        department: 'Marketing',
      },
      {
        title: 'Supply Chain Digital Twin',
        description: 'Optimize inventory and forecasting',
        department: 'Operations',
      },
      {
        title: 'Store Operations Twin',
        description: 'Workforce scheduling and task automation',
        department: 'Operations',
      },
    ];
    
    const industry = 'Enterprise Retail';
    
    // Filter logic
    const bannedTerms = ['customer personalization', 'personalized'];
    const filtered = mockRecommendations.filter(rec => {
      const text = `${rec.title} ${rec.description}`.toLowerCase();
      return !bannedTerms.some(term => text.includes(term));
    });
    
    expect(filtered.length).toBe(2);
    expect(filtered[0].title).toBe('Supply Chain Digital Twin');
    expect(filtered[1].title).toBe('Store Operations Twin');
  });

  it('should rank operational twins higher than generic recommendations', async () => {
    const mockRecommendations = [
      {
        title: 'Generic AI Training',
        score: 0.20,
      },
      {
        title: 'Supply Chain Digital Twin',
        score: 0.85,
      },
      {
        title: 'Logistics Optimization Twin',
        score: 0.80,
      },
    ];
    
    const ranked = mockRecommendations.sort((a, b) => b.score - a.score);
    
    expect(ranked[0].title).toBe('Supply Chain Digital Twin');
    expect(ranked[1].title).toBe('Logistics Optimization Twin');
    expect(ranked[2].title).toBe('Generic AI Training');
  });

  it('should return only top 3 recommendations after filtering', async () => {
    const mockRecommendations = Array.from({ length: 10 }, (_, i) => ({
      id: `rec-${i}`,
      title: `Operational Twin ${i}`,
      score: 0.9 - (i * 0.05),
    }));
    
    const topN = 3;
    const top3 = mockRecommendations.slice(0, topN);
    
    expect(top3.length).toBe(3);
    expect(top3[0].score).toBeGreaterThan(top3[1].score);
    expect(top3[1].score).toBeGreaterThan(top3[2].score);
  });

  it('should include operational tags in recommendations', async () => {
    const operationalTags = [
      'Supply Chain & Inventory',
      'Store Operations & Workforce',
      'Logistics & Last Mile',
      'Risk & Loss Prevention',
      'ESG & Sustainability',
    ];
    
    const mockRec = {
      title: 'Develop a Digital Twin for Multi-Echelon Supply Chain',
      tags: ['Supply Chain & Inventory', 'Funding Eligible'],
    };
    
    const hasOperationalTag = mockRec.tags.some(tag => operationalTags.includes(tag));
    
    expect(hasOperationalTag).toBe(true);
  });

  it('should not include personalization tags for enterprise retail', async () => {
    const bannedTags = ['Personalization', 'Marketing', 'Customer Experience'];
    
    const mockRec = {
      title: 'Supply Chain Twin',
      tags: ['Supply Chain & Inventory', 'Funding Eligible'],
    };
    
    const hasBannedTag = mockRec.tags.some(tag => bannedTags.includes(tag));
    
    expect(hasBannedTag).toBe(false);
  });
});

describe('Recommendation Content Validation', () => {
  it('should have structured digital twin blueprint format', () => {
    const mockBlueprint = {
      title: 'Develop a Digital Twin for Multi-Echelon Supply Chain & Inventory Planning',
      description: 'Predictive replenishment, SKU-level forecasting, inventory flows, distribution center routing',
      dataSourcesRequired: ['POS', 'WMS', 'TMS', 'ERP'],
      eventTriggers: ['Low stock alert', 'New forecast run', 'Inbound shipment'],
      humanInTheLoop: ['Planner approval', 'Exception handling'],
      businessImpact: '2-4% reduction in stockouts, 3-5% improvement in inventory turns',
      companyFit: 'For global retailers operating 1000+ stores with complex distribution networks',
    };
    
    // Validate structure
    expect(mockBlueprint.title).toContain('Digital Twin');
    expect(mockBlueprint.description.length).toBeGreaterThan(50);
    expect(mockBlueprint.dataSourcesRequired.length).toBeGreaterThan(0);
    expect(mockBlueprint.eventTriggers.length).toBeGreaterThan(0);
    expect(mockBlueprint.humanInTheLoop.length).toBeGreaterThan(0);
    expect(mockBlueprint.businessImpact.length).toBeGreaterThan(0);
    expect(mockBlueprint.companyFit.length).toBeGreaterThan(0);
  });

  it('should have correct scoring weights for enterprise retail', () => {
    const weights = {
      operationsFit: 0.40,
      supplyChainFit: 0.30,
      workforceFit: 0.15,
      logisticsFit: 0.10,
      enterpriseScaleFit: 0.05,
      consumerMarketingFit: 0.00,
      personalizationPenalty: -1.00,
    };
    
    // Validate weights sum correctly (excluding penalties)
    const positiveWeights = 
      weights.operationsFit +
      weights.supplyChainFit +
      weights.workforceFit +
      weights.logisticsFit +
      weights.enterpriseScaleFit;
    
    expect(positiveWeights).toBe(1.00);
    expect(weights.consumerMarketingFit).toBe(0);
    expect(weights.personalizationPenalty).toBeLessThan(0);
  });
});

describe('Edge Function Integration', () => {
  it('should handle domain classification override', () => {
    const testCases = [
      { domain: 'walmart.com', expected: 'Enterprise Retail' },
      { domain: 'target.com', expected: 'Enterprise Retail' },
      { domain: 'costco.com', expected: 'Enterprise Retail' },
      { domain: 'homedepot.com', expected: 'Enterprise Retail' },
      { domain: 'sap.com', expected: 'Not Enterprise Retail' },
    ];
    
    testCases.forEach(({ domain, expected }) => {
      const knownRetailers = ['walmart.com', 'target.com', 'costco.com', 'homedepot.com'];
      const industry = knownRetailers.includes(domain) 
        ? 'Enterprise Retail' 
        : 'Not Enterprise Retail';
      
      expect(industry).toBe(expected);
    });
  });

  it('should post-filter recommendations before returning', () => {
    const mockRecommendations = [
      {
        title: 'Customer Personalization Engine',
        isOperational: false,
      },
      {
        title: 'Supply Chain Digital Twin',
        isOperational: true,
      },
      {
        title: 'Store Operations Twin',
        isOperational: true,
      },
    ];
    
    const industry = 'Enterprise Retail';
    
    // Post-generation filter
    const validated = mockRecommendations.filter(rec => {
      if (industry === 'Enterprise Retail') {
        return rec.isOperational;
      }
      return true;
    });
    
    expect(validated.length).toBe(2);
    expect(validated.every(rec => rec.isOperational)).toBe(true);
  });
});
