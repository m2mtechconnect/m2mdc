/**
 * Deep Crawl Implementation
 * Discovers and captures multiple pages from a domain
 */

interface DeepCrawlOptions {
  rootUrl: string;
  maxPages: number;
  preferredPaths: string[];
  timeout: number;
}

interface CrawledPage {
  url: string;
  links: string[];
}

/**
 * Extract internal links from HTML
 */
export function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links: Set<string> = new Set();
  const urlObj = new URL(baseUrl);
  const baseDomain = urlObj.hostname;

  // Match href attributes
  const hrefPattern = /<a[^>]*\s+href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    
    // Skip anchors, javascript, mailto, tel
    if (href.startsWith('#') || href.startsWith('javascript:') || 
        href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    try {
      // Resolve relative URLs
      const absolute = new URL(href, baseUrl).toString();
      const linkUrl = new URL(absolute);

      // Only include same-domain links
      if (linkUrl.hostname === baseDomain || linkUrl.hostname === `www.${baseDomain}`) {
        // Remove hash and trailing slash for deduplication
        const normalized = linkUrl.origin + linkUrl.pathname.replace(/\/$/, '');
        links.add(normalized);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(links);
}

/**
 * Score links based on preferred paths
 */
function scoreLinkRelevance(url: string, preferredPaths: string[]): number {
  let score = 0;
  const path = new URL(url).pathname.toLowerCase();

  for (const preferred of preferredPaths) {
    if (path.includes(preferred.toLowerCase())) {
      score += 10;
    }
  }

  // Penalize very deep paths
  const depth = path.split('/').filter(Boolean).length;
  if (depth > 3) score -= 5;
  if (depth > 5) score -= 10;

  // Penalize common low-value pages
  if (path.includes('privacy') || path.includes('terms') || 
      path.includes('cookie') || path.includes('login') ||
      path.includes('cart') || path.includes('checkout')) {
    score -= 20;
  }

  return score;
}

/**
 * Deep crawl a website to find and return top N pages
 */
export async function deepCrawl(options: DeepCrawlOptions): Promise<string[]> {
  const { rootUrl, maxPages, preferredPaths, timeout } = options;
  const discovered: Set<string> = new Set([rootUrl]);
  const visited: Set<string> = new Set();
  const toVisit: string[] = [rootUrl];

  console.log(`[DeepCrawl] Starting deep crawl of ${rootUrl} (max ${maxPages} pages)`);

  while (toVisit.length > 0 && visited.size < maxPages) {
    const url = toVisit.shift()!;
    if (visited.has(url)) continue;

    console.log(`[DeepCrawl] Crawling ${url} (${visited.size + 1}/${maxPages})`);
    visited.add(url);

    try {
      // Fetch page
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'M2M-DeepCrawl/1.0 (AI Discovery Bot)',
          'Accept': 'text/html',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`[DeepCrawl] Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Extract links
      const links = extractInternalLinks(html, url);
      console.log(`[DeepCrawl] Found ${links.length} internal links on ${url}`);

      // Add new links to discovered set
      for (const link of links) {
        if (!discovered.has(link) && !visited.has(link)) {
          discovered.add(link);
          toVisit.push(link);
        }
      }

      // Sort toVisit by relevance score
      toVisit.sort((a, b) => 
        scoreLinkRelevance(b, preferredPaths) - scoreLinkRelevance(a, preferredPaths)
      );

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[DeepCrawl] Error crawling ${url}: ${message}`);
    }
  }

  const finalUrls = Array.from(visited);
  console.log(`[DeepCrawl] Completed: crawled ${finalUrls.length} pages`);

  return finalUrls;
}
