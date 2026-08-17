import { describe, it, expect } from 'vitest';
import { validateDigitalTwinWithContext } from '@/lib/digitalTwin/enhancedValidators';
import type { Industry } from '@/lib/digitalTwin/industryClassifier';
import type { Department } from '@/lib/digitalTwin/departmentClassifier';

/**
 * Unit Tests: Digital Twin Template Validation
 * Verifies that generated recommendations follow digital twin blueprint structure
 */

describe('Digital Twin Template Validation - Required Elements', () => {
  const validTwin = {
    title: 'Develop a Digital Twin for Multi-Echelon Supply Chain & Inventory Planning',
    description: 'Predictive replenishment using ERP and WMS data, with SKU-level forecasting triggered by low stock alerts. Includes planner approval for exception handling. Targets 3-5% inventory turn improvement.',
  };

  const invalidTwins = [
    {
      title: 'AI-Powered Customer Experience Personalization Engine',
      description: 'Improve customer journeys using machine learning',
    },
    {
      title: 'AI Upskilling Program for Employees',
      description: 'Training workshops to enhance AI literacy',
    },
    {
      title: 'Marketing Campaign Optimization Tool',
      description: 'Optimize ad spend using predictive analytics',
    },
    {
      title: 'Generic AI Innovation Platform',
      description: 'Leverage AI to improve efficiency',
    },
  ];

  it('should validate a proper digital twin blueprint', () => {
    const result = validateDigitalTwinWithContext(
      validTwin,
      'Enterprise Retail',
      'Supply Chain'
    );
    
    expect(result.isValid).toBe(true);
    expect(result.scores.total).toBeGreaterThan(40);
  });

  it('should require digital twin mention or operational process', () => {
    const noTwinMention = {
      title: 'Improve Business Operations',
      description: 'Use AI to enhance processes',
    };

    const result = validateDigitalTwinWithContext(
      noTwinMention,
      'Enterprise Retail',
      'Operations'
    );

    expect(result.isValid).toBe(false);
    expect(result.reasons).toContain(expect.stringContaining('No digital twin or operational process'));
  });

  it('should require data sources or systems integration', () => {
    const noDataSources = {
      title: 'Digital Twin for Operations',
      description: 'Monitor and optimize workflows with real-time insights',
    };

    const result = validateDigitalTwinWithContext(
      noDataSources,
      'Enterprise Retail',
      'Operations'
    );

    expect(result.isValid).toBe(false);
    expect(result.reasons).toContain(expect.stringContaining('No data sources'));
  });

  it('should require events or KPIs', () => {
    const noEventsOrKPIs = {
      title: 'Digital Twin for Inventory',
      description: 'Connect to ERP and WMS systems for better planning',
    };

    const result = validateDigitalTwinWithContext(
      noEventsOrKPIs,
      'Enterprise Retail',
      'Supply Chain'
    );

    expect(result.isValid).toBe(false);
    expect(result.reasons).toContain(expect.stringContaining('Missing both event triggers and KPIs'));
  });

  invalidTwins.forEach(twin => {
    it(`should reject generic/invalid: "${twin.title}"`, () => {
      const result = validateDigitalTwinWithContext(
        twin,
        'Enterprise Retail',
        'Operations'
      );

      expect(result.isValid).toBe(false);
    });
  });
});

describe('Digital Twin Template Validation - Industry Rules', () => {
  it('should reject CX personalization for Enterprise Retail', () => {
    const cxTwin = {
      title: 'Customer Experience Personalization Engine',
      description: 'Personalized product recommendations using CRM and POS data, triggered by customer visits',
    };

    const result = validateDigitalTwinWithContext(
      cxTwin,
      'Enterprise Retail',
      'Marketing'
    );

    expect(result.isValid).toBe(false);
    expect(result.reasons.some(r => r.includes('BLOCKED') || r.includes('Marketing not allowed'))).toBe(true);
  });

  it('should allow marketing twins for Fashion/Apparel Retail', () => {
    const marketingTwin = {
      title: 'Digital Twin for Marketing Campaign Performance',
      description: 'Track campaign ROI using CRM and marketing automation data, with event triggers for campaign launches',
    };

    const result = validateDigitalTwinWithContext(
      marketingTwin,
      'Fashion / Apparel Retail',
      'Marketing'
    );

    // Should not be blocked for fashion retail
    expect(result.reasons).not.toContain(expect.stringContaining('Marketing not allowed'));
  });

  it('should enforce industry-specific allowed types', () => {
    const pharmaCompliance = {
      title: 'Digital Twin for GxP Validation & Compliance Tracking',
      description: 'Real-time compliance monitoring using EHR and regulatory systems, triggered by audit events, ensuring % validation accuracy',
    };

    const result = validateDigitalTwinWithContext(
      pharmaCompliance,
      'Pharmaceuticals & Life Sciences',
      'Compliance / Risk'
    );

    expect(result.isValid).toBe(true);
  });
});

describe('Digital Twin Template Validation - Scoring Components', () => {
  const testTwin = {
    title: 'Develop a Digital Twin for Warehouse Operations & DC Routing',
    description: 'Optimize DC routing and inventory using WMS, TMS, and IoT sensors. Event-driven by shipment arrivals. Human approval for routing exceptions. Target 15% efficiency improvement in throughput.',
  };

  it('should score industry fit correctly', () => {
    const result = validateDigitalTwinWithContext(
      testTwin,
      'Logistics / Supply Chain / 3PL',
      'Operations'
    );

    expect(result.scores.industryFit).toBeGreaterThan(0);
    expect(result.scores.industryFit).toBeLessThanOrEqual(35);
  });

  it('should score department fit correctly', () => {
    const result = validateDigitalTwinWithContext(
      testTwin,
      'Logistics / Supply Chain / 3PL',
      'Operations'
    );

    expect(result.scores.departmentFit).toBeGreaterThan(0);
    expect(result.scores.departmentFit).toBeLessThanOrEqual(35);
  });

  it('should score twin specificity correctly', () => {
    const result = validateDigitalTwinWithContext(
      testTwin,
      'Logistics / Supply Chain / 3PL',
      'Operations'
    );

    expect(result.scores.twinSpecificity).toBeGreaterThan(0);
    expect(result.scores.twinSpecificity).toBeLessThanOrEqual(20);
  });

  it('should score integration depth correctly', () => {
    const result = validateDigitalTwinWithContext(
      testTwin,
      'Logistics / Supply Chain / 3PL',
      'Operations'
    );

    expect(result.scores.integrationDepth).toBeGreaterThan(0);
    expect(result.scores.integrationDepth).toBeLessThanOrEqual(10);
  });

  it('should apply generic penalty for vague phrasing', () => {
    const genericTwin = {
      title: 'Digital Twin to Improve Efficiency',
      description: 'Leverage AI to enhance performance and optimize processes using various systems',
    };

    const result = validateDigitalTwinWithContext(
      genericTwin,
      'Enterprise Retail',
      'Operations'
    );

    expect(result.reasons.some(r => r.includes('PENALTY') || r.includes('Generic'))).toBe(true);
  });

  it('should enforce minimum score threshold', () => {
    const lowScoreTwin = {
      title: 'Digital Twin for Business',
      description: 'Use ERP data to trigger events and improve KPIs',
    };

    const result = validateDigitalTwinWithContext(
      lowScoreTwin,
      'Enterprise Retail',
      'Operations'
    );

    if (!result.isValid) {
      expect(result.reasons.some(r => r.includes('below minimum'))).toBe(true);
    }
  });
});

describe('Digital Twin Template Validation - Blocked Categories', () => {
  const blockedRecommendations = [
    {
      title: 'AI Upskilling Program',
      description: 'Training program to improve AI literacy',
    },
    {
      title: 'AI Innovation Workshop',
      description: 'Workshop to brainstorm AI use cases',
    },
    {
      title: 'AI Strategy Assessment',
      description: 'Assess AI readiness and strategy',
    },
  ];

  blockedRecommendations.forEach(rec => {
    it(`should hard-block: "${rec.title}"`, () => {
      const result = validateDigitalTwinWithContext(
        rec,
        'Enterprise Retail',
        'Operations'
      );

      expect(result.isValid).toBe(false);
      expect(result.reasons.some(r => r.includes('REJECTED') || r.includes('Generic AI initiative'))).toBe(true);
    });
  });
});
