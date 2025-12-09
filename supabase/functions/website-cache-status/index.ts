/**
 * /v1/website-cache-status
 * 
 * PURPOSE: Check website content cache status for a domain
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - domain: string (required) - Domain to check cache for
 * 
 * RESPONSE:
 * - cached: boolean - Whether content is cached
 * - expired: boolean (optional) - Whether cache is expired
 * - domain: string - Domain checked
 * - pageCount: number - Number of cached pages
 * - totalWords: number - Total word count across pages
 * - lastExtracted: string (optional) - ISO timestamp of last extraction
 * - version: number - Cache version
 * - expiresAt: string (optional) - ISO timestamp when cache expires
 * - ttlHours: number - Time-to-live in hours
 * - pages: array (optional) - List of cached pages with details
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
});

serve(createHandler({
  name: "website-cache-status",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { domain } = input;
    const { supabase, log } = context;

    log("Checking cache status", { domain });

    // Check cache for this domain
    const { data: cacheEntries, error } = await supabase
      .from("website_content_cache")
      .select("*")
      .eq("domain", domain)
      .order("extracted_at", { ascending: false });

    if (error) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to check cache: ${error.message}`,
        status: 500,
      };
    }

    if (!cacheEntries || cacheEntries.length === 0) {
      log("No cache found", { domain });
      return {
        cached: false,
        domain,
        pageCount: 0,
        totalWords: 0,
        lastExtracted: null,
        version: 0,
      };
    }

    // Calculate cache stats
    const totalWords = cacheEntries.reduce((sum: number, entry: any) => sum + (entry.word_count || 0), 0);
    const latestEntry = cacheEntries[0];
    const ttlHours = 24;
    const expiresAt = new Date(new Date(latestEntry.extracted_at).getTime() + ttlHours * 60 * 60 * 1000);
    const isExpired = new Date() > expiresAt;

    log("Cache found", { pageCount: cacheEntries.length, expired: isExpired });

    return {
      cached: true,
      expired: isExpired,
      domain,
      pageCount: cacheEntries.length,
      totalWords,
      lastExtracted: latestEntry.extracted_at,
      version: latestEntry.version,
      expiresAt: expiresAt.toISOString(),
      ttlHours,
      pages: cacheEntries.map((entry: any) => ({
        url: entry.url,
        wordCount: entry.word_count,
        extractedAt: entry.extracted_at,
      })),
    };
  }
}));
