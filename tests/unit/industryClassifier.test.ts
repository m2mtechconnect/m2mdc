import { describe, it, expect } from 'vitest';
import { classifyIndustry, type Industry } from '@/lib/digitalTwin/industryClassifier';

/**
 * Unit Tests: Industry Classification (Top 20 Industries)
 * Verifies that domains are correctly classified into exactly one industry
 */

describe('Industry Classifier - Top 20 Industries', () => {
  const testCases: Array<{ domain: string; expected: Industry; context?: string }> = [
    { domain: 'walmart.com', expected: 'Enterprise Retail + Global Supply Chain' },
    { domain: 'costco.com', expected: 'Grocery & Food Retail' },
    { domain: 'nike.com', expected: 'Fashion / Apparel Retail' },
    { domain: 'fedex.com', expected: 'Logistics / Supply Chain / 3PL' },
    { domain: 'ford.com', expected: 'Manufacturing – Automotive' },
    { domain: 'ge.com', expected: 'Manufacturing – Industrial' },
    { domain: 'nestle.com', expected: 'Manufacturing – Consumer Goods' },
    { domain: 'duke-energy.com', expected: 'Energy / Utilities' },
    { domain: 'clevelandclinic.org', expected: 'Healthcare / Hospitals' },
    { domain: 'pfizer.com', expected: 'Pharmaceuticals & Life Sciences' },
    { domain: 'td.com', expected: 'Financial Services / Banking' },
    { domain: 'manulife.com', expected: 'Insurance' },
    { domain: 'zillow.com', expected: 'Real Estate / PropTech' },
    { domain: 'bechtel.com', expected: 'Construction / Engineering' },
    { domain: 'verizon.com', expected: 'Telecommunications' },
    { domain: 'delta.com', expected: 'Travel / Transportation' },
    { domain: 'coursera.org', expected: 'Education / EdTech' },
    { domain: 'monsanto.com', expected: 'Agriculture / Agritech' },
    { domain: 'canada.ca', expected: 'Government / Public Sector' },
    { domain: 'sap.com', expected: 'Software / Enterprise SaaS' },
  ];

  testCases.forEach(({ domain, expected }) => {
    it(`should classify ${domain} as ${expected}`, () => {
      const result = classifyIndustry(domain);
      expect(result).toBe(expected);
    });
  });

  it('should never return undefined or empty string', () => {
    const unknownDomain = 'unknown-random-domain-12345.com';
    const result = classifyIndustry(unknownDomain);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should always return exactly one of the 20 valid industries', () => {
    const validIndustries: Industry[] = [
      'Enterprise Retail + Global Supply Chain',
      'Fashion / Apparel Retail',
      'Grocery & Food Retail',
      'Logistics / Supply Chain / 3PL',
      'Manufacturing – Automotive',
      'Manufacturing – Industrial',
      'Manufacturing – Consumer Goods',
      'Energy / Utilities',
      'Healthcare / Hospitals',
      'Pharmaceuticals & Life Sciences',
      'Financial Services / Banking',
      'Insurance',
      'Real Estate / PropTech',
      'Construction / Engineering',
      'Telecommunications',
      'Travel / Transportation',
      'Education / EdTech',
      'Agriculture / Agritech',
      'Government / Public Sector',
      'Software / Enterprise SaaS',
    ];

    testCases.forEach(({ domain }) => {
      const result = classifyIndustry(domain);
      expect(validIndustries).toContain(result);
    });
  });

  it('should handle domain variations (www, https, paths)', () => {
    const variations = [
      'walmart.com',
      'www.walmart.com',
      'https://walmart.com',
      'https://www.walmart.com/store',
    ];

    variations.forEach(url => {
      const result = classifyIndustry(url);
      expect(result).toBe('Enterprise Retail + Global Supply Chain');
    });
  });

  it('should not default to generic for known patterns', () => {
    const knownDomains = testCases.map(t => t.domain);
    
    knownDomains.forEach(domain => {
      const result = classifyIndustry(domain);
      expect(result).not.toContain('Generic');
      expect(result).not.toContain('Unknown');
    });
  });
});

describe('Industry Classifier - Content-Based Classification', () => {
  it('should classify based on content when domain is ambiguous', () => {
    const retailContent = 'walmart supply chain inventory stores distribution retail';
    const result = classifyIndustry('walmart.com', retailContent);
    expect(result).toBe('Enterprise Retail + Global Supply Chain');
  });

  it('should classify pharma based on keywords', () => {
    const pharmaContent = 'pharmaceutical drug development clinical trials GxP validation';
    const result = classifyIndustry('pfizer.com', pharmaContent);
    expect(result).toBe('Pharmaceuticals & Life Sciences');
  });

  it('should classify manufacturing based on keywords', () => {
    const mfgContent = 'automotive manufacturing assembly plant production line';
    const result = classifyIndustry('ford.com', mfgContent);
    expect(result).toBe('Manufacturing – Automotive');
  });
});

describe('Industry Classifier - Edge Cases', () => {
  it('should handle empty domain gracefully', () => {
    const result = classifyIndustry('');
    expect(result).toBeTruthy();
  });

  it('should handle very long domain names', () => {
    const longDomain = 'very-long-domain-name-for-testing-purposes-12345.com';
    const result = classifyIndustry(longDomain);
    expect(result).toBeTruthy();
  });

  it('should be case-insensitive', () => {
    const result1 = classifyIndustry('WALMART.COM');
    const result2 = classifyIndustry('walmart.com');
    const result3 = classifyIndustry('WaLmArT.CoM');
    
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });
});
