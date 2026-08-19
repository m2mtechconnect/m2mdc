import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error -- remote Deno module, no local types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Scoped CORS headers for this invocation. Module-level helpers below render
// responses, so the resolved headers are held here and refreshed per request.
let corsHeaders = getCorsHeaders(null);



// Normalized response type
interface RecoResponse {
  company: string | null;
  domain: string;
  industryGuess: string | null;
  departmentsCovered: string[];
  items: any[];
  status: 'ok' | 'empty' | 'error';
  message?: string;
  warningMessage?: string;
  captureResults?: Array<{ 
    url: string; 
    status: 'success' | 'success_thin' | 'failed'; 
    wordCount?: number;
    error?: string;
    errorCode?: string;
  }>;
  telemetry?: {
    crawl_pages_found?: number;
    force_ingest_pages_found?: number;
    context_chars: number;
    gemini_ok: boolean;
    gemini_error?: string;
    returned_items_count: number;
  };
}

// Normalize partial responses to consistent shape
const normalizeResponse = (partial: Partial<RecoResponse>, domain: string): RecoResponse => ({
  company: partial.company ?? null,
  domain: partial.domain ?? domain,
  industryGuess: partial.industryGuess ?? null,
  departmentsCovered: Array.isArray(partial.departmentsCovered) ? partial.departmentsCovered : [],
  items: Array.isArray(partial.items) ? partial.items : [],
  status: partial.status ?? 'ok',
  message: partial.message,
  captureResults: partial.captureResults,
});

serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const domain = 'unknown';
  
  try {
    // Handle GET requests with query parameters (for SSE)
    let inputUrl: string;
    let topN = 3;
    let force = false;
    let forceIngest = false;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      inputUrl = url.searchParams.get('url') || '';
      topN = parseInt(url.searchParams.get('topN') || '3');
      force = url.searchParams.get('force') === 'true';
      forceIngest = url.searchParams.get('forceIngest') === 'true';
    } else {
      // Handle POST requests with JSON body
      const body = await req.json();
      inputUrl = body.url;
      topN = body.topN || 3;
      force = body.force || false;
      forceIngest = body.forceIngest || false;
    }
    
    if (!inputUrl) {
      return new Response(JSON.stringify(normalizeResponse({
        status: 'error',
        message: 'URL is required',
      }, domain)), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Normalize domain
    const urlObj = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
    const normalizedDomain = urlObj.hostname.replace(/^www\./, '');

    // Get or create site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('domain', normalizedDomain)
      .single();

    if (siteError && siteError.code !== 'PGRST116') {
      throw siteError;
    }

    if (!site) {
      const { data: newSite, error: createError } = await supabase
        .from('sites')
        .insert({ domain: normalizedDomain })
        .select()
        .single();
      
      if (createError) throw createError;
      site = newSite;
    }

    // Check if we need to crawl or force ingest
    const needsCrawl = !site.last_crawled_at || 
      force || 
      (new Date().getTime() - new Date(site.last_crawled_at).getTime()) > 24 * 60 * 60 * 1000;

    // Track capture results for Force Ingest mode
    const captureResults: Array<{ 
      url: string; 
      status: 'success' | 'failed'; 
      wordCount?: number;
      error?: string;
    }> = [];

    if (needsCrawl && !forceIngest) {
      console.log(`[Recommendations] Triggering crawl for ${normalizedDomain}`);
      const crawlResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/url-crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ domain: normalizedDomain, siteId: site.id }),
      });

      if (!crawlResponse.ok) {
        const error = await crawlResponse.text();
        console.error('[Recommendations] Crawl error:', error);
        return new Response(JSON.stringify(normalizeResponse({
          status: 'error',
          message: 'Failed to crawl website. Please try again.',
        }, normalizedDomain)), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }

      const crawlResult = await crawlResponse.json();
      if (crawlResult.pageCount === 0) {
        return new Response(JSON.stringify(normalizeResponse({
          status: 'empty',
          message: crawlResult.message || 'No content found on this website to analyze.',
        }, normalizedDomain)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }
    }

    // Force Ingest mode with SSE streaming - DEPRECATED
    // Turbo-capture now handles capture and DB insertion
    // This SSE mode is kept for backwards compatibility but should not be used
    if (false as boolean) { // DEPRECATED SSE path, retained for reference only
      console.log(`[Recommendations] Force Ingest mode with SSE for ${normalizedDomain}`);
      
      const keyPaths = ['', '/about', '/products', '/solutions', '/services', '/pricing', '/company'];
      const totalPages = keyPaths.length;
      
      // Create SSE stream
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const captureResults: Array<{url: string; status: 'success' | 'failed'; wordCount?: number; error?: string}> = [];
          
          const sendEvent = (event: string, data: any) => {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
            console.log(`[SSE] Sent ${event}:`, data);
          };
          
          try {
            // Send start event
            sendEvent('start', {
              domain: normalizedDomain,
              totalPages,
              timestamp: new Date().toISOString(),
            });
            
            let captureIndex = 0;
            
            // Capture each page
            for (const path of keyPaths) {
              const pageUrl = `https://${normalizedDomain}${path}`;
              captureIndex++;
              
              sendEvent('capture_start', {
                url: pageUrl,
                currentPage: captureIndex,
                totalPages,
              });
              
              try {
                const captureResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/url-capture`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({ url: pageUrl }),
                });
                
                if (captureResponse.ok) {
                  const captureData = await captureResponse.json();
                  
                  // Extract content from either top-level or snapshot
                  const content = captureData.content || captureData.snapshot?.content;
                  const contentLength = content?.length || 0;
                  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
                  
                  console.log(`[SSE] Capture response for ${pageUrl}:`, {
                    hasContent: !!content,
                    contentLength,
                    wordCount,
                    hasSnapshot: !!captureData.snapshot,
                    snapshotContentLength: captureData.snapshot?.content?.length || 0,
                    topLevelContentLength: captureData.content?.length || 0,
                  });
                  
                  // Accept any content, even thin pages (JS-rendered sites often start with minimal HTML)
                  const isThin = wordCount < 30;
                  const hasAnyContent = content && content.trim().length > 20;
                  
                  if (hasAnyContent) {
                    const statusLabel = isThin ? 'success_thin' : 'success';
                    console.log(`[SSE] Captured ${pageUrl}: ${wordCount} words (${statusLabel}), inserting to DB with site_id: ${site.id}`);
                    
                    const { error: insertError } = await supabase.from('site_pages').upsert({
                      site_id: site.id,
                      url: pageUrl,
                      content_text: content.slice(0, 50000),
                      content_html: captureData.rawHtml?.slice(0, 100000) || captureData.snapshot?.raw_html?.slice(0, 100000) || '',
                      status_code: 200,
                      lang: 'en',
                      word_count: wordCount,
                    }, { onConflict: 'site_id,url' });
                    
                    if (insertError) {
                      console.error(`[SSE] Insert error for ${pageUrl}:`, insertError);
                      captureResults.push({
                        url: pageUrl,
                        status: 'failed',
                        error: `DB insert failed: ${insertError.message}`,
                      });
                      
                      sendEvent('capture_failed', {
                        url: pageUrl,
                        error: `DB insert failed: ${insertError.message}`,
                        currentPage: captureIndex,
                        totalPages,
                      });
                    } else {
                      console.log(`[SSE] Successfully inserted ${pageUrl} to DB`);
                      captureResults.push({
                        url: pageUrl,
                        status: statusLabel as any,
                        wordCount,
                      });
                      
                      sendEvent('capture_success', {
                        url: pageUrl,
                        wordCount,
                        status: statusLabel,
                        currentPage: captureIndex,
                        totalPages,
                      });
                    }
                  } else {
                    const contentPreview = content?.substring(0, 100) || '(no content)';
                    console.log(`[SSE] No extractable content for ${pageUrl}: ${wordCount} words. Preview: ${contentPreview}`);
                    
                    captureResults.push({
                      url: pageUrl,
                      status: 'failed',
                      error: `No extractable content (${wordCount} words)`,
                    });
                    
                    sendEvent('capture_failed', {
                      url: pageUrl,
                      error: 'No extractable content',
                      currentPage: captureIndex,
                      totalPages,
                    });
                  }
                } else {
                  const error = `HTTP ${captureResponse.status}`;
                  captureResults.push({
                    url: pageUrl,
                    status: 'failed',
                    error,
                  });
                  
                  sendEvent('capture_failed', {
                    url: pageUrl,
                    error,
                    currentPage: captureIndex,
                    totalPages,
                  });
                }
              } catch (e: any) {
                const error = e?.message || 'Capture failed';
                captureResults.push({
                  url: pageUrl,
                  status: 'failed',
                  error,
                });
                
                sendEvent('capture_failed', {
                  url: pageUrl,
                  error,
                  currentPage: captureIndex,
                  totalPages,
                });
              }
              
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const successfulCaptures = captureResults.filter(r => r.status === 'success');
            
            if (successfulCaptures.length === 0) {
              sendEvent('error', {
                message: 'Could not capture content from this site. It may be blocking all automated access.',
                captureResults,
              });
              
              // Wait for error event to be delivered before closing
              await new Promise(resolve => setTimeout(resolve, 200));
              controller.close();
              return;
            }
            
            await supabase
              .from('sites')
              .update({ 
                last_crawled_at: new Date().toISOString(),
                company_name: `${normalizedDomain} (Force Ingest)`,
              })
              .eq('id', site.id);
            
            sendEvent('generating', {
              message: 'Analyzing captured content with AI...',
              pagesAnalyzed: successfulCaptures.length,
            });
            
            // Brief retry mechanism for DB commit visibility (reduced delays)
            console.log(`[SSE] Waiting for pages to appear in database for site_id: ${site.id}`);
            let pages = null;
            let retries = 0;
            const maxRetries = 3;
            
            while (retries < maxRetries && (!pages || pages.length === 0)) {
              if (retries > 0) {
                const delay = 500 * retries; // 500ms, 1000ms, 1500ms
                console.log(`[SSE] Retry ${retries}/${maxRetries}: waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              
              const { data: queryPages, error: pagesError } = await supabase
                .from('site_pages')
                .select('url, content_text, word_count')
                .eq('site_id', site.id)
                .gt('word_count', 0)
                .order('word_count', { ascending: false })
                .limit(50);
              
              console.log(`[SSE] Attempt ${retries + 1}: Query returned ${queryPages?.length || 0} pages, error: ${pagesError?.message || null}`);
              
              if (pagesError) {
                console.error('[SSE] Database error querying pages:', pagesError);
                sendEvent('error', {
                  message: `Database error: ${pagesError.message}`,
                  captureResults,
                });
                controller.close();
                return;
              }
              
              pages = queryPages;
              retries++;
            }
            
            if (!pages || pages.length === 0) {
              console.error('[SSE] No pages found after successful captures');
              sendEvent('error', {
                message: 'Pages were captured but could not be retrieved from database. Please try again.',
                captureResults,
                telemetry: {
                  force_ingest_pages_found: successfulCaptures.length,
                  context_chars: 0,
                  gemini_ok: false,
                  gemini_error: 'No pages found in database after capture',
                  returned_items_count: 0,
                }
              });
              
              // Wait for error event to be delivered before closing
              await new Promise(resolve => setTimeout(resolve, 200));
              controller.close();
              return;
            }
            
            // Build context
            let context = '';
            const usedUrls: string[] = [];
            for (const page of pages) {
              if (context.length > 120000) break;
              context += `\n\n=== ${page.url} ===\n${page.content_text}\n`;
              usedUrls.push(page.url);
            }
            
            // Call Lovable AI with structured output
            const systemPrompt = `You are M2M's Agentic Advisor. Given raw website text from a single company,
produce the TOP ${topN} AI initiatives PER department that can deliver measurable impact in 90–180 days.

Departments (only these):
Sales, Marketing, Product, Operations, Support, Engineering, Finance, HR, Legal, Compliance.

Rules:
- For each department, propose up to ${topN} initiatives. If insufficient evidence, omit the department.
- Each initiative MUST include: concise title; ≤80-word value proposition; one concrete "Next Step" doable in 2 weeks; tags chosen only from ["Adoption","Commercialization","Funding Eligible","MEA Spark","MEA Gateway"]; Impact (Low/Medium/High); Effort (Low/Medium/High); Confidence 0–1; optional fundingHints (Canada: IRAP, Scale AI, NGen, etc. when relevant); blueprintId + defaultAgents/defaultDatasets/defaultConnections that our studio can preload.
- Base everything ONLY on the provided site pages. If uncertain, lower confidence or omit.
- Prefer quick wins that can be piloted in AURA. Map to Canadian funding when appropriate.`;

            const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
            if (!LOVABLE_API_KEY) {
              throw new Error('LOVABLE_API_KEY not configured');
            }

            const recommendationSchema = {
              type: "object",
              properties: {
                company: { type: "string" },
                domain: { type: "string" },
                industryGuess: { type: "string" },
                departmentsCovered: { type: "array", items: { type: "string" } },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      department: { type: "string" },
                      title: { type: "string" },
                      description: { type: "string" },
                      nextStep: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                      confidence: { type: "number" },
                      impact: { type: "string", enum: ["Low", "Medium", "High"] },
                      effort: { type: "string", enum: ["Low", "Medium", "High"] },
                      fundingHints: { type: "array", items: { type: "string" } },
                      sources: { type: "array", items: { type: "string" } },
                      blueprintId: { type: "string" },
                      defaultAgents: { type: "array", items: { type: "object" } },
                      defaultDatasets: { type: "array", items: { type: "string" } },
                      defaultConnections: { type: "array", items: { type: "string" } }
                    },
                    required: ["department", "title", "description", "nextStep", "tags", "confidence", "impact", "effort"]
                  }
                }
              },
              required: ["company", "domain", "departmentsCovered", "items"]
            };

            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `Analyze this company:\n\nDomain: ${normalizedDomain}\n\nPages:\n${context}` },
                ],
                tools: [{
                  type: "function",
                  function: {
                    name: "generate_recommendations",
                    description: "Generate AI initiative recommendations for a company",
                    parameters: recommendationSchema
                  }
                }],
                tool_choice: { type: "function", function: { name: "generate_recommendations" } }
              }),
            });

            if (!aiResponse.ok) {
              const errorText = await aiResponse.text();
              console.error('[SSE] AI error:', aiResponse.status, errorText);
              sendEvent('error', {
                message: aiResponse.status === 429 ? 'Rate limit exceeded' : 'AI generation failed',
                captureResults,
              });
              
              // Wait for error event to be delivered before closing
              await new Promise(resolve => setTimeout(resolve, 200));
              controller.close();
              return;
            }

            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            
            if (!toolCall?.function?.arguments) {
              sendEvent('error', {
                message: 'AI returned no recommendations',
                captureResults,
              });
              
              // Wait for error event to be delivered before closing
              await new Promise(resolve => setTimeout(resolve, 200));
              controller.close();
              return;
            }

            const recommendations = JSON.parse(toolCall.function.arguments);
            
            // Wire up Canadian funding matches for each recommendation
            const { matchCanadianFunding } = await import('./canadianFunding.ts');
            const itemsWithFunding = recommendations.items.map((item: any) => {
              const fundingMatches = matchCanadianFunding({
                industry: recommendations.industryGuess || '',
                department: item.department,
                tags: item.tags || [],
              });
              return {
                ...item,
                fundingMatches,
              };
            });
            
            sendEvent('complete', {
              status: 'ok',
              domain: normalizedDomain,
              company: recommendations.company,
              industryGuess: recommendations.industryGuess,
              departmentsCovered: recommendations.departmentsCovered,
              items: itemsWithFunding,
              captureResults,
              telemetry: {
                force_ingest_pages_found: captureResults.filter(r => r.status !== 'failed').length,
                context_chars: context.length,
                gemini_ok: true,
                returned_items_count: itemsWithFunding.length,
              }
            });
            
            
          } catch (error: any) {
            sendEvent('error', {
              message: error?.message || 'An unexpected error occurred',
            });
            
            // Wait for error event to be delivered before closing
            await new Promise(resolve => setTimeout(resolve, 200));
          } finally {
            controller.close();
          }
        },
      });
      
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Check for cached recommendations (skip if force=true)
    if (!force) {
      const { data: cachedReco } = await supabase
        .from('recommendations')
        .select('*')
        .eq('site_id', site.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedReco?.payload) {
        console.log('[Recommendations] Using cached result');
        return new Response(JSON.stringify(normalizeResponse(cachedReco.payload, normalizedDomain)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch pages for context - accept any content including thin pages
    // Add a small delay to ensure DB writes are committed
    if (forceIngest) {
      console.log('[SSE] Waiting for DB writes to commit...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Query pages from database with retry mechanism for forceIngest mode
    let pages = null;
    let pagesError = null;
    
    if (forceIngest) {
      // Retry mechanism to wait for DB writes to be visible after turbo-capture
      console.log(`[Recommendations] === QUERY DIAGNOSTICS ===`);
      console.log(`[Recommendations] Site ID: ${site.id}, Domain: ${normalizedDomain}`);
      console.log(`[Recommendations] Waiting for pages to appear in database...`);
      
      let retries = 0;
      const maxRetries = 8; // Increased from 5 to 8 for better reliability
      
      while (retries < maxRetries && (!pages || pages.length === 0)) {
        if (retries > 0) {
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000); // 1s, 2s, 4s, 5s...
          console.log(`[Recommendations] Retry ${retries}/${maxRetries}: waiting ${delay}ms before querying pages...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const { data: queryPages, error: queryError } = await supabase
          .from('site_pages')
          .select('url, content_text, word_count, id')
          .eq('site_id', site.id)
          .gt('word_count', 0)
          .order('word_count', { ascending: false })
          .limit(50);
        
        console.log(`[Recommendations] Attempt ${retries + 1}/${maxRetries}: Query returned ${queryPages?.length || 0} pages for site_id ${site.id}`);
        if (queryError) {
          console.error(`[Recommendations] Query error:`, queryError);
        }
        if (queryPages && queryPages.length > 0) {
          console.log(`[Recommendations] Sample page: ${JSON.stringify({ 
            id: queryPages[0].id, 
            url: queryPages[0].url, 
            wordCount: queryPages[0].word_count,
            textLen: queryPages[0].content_text?.length || 0,
          })}`);
        }
        
        pages = queryPages;
        pagesError = queryError;
        retries++;
      }
      
      console.log(`[Recommendations] Final result after ${retries} attempts: ${pages?.length || 0} pages found`);
    } else {
      // Normal mode - single query
      console.log(`[Recommendations] === QUERY DIAGNOSTICS (Normal Mode) ===`);
      console.log(`[Recommendations] Site ID: ${site.id}, Domain: ${normalizedDomain}`);
      
      const { data: queryPages, error: queryError } = await supabase
        .from('site_pages')
        .select('url, content_text, word_count, id')
        .eq('site_id', site.id)
        .gt('word_count', 0)
        .order('word_count', { ascending: false })
        .limit(50);
      
      pages = queryPages;
      pagesError = queryError;
      
      console.log(`[Recommendations] Query returned ${pages?.length || 0} pages for site_id ${site.id}`);
      if (queryError) {
        console.error(`[Recommendations] Query error:`, queryError);
      }
      if (pages && pages.length > 0) {
        console.log(`[Recommendations] Sample pages: ${JSON.stringify(pages.slice(0, 3).map(p => ({ 
          id: p.id, 
          url: p.url, 
          wordCount: p.word_count,
          textLen: p.content_text?.length || 0 
        })))}`);
      }
    }

    const pagesFound = pages?.length || 0;

    if (!pages || pages.length === 0) {
      console.error('[Recommendations] No pages found. ForceIngest:', forceIngest, 'CaptureResults:', JSON.stringify(captureResults.slice(0, 3)));
      return new Response(JSON.stringify(normalizeResponse({
        status: 'empty',
        message: forceIngest 
          ? `Pages were captured but could not be retrieved from database after retries. ${captureResults.filter(r => r.status !== 'failed').length} pages captured successfully. This may be a temporary database issue - please wait a moment and try again.`
          : 'No text content stored for this domain. Try Force Ingest (Stealth) to bypass content restrictions.',
        captureResults: forceIngest ? captureResults : undefined,
        telemetry: {
          crawl_pages_found: forceIngest ? 0 : pagesFound,
          force_ingest_pages_found: forceIngest ? captureResults.filter(r => r.status !== 'failed').length : 0,
          context_chars: 0,
          gemini_ok: false,
          gemini_error: forceIngest ? 'Database query returned no results after successful captures and retries' : undefined,
          returned_items_count: 0,
        },
      }, normalizedDomain)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // Prioritize key pages
    const keywordPriority = ['/about', '/products', '/solutions', '/pricing', '/careers', '/docs', '/api', '/support', '/help', '/privacy', '/security'];
    const sortedPages = pages.sort((a, b) => {
      const aScore = keywordPriority.findIndex(kw => a.url.toLowerCase().includes(kw));
      const bScore = keywordPriority.findIndex(kw => b.url.toLowerCase().includes(kw));
      if (aScore !== -1 && bScore !== -1) return aScore - bScore;
      if (aScore !== -1) return -1;
      if (bScore !== -1) return 1;
      return (b.word_count || 0) - (a.word_count || 0);
    });

    // Build context (limit to ~120k chars)
    let context = '';
    const usedUrls: string[] = [];
    for (const page of sortedPages) {
      if (context.length > 120000) break;
      context += `\n\n=== ${page.url} ===\n${page.content_text}\n`;
      usedUrls.push(page.url);
    }

    const contextChars = context.length;
    console.log(`[Recommendations] Built context: ${contextChars} chars from ${usedUrls.length} pages`);

    // ========================================
    // INDUSTRY & DEPARTMENT CLASSIFICATION
    // ========================================
    
    // Simple industry classification helper
    const classifyIndustry = (domain: string, content: string): string => {
      const d = domain.toLowerCase();
      const c = content.toLowerCase();
      
      // Enterprise retail
      if (d.includes('walmart') || d.includes('target') || d.includes('costco') || d.includes('kroger') || d.includes('best buy') || d.includes('homedepot') || d.includes('lowes')) {
        return 'Enterprise Retail';
      }
      
      // Other industries - simplified for now, can be expanded
      if (c.includes('pharmaceutical') || c.includes('clinical trial') || c.includes('gxp')) {
        return 'Pharmaceuticals & Life Sciences';
      }
      if (c.includes('banking') || c.includes('financial services') || c.includes('credit')) {
        return 'Financial Services / Banking';
      }
      if (c.includes('manufacturing') && c.includes('automotive')) {
        return 'Manufacturing – Automotive';
      }
      if (c.includes('manufacturing') && (c.includes('industrial') || c.includes('machinery'))) {
        return 'Manufacturing – Industrial';
      }
      if (c.includes('logistics') || c.includes('3pl') || c.includes('freight')) {
        return 'Logistics / Supply Chain / 3PL';
      }
      if (c.includes('hospital') || c.includes('healthcare') || c.includes('patient care')) {
        return 'Healthcare / Hospitals';
      }
      if (c.includes('energy') || c.includes('utilities') || c.includes('power generation')) {
        return 'Energy / Utilities';
      }
      if (c.includes('saas') || c.includes('enterprise software') || d.includes('sap') || d.includes('oracle') || d.includes('salesforce')) {
        return 'Software / Enterprise SaaS';
      }
      
      return 'Software / Enterprise SaaS'; // Default
    };
    
    const industryClassification = classifyIndustry(normalizedDomain, context);
    
    console.log(`[Classification] Pre-classified Industry: ${industryClassification}`);

    // Call Lovable AI with Gemini - Digital Twin Blueprint Generator
    const systemPrompt = `You are an ELITE Digital Twin Blueprint Generator for M2M Agentic Studio.

🎯 YOUR MISSION
Analyze the company and generate ONLY Digital Twin Blueprints that:
1. Mirror REAL operational processes (not generic AI initiatives)
2. Match the company's industry: ${industryClassification}
3. Map to enterprise departments: Supply Chain, Operations, Procurement, Finance, HR/Workforce, IT/Engineering, Compliance/Risk, Customer Service, Sales, Marketing, Manufacturing/Production, Logistics/Fleet
4. Include data sources, event triggers, human-in-loop, KPIs, and integrations
5. Deliver measurable operational impact

🚫 ABSOLUTE PROHIBITIONS
NEVER generate:
- Generic "AI upskilling programs" without operational tie-in
- "AI innovation workshops" or "AI strategy sessions"
- Generic "customer personalization" for B2B or enterprise retail companies
- "Marketing automation" for industries where it's not core (manufacturing, logistics, pharma)
- Ideas that don't mirror a real operational process

🎯 DIGITAL TWIN BLUEPRINT REQUIREMENTS
Every recommendation MUST be structured as a Digital Twin Blueprint:

**Title Format:**
"Develop a Digital Twin for [Operational Area]" or "Deploy a [Function] Digital Twin for [Company Type]"

Examples:
- "Develop a Digital Twin for Multi-Echelon Supply Chain & Inventory Planning"
- "Deploy a Store Operations & Workforce Digital Twin for High-Volume Locations"
- "Build a GxP Compliance & Validation Digital Twin for Pharmaceutical Manufacturing"
- "Create a Credit Risk Decisioning Digital Twin for Banking Operations"

**Description Must Include:**
1. PROCESS MIRRORED: What real-world operational process is being replicated? (e.g., DC routing, surgical scheduling, freight matching)
2. DATA SOURCES: What systems feed this twin? (POS, WMS, TMS, ERP, HRIS, EHR, SCADA, MES, CRM, IoT sensors)
3. EVENT TRIGGERS: What events activate this twin? (low-stock alert, forecast run, patient admission, freight booking, shift start)
4. HUMAN-IN-LOOP: Where do humans approve, review, or intervene? (planner approval, manager override, QA review, dispatcher assignment)
5. KPIs & IMPACT: What metrics improve? (2-4% stockout reduction, 15% faster processing, 20% cost savings, 3-5% efficiency gain)
6. COMPANY FIT: WHY this specific blueprint fits THIS company's industry, scale, and operations

**Required Fields:**
- department: One of [Supply Chain, Operations, Procurement, Finance, HR / People / Workforce, IT / Engineering, Compliance / Risk, Customer Service, Sales, Marketing, Manufacturing / Production, Logistics / Fleet]
- tags: Choose from ["Supply Chain & Inventory", "Store Operations & Workforce", "Logistics & Last Mile", "Risk & Loss Prevention", "ESG & Sustainability", "Funding Eligible", "Agentic AI", "GxP Compliance", "Clinical Operations", "Manufacturing Excellence"]
- defaultDatasets: Specific data sources (e.g., "POS transaction data", "WMS inventory levels", "EHR patient records", "SCADA sensor feeds")
- defaultConnections: Integration points (e.g., "SAP ERP", "Manhattan WMS", "Epic EHR", "Siemens SCADA", "Oracle TMS")

🎯 INDUSTRY-SPECIFIC GUIDELINES

**Enterprise Retail (Walmart, Target, Costco):**
✅ ONLY: Supply chain twins, warehouse automation, store workforce, logistics, loss prevention, forecasting
❌ NEVER: Customer personalization, merchandising, marketing campaigns, loyalty programs

**Pharmaceuticals & Life Sciences:**
✅ ONLY: GxP compliance, clinical trials, manufacturing validation, regulatory tracking, supply chain
❌ NEVER: Consumer marketing, generic upskilling

**Financial Services / Banking:**
✅ ONLY: Credit risk, fraud detection, compliance, underwriting, trading operations
❌ NEVER: Consumer CX personalization, retail marketing

**Manufacturing (Automotive/Industrial/Consumer Goods):**
✅ ONLY: Production optimization, predictive maintenance, quality control, supply chain, safety
❌ NEVER: B2C marketing, consumer personalization

**Logistics / 3PL:**
✅ ONLY: Fleet management, route optimization, warehouse automation, freight matching
❌ NEVER: Consumer marketing, B2C personalization

**Healthcare / Hospitals:**
✅ ONLY: Patient flow, staffing, surgical scheduling, bed management, clinical workflows
❌ NEVER: Consumer marketing, generic automation

**Software / SaaS:**
✅ ONLY: Engineering velocity, customer success operations, sales operations, support automation
❌ NEVER: Generic HR training without tie-in

🎯 OUTPUT SCHEMA
Generate 5-10 Digital Twin Blueprints that match the company's industry and operational focus.

Return STRICT JSON:
{
  "company": "string",
  "domain": "string",
  "industryGuess": "${industryClassification}",
  "departmentsCovered": ["string"],
  "items": [{
    "department": "string (from allowed list)",
    "title": "string (Digital Twin format)",
    "description": "string (100-150 words with process, data, events, human-in-loop, KPIs, company fit)",
    "nextStep": "string (specific 2-week action with roles mentioned)",
    "tags": ["string"],
    "confidence": 0.0-1.0,
    "impact": "Low|Medium|High",
    "effort": "Low|Medium|High",
    "fundingHints": ["string"],
    "sources": ["url"],
    "blueprintId": "string (slug)",
    "defaultAgents": [{"name": "string", "role": "string", "systemPrompt": "string", "capabilities": ["string"]}],
    "defaultDatasets": ["string (specific)"],
    "defaultConnections": ["string (specific systems)"]
  }]
}

🎯 QUALITY CHECKS
Before returning, verify EACH recommendation:
✓ Explicitly mentions "Digital Twin" or describes an operational process mirror
✓ Lists specific data sources (not generic "transaction data")
✓ Names event triggers (not vague "when needed")
✓ Defines human-in-loop points (not missing)
✓ States measurable KPIs with numbers or percentages
✓ Explains why this fits THIS company
✓ Maps to the correct department
✓ Is NOT a generic AI initiative

If a recommendation fails any check → REMOVE IT`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use tool calling for guaranteed structured output
    const recommendationSchema = {
      type: "object",
      properties: {
        company: { type: "string" },
        domain: { type: "string" },
        industryGuess: { type: "string" },
        departmentsCovered: { type: "array", items: { type: "string" } },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              department: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              nextStep: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              confidence: { type: "number" },
              impact: { type: "string", enum: ["Low", "Medium", "High"] },
              effort: { type: "string", enum: ["Low", "Medium", "High"] },
              fundingHints: { type: "array", items: { type: "string" } },
              sources: { type: "array", items: { type: "string" } },
              blueprintId: { type: "string" },
              defaultAgents: { type: "array", items: { type: "object" } },
              defaultDatasets: { type: "array", items: { type: "string" } },
              defaultConnections: { type: "array", items: { type: "string" } }
            },
            required: ["department", "title", "description", "nextStep", "tags", "confidence", "impact", "effort"]
          }
        }
      },
      required: ["company", "domain", "departmentsCovered", "items"]
    };

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this company:\n\nDomain: ${normalizedDomain}\n\nPages:\n${context}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_recommendations",
            description: "Generate AI initiative recommendations for a company",
            parameters: recommendationSchema
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Recommendations] AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify(normalizeResponse({
          status: 'error',
          message: 'Rate limit exceeded. Please try again in a few moments.',
        }, normalizedDomain)), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify(normalizeResponse({
          status: 'error',
          message: 'AI credits exhausted. Please contact support.',
        }, normalizedDomain)), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }
      
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let result;
    let geminiOk = false;
    let geminiError: string | undefined;
    
    try {
      // Extract from tool call response
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        result = JSON.parse(toolCall.function.arguments);
        geminiOk = true;
        console.log('[Recommendations] Successfully extracted structured response from tool call');
      } else {
        // Fallback to content parsing
        result = JSON.parse(aiData.choices[0].message.content);
        geminiOk = true;
        console.log('[Recommendations] Fallback: parsed response from message content');
      }
    } catch (parseError: any) {
      console.error('[Recommendations] Failed to parse AI response:', parseError);
      geminiError = parseError?.message;
      
      return new Response(JSON.stringify(normalizeResponse({
        status: 'error',
        message: 'AI returned invalid response format. Please try again.',
        telemetry: {
          crawl_pages_found: forceIngest ? 0 : pagesFound,
          force_ingest_pages_found: forceIngest ? captureResults.filter(r => r.status === 'success').length : 0,
          context_chars: contextChars,
          gemini_ok: false,
          gemini_error: geminiError,
          returned_items_count: 0,
        },
      }, normalizedDomain)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // Validate and normalize result
    const itemsCount = result.items?.length || 0;
    console.log(`[Recommendations] AI returned ${itemsCount} recommendations`);
    
    if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
      return new Response(JSON.stringify(normalizeResponse({
        status: 'empty',
        message: 'AI could not generate recommendations from this content. The site may need more detailed information about products/services.',
        company: result.company,
        industryGuess: result.industryGuess,
        telemetry: {
          crawl_pages_found: forceIngest ? 0 : pagesFound,
          force_ingest_pages_found: forceIngest ? captureResults.filter(r => r.status === 'success').length : 0,
          context_chars: contextChars,
          gemini_ok: geminiOk,
          gemini_error: geminiError,
          returned_items_count: 0,
        },
      }, normalizedDomain)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // ========================================
    // ENHANCED VALIDATION WITH INDUSTRY + DEPARTMENT
    // ========================================
    
    // Get company info
    const companyName = (result.company || '').toLowerCase();
    const domainFromResult = (result.domain || normalizedDomain || '').toLowerCase();
    let industryGuess = (result.industryGuess || industryClassification || '').toLowerCase();
    
    console.log(`[Classification] Industry from AI: ${industryGuess}`);
    
    // Detect if this domain belongs to a large enterprise retailer
    const enterpriseRetailDomains = [
      'walmart.com',
      'walmart.ca',
      'target.com',
      'costco.com',
      'homedepot.com',
      'home-depot.com',
      'lowes.com',
      'lowes.ca',
      'bestbuy.com',
      'bestbuy.ca',
      'kroger.com',
    ];
    
    const isEnterpriseRetailDomain = enterpriseRetailDomains.some((d) =>
      domainFromResult.endsWith(d) || normalizedDomain.toLowerCase().endsWith(d)
    );
    
    // Industry classification override for enterprise retail
    if (isEnterpriseRetailDomain) {
      industryGuess = 'enterprise retail + global supply chain';
      result.industryGuess = 'Enterprise Retail + Global Supply Chain';
    }
    
    // Detect if this is an enterprise retailer (Walmart, Target, Costco, etc.)
    const isEnterpriseRetail = (
      isEnterpriseRetailDomain ||
      companyName.includes('walmart') ||
      companyName.includes('target') ||
      companyName.includes('costco') ||
      companyName.includes('kroger') ||
      companyName.includes('amazon') ||
      companyName.includes('best buy') ||
      companyName.includes('home depot') ||
      companyName.includes('lowe') ||
      industryGuess.includes('enterprise retail') ||
      (industryGuess.includes('retail') && industryGuess.includes('supply chain')) ||
      (industryGuess.includes('e-commerce') && industryGuess.includes('global')) ||
      (industryGuess.includes('marketplace') && industryGuess.includes('logistics'))
    );
    
    console.log(`[Classification] isEnterpriseRetail: ${isEnterpriseRetail}, company: ${companyName}, industry: ${industryGuess}`);
    
    const bannedTermsGeneral = [
      // B2C/Consumer terms that should never appear for B2B
      'shopping', 'shopper', 'loyalty program',
      'consumer segmentation', 'd2c marketing', 'brand loyalty',
      'checkout', 'cart', 'purchase journey',
      'promotions', 'offers'
    ];
    
    // Additional banned terms specifically for enterprise retailers
    // These companies are OPERATIONS-first, not consumer marketing-first
    const bannedTermsEnterpriseRetail = [
      // CRITICAL: Block any form of "personalization"
      'personalization', 'personalize', 'personalized',
      'customer personalization', 'personalized product',
      'ai-powered personalization', 'predictive personalization',
      
      // Block "customer experience" variations
      'enhance customer', 'customer experience', 'customer journey',
      'customer experience journey', 'journey mapping',
      'improve customer', 'optimize customer',
      
      // Block merchandising (B2C marketing term)
      'merchandising', 'predictive merchandising',
      
      // Block loyalty and promotions
      'loyalty program', 'loyalty optimization',
      'promotion optimization', 'promotional optimization',
      
      // Block other B2C terms
      'personalized recommendations', 'personalized shopping',
      'shopping experience', 'customer engagement', 
      'personalization engine', 'consumer experience',
      'online shopper', 'store associate',
      'shopping behavior', 'in-store experience',
      'consumer marketing', 'retail marketing',
      
      // Block marketing automation
      'marketing campaign', 'marketing automation',
      'customer segmentation', 'behavioral targeting'
    ];
    
    const bannedTerms = isEnterpriseRetail 
      ? [...bannedTermsGeneral, ...bannedTermsEnterpriseRetail]
      : bannedTermsGeneral;
    
    console.log(`[Filter] Using ${bannedTerms.length} banned terms (enterprise retail: ${isEnterpriseRetail})`);
    
    const filteredItems = result.items.filter((item: any) => {
      const textToCheck = `${item.title} ${item.description}`.toLowerCase();
      
      // Check for banned terms
      for (const term of bannedTerms) {
        if (textToCheck.includes(term)) {
          console.log(`[Filter] BLOCKED recommendation "${item.title}" - contains banned term: "${term}"`);
          return false; // Block this recommendation
        }
      }
      
      return true; // Keep this recommendation
    });
    
    console.log(`[Filter] Blocked ${result.items.length - filteredItems.length} irrelevant recommendations`);
    console.log(`[Filter] Kept ${filteredItems.length} relevant recommendations for scoring`);
    
    // ========================================
    // INDUSTRY MATCHING & SCORING
    // ========================================
    
    // Detect enterprise B2B companies (but exclude marketplace/platform companies)
    const isMarketplacePlatform = 
      companyName.includes('uber') ||
      companyName.includes('lyft') ||
      companyName.includes('airbnb') ||
      companyName.includes('doordash') ||
      industryGuess.includes('marketplace') ||
      industryGuess.includes('ride-sharing') ||
      industryGuess.includes('gig economy');
    
    const isEnterpriseB2B = 
      !isMarketplacePlatform && (
        industryGuess.includes('b2b') || 
        industryGuess.includes('enterprise') ||
        (industryGuess.includes('software') && (industryGuess.includes('enterprise') || companyName.includes('sap') || companyName.includes('oracle') || companyName.includes('salesforce')))
      );
    
    console.log(`[Industry] Detected: ${result.industryGuess}, Enterprise B2B: ${isEnterpriseB2B}`);
    
    const scoredItems = filteredItems.map((item: any, idx: number) => {
      const description = (item.description || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const textContent = `${title} ${description}`;
      
      // ========================================
      // Retail-specific fit scores (for enterprise retail only)
      // ========================================
      let operationsFitScore = 0;
      let supplyChainFitScore = 0;
      let workforceFitScore = 0;
      let logisticsFitScore = 0;
      let enterpriseScaleFitScore = 0;
      let consumerMarketingFitScore = 0;
      let personalizationFitScore = 0;
      
      // ========================================
      // SCORE 1: Enterprise Fit Score (0-100)
      // ========================================
      let enterpriseFitScore = 50; // Baseline
      
      if (isEnterpriseB2B) {
        // BOOST for enterprise-appropriate terms
        const enterpriseKeywords = [
          'procurement', 'spend', 'supplier', 'erp', 'supply chain',
          'finance', 'compliance', 'esg', 'sustainability', 'risk management',
          'partner ecosystem', 'developer', 'cloud cost', 'devops',
          'workforce planning', 'enterprise resource', 'vendor management'
        ];
        
        const enterpriseMatches = enterpriseKeywords.filter(kw => textContent.includes(kw)).length;
        enterpriseFitScore += enterpriseMatches * 10; // +10 per match
        
        // PENALTY for consumer/retail terms that slipped through
        const consumerKeywords = ['customer experience', 'personalization', 'marketing automation'];
        const consumerMatches = consumerKeywords.filter(kw => textContent.includes(kw)).length;
        enterpriseFitScore -= consumerMatches * 30; // -30 per match
      }
      
      // Enterprise Retail Scoring (Walmart, Target, etc.)
      if (isEnterpriseRetail) {
        const normalizeScore = (count: number) => Math.max(0, Math.min(100, count * 25));

        const operationsKeywords = [
          'in-store operations', 'store operations', 'task automation', 'task orchestration',
          'workforce automation', 'labor planning', 'shift scheduling', 'scheduling',
          'task management', 'checkout', 'self-checkout', 'robotics', 'robot', 'shelf scanning'
        ];
        const supplyChainKeywords = [
          'supply chain', 'inventory', 'sku', 'replenishment', 'distribution center',
          'dc', 'warehouse', 'fulfillment center', 'stockout', 'out-of-stock', 'safety stock'
        ];
        const workforceKeywords = [
          'workforce', 'associates', 'employees', 'staff scheduling', 'labor optimization'
        ];
        const logisticsKeywords = [
          'logistics', 'last-mile', 'delivery', 'route', 'routing', 'fleet', 'transportation', 'dispatch'
        ];
        const enterpriseScaleKeywords = [
          'global', 'multi-store', 'nationwide', 'enterprise scale', 'large-scale', 'at scale'
        ];
        const consumerMarketingKeywords = [
          'marketing', 'campaign', 'promotion', 'promotional', 'loyalty', 'brand marketing'
        ];
        const personalizationKeywords = [
          'personalization', 'personalized', 'personalise', 'recommender', 'product recommendations',
          'customer personalization', 'predictive merchandising'
        ];

        const countMatches = (keywords: string[]) =>
          keywords.filter((kw) => textContent.includes(kw)).length;

        operationsFitScore = normalizeScore(countMatches(operationsKeywords));
        supplyChainFitScore = normalizeScore(countMatches(supplyChainKeywords));
        workforceFitScore = normalizeScore(countMatches(workforceKeywords));
        logisticsFitScore = normalizeScore(countMatches(logisticsKeywords));
        enterpriseScaleFitScore = normalizeScore(countMatches(enterpriseScaleKeywords));
        consumerMarketingFitScore = normalizeScore(countMatches(consumerMarketingKeywords));
        personalizationFitScore = normalizeScore(countMatches(personalizationKeywords));

        // Re-use these signals to further nudge enterpriseFitScore up for strong ops/supply-chain coverage
        const retailOpsSignals = [
          'supply chain', 'inventory', 'warehouse', 'distribution center',
          'logistics', 'last-mile', 'delivery', 'routing', 'forecasting',
          'replenishment', 'shrinkage', 'loss prevention', 'workforce',
          'in-store operations', 'task automation', 'robotics', 'fulfillment',
          'fleet', 'transportation', 'demand planning', 'sku'
        ];

        let retailOpsCount = 0;
        retailOpsSignals.forEach((kw) => {
          if (textContent.includes(kw)) {
            enterpriseFitScore += 8;
            retailOpsCount++;
          }
        });

        // EXTREMELY HEAVY penalty for B2C personalization/merchandising in retail context
        const retailB2CPenalties = [
          'personalization', 'personalize', 'personalized',
          'customer personalization', 'personalized product', 
          'enhance customer', 'customer journey', 'shopping experience',
          'personalization engine', 'consumer experience',
          'merchandising', 'predictive merchandising',
          'customer experience', 'improve customer'
        ];
        
        let penaltyCount = 0;
        retailB2CPenalties.forEach((kw) => {
          if (textContent.includes(kw)) {
            enterpriseFitScore -= 80; // Massive penalty per term
            penaltyCount++;
          }
        });
        
        if (idx < 5) {
          console.log(
            `[Scoring] Retail ops matches for "${item.title}": ops=${operationsFitScore}, supply=${supplyChainFitScore}, workforce=${workforceFitScore}, logistics=${logisticsFitScore}, scale=${enterpriseScaleFitScore}, personalizationHits=${penaltyCount}`
          );
        }
      }
      
      enterpriseFitScore = Math.max(0, Math.min(100, enterpriseFitScore));
      
      // ========================================
      // SCORE 2: Industry Match Score (0-100)
      // ========================================
      let industryMatchScore = 60; // Baseline
      
      // Define valid industries per category
      const enterpriseIndustries = [
        'enterprise software', 'supply chain', 'erp', 'finance',
        'procurement', 'manufacturing', 'hr', 'workforce', 
        'sustainability', 'esg', 'developer ecosystem'
      ];
      
      if (isEnterpriseB2B) {
        // Check if recommendation aligns with valid enterprise industries
        const industryMatches = enterpriseIndustries.filter(ind => 
          textContent.includes(ind) || item.department === 'Finance' || item.department === 'Operations'
        ).length;
        
        industryMatchScore += industryMatches * 15; // +15 per match
        
        // Penalty if department doesn't fit enterprise B2B
        if (item.department === 'Marketing' && textContent.includes('consumer')) {
          industryMatchScore -= 40;
        }
      }
      
      // Enterprise Retail Industry Matching
      if (isEnterpriseRetail) {
        const validRetailIndustries = [
          'supply chain', 'logistics', 'distribution', 'warehouse',
          'inventory management', 'forecasting', 'operations',
          'workforce', 'last-mile', 'fulfillment', 'loss prevention',
          'transportation', 'fleet', 'demand planning'
        ];
        
        let matchCount = 0;
        validRetailIndustries.forEach(ind => {
          if (textContent.includes(ind) || (item.department === 'Operations' && textContent.includes('automation'))) {
            industryMatchScore += 15;
            matchCount++;
          }
        });
        
        // HEAVY penalty for B2C-focused recommendations
        if (item.department === 'Marketing' || 
            textContent.includes('customer experience') ||
            textContent.includes('personalization') ||
            textContent.includes('enhance customer')) {
          industryMatchScore -= 60;
        }
        
        if (idx < 5) {
          console.log(`[Scoring] Retail industry matches for "${item.title}": ${matchCount}`);
        }
      }
      
      industryMatchScore = Math.max(0, Math.min(100, industryMatchScore));
      
      // ========================================
      // SCORE 3: Digital Twin Relevance (0-100)
      // ========================================
      const dtKeywords = [
        'process', 'workflow', 'automation', 'intake', 'triage',
        'event', 'trigger', 'pipeline', 'orchestration', 'twin',
        'digital twin', 'agent', 'agentic', 'operational'
      ];
      
      const dtMatches = dtKeywords.filter(kw => textContent.includes(kw)).length;
      const digitalTwinRelevance = Math.min(100, 50 + (dtMatches * 8)); // Start at 50, +8 per keyword
      
      // ========================================
      // COMBINED SCORING
      // ========================================
      
      // Base scores from AI (used for non-retail and as tie-breakers)
      const confidenceScore = (item.confidence || 0.5) * 0.15; // 15% weight
      const impactMap: Record<string, number> = { High: 0.20, Medium: 0.12, Low: 0.05 };
      const impactScore = impactMap[item.impact] || 0.10;
      const effortMap: Record<string, number> = { High: -0.08, Medium: -0.04, Low: 0 };
      const effortPenalty = effortMap[item.effort] || 0;
      
      let relevanceScore: number;
      
      if (isEnterpriseRetail) {
        // Retail-specific ranking: operations + supply chain + workforce + logistics + scale
        const operationsWeight = (operationsFitScore / 100) * 0.40;
        const supplyChainWeight = (supplyChainFitScore / 100) * 0.30;
        const workforceWeight = (workforceFitScore / 100) * 0.15;
        const logisticsWeight = (logisticsFitScore / 100) * 0.10;
        const enterpriseScaleWeight = (enterpriseScaleFitScore / 100) * 0.05;
        
        // consumerMarketingFit contributes 0% (per spec), personalizationFit is a strong negative penalty
        const personalizationPenalty = personalizationFitScore > 0 ? -1.0 : 0;
        
        relevanceScore = Math.min(1.0, Math.max(0,
          operationsWeight +
          supplyChainWeight +
          workforceWeight +
          logisticsWeight +
          enterpriseScaleWeight +
          (digitalTwinRelevance / 100) * 0.10 + // small bonus for strong digital-twin structure
          personalizationPenalty
        ));
      } else {
        // Default multi-factor scoring (B2B, non-retail, etc.)
        const enterpriseFitWeight = (enterpriseFitScore / 100) * 0.25; // 25% weight
        const industryMatchWeight = (industryMatchScore / 100) * 0.25; // 25% weight
        const dtRelevanceWeight = (digitalTwinRelevance / 100) * 0.15; // 15% weight
        
        // Funding & tags bonuses
        const fundingBonus = (item.fundingHints && item.fundingHints.length > 0) ? 0.05 : 0;
        const agenticBonus = item.tags?.includes('Agentic AI') ? 0.03 : 0;
        const edgeBonus = item.tags?.includes('Edge AI') ? 0.02 : 0;
        
        relevanceScore = Math.min(1.0, Math.max(0,
          confidenceScore + 
          impactScore + 
          effortPenalty + 
          enterpriseFitWeight + 
          industryMatchWeight + 
          dtRelevanceWeight + 
          fundingBonus + 
          agenticBonus + 
          edgeBonus
        ));
      }
      
      // Log scoring details for top items
      if (idx < 5) {
        console.log(`[Scoring] "${item.title}": EnterpriseFit=${enterpriseFitScore}, IndustryMatch=${industryMatchScore}, DTRelevance=${digitalTwinRelevance}, FinalScore=${Math.round(relevanceScore * 100)}`);
      }
      
      return {
        ...item,
        id: `${site.id}-${item.department}-${idx}`,
        sources: usedUrls,
        relevanceScore: Math.round(relevanceScore * 100) / 100,
        _debug: {
          enterpriseFitScore,
          industryMatchScore,
          digitalTwinRelevance,
          operationsFitScore,
          supplyChainFitScore,
          workforceFitScore,
          logisticsFitScore,
          enterpriseScaleFitScore,
          consumerMarketingFitScore,
          personalizationFitScore,
        },
      };
    });
    
    // ========================================
    // STRICT FILTERING - Apply minimum score thresholds
    // ========================================
    
    const strictFiltered = scoredItems.filter((item: any) => {
      // For enterprise B2B companies, enforce strict thresholds (lowered from 70 to 60 for better coverage)
      if (isEnterpriseB2B) {
        const passesEnterpriseThreshold = item._debug.enterpriseFitScore >= 60; // Must be >= 60
        const passesIndustryThreshold = item._debug.industryMatchScore >= 60; // Must be >= 60
        const passesDTThreshold = item._debug.digitalTwinRelevance >= 60; // Must be >= 60
        
        if (!passesEnterpriseThreshold) {
          console.log(`[Strict Filter] BLOCKED "${item.title}" - Enterprise Fit Score too low: ${item._debug.enterpriseFitScore}`);
          return false;
        }
        if (!passesIndustryThreshold) {
          console.log(`[Strict Filter] BLOCKED "${item.title}" - Industry Match Score too low: ${item._debug.industryMatchScore}`);
          return false;
        }
        if (!passesDTThreshold) {
          console.log(`[Strict Filter] BLOCKED "${item.title}" - Digital Twin Relevance too low: ${item._debug.digitalTwinRelevance}`);
          return false;
        }
      }
      
      // For Enterprise Retail, enforce even STRICTER thresholds on operations
      if (isEnterpriseRetail) {
        const dbg = item._debug || {};
        const isOperationalRetailTwin =
          (dbg.operationsFitScore > 0 ||
           dbg.supplyChainFitScore > 0 ||
           dbg.workforceFitScore > 0 ||
           dbg.logisticsFitScore > 0) &&
          (dbg.personalizationFitScore ?? 0) <= 0 &&
          (dbg.consumerMarketingFitScore ?? 0) <= 0;
        
        if (!isOperationalRetailTwin) {
          console.log(
            `[Strict Filter] BLOCKED "${item.title}" - Not an operational enterprise retail twin (missing supply chain/ops/workforce/logistics focus or contains personalization/marketing).`,
            dbg,
          );
          return false;
        }
        
        const passesEnterpriseThreshold = dbg.enterpriseFitScore >= 75; // Must be >= 75
        const passesIndustryThreshold = dbg.industryMatchScore >= 75; // Must be >= 75
        const passesDTThreshold = dbg.digitalTwinRelevance >= 70; // Must be >= 70
        
        if (!passesEnterpriseThreshold) {
          console.log(`[Strict Filter] BLOCKED "${item.title}" - Retail Enterprise Fit Score too low: ${dbg.enterpriseFitScore}`);
          return false;
        }
        if (!passesIndustryThreshold) {
          console.log(`[Strict Filter] BLOCKED "${item.title}" - Retail Industry Match Score too low: ${dbg.industryMatchScore}`);
          return false;
        }
        if (!passesDTThreshold) {
          console.log(`[Strict Filter] BLOCKED "${item.title}" - Retail Digital Twin Relevance too low: ${dbg.digitalTwinRelevance}`);
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`[Strict Filter] Blocked ${scoredItems.length - strictFiltered.length} low-scoring recommendations`);
    console.log(`[Strict Filter] ${strictFiltered.length} recommendations passed all thresholds`);
    
    // ========================================
    // FALLBACK: If all recommendations were blocked, return top 3 with warning
    // ========================================
    let finalItems = strictFiltered;
    let hasLowQualityWarning = false;
    
    if (strictFiltered.length === 0 && scoredItems.length > 0) {
      console.log(`[Strict Filter] All recommendations blocked - using fallback mode`);
      // Return top 3 by relevance score even though they didn't meet thresholds
      finalItems = scoredItems.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore).slice(0, 3);
      hasLowQualityWarning = true;
    }
    
    // ========================================
    // RANKING & TOP N SELECTION
    // ========================================
    
    // Sort by relevance score (descending)
    const rankedItems = finalItems.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    
    // Keep total count before top-N filtering
    const totalCount = rankedItems.length;
    
    // Wire up Canadian funding matches for each recommendation
    const { matchCanadianFunding } = await import('./canadianFunding.ts');
    
    const itemsWithFunding = rankedItems.slice(0, topN).map((item: any) => {
      // Remove debug info and add funding matches
      const { _debug, ...cleanItem } = item;
      const fundingMatches = matchCanadianFunding({
        industry: result.industryGuess || '',
        department: item.department,
        tags: item.tags || [],
      });
      return {
        ...cleanItem,
        fundingMatches,
      };
    });
    
    result.items = itemsWithFunding;
    result.totalCount = totalCount;
    
    // Add warning if using fallback
    if (hasLowQualityWarning) {
      result.warningMessage = "Generated recommendations with lower confidence due to limited content match. Consider using Deep Recrawl for better results.";
    }

    // Ensure arrays exist
    result.departmentsCovered = Array.isArray(result.departmentsCovered) ? result.departmentsCovered : [];

    // Update site info
    await supabase
      .from('sites')
      .update({
        company_name: result.company,
        industry_guess: result.industryGuess,
      })
      .eq('id', site.id);

    // Store recommendation
    await supabase
      .from('recommendations')
      .insert({
        site_id: site.id,
        departments_covered: result.departmentsCovered,
        payload: { ...result, status: 'ok' },
        topn: topN,
        model: 'google/gemini-2.5-flash',
      });

    const response = normalizeResponse({ 
      ...result, 
      status: 'ok',
      domain: normalizedDomain,
      captureResults: forceIngest ? captureResults : undefined,
      telemetry: {
        crawl_pages_found: forceIngest ? 0 : pagesFound,
        force_ingest_pages_found: forceIngest ? captureResults.filter(r => r.status === 'success').length : 0,
        context_chars: contextChars,
        gemini_ok: geminiOk,
        returned_items_count: itemsCount,
      },
    }, normalizedDomain);

    console.log(`[Recommendations] Success: ${itemsCount} items across ${result.departmentsCovered?.length || 0} departments`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Recommendations] Error:', error);
    return new Response(JSON.stringify(normalizeResponse({
      status: 'error',
      message: error?.message || 'An unexpected error occurred. Please try again.',
    }, domain)), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
});