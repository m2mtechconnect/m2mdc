import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Removed MIN_WORDS threshold - accept any meaningful content for JS-rendered sites
const MIN_WORDS = 0; // No minimum - accept thin but meaningful content
const MIN_PARAGRAPHS = 0; // No minimum paragraphs required

// Multi-pass content extraction utility
function extractContentMultiPass(doc: any, html: string): { text: string; method: string; wordCount: number } {
  const results: Array<{ text: string; method: string; wordCount: number }> = [];
  
  // PASS 1: Semantic content extraction (main, article, section)
  const semanticSelectors = ['main', 'article', '[role="main"]', '.main-content', '#main-content', '.content', '#content'];
  for (const selector of semanticSelectors) {
    try {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        let text = '';
        Array.from(elements).forEach((el: any) => {
          // Get headings and paragraphs within semantic blocks
          const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
          const paragraphs = el.querySelectorAll('p');
          const listItems = el.querySelectorAll('li');
          
          Array.from(headings).forEach((h: any) => text += (h.textContent || '') + '\n');
          Array.from(paragraphs).forEach((p: any) => text += (p.textContent || '') + '\n');
          Array.from(listItems).forEach((li: any) => text += '• ' + (li.textContent || '') + '\n');
        });
        
    text = text.replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    // Accept any content with at least some text
    if (text.length > 20) {
      results.push({ text, method: `semantic:${selector}`, wordCount });
    }
      }
    } catch { /* best-effort capture step */ }
  }
  
  // PASS 2: Heading + Paragraph extraction (aggressive)
  try {
    let text = '';
    const headings = doc.querySelectorAll('h1, h2, h3, h4');
    const paragraphs = doc.querySelectorAll('p');
    const lists = doc.querySelectorAll('li');
    
    Array.from(headings).forEach((h: any) => text += (h.textContent || '') + '\n');
    Array.from(paragraphs).forEach((p: any) => text += (p.textContent || '') + '\n');
    Array.from(lists).forEach((li: any) => text += '• ' + (li.textContent || '') + '\n');
    
    text = text.replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    // Accept any content with at least some text
    if (text.length > 20) {
      results.push({ text, method: 'heading-paragraph-list', wordCount });
    }
  } catch { /* best-effort capture step */ }
  
  // PASS 3: Meta tag extraction (descriptions, OG tags)
  try {
    let text = '';
    const metaSelectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]'
    ];
    
    for (const selector of metaSelectors) {
      const meta = doc.querySelector(selector);
      if (meta) {
        const content = meta.getAttribute('content');
        if (content) text += content + ' ';
      }
    }
    
    // Add title
    const title = doc.querySelector('title');
    if (title) text += (title.textContent || '') + ' ';
    
    // Add all h1s
    const h1s = doc.querySelectorAll('h1');
    Array.from(h1s).forEach((h: any) => text += (h.textContent || '') + ' ');
    
    text = text.replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    // Accept any content with at least some text
    if (text.length > 20) {
      results.push({ text, method: 'meta-tags', wordCount });
    }
  } catch { /* best-effort capture step */ }
  
  // PASS 4: Body text as last resort (but clean it)
  try {
    const body = doc.querySelector('body');
    if (body) {
      // Remove script, style, nav, footer, header noise
      const clone = body.cloneNode(true);
      ['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript'].forEach(tag => {
        const elements = clone.querySelectorAll(tag);
        Array.from(elements).forEach((el: any) => el.remove && el.remove());
      });
      
      let text = clone.textContent || '';
      text = text.replace(/\s+/g, ' ').trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      // Accept any content with at least some text
      if (text.length > 20) {
        results.push({ text, method: 'body-cleaned', wordCount });
      }
    }
  } catch { /* best-effort capture step */ }
  
  // Return the result with most words
  if (results.length === 0) {
    return { text: '', method: 'none', wordCount: 0 };
  }
  
  results.sort((a, b) => b.wordCount - a.wordCount);
  return results[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, userId, healthCheck } = await req.json();
    
    // Health check endpoint for Gemini
    if (healthCheck) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ 
            healthy: false, 
            error: "LOVABLE_API_KEY not configured",
            stage: "config" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const healthStart = Date.now();
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 10,
          }),
        });

        const latency = Date.now() - healthStart;
        
        if (response.ok) {
          return new Response(
            JSON.stringify({ 
              healthy: true, 
              latency_ms: latency,
              model: "google/gemini-2.5-flash"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const error = await response.text();
          return new Response(
            JSON.stringify({ 
              healthy: false, 
              error: `AI gateway returned ${response.status}`,
              details: error,
              stage: "ai"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        return new Response(
          JSON.stringify({ 
            healthy: false, 
            error: e instanceof Error ? e.message : "Health check failed",
            stage: "network"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "URL is required", stage: "validation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Capturing URL:", url);
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured in secrets");
      return new Response(
        JSON.stringify({ 
          error: "AI service not configured. Please contact support.",
          stage: "config"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("✓ Lovable AI configured");

    // STAGE: Preflight - Check robots.txt (lightweight check, not strict RFC compliance)
    console.log(`[${requestId}] STAGE: preflight`);
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    let robotsAllowed = true;

    try {
      const robotsResponse = await fetch(robotsUrl, { 
        signal: AbortSignal.timeout(2000),
        headers: { "User-Agent": "LovableBot/1.0" }
      });
      
      if (robotsResponse.ok) {
        const robotsTxt = await robotsResponse.text();
        console.log(`[${requestId}] robots.txt preview: ${robotsTxt.substring(0, 200)}`);
        
        // Only block if there's an explicit "Disallow: /" rule for our user agent or wildcard
        // This is a simplified check - we're looking for lines that explicitly disallow root path
        const lines = robotsTxt.split('\n');
        let currentAgent = '';
        let shouldBlock = false;
        
        for (const line of lines) {
          const trimmed = line.trim().toLowerCase();
          if (trimmed.startsWith('user-agent:')) {
            currentAgent = trimmed;
          } else if (trimmed === 'disallow: /' && (currentAgent.includes('*') || currentAgent.includes('lovablebot'))) {
            shouldBlock = true;
            console.log(`[${requestId}] Found blocking rule: ${line}`);
            break;
          }
        }
        
        if (shouldBlock) {
          robotsAllowed = false;
          console.log(`[${requestId}] BLOCKED by robots.txt - but proceeding anyway for Force Ingest`);
          // Don't return error - proceed with stealth mode
          // Force Ingest should bypass robots.txt since it's user-initiated
        }
      }
    } catch (e) {
      console.log(`[${requestId}] robots.txt check failed (proceeding):`, e instanceof Error ? e.message : String(e));
    }

    // STAGE: Fetch - Try multiple strategies with backoff and mirror fallback
    console.log(`[${requestId}] STAGE: fetch`);
    
    let pageResponse: Response | undefined;
    let html: string | undefined;
    let fetchStrategy = "";
    
    const DEFAULT_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    };
    
    // Retry with exponential backoff
    const retryWithBackoff = async (
      fetchFn: () => Promise<Response>,
      maxRetries: number = 3,
      baseDelay: number = 1000
    ): Promise<Response> => {
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await fetchFn();
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
            console.log(`[${requestId}] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError;
    };
    
    const strategies: Array<{
      name: string; 
      headers: Record<string, string>; 
      timeout: number; 
      url?: string;
      retries?: number;
    }> = [
      { 
        name: "default-headers", 
        headers: DEFAULT_HEADERS,
        timeout: 5000,
        retries: 2,
      },
      { 
        name: "firefox-ua", 
        headers: {
          ...DEFAULT_HEADERS,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        },
        timeout: 5000,
        retries: 2,
      },
      { 
        name: "safari-ua", 
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
        },
        timeout: 5000,
        retries: 2,
      },
      { 
        name: "stealth-render", 
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LovableBot/1.0)",
          "Accept": "text/html,text/plain",
        },
        timeout: 8000,
        url: `https://r.jina.ai/${url}`,
        retries: 2,
      },
    ];

    let lastError: Error | null = null;
    let lastStatusCode: number | undefined;
    const globalTimeout = Date.now() + 15000; // 15s cap for all attempts

    for (const strategy of strategies) {
      if (Date.now() >= globalTimeout) {
        console.log(`[${requestId}] Global timeout reached`);
        break;
      }

      try {
        console.log(`[${requestId}] Trying: ${strategy.name} (timeout: ${strategy.timeout}ms, retries: ${strategy.retries || 1})`);
        const fetchUrl = strategy.url || url;
        
        const response = await retryWithBackoff(
          () => fetch(fetchUrl, {
            headers: strategy.headers,
            signal: AbortSignal.timeout(strategy.timeout),
            redirect: "follow",
          }),
          strategy.retries || 1,
          1000
        );
        
        lastStatusCode = response.status;
        
        if (response.ok) {
          html = await response.text();
          fetchStrategy = strategy.name;
          console.log(`[${requestId}] ✓ Success with ${strategy.name} - ${html.length} bytes`);
          pageResponse = response;
          break;
        } else if (response.status === 403 || response.status === 451) {
          console.log(`[${requestId}] Blocked status: ${response.status}`);
          if (strategy.name === "stealth-render") {
            throw new Error(`BOT_BLOCKED:${response.status}`);
          }
          // Continue to next strategy
        } else if (response.status === 503 || response.status === 504) {
          console.log(`[${requestId}] Service unavailable: ${response.status}`);
          throw new Error(`SERVICE_UNAVAILABLE:${response.status}`);
        } else {
          console.log(`[${requestId}] HTTP ${response.status} - trying next strategy`);
        }
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.log(`[${requestId}] ${strategy.name} failed:`, lastError.message);
        
        // If this was the last strategy, we've exhausted all options
        if (strategy.name === "stealth-render") {
          break;
        }
      }
    }

    if (!html || !pageResponse) {
      const errorMsg = lastError?.message || "Unknown error";
      console.error(`[${requestId}] All fetch strategies failed:`, errorMsg, "Status:", lastStatusCode);
      
      // Detect specific error types and return user-friendly messages
      if (errorMsg.includes("BOT_BLOCKED") || lastStatusCode === 403 || lastStatusCode === 451) {
        return new Response(
          JSON.stringify({ 
            error: "This website blocks automated access. Try again later or contact the site owner.",
            errorType: "bot_protection",
            stage: "fetch",
            requestId,
            statusCode: lastStatusCode,
            userMessage: "🔒 This website blocks automated access. Try again later or contact the site owner.",
            cta: {
              primary: { label: "Retry Securely", action: "retry_stealth" },
              secondary: { label: "Upload PDF", action: "upload_file" }
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (errorMsg.includes("SERVICE_UNAVAILABLE") || lastStatusCode === 503 || lastStatusCode === 504) {
        return new Response(
          JSON.stringify({ 
            error: "Network error — please check your connection or try again later.",
            errorType: "network_error",
            stage: "fetch",
            requestId,
            statusCode: lastStatusCode,
            userMessage: "🌐 Network error — please check your connection or try again later.",
            cta: {
              primary: { label: "Retry", action: "retry" },
              secondary: { label: "Contact Support", action: "support" }
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
        return new Response(
          JSON.stringify({ 
            error: "Request timeout after 15 seconds",
            errorType: "timeout",
            stage: "fetch",
            requestId,
            statusCode: 408,
            userMessage: "⏱️ Request timeout — this website is taking too long to respond.",
            cta: {
              primary: { label: "Retry", action: "retry" },
              secondary: { label: "Try Different URL", action: "new_url" }
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (errorMsg.includes("http2") || errorMsg.includes("stream error") || errorMsg.includes("protocol")) {
        return new Response(
          JSON.stringify({ 
            error: "This website uses advanced bot protection. Please try uploading a PDF or document instead.",
            errorType: "protocol_error",
            stage: "fetch",
            requestId,
            userMessage: "⚙️ This website requires JavaScript to load its content. Try enabling Stealth Render mode.",
            cta: {
              primary: { label: "Retry in Stealth Mode", action: "retry_stealth" },
              secondary: { label: "Upload PDF", action: "upload_file" }
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Generic error
      return new Response(
        JSON.stringify({ 
          error: `Could not fetch website: ${errorMsg}`,
          errorType: "unknown",
          stage: "fetch",
          requestId,
          statusCode: lastStatusCode,
          userMessage: "❗ We couldn't process this website. Please contact support if this persists.",
          cta: {
            primary: { label: "Retry", action: "retry" },
            secondary: { label: "Contact Support", action: "support" }
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // STAGE: Parse - Extract content with quality thresholds
    console.log(`[${requestId}] STAGE: parse - ${html.length} bytes, strategy: ${fetchStrategy}`);
    
    let title = "";
    let metaDescription = "";
    let mainContent = "";
    let extractionStrategy = "";
    let metrics = { chars_total: 0, num_paragraphs: 0, heading_count: 0 };

    // If using stealth render (jina mirror), content is already cleaned
    if (fetchStrategy === "stealth-render") {
      console.log(`[${requestId}] Using stealth render content (pre-cleaned)`);
      const lines = html.split('\n');
      title = lines[0]?.substring(0, 200) || urlObj.host;
      mainContent = html.substring(0, 10000);
      extractionStrategy = "stealth";
      
      const paragraphs = mainContent.split('\n\n').filter(p => p.trim().length > 50);
      metrics = {
        chars_total: mainContent.length,
        num_paragraphs: paragraphs.length,
        heading_count: lines.filter(l => l.startsWith('#')).length
      };
    } else {
      // Parse HTML with multi-pass extraction
      const doc = new DOMParser().parseFromString(html, "text/html");
      if (!doc) {
        return new Response(
          JSON.stringify({ 
            error: "Fetched the page but couldn't extract readable text",
            errorType: "parse_error",
            stage: "parse",
            requestId,
            userMessage: "📄 Fetched the page but found no readable text. Try a different URL or upload a document.",
            cta: {
              primary: { label: "Retry in Stealth Mode", action: "retry_stealth" },
              secondary: { label: "Upload a File", action: "upload_file" }
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      title = doc.querySelector("title")?.textContent?.trim() || urlObj.host;
      metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
      
      console.log(`[${requestId}] Trying multi-pass extraction`);
      const extractionResult = extractContentMultiPass(doc, html);
      
      // Accept any extracted content (no minimum threshold)
      if (extractionResult.text && extractionResult.text.length > 20) {
        mainContent = extractionResult.text;
        extractionStrategy = extractionResult.method;
        const paragraphs = mainContent.split('\n\n').filter(p => p.trim().length > 40);
        metrics = {
          chars_total: mainContent.length,
          num_paragraphs: paragraphs.length,
          heading_count: (mainContent.match(/^[A-Z][^.!?]{20,}$/gm) || []).length
        };
        console.log(`[${requestId}] ✓ Multi-pass extraction succeeded: ${extractionResult.wordCount} words via ${extractionResult.method}`);
      } else {
        console.log(`[${requestId}] Multi-pass extraction yielded minimal content: ${extractionResult.wordCount} words`);
      }
      
      // Clean up content if we got any
      if (mainContent) {
        const beforeCleanup = mainContent.length;
        mainContent = mainContent
          .replace(/\s+/g, " ")
          .replace(/\n\s*\n/g, "\n\n")
          .trim()
          .substring(0, 10000);
        console.log(`[${requestId}] Cleanup: ${beforeCleanup} -> ${mainContent.length} chars`);
      }
    }

    // Try r.jina.ai for JS-rendered sites if initial extraction is thin
    const finalWordCount = mainContent ? mainContent.split(/\s+/).filter(Boolean).length : 0;
    console.log(`[${requestId}] Initial extraction: mainContent length=${mainContent?.length || 0}, words=${finalWordCount}, paragraphs=${metrics.num_paragraphs}`);
    
    // Always try Jina for thin content OR if no content at all
    if (!mainContent || finalWordCount < 30) {
      console.log(`[${requestId}] Content thin or missing (${finalWordCount} words). Trying r.jina.ai for better JS rendering...`);
      
      try {
        const jinaMirrorUrl = `https://r.jina.ai/${url}`;
        console.log(`[${requestId}] Fetching: ${jinaMirrorUrl}`);
        
        const jinaResponse = await fetch(jinaMirrorUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/plain,text/html,text/markdown",
            "Accept-Language": "en-CA,en-US;q=0.9,en;q=0.8",
            "X-With-Generated-Alt": "true", // Get alt text for images
            "X-Return-Format": "markdown", // Get markdown format
            "X-With-Links-Summary": "true", // Include link context
            "X-No-Cache": "true", // Force fresh render
          },
          signal: AbortSignal.timeout(15000), // Increased timeout for JS-heavy sites
        });
        
        if (jinaResponse.ok) {
          const jinaText = await jinaResponse.text();
          const jinaWordCount = jinaText.split(/\s+/).filter(Boolean).length;
          console.log(`[${requestId}] Jina mirror returned ${jinaText.length} chars (${jinaWordCount} words)`);
          console.log(`[${requestId}] Jina content preview: ${jinaText.substring(0, 300)}`);
          
          // Accept Jina content even if thin - it's better than nothing
          if (jinaText.length > 20) {
            const lines = jinaText.split('\n');
            title = lines[0]?.substring(0, 200) || title || urlObj.host;
            mainContent = jinaText.substring(0, 50000); // Increased from 10k to 50k
            extractionStrategy = "jina-mirror-js-render";
            
            const paragraphs = mainContent.split('\n\n').filter(p => p.trim().length > 50);
            metrics = {
              chars_total: mainContent.length,
              num_paragraphs: paragraphs.length,
              heading_count: lines.filter(l => l.startsWith('#')).length
            };
            
            console.log(`[${requestId}] ✓ jina-mirror succeeded: ${jinaWordCount} words, ${metrics.num_paragraphs} paragraphs`);
          } else {
            console.log(`[${requestId}] jina-mirror returned minimal content: ${jinaWordCount} words`);
          }
        } else {
          console.log(`[${requestId}] jina-mirror failed: ${jinaResponse.status} ${jinaResponse.statusText}`);
          const errorText = await jinaResponse.text();
          console.log(`[${requestId}] jina-mirror error details: ${errorText.substring(0, 200)}`);
        }
      } catch (e) {
        console.log(`[${requestId}] jina-mirror error:`, e instanceof Error ? e.message : String(e));
      }
    }
    
    // Final check - accept any content, even if thin
    const postAllStrategiesWordCount = mainContent ? mainContent.split(/\s+/).filter(Boolean).length : 0;
    console.log(`[${requestId}] Final check: mainContent exists=${!!mainContent}, length=${mainContent?.length || 0}, words=${postAllStrategiesWordCount}`);
    
    // Only fail if absolutely no content was extracted
    if (!mainContent || mainContent.length < 20) {
      console.log(`[${requestId}] Parse failed - no usable content after all strategies: ${postAllStrategiesWordCount} words`);
      console.log(`[${requestId}] Extraction strategy tried: ${extractionStrategy || 'none'}`);
      console.log(`[${requestId}] Content preview: ${mainContent?.substring(0, 200) || '(no content extracted)'}`);
      console.log(`[${requestId}] Fetch strategy: ${fetchStrategy}`);
      
      return new Response(
        JSON.stringify({ 
          error: `Unable to extract any readable content from this page`,
          errorType: "no_content",
          stage: "parse",
          requestId,
          metrics: { 
            finalWordCount: postAllStrategiesWordCount,
            extractionStrategy: extractionStrategy || 'none',
            fetchStrategy
          },
          userMessage: `📄 Unable to extract readable text from this page. This usually means the site heavily relies on JavaScript or blocks automated access.`,
          cta: {
            primary: { label: "Upload a Document", action: "upload_file" },
            secondary: { label: "Try Different Page", action: "new_url" }
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Determine status based on content quality
    const contentStatus = postAllStrategiesWordCount < 50 ? "success_thin" : "success";

    const successWordCount = mainContent.split(/\s+/).filter(Boolean).length;
    console.log(`[${requestId}] ✓ Parse successful via ${extractionStrategy}: ${metrics.chars_total} chars, ${successWordCount} words, ${metrics.num_paragraphs} paragraphs, ${metrics.heading_count} headings`);
    console.log(`[${requestId}] Content preview (first 300 chars): ${mainContent.substring(0, 300)}...`);

    const snapshot = {
      title,
      meta_description: metaDescription,
      url,
      content: mainContent,
      headings: fetchStrategy === "jina-mirror" ? [] : 
        Array.from((new DOMParser().parseFromString(html, "text/html"))?.querySelectorAll("h1, h2, h3") || [])
          .slice(0, 10)
          .map(h => h.textContent?.trim())
          .filter(Boolean),
      bytes: html.length,
      fetch_strategy: fetchStrategy,
    };

    console.log(`[${requestId}] Snapshot: ${title} (${mainContent.length} chars)`);

    // STAGE: Summarize - Generate AI summary
    console.log(`[${requestId}] STAGE: summarize - calling Gemini`);
    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a web content summarizer. Analyze the website content and provide:
1. A concise 2-3 sentence summary
2. 3-5 key points
3. Main topics covered

Return JSON:
{
  "summary": "...",
  "key_points": ["...", "..."],
  "topics": ["...", "..."],
  "faqs": [{"question": "...", "answer": "..."}]
}`,
          },
          {
            role: "user",
            content: `Title: ${title}\n\nContent:\n${mainContent.substring(0, 4000)}`,
          },
        ],
      }),
    });

    let aiSummary;
    if (summaryResponse.ok) {
      console.log(`[${requestId}] ✓ AI summarization successful`);
      const summaryData = await summaryResponse.json();
      const summaryContent = summaryData.choices?.[0]?.message?.content;
      
      try {
        const jsonMatch = summaryContent.match(/```json\n([\s\S]*?)\n```/) || summaryContent.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : summaryContent;
        aiSummary = JSON.parse(jsonStr);
      } catch (e) {
        console.error(`[${requestId}] Failed to parse summary JSON:`, e);
        aiSummary = {
          summary: summaryContent || "Summary generation failed",
          key_points: [],
          topics: [],
          faqs: [],
        };
      }
    } else {
      const errorText = await summaryResponse.text();
      console.error(`[${requestId}] AI summarization failed:`, summaryResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: "AI service failed - check if Gemini is configured",
          stage: "summarize",
          requestId,
          details: `Status ${summaryResponse.status}: ${errorText.substring(0, 200)}`,
          actions: ["Verify AI is enabled in settings", "Try again later"]
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STAGE: Index - Store in database
    console.log(`[${requestId}] STAGE: index`);
    const { data: indexedData, error: indexError } = await supabase
      .from("indexed_content")
      .insert({
        source_type: "web",
        source_name: urlObj.host,
        url,
        title,
        content: mainContent,
        metadata: {
          meta_description: metaDescription,
          summary: aiSummary.summary,
          key_points: aiSummary.key_points,
          topics: aiSummary.topics,
          faqs: aiSummary.faqs,
          bytes_fetched: html.length,
          robots_allowed: robotsAllowed,
          fetch_strategy: fetchStrategy,
          request_id: requestId,
        },
      })
      .select()
      .single();

    if (indexError) {
      console.error(`[${requestId}] Index error:`, indexError);
    }

    const latency = Date.now() - startTime;

    // Store search history
    if (userId) {
      await supabase.from("search_history").insert({
        user_id: userId,
        query: url,
        intent: "URL",
        normalized_url: url,
        result_count: 1,
        latency_ms: latency,
      });
    }

    // Create background crawl job for deeper indexing
    await supabase.from("crawl_jobs").insert({
      url,
      status: "pending",
      depth: 0,
      max_depth: 1,
      robots_allowed: robotsAllowed,
      metadata: { triggered_by: "url_capture" },
    });

    console.log(`[${requestId}] ✓ Complete in ${latency}ms`);

    return new Response(
      JSON.stringify({
        status: contentStatus, // "success" or "success_thin"
        snapshot,
        summary: aiSummary,
        indexed_id: indexedData?.id,
        latency_ms: latency,
        robots_allowed: robotsAllowed,
        requestId,
        fetch_strategy: fetchStrategy,
        extraction_strategy: extractionStrategy,
        metrics: {
          word_count: postAllStrategiesWordCount,
          char_count: mainContent.length,
          paragraphs: metrics.num_paragraphs,
          headings: metrics.heading_count
        },
        content: mainContent, // Include raw content for debugging
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in url-capture:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stage: "unknown"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
