import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, companyName, forceRefresh } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create hash for caching
    const siteHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(url)
    ).then(buf => 
      Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('ai_recommendations_cache')
        .select('*')
        .eq('site_hash', siteHash)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        console.log('Returning cached recommendations');
        return new Response(
          JSON.stringify({ 
            recommendations: cached.recommendations,
            cached: true,
            cached_at: cached.created_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch website content (simplified - you may want to expand this)
    let websiteContext = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const pageResponse = await fetch(url, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; M2MBot/1.0)' }
      });
      clearTimeout(timeoutId);
      
      if (!pageResponse.ok) {
        throw new Error(`HTTP ${pageResponse.status}`);
      }
      
      const html = await pageResponse.text();
      // Extract text content (basic implementation)
      websiteContext = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 8000); // Limit context size
    } catch (error) {
      console.error('Error fetching website:', error);
      // Use minimal fallback context if fetch fails
      websiteContext = `Company: ${companyName || 'Unknown'}`;
    }

    // Call Lovable AI (Gemini 2.5 Flash)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an AI strategist helping organizations identify strategic AI opportunities.
Given website content, generate exactly 3 client-facing AI initiative recommendations.

CRITICAL LANGUAGE RULES:
- Write for the CLIENT, not about M2M Tech
- Use "your organization", "your team", "your company" as the main actors
- Position M2M Tech as the enablement/delivery partner only where relevant
- Focus on what the CLIENT will achieve, not what M2M Tech will deliver
- Example: "This initiative helps your organization accelerate AI adoption with training and implementation support from M2M Tech"

Each recommendation must include:
- title: Clear, actionable title focused on client benefit (e.g., "Launch an AI Readiness Program for Your Organization")
- summary: 120-word strategic summary answering "What does this do for the client?" Position M2M Tech as delivery partner only
- nextStep: One specific actionable instruction phrased as client action (e.g., "Work with M2M Tech to design the foundational module for your organization")
- impact: Score 0-100 (business value for client)
- relevance: Score 0-100 (fit to client context)
- effort: "Low", "Medium", or "High"
- fundingEligible: boolean (eligible for grants/programs client may qualify for)
- tags: Array of relevant tags from: ["Agentic AI", "Edge AI", "Upskilling", "Adoption", "Commercialization", "MEA Spark", "MEA Gateway", "MEA Nexus", "Funding Eligible"]
- fundingPrograms: Array of programs with note "Potential funding sources your organization may qualify for" (e.g., ["Scale AI", "NGen", "IRAP"])

Focus on initiatives that:
1. Create clear value for the client's business
2. Are fundable through government/institutional programs the client can access
3. Align with client's MEA maturity level (Spark=Learning phase, Gateway=Framework adoption, Nexus=Launch readiness)
4. Balance AI adoption, workforce enablement, and revenue opportunities for the client

Return ONLY valid JSON array with 3 recommendations.`;

    const userPrompt = `Analyze this company and website content to generate top 3 AI recommendations:

Website URL: ${url}
Company: ${companyName || 'Unknown'}

Website Context:
${websiteContext}

Generate 3 strategic AI initiatives ranked by composite score (impact, relevance, funding potential, MEA alignment).`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096, // Increased to prevent truncation of recommendations
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse AI response
    let recommendations;
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonText = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }
      
      // Trim and clean the JSON text
      jsonText = jsonText.trim();
      
      // Log for debugging
      console.log('Attempting to parse JSON, first 500 chars:', jsonText.substring(0, 500));
      console.log('Last 200 chars:', jsonText.substring(Math.max(0, jsonText.length - 200)));
      
      recommendations = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response. Error:', parseError);
      console.error('Full response content (first 2000 chars):', content.substring(0, 2000));
      console.error('Response length:', content.length);
      throw new Error(`Invalid AI response format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate and ensure we have exactly 3 recommendations
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error('AI did not return valid recommendations');
    }
    
    // Validate required fields for each recommendation
    recommendations = recommendations
      .filter(rec => rec.title && rec.summary)
      .slice(0, 3);
    
    if (recommendations.length === 0) {
      throw new Error('No valid recommendations after filtering');
    }

    // Cache the results
    try {
      const { error: cacheError } = await supabase
        .from('ai_recommendations_cache')
        .insert({
          site_url: url,
          site_hash: siteHash,
          company_id: null, // Add company_id if available
          recommendations: recommendations,
          model_version: 'google/gemini-3-pro-preview',
        });

      if (cacheError) {
        console.error('Cache insert error:', cacheError);
        // Continue execution even if cache fails - don't block the response
      }
    } catch (cacheException) {
      console.error('Cache operation failed:', cacheException);
      // Don't throw - caching is non-critical
    }

    return new Response(
      JSON.stringify({ 
        recommendations,
        cached: false,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
