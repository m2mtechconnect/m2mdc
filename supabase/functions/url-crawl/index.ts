/**
 * /v1/url-crawl
 * 
 * PURPOSE: Crawl a website to discover and extract content from pages
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - domain: string (required) - Domain to crawl
 * - siteId: string (required) - Site ID to associate pages with
 * 
 * RESPONSE:
 * - success: boolean
 * - pageCount: number - Number of pages crawled
 * - urls: string[] - List of URLs crawled
 * - sitemapUsed: boolean - Whether sitemap was used
 * - message: string (optional) - Optional message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  siteId: z.string().uuid("Invalid site ID"),
});

serve(createHandler({
  name: "url-crawl",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { domain, siteId } = input;
    const { supabase, log } = context;

    log("Starting crawl", { domain, siteId });

    // Create crawl record
    const { data: crawl, error: crawlError } = await supabase
      .from('site_crawls')
      .insert({ site_id: siteId })
      .select()
      .single();

    if (crawlError) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to create crawl record: ${crawlError.message}`,
        status: 500,
      };
    }

    const origin = `https://${domain}`;
    const visited = new Set<string>();
    const toVisit: string[] = [origin];
    const pages: Array<{
      site_id: string;
      url: string;
      status_code: number;
      content_text: string;
      content_html: string;
      lang: string;
      word_count: number;
    }> = [];

    let sitemapUsed = false;

    // Try to fetch sitemap
    try {
      const sitemapUrl = `${origin}/sitemap.xml`;
      const sitemapRes = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'M2M-RecoBot/1.0' },
      });

      if (sitemapRes.ok) {
        const sitemapXml = await sitemapRes.text();
        const urlMatches = sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g);
        for (const match of urlMatches) {
          const url = match[1];
          if (url.startsWith(origin) && pages.length < 200) {
            toVisit.push(url);
          }
        }
        sitemapUsed = true;
        log("Sitemap found and parsed");
      }
    } catch (e: any) {
      log("No sitemap found", { error: e?.message });
    }

    // Crawl pages (BFS, max 200 pages)
    let depth = 0;
    const maxDepth = 3;

    while (toVisit.length > 0 && pages.length < 200 && depth <= maxDepth) {
      const currentUrl = toVisit.shift();
      if (!currentUrl || visited.has(currentUrl)) continue;

      visited.add(currentUrl);

      try {
        const response = await fetch(currentUrl, {
          headers: { 'User-Agent': 'M2M-RecoBot/1.0' },
          redirect: 'follow',
        });

        if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
          continue;
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        if (!doc) continue;

        // Remove scripts and styles
        doc.querySelectorAll('script, style, nav, footer, header').forEach((el: any) => el.remove());

        const bodyText = doc.body?.textContent || '';
        const normalizedText = bodyText.replace(/\s+/g, ' ').trim();
        const wordCount = normalizedText.split(/\s+/).length;

        // Skip very short pages (50 words minimum)
        if (wordCount < 50) {
          log("Skipping short page", { url: currentUrl, wordCount });
          continue;
        }

        // Extract language
        const lang = doc.querySelector('html')?.getAttribute('lang') || 'en';

        pages.push({
          site_id: siteId,
          url: currentUrl,
          status_code: response.status,
          content_text: normalizedText.slice(0, 50000), // Limit text size
          content_html: html.slice(0, 100000),
          lang,
          word_count: wordCount,
        });

        // Extract internal links (only if not using sitemap)
        if (!sitemapUsed && depth < maxDepth) {
          const links = doc.querySelectorAll('a[href]');
          links.forEach((link: any) => {
            try {
              const href = link.getAttribute('href');
              if (!href) return;
              
              const absoluteUrl = new URL(href, currentUrl).href;
              const urlObj = new URL(absoluteUrl);
              
              if (urlObj.origin === origin && !visited.has(absoluteUrl) && !toVisit.includes(absoluteUrl)) {
                toVisit.push(absoluteUrl);
              }
            } catch (e) {
              // Invalid URL, skip
            }
          });
        }
      } catch (e: any) {
        log("Error crawling URL", { url: currentUrl, error: e?.message });
      }

      // Rate limit: small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Insert pages in batches
    if (pages.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        await supabase.from('site_pages').insert(batch);
      }
      log("Pages inserted", { count: pages.length });
    }

    // Update crawl record - always set finished_at even if 0 pages
    await supabase
      .from('site_crawls')
      .update({
        finished_at: new Date().toISOString(),
        page_count: pages.length,
        sitemap_used: sitemapUsed,
        error: pages.length === 0 ? 'No valid pages found' : null,
      })
      .eq('id', crawl.id);

    // Update site
    await supabase
      .from('sites')
      .update({ last_crawled_at: new Date().toISOString() })
      .eq('id', siteId);

    log("Crawl completed", { pageCount: pages.length, sitemapUsed });

    // Return success even with 0 pages - caller will handle
    return {
      success: true,
      pageCount: pages.length,
      urls: pages.map(p => p.url),
      sitemapUsed,
      message: pages.length === 0 ? 'No content found to analyze' : undefined,
    };
  }
}));
