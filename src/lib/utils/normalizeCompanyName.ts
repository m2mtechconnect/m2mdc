/**
 * Company Name Normalization Utility
 * Extracts and cleans company names from various sources (URLs, metadata, etc.)
 */

/**
 * Normalize a raw company name string to clean, display-ready format
 * Handles URLs, markdown artifacts, and malformed strings
 */
export function normalizeCompanyName(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  let cleaned = raw.trim();

  // Remove common markdown/URL artifacts
  cleaned = cleaned
    .replace(/^!\[.*?\]\(.*?\)/g, '') // ![alt](url) markdown images
    .replace(/^\[.*?\]\(.*?\)/g, '')  // [text](url) markdown links
    .replace(/^!\(/g, '')             // !(... malformed markdown
    .replace(/^\(/g, '')              // Leading (
    .replace(/\)$/g, '')              // Trailing )
    .replace(/^\[/g, '')              // Leading [
    .replace(/\]$/g, '')              // Trailing ]
    .replace(/^!/g, '');              // Leading !

  // Remove protocol and www
  cleaned = cleaned
    .replace(/^https?:\/\//gi, '')
    .replace(/^www\./gi, '');

  // Remove trailing paths, query strings, fragments
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];

  // Remove common suffixes that leak through
  cleaned = cleaned
    .replace(/\s*[-–|:]\s*(Home|Homepage|Official Site|Welcome|Main).*$/i, '')
    // Only treat a dash/pipe as a title separator when it is surrounded by
    // whitespace ("Acme - Home"); bare hyphens belong to slug-style names
    // such as "my-health-system" and must survive.
    .replace(/\s+[-–|]\s+.*$/g, '')
    .replace(/\s+Home$/i, '')
    .replace(/\s+Official$/i, '')
    .replace(/\s+Inc\.?$/i, '')
    .replace(/\s+LLC\.?$/i, '')
    .replace(/\s+Ltd\.?$/i, '')
    .replace(/\s+Corp\.?$/i, '');

  // If it looks like a domain, extract the name part
  if (cleaned.includes('.') && !cleaned.includes(' ')) {
    const domainParts = cleaned.split('.');
    // Take the first part (usually the company name)
    cleaned = domainParts[0];
  }

  // Convert hyphens/underscores to spaces
  cleaned = cleaned
    .replace(/-/g, ' ')
    .replace(/_/g, ' ');

  // Capitalize each word
  cleaned = cleaned
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Final cleanup - remove any remaining special chars at boundaries
  cleaned = cleaned.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

  return cleaned;
}

/**
 * Extract company name from URL with smart parsing
 */
export function extractCompanyNameFromUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    // Clean the URL first
    let cleanUrl = url.trim();
    
    // Add protocol if missing
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname.replace(/^www\./i, '');

    // Known mega-retailer/company domain mappings
    const knownCompanies: Record<string, string> = {
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
      'tdbank': 'TD Bank',
      'rbc': 'RBC',
      'bmo': 'BMO',
      'scotiabank': 'Scotiabank',
      'cibc': 'CIBC',
      'desjardins': 'Desjardins',
      'google': 'Google',
      'microsoft': 'Microsoft',
      'apple': 'Apple',
      'meta': 'Meta',
      'netflix': 'Netflix',
      'shopify': 'Shopify',
    };

    // Check for known company
    const domainBase = hostname.split('.')[0].toLowerCase();
    if (knownCompanies[domainBase]) {
      return knownCompanies[domainBase];
    }

    // Extract and normalize the domain name
    return normalizeCompanyName(hostname);
  } catch {
    // If URL parsing fails, try to normalize the raw string
    return normalizeCompanyName(url);
  }
}

/**
 * Extract company name from HTML metadata with priority order
 */
export function extractCompanyNameFromMetadata(metadata: {
  ogSiteName?: string;
  title?: string;
  applicationName?: string;
  h1?: string;
  url?: string;
}): string {
  // Priority order for extraction
  const sources = [
    metadata.ogSiteName,
    metadata.applicationName,
    metadata.title,
    metadata.h1,
  ];

  for (const source of sources) {
    if (source && typeof source === 'string') {
      const normalized = normalizeCompanyName(source);
      if (normalized.length >= 2 && normalized.length <= 50) {
        return normalized;
      }
    }
  }

  // Fallback to URL extraction
  if (metadata.url) {
    return extractCompanyNameFromUrl(metadata.url);
  }

  return '';
}

/**
 * Generate a safe twin name from company name
 */
export function generateTwinName(companyName: string | undefined | null, fallback: string = 'Sovereign Green AI Data Centre Twin'): string {
  const normalized = normalizeCompanyName(companyName);
  
  if (normalized && normalized.length >= 2) {
    return `${normalized} Sovereign Green AI Data Centre Twin`;
  }
  
  return fallback;
}

/**
 * Validate and sanitize an existing twin name
 * Fixes malformed names like "!(https Sovereign Green AI Data Centre Twin)"
 */
export function sanitizeTwinName(twinName: string | undefined | null): string {
  if (!twinName || typeof twinName !== 'string') {
    return 'Sovereign Green AI Data Centre Twin';
  }

  // Check for malformed patterns
  const malformedPatterns = [
    /^!\(/,                           // Starts with !(
    /^https?:\/\//i,                  // Starts with http
    /^\[/,                            // Starts with [
    /^\(/,                            // Starts with (
  ];

  const hasMalformedStart = malformedPatterns.some(pattern => pattern.test(twinName.trim()));

  if (hasMalformedStart) {
    // Extract what we can and regenerate
    const suffix = ' Sovereign Green AI Data Centre Twin';
    
    // Try to find the actual company name before the suffix
    const suffixIndex = twinName.indexOf('Sovereign Green AI Data Centre Twin');
    if (suffixIndex > 0) {
      const potentialName = twinName.slice(0, suffixIndex);
      const normalized = normalizeCompanyName(potentialName);
      // A prefix that is a URL (or a leftover protocol token) is an artifact,
      // not a company name - fall through to the generic twin name.
      const isUrlArtifact =
        /https?:\/\//i.test(potentialName) || /^(https?|www)$/i.test(normalized);
      if (normalized && !isUrlArtifact) {
        return `${normalized}${suffix}`;
      }
    }
    
    // Fallback
    return 'Sovereign Green AI Data Centre Twin';
  }

  return twinName;
}

/**
 * Check if a company name is valid (not empty, not a URL, not malformed)
 */
export function isValidCompanyName(name: string | undefined | null): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();
  
  // Too short or too long
  if (trimmed.length < 2 || trimmed.length > 100) {
    return false;
  }

  // Contains URL patterns
  if (/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  // Contains markdown patterns
  if (/^!\(|^\[/.test(trimmed)) {
    return false;
  }

  return true;
}
