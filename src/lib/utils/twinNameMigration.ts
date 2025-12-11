/**
 * Twin Name Migration Utility
 * Fixes broken twin names that contain URL artifacts or malformed patterns
 */

import type { ScrapedSiteMeta, CompanyIdentity } from '@/types/scrapedSiteMeta';
import { resolveCompanyIdentity, generateCanonicalTwinName, sanitizeTwinName } from './extractCompanyIdentity';

/**
 * Check if a twin name is broken/malformed
 */
export function isTwinNameBroken(name: string | undefined): boolean {
  if (!name) return true;
  
  const brokenPatterns = [
    /^!\(/,                    // Starts with !(
    /^\[/,                     // Starts with [
    /^https?:\/\//i,           // Starts with http:// or https://
    /^www\./i,                 // Starts with www.
    /^\(/,                     // Starts with (
    /^[^a-zA-Z]/,             // Doesn't start with a letter
  ];
  
  // Check if name matches any broken pattern
  if (brokenPatterns.some(pattern => pattern.test(name.trim()))) {
    return true;
  }
  
  // Check if name is just "Sovereign Green AI Data Centre Twin" without company prefix
  const twinBase = 'Sovereign Green AI Data Centre Twin';
  if (name.trim() === twinBase) {
    // This is acceptable for generic twins, but may indicate missing company name
    return false;
  }
  
  // Check if the part before "Sovereign" looks like a valid company name
  const twinBaseIndex = name.indexOf('Sovereign Green AI Data Centre Twin');
  if (twinBaseIndex > 0) {
    const prefix = name.substring(0, twinBaseIndex).trim();
    // Prefix should be a reasonable company name (not URL fragments, special chars, etc.)
    if (prefix.length < 2 || /^[!()\[\]{}]/.test(prefix) || /^https?:/i.test(prefix)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Migrate a broken twin name using available metadata
 */
export function migrateTwinName(
  currentName: string | undefined,
  meta?: ScrapedSiteMeta | null,
  fallbackDomain?: string
): string {
  // If name is not broken, return as-is (maybe with minor cleanup)
  if (!isTwinNameBroken(currentName)) {
    return sanitizeTwinName(currentName || 'Sovereign Green AI Data Centre Twin', meta);
  }
  
  // Try to resolve company identity from metadata
  if (meta) {
    const identity = resolveCompanyIdentity(meta);
    return generateCanonicalTwinName(identity);
  }
  
  // Try to extract from fallback domain
  if (fallbackDomain) {
    const domainMeta: ScrapedSiteMeta = {
      url: `https://${fallbackDomain}`,
      domain: fallbackDomain,
    };
    const identity = resolveCompanyIdentity(domainMeta);
    return generateCanonicalTwinName(identity);
  }
  
  // Last resort: sanitize the current name
  return sanitizeTwinName(currentName || '', meta);
}

/**
 * Extract domain from a URL or broken name
 */
export function extractDomainFromBrokenName(name: string): string | null {
  if (!name) return null;
  
  // Try to find URL pattern in the name
  const urlMatch = name.match(/https?:\/\/([^\/\s]+)/i);
  if (urlMatch) {
    return urlMatch[1].replace(/^www\./i, '');
  }
  
  // Try to find domain-like pattern
  const domainMatch = name.match(/([a-zA-Z0-9-]+\.(com|ca|org|net|io|co|ai|dev|app))/i);
  if (domainMatch) {
    return domainMatch[1];
  }
  
  return null;
}

/**
 * Migrate twin builder state if names are broken
 */
export interface TwinBuilderMigrationResult {
  migrated: boolean;
  originalName?: string;
  newName: string;
  originalCustomerName?: string;
  newCustomerName?: string;
}

export function migrateTwinBuilderState(
  state: {
    overview: {
      twinName?: string;
      customerName?: string;
      siteUrl?: string;
    };
    sourceRecommendation?: {
      url?: string;
    };
  },
  meta?: ScrapedSiteMeta | null
): TwinBuilderMigrationResult {
  const currentName = state.overview.twinName;
  const currentCustomerName = state.overview.customerName;
  
  // Not broken, no migration needed
  if (!isTwinNameBroken(currentName) && currentCustomerName && currentCustomerName.length > 0) {
    return {
      migrated: false,
      newName: currentName || 'Sovereign Green AI Data Centre Twin',
      newCustomerName: currentCustomerName,
    };
  }
  
  // Try to get domain from various sources
  let domain: string | undefined;
  
  if (state.overview.siteUrl) {
    try {
      const url = new URL(
        state.overview.siteUrl.startsWith('http') 
          ? state.overview.siteUrl 
          : `https://${state.overview.siteUrl}`
      );
      domain = url.hostname.replace(/^www\./i, '');
    } catch {
      domain = state.overview.siteUrl.replace(/^www\./i, '');
    }
  }
  
  if (!domain && state.sourceRecommendation?.url) {
    try {
      const url = new URL(state.sourceRecommendation.url);
      domain = url.hostname.replace(/^www\./i, '');
    } catch {
      // Ignore
    }
  }
  
  if (!domain && currentName) {
    domain = extractDomainFromBrokenName(currentName) || undefined;
  }
  
  // Build metadata for resolution
  const effectiveMeta: ScrapedSiteMeta = meta || {
    url: domain ? `https://${domain}` : '',
    domain: domain || '',
  };
  
  // Resolve identity
  const identity = resolveCompanyIdentity(effectiveMeta);
  const newName = generateCanonicalTwinName(identity);
  
  return {
    migrated: true,
    originalName: currentName,
    newName,
    originalCustomerName: currentCustomerName,
    newCustomerName: identity.companyName,
  };
}
