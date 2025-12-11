/**
 * Unit tests for company identity extraction
 */

import { describe, it, expect } from 'vitest';
import { 
  resolveCompanyIdentity, 
  generateCanonicalTwinName,
  sanitizeTwinName,
  isValidCompanyName 
} from '@/lib/utils/extractCompanyIdentity';
import type { ScrapedSiteMeta } from '@/types/scrapedSiteMeta';

describe('extractCompanyIdentity', () => {
  describe('resolveCompanyIdentity', () => {
    it('extracts from og:site_name', () => {
      const meta: ScrapedSiteMeta = {
        url: 'https://example.com',
        domain: 'example.com',
        metaOgSiteName: 'TELUS Business',
      };
      const result = resolveCompanyIdentity(meta);
      expect(result.companyName).toBe('TELUS Business');
    });

    it('extracts from page title with delimiter', () => {
      const meta: ScrapedSiteMeta = {
        url: 'https://walmart.ca',
        domain: 'walmart.ca',
        pageTitle: 'Walmart Canada | Official Site',
      };
      const result = resolveCompanyIdentity(meta);
      expect(result.companyName).toBe('Walmart Canada');
    });

    it('extracts from domain for known companies', () => {
      const meta: ScrapedSiteMeta = {
        url: 'https://www.microsoft.com',
        domain: 'microsoft.com',
      };
      const result = resolveCompanyIdentity(meta);
      expect(result.companyName).toBe('Microsoft');
    });

    it('handles malformed input gracefully', () => {
      const meta: ScrapedSiteMeta = {
        url: '!(https://broken.com',
        domain: 'broken.com',
        pageTitle: '!(https Sovereign Green AI Data Centre Twin',
      };
      const result = resolveCompanyIdentity(meta);
      expect(result.companyName).toBe('Broken');
      expect(result.companyName).not.toContain('!(');
    });

    it('strips corporate suffixes', () => {
      const meta: ScrapedSiteMeta = {
        url: 'https://acme.com',
        domain: 'acme.com',
        metaOgSiteName: 'Acme Corporation Inc.',
      };
      const result = resolveCompanyIdentity(meta);
      expect(result.companyName).toBe('Acme Corporation');
      expect(result.legalName).toBe('Acme Corporation Inc.');
    });
  });

  describe('generateCanonicalTwinName', () => {
    it('generates proper twin name', () => {
      const identity = { companyName: 'Walmart', displayName: 'Walmart', domain: 'walmart.ca' };
      const twinName = generateCanonicalTwinName(identity);
      expect(twinName).toBe('Walmart Sovereign Green AI Data Centre Twin');
    });

    it('falls back for empty company name', () => {
      const identity = { companyName: '', displayName: '', domain: '' };
      const twinName = generateCanonicalTwinName(identity);
      expect(twinName).toBe('Sovereign Green AI Data Centre Twin');
    });
  });

  describe('sanitizeTwinName', () => {
    it('fixes malformed twin names', () => {
      const result = sanitizeTwinName('!(https Sovereign Green AI Data Centre Twin');
      expect(result).toBe('Sovereign Green AI Data Centre Twin');
      expect(result).not.toContain('!(');
    });

    it('preserves valid twin names', () => {
      const result = sanitizeTwinName('Walmart Sovereign Green AI Data Centre Twin');
      expect(result).toBe('Walmart Sovereign Green AI Data Centre Twin');
    });
  });

  describe('isValidCompanyName', () => {
    it('rejects URLs', () => {
      expect(isValidCompanyName('https://example.com')).toBe(false);
    });

    it('rejects malformed patterns', () => {
      expect(isValidCompanyName('!(broken')).toBe(false);
      expect(isValidCompanyName('[link]')).toBe(false);
    });

    it('accepts valid names', () => {
      expect(isValidCompanyName('Walmart')).toBe(true);
      expect(isValidCompanyName('TD Bank')).toBe(true);
    });
  });
});
