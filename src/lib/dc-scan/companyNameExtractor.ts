/**
 * Company Name Extractor
 * Multi-pass heuristic extraction for robust company name detection
 * 
 * Priority order:
 * 1. og:site_name meta tag
 * 2. Organization schema (JSON-LD)
 * 3. Navbar brand / header logo alt text
 * 4. application-name meta tag
 * 5. First segment of page title (before | or -)
 * 6. Footer legal entity name
 * 7. Domain root with intelligent formatting
 * 
 * ENFORCED RULE: Never return "Organization" - use "This company" as fallback
 */

import type { ScrapedSiteMeta, CompanyIdentity } from '@/types/scrapedSiteMeta';

// Known company name mappings for mega-corporations
const KNOWN_COMPANIES: Record<string, string> = {
  'walmart': 'Walmart',
  'costco': 'Costco',
  'target': 'Target',
  'amazon': 'Amazon',
  'microsoft': 'Microsoft',
  'google': 'Google',
  'apple': 'Apple',
  'meta': 'Meta',
  'deloitte': 'Deloitte',
  'kpmg': 'KPMG',
  'pwc': 'PwC',
  'ey': 'Ernst & Young',
  'accenture': 'Accenture',
  'mckinsey': 'McKinsey & Company',
  'bcg': 'Boston Consulting Group',
  'bain': 'Bain & Company',
  'ibm': 'IBM',
  'oracle': 'Oracle',
  'salesforce': 'Salesforce',
  'sap': 'SAP',
  'rbc': 'RBC',
  'td': 'TD Bank',
  'bmo': 'BMO',
  'scotiabank': 'Scotiabank',
  'cibc': 'CIBC',
  'shopify': 'Shopify',
  'telus': 'TELUS',
  'rogers': 'Rogers',
  'bell': 'Bell Canada',
  'hydroquebec': 'Hydro-Québec',
  'nvidia': 'NVIDIA',
  'amd': 'AMD',
  'intel': 'Intel',
  'tesla': 'Tesla',
  'netflix': 'Netflix',
  'uber': 'Uber',
  'airbnb': 'Airbnb',
  'stripe': 'Stripe',
  'square': 'Square',
  'paypal': 'PayPal',
};

// Junk patterns to filter out
const JUNK_PATTERNS = [
  /^skip to/i,
  /^welcome to/i,
  /^home\s*[-|]/i,
  /^\[.*\]$/,
  /^loading/i,
  /^untitled/i,
  /^null$/i,
  /^undefined$/i,
  /^http/i,
  /^www\./i,
];

// Title separators
const TITLE_SEPARATORS = /\s*[|\-–—:]\s*/;

/**
 * Normalize and clean a company name
 */
export function normalizeCompanyName(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  
  let cleaned = raw.trim();
  
  // Remove markdown artifacts
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');
  cleaned = cleaned.replace(/\[.*?\]\(.*?\)/g, '');
  cleaned = cleaned.replace(/[#*_`]/g, '');
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Check against junk patterns
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(cleaned)) return null;
  }
  
  // Too short or too long
  if (cleaned.length < 2 || cleaned.length > 100) return null;
  
  // All special characters
  if (!/[a-zA-Z]/.test(cleaned)) return null;
  
  return cleaned;
}

/**
 * Extract company name from domain
 */
export function extractFromDomain(url: string): string | null {
  try {
    let domain = url.toLowerCase();
    
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    
    // Get first part before path
    domain = domain.split('/')[0];
    
    // Get domain name without TLD
    const parts = domain.split('.');
    const name = parts[0];
    
    // Check known companies first
    if (KNOWN_COMPANIES[name]) {
      return KNOWN_COMPANIES[name];
    }
    
    // Title case the domain name
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return null;
  }
}

/**
 * Extract company name from page title
 */
export function extractFromTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  
  // Split by common separators and take first meaningful part
  const parts = title.split(TITLE_SEPARATORS);
  
  for (const part of parts) {
    const cleaned = normalizeCompanyName(part);
    if (cleaned && cleaned.length > 2) {
      return cleaned;
    }
  }
  
  return null;
}

/**
 * Extract company identity from scraped metadata
 */
export function extractCompanyIdentity(
  url: string,
  siteMeta?: ScrapedSiteMeta | null
): CompanyIdentity {
  const candidates: { source: string; value: string | null }[] = [];
  
  // 1. og:site_name
  candidates.push({
    source: 'og:site_name',
    value: normalizeCompanyName(siteMeta?.metaOgSiteName)
  });
  
  // 2. Organization schema
  candidates.push({
    source: 'schema.org',
    value: normalizeCompanyName(siteMeta?.organizationSchemaName)
  });
  
  // 3. application-name meta
  candidates.push({
    source: 'application-name',
    value: normalizeCompanyName(siteMeta?.metaApplicationName)
  });
  
  // 4. Page title extraction
  candidates.push({
    source: 'title',
    value: extractFromTitle(siteMeta?.pageTitle)
  });
  
  // 5. Domain-based extraction
  candidates.push({
    source: 'domain',
    value: extractFromDomain(url)
  });
  
  // Find first valid candidate
  let companyName: string | null = null;
  
  for (const candidate of candidates) {
    if (candidate.value) {
      companyName = candidate.value;
      break;
    }
  }
  
  // ENFORCED RULE: Never return "Organization"
  if (!companyName || companyName.toLowerCase() === 'organization') {
    // Use domain as last resort, but never return null
    companyName = extractFromDomain(url) || 'This company';
  }
  
  // Generate display name
  const displayName = companyName;
  
  // Get domain from URL
  let domain = url;
  try {
    domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  } catch {
    // Keep original
  }
  
  return {
    companyName,
    displayName,
    domain
  };
}

/**
 * Get company name for display, ensuring never empty or generic
 */
export function getDisplayCompanyName(
  companyName: string | null | undefined,
  url?: string
): string {
  if (companyName && 
      companyName !== 'Organization' && 
      companyName !== 'Unknown' &&
      companyName.length > 1) {
    return companyName;
  }
  
  if (url) {
    const fromDomain = extractFromDomain(url);
    if (fromDomain) return fromDomain;
  }
  
  return 'This company';
}
