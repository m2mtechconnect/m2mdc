/**
 * /v1/website-scan
 * 
 * PURPOSE: Scan and extract content from a website URL with enhanced metadata
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - url: string (required, valid URL)
 * 
 * RESPONSE:
 * - url: Scanned URL
 * - domain: Extracted domain
 * - title: Page title
 * - description: Meta description
 * - meta: Enhanced site metadata for company name extraction
 * - textContent: Extracted text content (max 10k chars)
 * - links: Array of extracted links (max 50)
 * - scannedAt: ISO timestamp
 * - contentLength: Original HTML length
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  url: z.string().url("Invalid URL format"),
});

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

/**
 * Extract meta tag content by name or property
 */
function extractMetaContent(html: string, nameOrProp: string): string {
  // Try name attribute
  const nameMatch = html.match(
    new RegExp(`<meta[^>]*name=["']${nameOrProp}["'][^>]*content=["']([^"']+)["']`, 'i')
  );
  if (nameMatch) return nameMatch[1].trim();

  // Try property attribute (for og: tags)
  const propMatch = html.match(
    new RegExp(`<meta[^>]*property=["']${nameOrProp}["'][^>]*content=["']([^"']+)["']`, 'i')
  );
  if (propMatch) return propMatch[1].trim();

  // Try reverse order (content before name/property)
  const reverseNameMatch = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${nameOrProp}["']`, 'i')
  );
  if (reverseNameMatch) return reverseNameMatch[1].trim();

  const reversePropMatch = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${nameOrProp}["']`, 'i')
  );
  if (reversePropMatch) return reversePropMatch[1].trim();

  return "";
}

/**
 * Extract first H1 text
 */
function extractH1(html: string): string {
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, '').trim();
  }
  return "";
}

/**
 * Extract schema.org Organization name
 */
function extractOrganizationSchema(html: string): string {
  // Try JSON-LD
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
        const data = JSON.parse(jsonContent);
        
        // Handle array of schemas
        const schemas = Array.isArray(data) ? data : [data];
        for (const schema of schemas) {
          if (schema['@type'] === 'Organization' && schema.name) {
            return schema.name.trim();
          }
          // Check for nested organization
          if (schema.publisher?.['@type'] === 'Organization' && schema.publisher?.name) {
            return schema.publisher.name.trim();
          }
        }
      } catch {
        // Invalid JSON, continue
      }
    }
  }
  return "";
}

/**
 * Extract logo alt text from header area
 */
function extractLogoAlt(html: string): string {
  // Look for common logo patterns in header
  const headerMatch = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  const searchArea = headerMatch ? headerMatch[1] : html.slice(0, 5000);
  
  // Look for images with "logo" in class, id, or alt
  const logoImgMatch = searchArea.match(
    /<img[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*alt=["']([^"']+)["']/i
  );
  if (logoImgMatch) return logoImgMatch[1].trim();
  
  // Reverse order - alt before class
  const logoImgMatch2 = searchArea.match(
    /<img[^>]*alt=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*logo/i
  );
  if (logoImgMatch2) return logoImgMatch2[1].trim();
  
  // Any image in a logo container
  const logoContainerMatch = searchArea.match(
    /<(?:div|a|span)[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]*alt=["']([^"']+)["']/i
  );
  if (logoContainerMatch) return logoContainerMatch[1].trim();
  
  return "";
}

serve(createHandler({
  name: "website-scan",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { url } = input;
    const { log } = context;

    log("Scanning website", { url });

    // Fetch the website
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; M2MTechBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      log("Fetch failed", { status: response.status, statusText: response.statusText });
      throw {
        code: 'EXTERNAL_API_ERROR',
        message: `Failed to fetch: ${response.status} ${response.statusText}`,
        status: 500,
      };
    }

    const html = await response.text();
    const contentLength = html.length;
    const domain = extractDomain(url);

    log("HTML fetched", { contentLength, domain });

    // Extract basic metadata
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const description = extractMetaContent(html, "description");

    // Extract enhanced metadata for company name extraction
    const meta = {
      url,
      domain,
      pageTitle: title,
      metaOgSiteName: extractMetaContent(html, "og:site_name"),
      metaOgTitle: extractMetaContent(html, "og:title"),
      metaApplicationName: extractMetaContent(html, "application-name"),
      h1Text: extractH1(html),
      organizationSchemaName: extractOrganizationSchema(html),
      logoAltText: extractLogoAlt(html),
      metaDescription: description,
    };

    log("Metadata extracted", {
      hasOgSiteName: !!meta.metaOgSiteName,
      hasOrgSchema: !!meta.organizationSchemaName,
      hasLogoAlt: !!meta.logoAltText,
    });

    // Extract text content (remove scripts, styles, and HTML tags)
    let textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit text content to first 10000 characters
    if (textContent.length > 10000) {
      textContent = textContent.substring(0, 10000) + "...";
    }

    // Extract links
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi);
    const links = Array.from(linkMatches)
      .map(match => ({
        url: match[1],
        text: match[2].trim()
      }))
      .slice(0, 50); // Limit to 50 links

    log("Content extracted", {
      titleLength: title.length,
      descLength: description.length,
      textLength: textContent.length,
      linkCount: links.length
    });

    return {
      url,
      domain,
      title,
      description,
      meta,
      textContent,
      links,
      scannedAt: new Date().toISOString(),
      contentLength,
    };
  }
}));
