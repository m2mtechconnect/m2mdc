import { describe, it, expect } from 'vitest';

/**
 * Unit tests for recommendation filtering and ranking logic
 * Tests the core business rules for enterprise retail recommendations
 */

// Mock recommendation data
const mockRecommendations = [
  {
    id: 'rec-1',
    title: 'Customer Experience Personalization Engine',
    description: 'Build personalized customer journeys and loyalty optimization',
    tags: ['CX Personalization', 'Marketing'],
    department: 'Marketing',
    impact: 'High',
    effort: 'Medium',
    confidence: 0.85,
  },
  {
    id: 'rec-2',
    title: 'Generic AI Upskilling Program',
    description: 'Train employees on basic AI concepts and tools',
    tags: ['Upskilling'],
    department: 'HR',
    impact: 'Medium',
    effort: 'Low',
    confidence: 0.75,
  },
  {
    id: 'rec-3',
    title: 'Develop a Digital Twin for Multi-Echelon Supply Chain & Inventory Planning',
    description: 'Predictive replenishment, SKU-level forecasting, inventory flows, distribution center routing for global retailer operations',
    tags: ['Supply Chain & Inventory', 'Funding Eligible'],
    department: 'Operations',
    impact: 'High',
    effort: 'High',
    confidence: 0.90,
  },
  {
    id: 'rec-4',
    title: 'Deploy a Store Operations & Workforce Digital Twin',
    description: 'Task orchestration, robotics integration, shelf scanning, checkout load balancing for high-volume locations',
    tags: ['Store Operations & Workforce', 'Agentic AI'],
    department: 'Operations',
    impact: 'High',
    effort: 'Medium',
    confidence: 0.88,
  },
  {
    id: 'rec-5',
    title: 'Logistics & Last-Mile Optimization Twin',
    description: 'Fleet routing, delivery batching, transportation modeling, energy optimization',
    tags: ['Logistics & Last Mile', 'ESG & Sustainability'],
    department: 'Operations',
    impact: 'High',
    effort: 'Medium',
    confidence: 0.87,
  },
];

// Banned terms for enterprise retail
const bannedTermsEnterpriseRetail = [
  'customer personalization',
  'personalized shopping',
  'marketing personalization',
  'loyalty optimization',
  'customer journey',
  'journey mapping',
  'promotional optimization',
  'personalization',
  'personalize',
  'personalized',
  'merchandising',
  'customer experience',
  'shopping experience',
];

// Operational keywords for enterprise retail
const operationalKeywords = [
  'supply chain',
  'inventory',
  'distribution center',
  'warehouse',
  'store operations',
  'workforce',
  'logistics',
  'last mile',
  'loss prevention',
  'shrinkage',
  'forecasting',
  'replenishment',
  'sustainability',
  'energy optimization',
];

/**
 * Filter function: Remove B2C personalization/marketing for enterprise retail
 */
function filterEnterpriseRetail(recommendations: any[], industry: string) {
  if (industry !== 'Enterprise Retail') {
    return recommendations;
  }

  return recommendations.filter(rec => {
    const textToCheck = `${rec.title} ${rec.description}`.toLowerCase();
    
    // Check for banned terms
    const hasBannedTerm = bannedTermsEnterpriseRetail.some(term => 
      textToCheck.includes(term.toLowerCase())
    );
    
    if (hasBannedTerm) {
      console.log(`[Filter] Rejecting "${rec.title}" - contains banned term`);
      return false;
    }
    
    // Must have at least one operational keyword
    const hasOperationalKeyword = operationalKeywords.some(keyword =>
      textToCheck.includes(keyword.toLowerCase())
    );
    
    if (!hasOperationalKeyword && rec.department !== 'Operations') {
      console.log(`[Filter] Rejecting "${rec.title}" - no operational keywords`);
      return false;
    }
    
    return true;
  });
}

/**
 * Scoring function: Calculate operational fit for enterprise retail
 */
function scoreEnterpriseRetail(rec: any, industry: string) {
  if (industry !== 'Enterprise Retail') {
    // Default scoring for non-retail
    const impactScore = rec.impact === 'High' ? 0.48 : rec.impact === 'Medium' ? 0.30 : 0.15;
    const relevanceScore = rec.confidence * 0.30;
    return impactScore + relevanceScore;
  }

  // Enterprise retail scoring weights
  const textToCheck = `${rec.title} ${rec.description}`.toLowerCase();
  
  let operationsFitScore = 0;
  let supplyChainFitScore = 0;
  let workforceFitScore = 0;
  let logisticsFitScore = 0;
  let enterpriseScaleFitScore = 0;
  let personalizationPenalty = 0;

  // Operations fit (40%)
  const opsKeywords = ['store operations', 'workforce', 'in-store', 'task automation', 'robotics'];
  opsKeywords.forEach(kw => {
    if (textToCheck.includes(kw)) operationsFitScore += 0.08;
  });
  operationsFitScore = Math.min(operationsFitScore, 0.40);

  // Supply chain fit (30%)
  const scKeywords = ['supply chain', 'inventory', 'forecasting', 'replenishment', 'distribution'];
  scKeywords.forEach(kw => {
    if (textToCheck.includes(kw)) supplyChainFitScore += 0.06;
  });
  supplyChainFitScore = Math.min(supplyChainFitScore, 0.30);

  // Workforce fit (15%)
  const workforceKeywords = ['workforce', 'scheduling', 'shift', 'staffing', 'labor'];
  workforceKeywords.forEach(kw => {
    if (textToCheck.includes(kw)) workforceFitScore += 0.03;
  });
  workforceFitScore = Math.min(workforceFitScore, 0.15);

  // Logistics fit (10%)
  const logisticsKeywords = ['logistics', 'last mile', 'fleet', 'delivery', 'transportation'];
  logisticsKeywords.forEach(kw => {
    if (textToCheck.includes(kw)) logisticsFitScore += 0.02;
  });
  logisticsFitScore = Math.min(logisticsFitScore, 0.10);

  // Enterprise scale fit (5%)
  const scaleKeywords = ['global', 'enterprise', 'multi-echelon', 'thousands of stores'];
  scaleKeywords.forEach(kw => {
    if (textToCheck.includes(kw)) enterpriseScaleFitScore += 0.01;
  });
  enterpriseScaleFitScore = Math.min(enterpriseScaleFitScore, 0.05);

  // Personalization penalty (-100%)
  bannedTermsEnterpriseRetail.forEach(term => {
    if (textToCheck.includes(term)) {
      personalizationPenalty -= 0.80; // Massive penalty per banned term
    }
  });

  const totalScore = 
    operationsFitScore +
    supplyChainFitScore +
    workforceFitScore +
    logisticsFitScore +
    enterpriseScaleFitScore +
    personalizationPenalty;

  return Math.max(0, totalScore); // Floor at 0
}

/**
 * Rank recommendations by composite score
 */
function rankRecommendations(recommendations: any[], industry: string) {
  const scored = recommendations.map(rec => ({
    ...rec,
    compositeScore: scoreEnterpriseRetail(rec, industry),
  }));

  return scored.sort((a, b) => b.compositeScore - a.compositeScore);
}

describe('Recommendation Engine - Filtering', () => {
  it('should reject CX personalization for enterprise retail', () => {
    const filtered = filterEnterpriseRetail(mockRecommendations, 'Enterprise Retail');
    
    const hasCXPersonalization = filtered.some(rec => 
      rec.title.toLowerCase().includes('personalization')
    );
    
    expect(hasCXPersonalization).toBe(false);
  });

  it('should reject generic AI upskilling for enterprise retail', () => {
    const filtered = filterEnterpriseRetail(mockRecommendations, 'Enterprise Retail');
    
    const hasGenericUpskilling = filtered.some(rec =>
      rec.title.toLowerCase().includes('generic ai upskilling')
    );
    
    expect(hasGenericUpskilling).toBe(false);
  });

  it('should keep supply chain twins for enterprise retail', () => {
    const filtered = filterEnterpriseRetail(mockRecommendations, 'Enterprise Retail');
    
    const hasSupplyChain = filtered.some(rec =>
      rec.tags?.includes('Supply Chain & Inventory')
    );
    
    expect(hasSupplyChain).toBe(true);
  });

  it('should keep store operations twins for enterprise retail', () => {
    const filtered = filterEnterpriseRetail(mockRecommendations, 'Enterprise Retail');
    
    const hasStoreOps = filtered.some(rec =>
      rec.tags?.includes('Store Operations & Workforce')
    );
    
    expect(hasStoreOps).toBe(true);
  });

  it('should keep logistics twins for enterprise retail', () => {
    const filtered = filterEnterpriseRetail(mockRecommendations, 'Enterprise Retail');
    
    const hasLogistics = filtered.some(rec =>
      rec.tags?.includes('Logistics & Last Mile')
    );
    
    expect(hasLogistics).toBe(true);
  });

  it('should allow all recommendations for non-retail industries', () => {
    const filtered = filterEnterpriseRetail(mockRecommendations, 'Enterprise Software');
    
    // Should not filter anything for non-retail
    expect(filtered.length).toBe(mockRecommendations.length);
  });
});

describe('Recommendation Engine - Scoring', () => {
  it('should prioritize operational twins over CX for enterprise retail', () => {
    const ranked = rankRecommendations(mockRecommendations, 'Enterprise Retail');
    
    // Filter first (CX should be removed)
    const filtered = filterEnterpriseRetail(ranked, 'Enterprise Retail');
    const finalRanked = rankRecommendations(filtered, 'Enterprise Retail');
    
    const top3 = finalRanked.slice(0, 3);
    
    // All top 3 should be operational
    top3.forEach(rec => {
      const isOperational = 
        rec.tags?.includes('Supply Chain & Inventory') ||
        rec.tags?.includes('Store Operations & Workforce') ||
        rec.tags?.includes('Logistics & Last Mile');
      
      expect(isOperational).toBe(true);
    });
  });

  it('should apply correct weight distribution for enterprise retail', () => {
    const supplyChainRec = mockRecommendations[2]; // Supply chain twin
    const score = scoreEnterpriseRetail(supplyChainRec, 'Enterprise Retail');
    
    // Supply chain twin should score high due to operational fit
    expect(score).toBeGreaterThan(0.40); // Operations + supply chain fit
  });

  it('should heavily penalize personalization terms', () => {
    const cxRec = mockRecommendations[0]; // CX Personalization
    const score = scoreEnterpriseRetail(cxRec, 'Enterprise Retail');
    
    // Should have massive negative penalty
    expect(score).toBeLessThan(0.10);
  });
});

describe('Recommendation Engine - Top 3 Selection', () => {
  it('should return only operational twins in top 3 for Walmart', () => {
    const industry = 'Enterprise Retail';
    const filtered = filterEnterpriseRetail(mockRecommendations, industry);
    const ranked = rankRecommendations(filtered, industry);
    const top3 = ranked.slice(0, 3);
    
    expect(top3.length).toBe(3);
    
    // All should be operational
    top3.forEach(rec => {
      expect(rec.department).toBe('Operations');
      
      const hasOperationalTag = 
        rec.tags?.includes('Supply Chain & Inventory') ||
        rec.tags?.includes('Store Operations & Workforce') ||
        rec.tags?.includes('Logistics & Last Mile') ||
        rec.tags?.includes('Risk & Loss Prevention') ||
        rec.tags?.includes('ESG & Sustainability');
      
      expect(hasOperationalTag).toBe(true);
    });
  });

  it('should not contain banned phrases in top 3 for enterprise retail', () => {
    const industry = 'Enterprise Retail';
    const filtered = filterEnterpriseRetail(mockRecommendations, industry);
    const ranked = rankRecommendations(filtered, industry);
    const top3 = ranked.slice(0, 3);
    
    top3.forEach(rec => {
      const text = `${rec.title} ${rec.description}`.toLowerCase();
      
      bannedTermsEnterpriseRetail.forEach(term => {
        expect(text).not.toContain(term.toLowerCase());
      });
    });
  });
});
