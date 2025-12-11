/**
 * Scraped Site Metadata Types
 * Used for company name extraction and recommendation generation
 */

/**
 * Raw metadata extracted from a scanned website
 */
export interface ScrapedSiteMeta {
  url: string;
  domain: string;                    // walmart.ca, telus.com, etc.
  pageTitle?: string;                // <title> tag
  metaOgSiteName?: string;           // og:site_name
  metaOgTitle?: string;              // og:title
  metaApplicationName?: string;      // application-name
  h1Text?: string;                   // first <h1>
  organizationSchemaName?: string;   // schema.org Organization.name
  logoAltText?: string;              // <img alt> from header / logo
  metaDescription?: string;          // meta description
}

/**
 * Clean company identity extracted from site metadata
 */
export interface CompanyIdentity {
  companyName: string;       // "Walmart"
  displayName: string;       // "Walmart" (for display)
  legalName?: string;        // "Walmart Canada Inc."
  domain: string;            // "walmart.ca"
}

/**
 * Scan result with site metadata
 */
export interface EnhancedScanResult {
  meta: ScrapedSiteMeta;
  companyIdentity: CompanyIdentity;
  url: string;
  title?: string;
  description?: string;
  textContent?: string;
  scannedAt: string;
}
