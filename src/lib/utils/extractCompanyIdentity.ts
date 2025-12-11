/**
 * Company Identity Extraction Utility
 * 
 * Robust extraction of company names from scraped website metadata
 * Follows priority order: Schema.org > og:site_name > title > logo alt > domain
 */

import type { ScrapedSiteMeta, CompanyIdentity } from '@/types/scrapedSiteMeta';

/**
 * Known mega-company domain mappings for reliable extraction
 */
const KNOWN_COMPANIES: Record<string, string> = {
  // Retail
  'walmart': 'Walmart',
  'costco': 'Costco',
  'target': 'Target',
  'tesco': 'Tesco',
  'amazon': 'Amazon',
  'alibaba': 'Alibaba',
  'homedepot': 'Home Depot',
  'lowes': 'Lowes',
  'bestbuy': 'Best Buy',
  'kroger': 'Kroger',
  'albertsons': 'Albertsons',
  'walgreens': 'Walgreens',
  'cvs': 'CVS',
  'sephora': 'Sephora',
  'macys': 'Macy\'s',
  'nordstrom': 'Nordstrom',
  'ikea': 'IKEA',
  'loblaws': 'Loblaws',
  'sobeys': 'Sobeys',
  'metro': 'Metro',
  
  // Banks
  'tdbank': 'TD Bank',
  'td': 'TD',
  'rbc': 'RBC',
  'bmo': 'BMO',
  'scotiabank': 'Scotiabank',
  'cibc': 'CIBC',
  'desjardins': 'Desjardins',
  'jpmorgan': 'JPMorgan',
  'chase': 'Chase',
  'bankofamerica': 'Bank of America',
  'wellsfargo': 'Wells Fargo',
  'citi': 'Citi',
  'hsbc': 'HSBC',
  
  // Tech
  'google': 'Google',
  'microsoft': 'Microsoft',
  'apple': 'Apple',
  'meta': 'Meta',
  'facebook': 'Meta',
  'netflix': 'Netflix',
  'shopify': 'Shopify',
  'salesforce': 'Salesforce',
  'oracle': 'Oracle',
  'ibm': 'IBM',
  'intel': 'Intel',
  'nvidia': 'NVIDIA',
  'amd': 'AMD',
  'cisco': 'Cisco',
  'aws': 'AWS',
  'azure': 'Azure',
  'github': 'GitHub',
  'slack': 'Slack',
  'zoom': 'Zoom',
  
  // Telecom
  'telus': 'TELUS',
  'rogers': 'Rogers',
  'bell': 'Bell',
  'shaw': 'Shaw',
  'videotron': 'Videotron',
  'att': 'AT&T',
  'verizon': 'Verizon',
  'tmobile': 'T-Mobile',
  
  // Government
  'canada': 'Government of Canada',
  'gc': 'Government of Canada',
  'ontario': 'Government of Ontario',
  'quebec': 'Government of Quebec',
  'gov': 'Government',
  
  // Healthcare
  'sunnybrook': 'Sunnybrook',
  'uhn': 'UHN',
  'mcgill': 'McGill',
  
  // Energy
  'hydroquebec': 'Hydro-Québec',
  'ontariohydro': 'Ontario Power Generation',
  'opg': 'Ontario Power Generation',
  'bchydro': 'BC Hydro',
  'enbridge': 'Enbridge',
  'suncor': 'Suncor',
};

/**
 * Corporate suffixes to strip from names
 */
const CORPORATE_SUFFIXES = [
  ' Inc.',
  ' Inc',
  ' LLC',
  ' Ltd.',
  ' Ltd',
  ' Corp.',
  ' Corp',
  ' Corporation',
  ' Company',
  ' Co.',
  ' Co',
  ' Limited',
  ' L.P.',
  ' LP',
  ' S.A.',
  ' SA',
  ' PLC',
  ' GmbH',
  ' AG',
];

/**
 * Patterns that indicate junk text (not a company name)
 */
const JUNK_PATTERNS = [
  /^skip to/i,
  /^go to/i,
  /^welcome to/i,
  /^home$/i,
  /^homepage$/i,
  /^official site$/i,
  /^main$/i,
  /^login$/i,
  /^sign in$/i,
  /^menu$/i,
  /^navigation$/i,
  /^http/i,
  /^www\./i,
  /^\[/,
  /^!/,
  /^\(/,
];

/**
 * Title delimiters to split on (company name usually comes first)
 */
const TITLE_DELIMITERS = ['|', '–', '-', '•', ':', '—'];

/**
 * Clean and normalize a raw company name string
 */
function cleanCompanyName(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  
  let name = raw.trim();
  
  // Remove common artifacts
  name = name
    .replace(/^!\[.*?\]\(.*?\)/g, '')  // Markdown images
    .replace(/^\[.*?\]\(.*?\)/g, '')   // Markdown links
    .replace(/^!\(/g, '')               // Malformed markdown
    .replace(/^\(/g, '')
    .replace(/\)$/g, '')
    .replace(/^\[/g, '')
    .replace(/\]$/g, '')
    .replace(/^!/g, '')
    .replace(/^https?:\/\//gi, '')
    .replace(/^www\./gi, '');
  
  // Check for junk patterns
  if (JUNK_PATTERNS.some(pattern => pattern.test(name))) {
    return '';
  }
  
  // Remove content in brackets at the end
  name = name.replace(/\s*\([^)]*\)\s*$/g, '');
  name = name.replace(/\s*\[[^\]]*\]\s*$/g, '');
  
  // Trim and limit length
  name = name.trim().slice(0, 60);
  
  return name;
}

/**
 * Extract brand name from page title
 */
function extractFromTitle(title: string | undefined | null): string {
  if (!title) return '';
  
  const cleaned = cleanCompanyName(title);
  if (!cleaned) return '';
  
  // Split on delimiters and take first part
  for (const delimiter of TITLE_DELIMITERS) {
    if (cleaned.includes(delimiter)) {
      const parts = cleaned.split(delimiter);
      const firstPart = cleanCompanyName(parts[0]);
      if (firstPart && firstPart.length >= 2 && firstPart.length <= 40) {
        return firstPart;
      }
    }
  }
  
  // If no delimiter and reasonable length, use as-is
  if (cleaned.length >= 2 && cleaned.length <= 40) {
    return cleaned;
  }
  
  return '';
}

/**
 * Extract company name from logo alt text
 */
function extractFromLogoAlt(altText: string | undefined | null): string {
  if (!altText) return '';
  
  const cleaned = cleanCompanyName(altText);
  if (!cleaned) return '';
  
  // Logo alt should be short (1-5 words) and not contain URLs
  const words = cleaned.split(/\s+/);
  if (words.length > 5) return '';
  if (cleaned.includes('.com') || cleaned.includes('.ca') || cleaned.includes('http')) return '';
  
  // Remove "logo" suffix if present
  const withoutLogo = cleaned.replace(/\s*logo\s*$/i, '').trim();
  
  if (withoutLogo.length >= 2 && withoutLogo.length <= 40) {
    return withoutLogo;
  }
  
  return '';
}

/**
 * Extract company name from domain
 */
function extractFromDomain(domain: string | undefined | null): string {
  if (!domain) return '';
  
  try {
    let hostname = domain.toLowerCase().trim();
    
    // Remove protocol and www
    hostname = hostname
      .replace(/^https?:\/\//gi, '')
      .replace(/^www\./gi, '');
    
    // Get base domain (before first .)
    const parts = hostname.split('.');
    const baseName = parts[0];
    
    if (!baseName) return '';
    
    // Check known companies first
    if (KNOWN_COMPANIES[baseName]) {
      return KNOWN_COMPANIES[baseName];
    }
    
    // Convert to title case
    const titleCase = baseName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    
    if (titleCase.length >= 2) {
      return titleCase;
    }
    
    return '';
  } catch {
    return '';
  }
}

/**
 * Strip corporate suffix and return both parts
 */
function stripCorporateSuffix(name: string): { displayName: string; legalName?: string } {
  const original = name.trim();
  let displayName = original;
  
  for (const suffix of CORPORATE_SUFFIXES) {
    if (displayName.endsWith(suffix)) {
      displayName = displayName.slice(0, -suffix.length).trim();
      return { displayName, legalName: original };
    }
    if (displayName.toLowerCase().endsWith(suffix.toLowerCase())) {
      displayName = displayName.slice(0, -suffix.length).trim();
      return { displayName, legalName: original };
    }
  }
  
  return { displayName };
}

/**
 * Main extraction function with priority order
 */
export function resolveCompanyIdentity(meta: ScrapedSiteMeta): CompanyIdentity {
  const domain = meta.domain || '';
  
  // Priority 1: Organization schema name
  let name = cleanCompanyName(meta.organizationSchemaName);
  
  // Priority 2: og:site_name
  if (!name) {
    name = cleanCompanyName(meta.metaOgSiteName);
  }
  
  // Priority 3: Page title (extract brand part)
  if (!name) {
    name = extractFromTitle(meta.pageTitle);
  }
  
  // Priority 4: og:title (extract brand part)
  if (!name) {
    name = extractFromTitle(meta.metaOgTitle);
  }
  
  // Priority 5: application-name
  if (!name) {
    name = cleanCompanyName(meta.metaApplicationName);
  }
  
  // Priority 6: Logo alt text
  if (!name) {
    name = extractFromLogoAlt(meta.logoAltText);
  }
  
  // Priority 7: Domain extraction
  if (!name) {
    name = extractFromDomain(domain);
  }
  
  // Fallback: just use domain base
  if (!name && domain) {
    const parts = domain.split('.');
    name = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Organization';
  }
  
  // Final fallback
  if (!name) {
    name = 'Organization';
  }
  
  // Strip corporate suffix
  const { displayName, legalName } = stripCorporateSuffix(name);
  
  return {
    companyName: displayName,
    displayName,
    legalName,
    domain,
  };
}

/**
 * Generate the canonical twin name from company identity
 */
export function generateCanonicalTwinName(identity: CompanyIdentity): string {
  const base = 'Sovereign Green AI Data Centre Twin';
  
  if (identity.companyName && identity.companyName !== 'Organization') {
    return `${identity.companyName} ${base}`;
  }
  
  return base;
}

/**
 * Validate a company name is usable
 */
export function isValidCompanyName(name: string | undefined | null): boolean {
  if (!name || typeof name !== 'string') return false;
  
  const trimmed = name.trim();
  
  // Length checks
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  
  // Check for malformed patterns
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^!\(/i.test(trimmed)) return false;
  if (/^\[/i.test(trimmed)) return false;
  if (/^www\./i.test(trimmed)) return false;
  
  return true;
}

/**
 * Fix a malformed twin name
 */
export function sanitizeTwinName(twinName: string | undefined | null, meta?: ScrapedSiteMeta): string {
  const base = 'Sovereign Green AI Data Centre Twin';
  
  if (!twinName || typeof twinName !== 'string') {
    if (meta) {
      const identity = resolveCompanyIdentity(meta);
      return generateCanonicalTwinName(identity);
    }
    return base;
  }
  
  const trimmed = twinName.trim();
  
  // Check for malformed patterns
  const malformedPatterns = [
    /^!\(/,
    /^https?:\/\//i,
    /^\[/,
    /^\(/,
    /^www\./i,
  ];
  
  const isMalformed = malformedPatterns.some(p => p.test(trimmed));
  
  if (isMalformed) {
    // Try to extract from metadata
    if (meta) {
      const identity = resolveCompanyIdentity(meta);
      return generateCanonicalTwinName(identity);
    }
    
    // Try to find company name before the suffix
    const suffixIndex = trimmed.indexOf('Sovereign Green AI Data Centre Twin');
    if (suffixIndex > 0) {
      const potentialName = trimmed.slice(0, suffixIndex).trim();
      const cleaned = cleanCompanyName(potentialName);
      if (cleaned && cleaned.length >= 2) {
        return `${cleaned} ${base}`;
      }
    }
    
    return base;
  }
  
  return trimmed;
}
