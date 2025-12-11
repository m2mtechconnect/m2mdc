/**
 * Tests for Company Name Normalization Utility
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeCompanyName,
  extractCompanyNameFromUrl,
  extractCompanyNameFromMetadata,
  generateTwinName,
  sanitizeTwinName,
  isValidCompanyName,
} from './normalizeCompanyName';

describe('normalizeCompanyName', () => {
  it('should handle undefined/null values', () => {
    expect(normalizeCompanyName(undefined)).toBe('');
    expect(normalizeCompanyName(null)).toBe('');
    expect(normalizeCompanyName('')).toBe('');
  });

  it('should remove URL protocols', () => {
    expect(normalizeCompanyName('https://walmart.com')).toBe('Walmart');
    expect(normalizeCompanyName('http://www.costco.com')).toBe('Costco');
  });

  it('should remove markdown artifacts', () => {
    expect(normalizeCompanyName('!(https://example.com)')).toBe('Example');
    expect(normalizeCompanyName('[Walmart](https://walmart.com)')).toBe('');
    expect(normalizeCompanyName('!(broken')).toBe('Broken');
  });

  it('should convert hyphens to spaces and capitalize', () => {
    expect(normalizeCompanyName('my-health-system')).toBe('My Health System');
    expect(normalizeCompanyName('some_company_name')).toBe('Some Company Name');
  });

  it('should handle domain names', () => {
    expect(normalizeCompanyName('walmart.com')).toBe('Walmart');
    expect(normalizeCompanyName('hopitalmontreal.com')).toBe('Hopitalmontreal');
  });

  it('should remove common suffixes', () => {
    expect(normalizeCompanyName('Walmart Inc.')).toBe('Walmart');
    expect(normalizeCompanyName('Company LLC')).toBe('Company');
    expect(normalizeCompanyName('Example - Home')).toBe('Example');
  });
});

describe('extractCompanyNameFromUrl', () => {
  it('should extract company name from valid URLs', () => {
    expect(extractCompanyNameFromUrl('https://walmart.ca')).toBe('Walmart');
    expect(extractCompanyNameFromUrl('https://www.costco.com/products')).toBe('Costco');
    expect(extractCompanyNameFromUrl('target.com')).toBe('Target');
  });

  it('should handle known company mappings', () => {
    expect(extractCompanyNameFromUrl('https://homedepot.com')).toBe('Home Depot');
    expect(extractCompanyNameFromUrl('https://bestbuy.ca')).toBe('Best Buy');
    expect(extractCompanyNameFromUrl('https://tdbank.com')).toBe('TD Bank');
  });

  it('should handle malformed URLs gracefully', () => {
    expect(extractCompanyNameFromUrl('')).toBe('');
    expect(extractCompanyNameFromUrl(null as any)).toBe('');
    expect(extractCompanyNameFromUrl('not-a-url')).toBe('Not A Url');
  });
});

describe('extractCompanyNameFromMetadata', () => {
  it('should prioritize og:site_name', () => {
    const result = extractCompanyNameFromMetadata({
      ogSiteName: 'Walmart Canada',
      title: 'Some Page Title',
      url: 'https://walmart.ca',
    });
    expect(result).toBe('Walmart Canada');
  });

  it('should fallback to title if og:site_name missing', () => {
    const result = extractCompanyNameFromMetadata({
      title: 'Costco Wholesale',
      url: 'https://costco.com',
    });
    expect(result).toBe('Costco Wholesale');
  });

  it('should fallback to URL if metadata is empty', () => {
    const result = extractCompanyNameFromMetadata({
      url: 'https://example.com',
    });
    expect(result).toBe('Example');
  });
});

describe('generateTwinName', () => {
  it('should generate proper twin name from company name', () => {
    expect(generateTwinName('Walmart')).toBe('Walmart Sovereign Green AI Data Centre Twin');
    expect(generateTwinName('TD Bank')).toBe('Td Bank Sovereign Green AI Data Centre Twin');
  });

  it('should use fallback for empty/invalid names', () => {
    expect(generateTwinName('')).toBe('Sovereign Green AI Data Centre Twin');
    expect(generateTwinName(undefined)).toBe('Sovereign Green AI Data Centre Twin');
    expect(generateTwinName('a')).toBe('Sovereign Green AI Data Centre Twin');
  });
});

describe('sanitizeTwinName', () => {
  it('should fix malformed twin names', () => {
    expect(sanitizeTwinName('!(https Sovereign Green AI Data Centre Twin)'))
      .toBe('Sovereign Green AI Data Centre Twin');
    expect(sanitizeTwinName('https://example.com Sovereign Green AI Data Centre Twin'))
      .toBe('Sovereign Green AI Data Centre Twin');
  });

  it('should preserve valid twin names', () => {
    expect(sanitizeTwinName('Walmart Sovereign Green AI Data Centre Twin'))
      .toBe('Walmart Sovereign Green AI Data Centre Twin');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeTwinName(undefined)).toBe('Sovereign Green AI Data Centre Twin');
    expect(sanitizeTwinName(null)).toBe('Sovereign Green AI Data Centre Twin');
  });
});

describe('isValidCompanyName', () => {
  it('should return true for valid names', () => {
    expect(isValidCompanyName('Walmart')).toBe(true);
    expect(isValidCompanyName('TD Bank')).toBe(true);
    expect(isValidCompanyName('Home Depot')).toBe(true);
  });

  it('should return false for invalid names', () => {
    expect(isValidCompanyName('')).toBe(false);
    expect(isValidCompanyName('a')).toBe(false);
    expect(isValidCompanyName('https://example.com')).toBe(false);
    expect(isValidCompanyName('!(')).toBe(false);
    expect(isValidCompanyName(null as any)).toBe(false);
  });
});
