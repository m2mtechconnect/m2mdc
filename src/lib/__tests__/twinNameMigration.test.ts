/**
 * Unit tests for twin name migration utility
 */

import { describe, it, expect } from 'vitest';
import { 
  isTwinNameBroken, 
  migrateTwinName, 
  extractDomainFromBrokenName,
  migrateTwinBuilderState
} from '@/lib/utils/twinNameMigration';
import type { ScrapedSiteMeta } from '@/types/scrapedSiteMeta';

describe('twinNameMigration', () => {
  describe('isTwinNameBroken', () => {
    it('detects !( prefix as broken', () => {
      expect(isTwinNameBroken('!(https Sovereign Green AI Data Centre Twin')).toBe(true);
    });

    it('detects [ prefix as broken', () => {
      expect(isTwinNameBroken('[link] Sovereign Green AI Data Centre Twin')).toBe(true);
    });

    it('detects URL prefix as broken', () => {
      expect(isTwinNameBroken('https://walmart.ca Sovereign Green AI Data Centre Twin')).toBe(true);
    });

    it('detects www. prefix as broken', () => {
      expect(isTwinNameBroken('www.walmart.ca Sovereign Green AI Data Centre Twin')).toBe(true);
    });

    it('accepts valid twin name', () => {
      expect(isTwinNameBroken('Walmart Sovereign Green AI Data Centre Twin')).toBe(false);
    });

    it('accepts generic twin name without company', () => {
      expect(isTwinNameBroken('Sovereign Green AI Data Centre Twin')).toBe(false);
    });

    it('detects undefined as broken', () => {
      expect(isTwinNameBroken(undefined)).toBe(true);
    });

    it('detects empty string as broken', () => {
      expect(isTwinNameBroken('')).toBe(true);
    });
  });

  describe('extractDomainFromBrokenName', () => {
    it('extracts domain from URL in name', () => {
      expect(extractDomainFromBrokenName('https://walmart.ca/something')).toBe('walmart.ca');
    });

    it('extracts domain from domain pattern', () => {
      expect(extractDomainFromBrokenName('walmart.com Twin')).toBe('walmart.com');
    });

    it('returns null for no domain', () => {
      expect(extractDomainFromBrokenName('Some Random Text')).toBe(null);
    });

    it('removes www prefix', () => {
      expect(extractDomainFromBrokenName('https://www.walmart.ca')).toBe('walmart.ca');
    });
  });

  describe('migrateTwinName', () => {
    it('returns clean name for non-broken input', () => {
      const result = migrateTwinName('Walmart Sovereign Green AI Data Centre Twin');
      expect(result).toBe('Walmart Sovereign Green AI Data Centre Twin');
    });

    it('fixes broken name using metadata', () => {
      const meta: ScrapedSiteMeta = {
        url: 'https://walmart.ca',
        domain: 'walmart.ca',
        metaOgSiteName: 'Walmart Canada',
      };
      const result = migrateTwinName('!(https Sovereign Green AI Data Centre Twin', meta);
      expect(result).toBe('Walmart Canada Sovereign Green AI Data Centre Twin');
    });

    it('fixes broken name using fallback domain', () => {
      const result = migrateTwinName('!(https Sovereign Green AI Data Centre Twin', null, 'microsoft.com');
      expect(result).toBe('Microsoft Sovereign Green AI Data Centre Twin');
    });

    it('handles completely broken input gracefully', () => {
      const result = migrateTwinName('!(', null, undefined);
      expect(result).toBe('Sovereign Green AI Data Centre Twin');
    });
  });

  describe('migrateTwinBuilderState', () => {
    it('does not migrate valid state', () => {
      const state = {
        overview: {
          twinName: 'Walmart Sovereign Green AI Data Centre Twin',
          customerName: 'Walmart',
          siteUrl: 'walmart.ca',
        },
      };
      const result = migrateTwinBuilderState(state);
      expect(result.migrated).toBe(false);
      expect(result.newName).toBe('Walmart Sovereign Green AI Data Centre Twin');
    });

    it('migrates broken state using siteUrl', () => {
      const state = {
        overview: {
          twinName: '!(https Sovereign Green AI Data Centre Twin',
          customerName: '',
          siteUrl: 'walmart.ca',
        },
      };
      const result = migrateTwinBuilderState(state);
      expect(result.migrated).toBe(true);
      expect(result.newName).toBe('Walmart Sovereign Green AI Data Centre Twin');
      expect(result.newCustomerName).toBe('Walmart');
    });

    it('migrates broken state using sourceRecommendation url', () => {
      const state = {
        overview: {
          twinName: '!(broken',
          customerName: '',
        },
        sourceRecommendation: {
          url: 'https://telus.com/business',
        },
      };
      const result = migrateTwinBuilderState(state);
      expect(result.migrated).toBe(true);
      expect(result.newName).toBe('Telus Sovereign Green AI Data Centre Twin');
    });

    it('extracts domain from broken name as last resort', () => {
      const state = {
        overview: {
          twinName: 'https://costco.ca Sovereign Green AI Data Centre Twin',
          customerName: '',
        },
      };
      const result = migrateTwinBuilderState(state);
      expect(result.migrated).toBe(true);
      expect(result.newName).toBe('Costco Sovereign Green AI Data Centre Twin');
    });
  });
});
