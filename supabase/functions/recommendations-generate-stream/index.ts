import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recommendation {
  department: string;
  recommendation: string;
  why_it_matters: string;
  steps: string[];
  confidence: number;
  citations?: Array<{ url: string; snippet: string; snippet_id?: string }>;
}

const SYSTEM_PROMPT = `You are a business analyst generating CLIENT-FACING recommendations based on website content.
Task: Generate 1-2 recommendations per department (Operations, Sales & Marketing, Finance & Administration).

CRITICAL LANGUAGE RULES:
- Write FOR the client organization, not about M2M Tech
- Use "your organization", "your team", "your operations" as main actors
- Position M2M Tech as delivery partner only where relevant
- Focus on client benefits and actions

Rules:
- Use ONLY evidence from the provided context.
- Each recommendation: Actionable suggestion (80 chars, client-focused), Why it matters (150 chars, client benefit), 3-5 implementation steps (client actions with M2M Tech support where relevant).
- Confidence: 60-100 based on evidence strength.
- If evidence is weak, skip that department.
Output valid JSON array: [{"department":"X","recommendation":"...","why_it_matters":"...","steps":["..."],"confidence":85}]`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { departments, systemId } = await req.json();

    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'departments array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch RAG items (knowledge_sources for website content only)
    const { data: knowledgeSources, error: ksError } = await supabase
      .from('knowledge_sources')
      .select('name, description, url, tags, metadata')
      .eq('user_id', user.id)
      .eq('source_type', 'url')
      .limit(15);

    if (ksError) {
      console.error('Knowledge sources fetch error:', ksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch website content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!knowledgeSources || knowledgeSources.length === 0) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          message: 'No website content found. Ingest content in Step 3 (RAG Panel).',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from knowledge sources
    const contextChunks = knowledgeSources.map((ks, idx) => ({
      url: ks.url || ks.name,
      content: `${ks.name}: ${ks.description || ''}. Tags: ${ks.tags?.join(', ') || 'none'}`,
      id: `url_${idx}`,
    }));

    const totalContextLength = contextChunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
    
    // Check minimum context threshold
    if (totalContextLength < 300) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          message: 'Insufficient website content. Add more URLs in Step 3.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format context concisely
    const retrievedContent = contextChunks
      .map(chunk => `[${chunk.id}] ${chunk.url}\n${chunk.content.slice(0, 500)}`)
      .join('\n\n---\n\n');

    // Parallel per-department generation for ultra-fast results
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate recommendations in parallel for all departments
    const results = await Promise.all(
      departments.map(async (dept) => {
        try {
          const userPrompt = `Generate 1-2 grounded recommendations for: ${dept}

Website Content:
${retrievedContent}

Output valid JSON array with max 2 recommendations. Format:
[{"department":"${dept}","recommendation":"...","why_it_matters":"...","steps":["...","...","..."],"confidence":80}]`;

          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-3-pro-preview',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.2,
              max_tokens: 800,
            }),
          });

          if (!aiResponse.ok) {
            console.error(`AI error for ${dept}:`, aiResponse.status);
            return [];
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;

          if (!content) return [];

          // Parse JSON from markdown if present
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : content;
          const recommendations = JSON.parse(jsonStr);

          // Filter and validate
          return recommendations
            .filter((rec: Recommendation) => 
              rec.confidence >= 60 && 
              rec.steps && 
              rec.steps.length >= 2
            )
            .map((rec: Recommendation) => ({
              department: rec.department,
              recommendation: rec.recommendation.slice(0, 900),
              why_it_matters: rec.why_it_matters.slice(0, 400),
              steps: rec.steps.slice(0, 5),
              confidence: rec.confidence,
            }));
        } catch (err) {
          console.error(`Error generating for ${dept}:`, err);
          return [];
        }
      })
    );

    // Flatten and dedupe
    const allRecommendations = results.flat();

    console.log('[Telemetry]', {
      departments,
      context_sources: contextChunks.length,
      context_chars: totalContextLength,
      recommendations_generated: allRecommendations.length,
      parallel_duration_ms: Date.now(),
    });

    return new Response(
      JSON.stringify({
        recommendations: allRecommendations,
        metadata: {
          departments,
          sources_used: contextChunks.length,
          parallel_processing: true,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in recommendations-generate-stream:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
