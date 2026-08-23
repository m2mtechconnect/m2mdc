import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CONFIG, AIProviderRequestError, makeAICompletion } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageId, url, text, title } = await req.json();

    if (!text || !url) {
      return new Response(
        JSON.stringify({ error: 'Missing text or url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[grounded-summary] Generating summary for:', url);

    const systemPrompt = `You are an expert content analyzer. Generate a concise 3-6 bullet point summary of the provided content. Focus on:
- Key business value propositions
- Technical capabilities and features
- Target audience and use cases
- Unique differentiators
- Measurable outcomes or metrics

Return ONLY a JSON object with this structure:
{
  "summary": "One paragraph overview (2-3 sentences)",
  "bullets": ["Bullet 1", "Bullet 2", "Bullet 3", ...],
  "keyInsights": ["Insight 1", "Insight 2", ...],
  "confidence": 0.0-1.0
}`;

    const userPrompt = `URL: ${url}
Title: ${title || 'N/A'}

Content:
${text.substring(0, 8000)}

Generate a grounded summary with citations to the source content.`;

    const aiResult = await makeAICompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model: 'compatibilitySummary', temperature: 0.2 },
    );

    const content = aiResult.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    let summaryData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      summaryData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[grounded-summary] JSON parse error:', parseError);
      summaryData = {
        summary: content.substring(0, 500),
        bullets: content.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('•')).slice(0, 6),
        keyInsights: [],
        confidence: 0.7,
      };
    }

    if (pageId && supabase) {
      const { error: insertError } = await supabase
        .from('page_summaries')
        .upsert({
          page_id: pageId,
          summary: summaryData.summary,
          bullets: summaryData.bullets || [],
          source: 'gemini',
          grounding_metadata: {
            model: AI_CONFIG.models.compatibilitySummary,
            confidence: summaryData.confidence || 0,
            key_insights: summaryData.keyInsights || [],
          },
        }, {
          onConflict: 'page_id,source',
        });

      if (insertError) {
        console.error('[grounded-summary] DB insert error:', insertError);
      } else {
        console.log('[grounded-summary] Summary stored in database');
      }
    }

    console.log('[grounded-summary] Summary generated successfully');

    return new Response(
      JSON.stringify({
        summary: summaryData.summary,
        bullets: summaryData.bullets || [],
        keyInsights: summaryData.keyInsights || [],
        confidence: summaryData.confidence || 0,
        source: 'gemini',
        pageId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[grounded-summary] Error:', error);

    if (error instanceof AIProviderRequestError && error.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error instanceof AIProviderRequestError && error.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Summary generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
