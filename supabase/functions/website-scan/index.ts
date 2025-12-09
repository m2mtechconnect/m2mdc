/**
 * /v1/website-scan
 * 
 * PURPOSE: Scan and extract content from a website URL
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - url: string (required, valid URL)
 * 
 * RESPONSE:
 * - url: Scanned URL
 * - title: Page title
 * - description: Meta description
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

// Response schema for external fetch
const ScanResultSchema = z.object({
  title: z.string(),
  description: z.string(),
  textContent: z.string(),
  links: z.array(z.object({
    url: z.string(),
    text: z.string(),
  })),
});

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

    log("HTML fetched", { contentLength });

    // Extract basic metadata
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

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
      title,
      description,
      textContent,
      links,
      scannedAt: new Date().toISOString(),
      contentLength,
    };
  }
}));
