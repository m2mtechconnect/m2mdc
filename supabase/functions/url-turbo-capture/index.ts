import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


// v1.3 - Deep crawl support, improved error handling
const CONFIG = {
  crawler: { 
    concurrency: 8, 
    timeout_ms: 8000, // Increased for slower government sites
    max_depth: 1, 
    same_origin: true,
    max_pages_deep: 10, // For deep crawl mode
    preferred_paths: ['/about', '/services', '/solutions', '/industries', '/products', '/digital', '/innovation'] 
  },
  html: { max_bytes: 2000000, readability: true, language_allow: ["en", "fr"] },
  chunking: { target_tokens: 2000, overlap_pct: 10 },
  llm: { provider: "google", model: "gemini-3-pro-preview", temperature: 0.1, stream: true, timeout_ms: 3000 },
  cache: { ttl_seconds: 86400 }
};

interface CaptureResult {
  url: string;
  status: 'success' | 'failed' | 'low_content';
  wordCount?: number;
  chunkCount?: number;
  summary?: string;
  error?: string;
  errorCode?: 'TIMEOUT' | 'BLOCKED' | 'SSL_ERROR' | 'DNS_ERROR' | 'NO_CONTENT' | 'JS_RENDERED' | 'UNKNOWN';
  content?: string; // Store actual content for reuse
  usedRobustCapture?: boolean; // Flag to track if robust capture was used
  method?: string; // Capture method used
}

// Enhanced readability extractor with better content extraction
function extractReadableText(html: string): { text: string; title: string } {
  try {
    // Extract title first
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    // Remove only script, style, and minimal noise elements
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Extract text from key semantic areas (prioritize but don't exclude other content)
    const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const headerMatch = cleaned.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    
    // Combine content from multiple areas for better coverage
    const contentParts: string[] = [];
    
    // Always include meta description
    const descriptionMatch = html.match(/<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']+)["']/i);
    if (descriptionMatch) {
      contentParts.push(descriptionMatch[1]);
    }

    // Add header content (often contains important business info)
    if (headerMatch?.[1]) {
      contentParts.push(headerMatch[1]);
    }

    // Prioritize main and article, but fallback to body
    if (mainMatch?.[1]) {
      contentParts.push(mainMatch[1]);
    } else if (articleMatch?.[1]) {
      contentParts.push(articleMatch[1]);
    } else if (bodyMatch?.[1]) {
      // For body content, extract sections but keep more content
      contentParts.push(bodyMatch[1]);
    } else {
      contentParts.push(cleaned);
    }

    // Join all parts and remove HTML tags
    let content = contentParts.join(' ').replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    content = content
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z0-9]+;/gi, ' ');

    // Normalize whitespace but keep paragraph breaks
    content = content
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Remove common navigation noise patterns
    content = content
      .replace(/\b(skip to (main )?content|menu|search|log in|sign in|home|about|contact|privacy|terms)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    // If we got very little content, the site is likely JS-rendered
    if (wordCount < 30) {
      console.log(`[Readability] Low word count detected: ${wordCount} words - likely JS-rendered site`);
    } else {
      console.log(`[Readability] Extracted ${wordCount} words from ${title}`);
    }

    return { text: content, title };
  } catch (e) {
    console.error('[Readability] Error:', e);
    return { text: '', title: 'Error' };
  }
}

// Detect language (simple heuristic)
function detectLanguage(text: string): string {
  const sample = text.slice(0, 500).toLowerCase();
  const frenchWords = ['le', 'la', 'les', 'de', 'et', 'à', 'un', 'une', 'pour'];
  const frenchCount = frenchWords.filter(w => sample.includes(` ${w} `)).length;
  return frenchCount > 3 ? 'fr' : 'en';
}

// Chunk text with overlap
function chunkText(text: string, targetTokens: number = 1500, overlapPct: number = 15): string[] {
  const words = text.split(/\s+/);
  const wordsPerChunk = Math.floor(targetTokens * 0.75); // ~0.75 words per token
  const overlapWords = Math.floor(wordsPerChunk * overlapPct / 100);
  
  const chunks: string[] = [];
  let i = 0;
  
  while (i < words.length) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.split(/\s+/).length >= 40) { // Min 40 words per chunk
      chunks.push(chunk);
    }
    i += wordsPerChunk - overlapWords;
  }
  
  return chunks;
}

// Progressive fetch with multiple user-agent strategies
async function fetchWithTimeout(
  url: string, 
  timeout: number,
  strategy: 'standard' | 'mobile' | 'crawler' | 'insecure' = 'standard'
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const userAgents = {
    standard: 'M2M-TurboCapture/1.0 (AI Recommendations Bot)',
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    crawler: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    insecure: 'M2M-TurboCapture/1.0 (AI Recommendations Bot; Insecure Mode)'
  };
  
  try {
    // If insecure strategy and URL is https, try http instead
    let fetchUrl = url;
    if (strategy === 'insecure' && url.startsWith('https://')) {
      fetchUrl = url.replace('https://', 'http://');
      console.log(`[Fetch] Insecure mode: Trying HTTP instead of HTTPS: ${fetchUrl}`);
    }
    
    const response = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgents[strategy],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// Check cache from website_content_cache table
async function checkCache(supabase: any, domain: string, url: string, forceScan: boolean = false): Promise<CaptureResult | null> {
  if (forceScan) {
    console.log(`[Cache] Force scan enabled, skipping cache for ${url}`);
    return null;
  }

  const ttlHours = 24;
  const minExtractedAt = new Date(Date.now() - ttlHours * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('website_content_cache')
    .select('*')
    .eq('url', url)
    .gt('extracted_at', minExtractedAt)
    .order('extracted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('[Cache] Error checking cache:', error);
    return null;
  }
  
  if (!data) {
    console.log(`[Cache] No cache entry found for ${url}`);
    return null;
  }
  
  // Ignore stale cache entries that report words but have no real content
  const hasContent = typeof data.content === 'string' && data.content.trim().length > 50;
  if (!hasContent) {
    console.log(`[Cache] Stale or empty cache for ${url} (word_count=${data.word_count}), ignoring`);
    return null;
  }
  
  console.log(`[Cache] Cache hit for ${url} (extracted: ${data.extracted_at}, version: ${data.version})`);
  
  return {
    url: data.url,
    status: data.word_count > 0 ? 'success' : 'low_content',
    wordCount: data.word_count,
    summary: data.summary?.summary || data.content?.substring(0, 200) || '',
    content: data.content,
  };
}

// Save to website_content_cache table with hash
async function saveCache(supabase: any, domain: string, url: string, result: CaptureResult): Promise<void> {
  try {
    const content = result.content || '';
    const wordCount = result.wordCount || 0;
    
    // Generate hash of content for change detection
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const chunkHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Check if we already have this content
    const { data: existing } = await supabase
      .from('website_content_cache')
      .select('id, version')
      .eq('url', url)
      .eq('chunk_hash', chunkHash)
      .maybeSingle();
    
    if (existing) {
      console.log(`[Cache] Content unchanged for ${url}, not saving`);
      return;
    }
    
    // Get latest version for this URL
    const { data: latestVersion } = await supabase
      .from('website_content_cache')
      .select('version')
      .eq('url', url)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const newVersion = latestVersion ? latestVersion.version + 1 : 1;
    
    await supabase.from('website_content_cache').insert({
      domain,
      url,
      content,
      word_count: wordCount,
      chunk_hash: chunkHash,
      summary: result.summary ? { summary: result.summary } : {},
      version: newVersion,
      metadata: {
        status: result.status,
        error: result.error,
        usedRobustCapture: result.usedRobustCapture,
      }
    });
    
    console.log(`[Cache] Saved cache for ${url} (version: ${newVersion}, hash: ${chunkHash.substring(0, 8)}...)`);
  } catch (e) {
    console.error('[Cache] Error saving cache:', e);
  }
}

// Progressive capture with fallback strategies
async function progressiveCapture(url: string): Promise<{
  text: string;
  title: string;
  wordCount: number;
  method: string;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  errorCode?: 'TIMEOUT' | 'BLOCKED' | 'SSL_ERROR' | 'DNS_ERROR' | 'NO_CONTENT' | 'JS_RENDERED' | 'UNKNOWN';
}> {
  console.log(`[Progressive-Capture] Starting for ${url}`);
  
  let sslError = false;
  let lastError: Error | null = null;

  // Strategy 1: Standard fetch
  try {
    console.log('[Progressive-Capture] Strategy 1: Standard fetch');
    const response = await fetchWithTimeout(url, CONFIG.crawler.timeout_ms, 'standard');
    const html = await response.text();
    const { text, title } = extractReadableText(html);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    if (wordCount >= 50) {
      console.log(`[Progressive-Capture] ✓ Standard successful: ${wordCount} words`);
      return { text, title, wordCount, method: 'standard', status: 'success' };
    }
    console.log(`[Progressive-Capture] Standard insufficient: ${wordCount} words`);
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    const message = lastError.message.toLowerCase();
    // Detect SSL/TLS errors
    if (message.includes('ssl') || message.includes('tls') || message.includes('certificate') || 
        message.includes('cert') || message.includes('handshake')) {
      sslError = true;
      console.log(`[Progressive-Capture] SSL/TLS error detected: ${lastError.message}`);
    } else {
      console.log(`[Progressive-Capture] Strategy 1 failed: ${lastError.message}`);
    }
  }
  
  // If SSL error detected, skip other HTTPS strategies and go straight to HTTP fallback
  if (sslError && url.startsWith('https://')) {
    console.log('[Progressive-Capture] SSL error detected, trying HTTP fallback immediately');
    try {
      const response = await fetchWithTimeout(url, CONFIG.crawler.timeout_ms, 'insecure');
      const html = await response.text();
      const { text, title } = extractReadableText(html);
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      
      if (wordCount >= 50) {
        console.log(`[Progressive-Capture] ✓ HTTP fallback successful: ${wordCount} words`);
        return { text, title, wordCount, method: 'http-fallback', status: 'success' };
      }
      console.log(`[Progressive-Capture] HTTP fallback insufficient: ${wordCount} words`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[Progressive-Capture] HTTP fallback failed: ${message}`);
      // Return SSL error since that's the root cause
      return {
        text: '',
        title: 'SSL Error',
        wordCount: 0,
        method: 'failed',
        status: 'failed',
        errorCode: 'SSL_ERROR',
        errorMessage: `SSL/TLS certificate issue: ${lastError?.message || 'Unknown SSL error'}. Try accessing the site via HTTP or check if the site has valid certificates.`
      };
    }
  }

  // Strategy 2: Mobile user-agent (some sites serve simpler content)
  try {
    console.log('[Progressive-Capture] Strategy 2: Mobile user-agent');
    const response = await fetchWithTimeout(url, CONFIG.crawler.timeout_ms, 'mobile');
    const html = await response.text();
    const { text, title } = extractReadableText(html);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    if (wordCount >= 50) {
      console.log(`[Progressive-Capture] ✓ Mobile successful: ${wordCount} words`);
      return { text, title, wordCount, method: 'mobile', status: 'success' };
    }
    console.log(`[Progressive-Capture] Mobile insufficient: ${wordCount} words`);
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    console.log(`[Progressive-Capture] Strategy 2 failed: ${lastError.message}`);
  }

  // Strategy 3: Crawler user-agent
  try {
    console.log('[Progressive-Capture] Strategy 3: Crawler user-agent');
    const response = await fetchWithTimeout(url, CONFIG.crawler.timeout_ms, 'crawler');
    const html = await response.text();
    const { text, title } = extractReadableText(html);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    if (wordCount >= 50) {
      console.log(`[Progressive-Capture] ✓ Crawler successful: ${wordCount} words`);
      return { text, title, wordCount, method: 'crawler', status: 'success' };
    }
    console.log(`[Progressive-Capture] Crawler insufficient: ${wordCount} words`);
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    console.log(`[Progressive-Capture] Strategy 3 failed: ${lastError.message}`);
  }

  // Strategy 4: AI content recovery (for JS-heavy sites)
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (LOVABLE_API_KEY) {
    try {
      console.log('[Progressive-Capture] Strategy 4: AI content recovery');
      const response = await fetchWithTimeout(url, CONFIG.crawler.timeout_ms, 'standard');
      const html = await response.text();
      
      // Check if there's any structure at all
      if (html.length < 500) {
        console.log('[Progressive-Capture] Minimal HTML, site may be blocking');
        return {
          text: '',
          title: 'Content Unavailable',
          wordCount: 0,
          method: 'blocked',
          status: 'failed',
          errorCode: 'BLOCKED',
          errorMessage: 'Site appears to be blocking automated access'
        };
      }

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-preview',
          messages: [
            {
              role: 'system',
              content: 'Extract all meaningful business content from this HTML. Focus on what the business does, their services, products, mission, and key information. Ignore navigation, menus, footers, scripts, and UI elements. If the page is mostly JavaScript placeholders or has no real content, respond with just "INSUFFICIENT_CONTENT".'
            },
            {
              role: 'user',
              content: `URL: ${url}\n\nHTML:\n${html.substring(0, 50000)}`
            }
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        const extracted = data.choices[0].message.content || '';
        
        if (extracted === 'INSUFFICIENT_CONTENT' || extracted.length < 100) {
          console.log('[Progressive-Capture] AI detected insufficient content');
          return {
            text: '',
            title: 'JS-Rendered Content',
            wordCount: 0,
            method: 'ai-insufficient',
            status: 'failed',
            errorCode: 'JS_RENDERED',
            errorMessage: 'This website uses JavaScript to render content and cannot be captured by automated tools'
          };
        }
        
        const wordCount = extracted.split(/\s+/).filter(Boolean).length;
        const { title } = extractReadableText(html);
        console.log(`[Progressive-Capture] ✓ AI recovery: ${wordCount} words`);
        return { 
          text: extracted, 
          title: title || 'Extracted Content',
          wordCount, 
          method: 'ai-recovery', 
          status: 'partial' 
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[Progressive-Capture] Strategy 4 failed: ${lastError.message}`);
    }
  }

  // Strategy 5: HTTP fallback for sites with SSL issues (only if not already tried)
  if (!sslError && url.startsWith('https://')) {
    try {
      console.log('[Progressive-Capture] Strategy 5: HTTP fallback');
      const response = await fetchWithTimeout(url, CONFIG.crawler.timeout_ms, 'insecure');
      const html = await response.text();
      const { text, title } = extractReadableText(html);
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      
      if (wordCount >= 50) {
        console.log(`[Progressive-Capture] ✓ HTTP fallback successful: ${wordCount} words`);
        return { text, title, wordCount, method: 'http-fallback', status: 'success' };
      }
      console.log(`[Progressive-Capture] HTTP fallback insufficient: ${wordCount} words`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[Progressive-Capture] Strategy 5 failed: ${lastError.message}`);
    }
  }

  // Strategy 6: Firecrawl as ultimate fallback for sites that block automated access
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (FIRECRAWL_API_KEY) {
    try {
      console.log('[Progressive-Capture] Strategy 6: Firecrawl external service');
      
      const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 0,
        }),
      });

      if (firecrawlResponse.ok) {
        const firecrawlData = await firecrawlResponse.json();
        
        if (firecrawlData.success && firecrawlData.data?.markdown) {
          const markdown = firecrawlData.data.markdown;
          const title = firecrawlData.data.metadata?.title || 'Extracted Content';
          const wordCount = markdown.split(/\s+/).filter(Boolean).length;
          
          if (wordCount >= 50) {
            console.log(`[Progressive-Capture] ✓ Firecrawl successful: ${wordCount} words`);
            return { 
              text: markdown, 
              title, 
              wordCount, 
              method: 'firecrawl', 
              status: 'success' 
            };
          }
          console.log(`[Progressive-Capture] Firecrawl insufficient content: ${wordCount} words`);
        } else {
          console.log('[Progressive-Capture] Firecrawl returned no content');
        }
      } else {
        const errorText = await firecrawlResponse.text();
        console.log(`[Progressive-Capture] Firecrawl API error: ${firecrawlResponse.status} - ${errorText}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[Progressive-Capture] Strategy 6 failed: ${lastError.message}`);
    }
  }

  // All strategies failed - determine error code
  console.log('[Progressive-Capture] ✗ All strategies exhausted');
  
  // Try to determine specific error type from the last error
  let errorCode: 'TIMEOUT' | 'BLOCKED' | 'SSL_ERROR' | 'DNS_ERROR' | 'NO_CONTENT' | 'JS_RENDERED' | 'UNKNOWN' = 'UNKNOWN';
  let errorMessage = 'Unable to extract content from this website.';
  
  if (lastError) {
    const errMsg = lastError.message.toLowerCase();
    if (errMsg.includes('timeout') || errMsg.includes('aborted')) {
      errorCode = 'TIMEOUT';
      errorMessage = 'Request timed out. The website took too long to respond.';
    } else if (errMsg.includes('dns') || errMsg.includes('enotfound') || errMsg.includes('getaddrinfo')) {
      errorCode = 'DNS_ERROR';
      errorMessage = 'Could not resolve domain name. The website may not exist or be unreachable.';
    } else if (errMsg.includes('403') || errMsg.includes('forbidden') || errMsg.includes('blocked')) {
      errorCode = 'BLOCKED';
      errorMessage = 'Access blocked. The website is blocking automated access.';
    } else if (sslError) {
      errorCode = 'SSL_ERROR';
      errorMessage = `SSL/TLS error: ${lastError.message}. The site may have certificate issues.`;
    }
  }
  
  return {
    text: '',
    title: 'Capture Failed',
    wordCount: 0,
    method: 'failed',
    status: 'failed',
    errorCode,
    errorMessage
  };
}

// Summarize with Gemini 2.5 Flash
async function summarizeChunk(chunk: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-pro-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a precise extractive summarizer. Use only the provided text. Return concise bullets and tagged entities relevant to Operations, Sales & Marketing, and Finance & Administration. If content is thin, return "insufficient_evidence": true.'
        },
        {
          role: 'user',
          content: chunk
        }
      ],
      temperature: 0.1,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content || '';
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const inputUrl = url.searchParams.get('url') || '';
    const forceScan = url.searchParams.get('forceScan') === 'true';
    const deepCrawl = url.searchParams.get('deepCrawl') === 'true';
    
    if (!inputUrl) {
      return new Response(JSON.stringify({ error: 'URL required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const urlObj = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          // Step 1: Discover pages
          sendEvent('phase', { phase: 'discovering', message: deepCrawl ? 'Deep crawling website for multiple pages...' : 'Checking sitemap and robots.txt...' });
          
          let urlsToCapture: string[] = [];
          
          if (deepCrawl) {
            // Use deep crawl module to discover more pages
            const { deepCrawl: performDeepCrawl } = await import('./deepCrawl.ts');
            console.log('[Deep-Crawl] Starting aggressive multi-page discovery');
            
            try {
              urlsToCapture = await performDeepCrawl({
                rootUrl: baseUrl,
                maxPages: CONFIG.crawler.max_pages_deep,
                preferredPaths: CONFIG.crawler.preferred_paths,
                timeout: CONFIG.crawler.timeout_ms,
              });
              console.log(`[Deep-Crawl] Discovered ${urlsToCapture.length} pages`);
            } catch (e) {
              console.error('[Deep-Crawl] Error:', e);
              // Fall back to standard discovery
              urlsToCapture = [];
            }
          }
          
          // If deep crawl didn't find pages or wasn't used, try sitemap
          if (urlsToCapture.length === 0) {
            try {
              const sitemapResponse = await fetchWithTimeout(`${baseUrl}/sitemap.xml`, 5000);
              if (sitemapResponse.ok) {
                const sitemapText = await sitemapResponse.text();
                const isSitemapIndex = sitemapText.includes('<sitemap>') || sitemapText.includes('<sitemap ');
                
                if (isSitemapIndex) {
                  console.log('[Discovery] Found sitemap index, fetching sub-sitemaps...');
                  const sitemapMatches = sitemapText.match(/<loc>([^<]+)<\/loc>/g);
                  if (sitemapMatches) {
                    const sitemapUrls = sitemapMatches
                      .map(m => m.replace(/<\/?loc>/g, ''))
                      .filter(u => u.endsWith('.xml') && !u.match(/\.(pdf|jpg|jpeg|png|gif|zip|doc|docx)$/i));
                    
                    for (const sitemapUrl of sitemapUrls.slice(0, 3)) {
                      try {
                        const subSitemapResponse = await fetchWithTimeout(sitemapUrl, 5000);
                        if (subSitemapResponse.ok) {
                          const subSitemapText = await subSitemapResponse.text();
                          const pageMatches = subSitemapText.match(/<loc>([^<]+)<\/loc>/g);
                          if (pageMatches) {
                            const pages = pageMatches
                              .map(m => m.replace(/<\/?loc>/g, ''))
                              .filter(u => {
                                const nonHtmlExtensions = /\.(xml|pdf|jpg|jpeg|png|gif|svg|webp|zip|rar|doc|docx|xls|xlsx|ppt|pptx|mp3|mp4|avi|mov)$/i;
                                return !nonHtmlExtensions.test(u) && u.startsWith(baseUrl);
                              });
                            urlsToCapture.push(...pages);
                          }
                        }
                      } catch (e) {
                        console.log(`[Discovery] Failed to fetch sub-sitemap: ${sitemapUrl}`);
                      }
                    }
                    urlsToCapture = urlsToCapture.slice(0, deepCrawl ? 15 : 10);
                  }
                } else {
                  const urlMatches = sitemapText.match(/<loc>([^<]+)<\/loc>/g);
                  if (urlMatches) {
                    const nonHtmlExtensions = /\.(xml|pdf|jpg|jpeg|png|gif|svg|webp|zip|rar|doc|docx|xls|xlsx|ppt|pptx|mp3|mp4|avi|mov)$/i;
                    urlsToCapture = urlMatches
                      .map(m => m.replace(/<\/?loc>/g, ''))
                      .filter(u => !nonHtmlExtensions.test(u) && u.startsWith(baseUrl))
                      .slice(0, deepCrawl ? 15 : 10);
                  }
                }
              }
            } catch (e) {
              console.log('[Discovery] No sitemap found');
            }
          }

          // Final fallback to key paths
          if (urlsToCapture.length === 0) {
            const keyPaths = ['', '/about', '/products', '/solutions', '/services', '/pricing', '/company'];
            urlsToCapture = keyPaths.map(path => `${baseUrl}${path}`);
          }

          sendEvent('discovered', { totalPages: urlsToCapture.length, urls: urlsToCapture, deepCrawl });

          // Step 2: Capture pages in parallel
          sendEvent('phase', { phase: 'capturing', message: 'Fetching pages in parallel...' });
          
          const captureResults: CaptureResult[] = [];
          const concurrency = CONFIG.crawler.concurrency;
          
          for (let i = 0; i < urlsToCapture.length; i += concurrency) {
            const batch = urlsToCapture.slice(i, i + concurrency);
            
            const batchResults = await Promise.all(
              batch.map(async (pageUrl) => {
                sendEvent('capture_start', { url: pageUrl, index: i + batch.indexOf(pageUrl) + 1, total: urlsToCapture.length });
                
                // Check cache first unless force scan is enabled
                const cached = await checkCache(supabase, domain, pageUrl, forceScan);
                if (cached) {
                  console.log(`[Turbo-Capture] Cache hit for ${pageUrl}`);
                  sendEvent('capture_cached', { url: pageUrl, result: cached });
                  return cached;
                }
                
                try {
                  // Use progressive capture with multiple strategies
                  const captureResult = await progressiveCapture(pageUrl);
                  
                  if (captureResult.status === 'failed') {
                    const result: CaptureResult = { 
                      url: pageUrl, 
                      status: 'failed', 
                      error: captureResult.errorMessage || 'Unable to capture content',
                      wordCount: 0,
                      content: ''
                    };
                    await saveCache(supabase, domain, pageUrl, result);
                    sendEvent('capture_failed', { 
                      url: pageUrl, 
                      error: result.error,
                      method: captureResult.method 
                    });
                    return result;
                  }
                  
                  const { text, title, wordCount, method, status } = captureResult;
                  console.log(`[Turbo-Capture] Captured ${pageUrl}: ${wordCount} words via ${method}`);
                  
                  // Language check
                  const lang = detectLanguage(text);
                  if (!CONFIG.html.language_allow.includes(lang)) {
                    const result: CaptureResult = { url: pageUrl, status: 'failed', error: `Language ${lang} not supported` };
                    await saveCache(supabase, domain, pageUrl, result);
                    sendEvent('capture_failed', { url: pageUrl, error: result.error });
                    return result;
                  }

                  const captureStatus = status === 'partial' ? 'success' : status;
                  const result: CaptureResult = { 
                    url: pageUrl, 
                    status: captureStatus,
                    wordCount, 
                    content: text,
                    usedRobustCapture: method === 'ai-recovery'
                  };
                  await saveCache(supabase, domain, pageUrl, result);
                  sendEvent('capture_success', { 
                    url: pageUrl, 
                    wordCount, 
                    method,
                    status 
                  });
                  return result;
                } catch (e: any) {
                  const result: CaptureResult = { url: pageUrl, status: 'failed', error: e.message || 'Timeout' };
                  await saveCache(supabase, domain, pageUrl, result);
                  sendEvent('capture_failed', { url: pageUrl, error: result.error });
                  return result;
                }
              })
            );
            
            captureResults.push(...batchResults);
            
            // Adaptive backoff
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Step 3: Analyze content with Gemini (PARALLEL)
          sendEvent('phase', { phase: 'analyzing', message: 'Analyzing content with AI...' });
          
          const successfulCaptures = captureResults.filter(r => r.status === 'success');
          
          if (successfulCaptures.length === 0) {
            const allLowContent = captureResults.every(r => r.status === 'low_content');
            const message = allLowContent 
              ? 'This site appears to be JavaScript-rendered. The basic capture only gets minimal content. For better results, the site owner should implement server-side rendering (SSR) or provide a sitemap with static HTML versions.'
              : 'Could not capture content from this site. It may be blocking automated access or have technical issues.';
            
            sendEvent('complete', { 
              status: 'empty', 
              message,
              captureResults 
            });
            controller.close();
            return;
          }

          // Analyze all pages in PARALLEL with concurrency limit
          const analyzeTask = async (capture: CaptureResult, index: number) => {
            sendEvent('analyze_start', { url: capture.url, index: index + 1, total: successfulCaptures.length });
            
            try {
              // Use content directly from capture object (already has it from capture phase)
              // Fall back to cache only if content is missing from capture
              let text = capture.content || '';
              let existingSummary = '';
              
              // Only check cache if we don't have content in capture object
              if (!text || text.length < 100) {
                const cached = await checkCache(supabase, domain, capture.url);
                if (!cached) {
                  console.log(`[Turbo-Capture] No content available for ${capture.url}`);
                  return;
                }
                text = cached.content || '';
                existingSummary = cached.summary || '';
              }
              
              // If cache has a summary already, use it
              if (existingSummary && existingSummary.length > 50) {
                console.log(`[Turbo-Capture] Using cached summary for ${capture.url}`);
                capture.summary = existingSummary;
                capture.chunkCount = 0;
                sendEvent('analyze_complete', { 
                  url: capture.url, 
                  cached: true,
                  summary: capture.summary.slice(0, 200) + '...'
                });
                return;
              }
              
              // Final validation of content
              if (!text || text.length < 100) {
                console.log(`[Turbo-Capture] Insufficient content for ${capture.url}: ${text.length} chars`);
                return;
              }
              
              // Chunk text (fewer, larger chunks = fewer LLM calls)
              const chunks = chunkText(text, CONFIG.chunking.target_tokens, CONFIG.chunking.overlap_pct);
              capture.chunkCount = chunks.length;
              
              // Summarize chunks in parallel (batch 6 at a time for speed)
              const summaries: string[] = [];
              for (let j = 0; j < chunks.length; j += 6) {
                const chunkBatch = chunks.slice(j, j + 6);
                const batchSummaries = await Promise.all(
                  chunkBatch.map(chunk => summarizeChunk(chunk).catch(() => ''))
                );
                summaries.push(...batchSummaries.filter(Boolean));
              }
              
              capture.summary = summaries.join('\n\n');
              
              // Update cache with summary
              await saveCache(supabase, domain, capture.url, capture);
              
              sendEvent('analyze_complete', { 
                url: capture.url, 
                chunkCount: capture.chunkCount,
                summary: capture.summary.slice(0, 200) + '...'
              });
            } catch (e: any) {
              console.error('[Analyze] Error:', e);
              sendEvent('analyze_failed', { url: capture.url, error: e.message });
            }
          };

          // Process all pages in parallel with higher concurrency (5 instead of 3)
          const concurrencyLimit = 5;
          for (let i = 0; i < successfulCaptures.length; i += concurrencyLimit) {
            const batch = successfulCaptures.slice(i, i + concurrencyLimit);
            await Promise.all(batch.map((capture, batchIdx) => 
              analyzeTask(capture, i + batchIdx)
            ));
          }

          // Insert successfully analyzed pages into site_pages table
          console.log('[Turbo-Capture] Inserting analyzed pages into site_pages table...');
          
          // Get or create site
          let { data: site, error: siteError } = await supabase
            .from('sites')
            .select('*')
            .eq('domain', domain)
            .single();

          if (siteError && siteError.code !== 'PGRST116') {
            console.error('[Turbo-Capture] Error fetching site:', siteError);
          }

          if (!site) {
            const { data: newSite, error: createError } = await supabase
              .from('sites')
              .insert({ domain, company_name: domain })
              .select()
              .single();
            
            if (createError) {
              console.error('[Turbo-Capture] Error creating site:', createError);
            } else {
              site = newSite;
            }
          }

          // Prepare pages for insertion
          let pagesInserted = 0;
          
          // Insert pages with summaries into site_pages
          if (site) {
            const pagesToInsert = successfulCaptures
              .filter(c => {
                // Log what we're filtering
                const hasContent = !!(c.content && c.content.trim().length > 20);
                const hasSummary = !!(c.summary && c.summary.trim().length > 20);
                const hasWordCount = !!(c.wordCount && c.wordCount >= 10); // Lowered from 20
                
                console.log(`[Insert-Filter] ${c.url}: wordCount=${c.wordCount}, hasContent=${hasContent}, hasSummary=${hasSummary}, contentLen=${c.content?.length || 0}, summaryLen=${c.summary?.length || 0}`);
                
                // Accept if we have ANY of: reasonable word count, content, or summary
                // This is more lenient than before - we just need SOMETHING meaningful
                if (!hasWordCount && !hasContent && !hasSummary) {
                  console.log(`[Insert-Filter] Skipping ${c.url}: no meaningful content (wc=${c.wordCount}, content=${c.content?.length || 0}, summary=${c.summary?.length || 0})`);
                  return false;
                }
                
                // Ensure content is not just XML/JSON tags
                const testText = (c.summary || c.content || '').trim();
                const hasXmlTags = testText.includes('<?xml') || testText.includes('</urlset>');
                const hasJsonBrackets = (testText.startsWith('{') && testText.endsWith('}')) || 
                                       (testText.startsWith('[') && testText.endsWith(']'));
                
                if (hasXmlTags || hasJsonBrackets) {
                  console.log(`[Insert-Filter] Skipping ${c.url}: contains XML/JSON structure`);
                  return false;
                }
                
                console.log(`[Insert-Filter] ✓ Including ${c.url} for insertion`);
                return true;
              })
              .map(c => {
                // Use summary if available, otherwise use content snippet
                const text = c.summary || (c.content ? c.content.substring(0, 2000) : '');
                const wordCount = c.wordCount || text.split(/\s+/).filter(Boolean).length;
                
                console.log(`[Insert-Map] ${c.url}: final text length=${text.length}, wordCount=${wordCount}`);
                
                return {
                  site_id: site!.id,
                  url: c.url,
                  content_text: text,
                  content_html: '', // We don't have HTML, just the text
                  status_code: 200,
                  lang: 'en',
                  word_count: wordCount,
                };
              });

            console.log(`[Turbo-Capture] Preparing to insert ${pagesToInsert.length} pages (from ${successfulCaptures.length} successful captures)`);
            console.log(`[Turbo-Capture] Insert details: ${JSON.stringify(pagesToInsert.map(p => ({ url: p.url, wordCount: p.word_count, textLen: p.content_text.length })))}`);

            if (pagesToInsert.length > 0) {
              const { data: insertedData, error: insertError } = await supabase
                .from('site_pages')
                .upsert(pagesToInsert, { onConflict: 'site_id,url' })
                .select('id, url');
              
              if (insertError) {
                console.error('[Turbo-Capture] Error inserting pages:', insertError);
              } else {
                console.log(`[Turbo-Capture] Successfully inserted ${insertedData?.length || 0} pages into database`);
                console.log(`[Turbo-Capture] Inserted page IDs: ${JSON.stringify(insertedData?.map(p => ({ id: p.id, url: p.url })))}`);
                pagesInserted = insertedData?.length || pagesToInsert.length;
                
                // Update site's last_crawled_at
                await supabase
                  .from('sites')
                  .update({ last_crawled_at: new Date().toISOString() })
                  .eq('id', site.id);
              }
            } else {
              console.warn('[Turbo-Capture] No pages met insertion criteria:', 
                successfulCaptures.map(c => ({ 
                  url: c.url, 
                  hasSummary: !!c.summary, 
                  hasContent: !!c.content, 
                  wordCount: c.wordCount 
                }))
              );
            }
          }

          // Brief wait for database commit visibility (reduced from 3s to 500ms)
          if (pagesInserted > 0) {
            console.log('[Turbo-Capture] Waiting 500ms for database commit visibility...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Log final statistics for debugging
          console.log(`[Turbo-Capture] === FINAL STATISTICS ===`);
          console.log(`[Turbo-Capture] Domain: ${domain}, Site ID: ${site?.id}`);
          console.log(`[Turbo-Capture] URLs discovered: ${urlsToCapture.length}`);
          console.log(`[Turbo-Capture] Pages captured (non-failed): ${captureResults.filter(r => r.status !== 'failed').length}`);
          console.log(`[Turbo-Capture] Pages with summaries: ${successfulCaptures.filter(c => c.summary).length}`);
          console.log(`[Turbo-Capture] Pages inserted to DB: ${pagesInserted}`);
          console.log(`[Turbo-Capture] Failed captures: ${captureResults.filter(r => r.status === 'failed').length}`);
          
          // Final completion
          sendEvent('complete', {
            status: 'ok',
            captureResults,
            stats: {
              total: urlsToCapture.length,
              captured: successfulCaptures.length,
              analyzed: successfulCaptures.filter(c => c.summary).length,
              lowContent: captureResults.filter(r => r.status === 'low_content').length,
              failed: captureResults.filter(r => r.status === 'failed').length,
            },
            siteId: site?.id,
            domain: domain,
          });
          
          controller.close();
        } catch (e: any) {
          console.error('[Turbo-Capture] Error:', e);
          sendEvent('error', { message: e.message || 'An error occurred' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e: any) {
    console.error('[Turbo-Capture] Error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
