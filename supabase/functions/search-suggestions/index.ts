import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchSuggestion {
  id: string;
  type: 'url_scan' | 'agent' | 'template' | 'copilot_prompt' | 'generic_example';
  label: string; // SHORT: 2-6 words for UI display
  question: string; // FULL prompt to send to Co-Pilot
  score: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { pageContext, query } = await req.json();
    const suggestions: SearchSuggestion[] = [];

    // 1. Recent URL scans (last 10)
    const { data: recentScans } = await supabase
      .from('captured_pages')
      .select('id, url, title, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentScans && recentScans.length > 0) {
      const mostRecent = recentScans[0];
      const domain = new URL(mostRecent.url).hostname.replace('www.', '');
      suggestions.push({
        id: `scan-${mostRecent.id}`,
        type: 'url_scan',
        label: `Scan ${domain}`,
        question: `Scan ${mostRecent.url} and suggest 3 digital twins we could deploy.`,
        score: 100,
      });
    }

    // 2. Recent agents/twins (last 10)
    const { data: recentAgents } = await supabase
      .from('agents')
      .select('id, name, description, status, updated_at, config')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (recentAgents && recentAgents.length > 0) {
      const mostRecent = recentAgents[0];
      // Extract first 2-3 meaningful words from agent name
      const nameWords = mostRecent.name.split(' ').slice(0, 3).join(' ');
      const shortLabel = nameWords.length > 30 ? nameWords.substring(0, 27) + '...' : nameWords;
      suggestions.push({
        id: `agent-${mostRecent.id}`,
        type: 'agent',
        label: `Run ${shortLabel} test`,
        question: `Run a simulation for ${mostRecent.name} with a realistic scenario.`,
        score: 90,
      });
    }

    // 3. Popular templates (bias by page context and user's industry)
    const userIndustries = [
      ...new Set([
        ...(recentScans?.map((s) => s.metadata?.industry).filter(Boolean) || []),
        ...(recentAgents?.map((a) => a.config?.industry).filter(Boolean) || []),
      ]),
    ];

    let templatesQuery = supabase
      .from('agent_templates')
      .select('id, slug, name, description, category')
      .order('created_at', { ascending: false })
      .limit(5);

    // Bias templates based on page context
    if (pageContext === 'marketplace' || pageContext === 'template_library') {
      // Show all templates
    } else if (userIndustries.length > 0) {
      // Filter by user's industries if possible (assuming templates have industry field)
      // For now, just show popular ones
    }

    const { data: templates } = await templatesQuery;

    if (templates && templates.length > 0) {
      const topTemplate = templates[0];
      // Extract first 2-3 words from template name
      const nameWords = topTemplate.name.split(' ').slice(0, 3).join(' ');
      const shortLabel = nameWords.length > 25 ? nameWords.substring(0, 22) + '...' : nameWords;
      suggestions.push({
        id: `template-${topTemplate.id}`,
        type: 'template',
        label: `Try ${shortLabel}`,
        question: `Explain how the ${topTemplate.name} digital twin would apply to my business.`,
        score: 80,
      });
    }

    // 4. Recent Co-Pilot queries (last 5, deduped)
    const { data: recentQueries } = await supabase
      .from('copilot_events')
      .select('prompt, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentQueries) {
      const uniqueQueries = Array.from(
        new Map(
          recentQueries
            .filter((q) => q.prompt && q.prompt.length < 100)
            .map((q) => [q.prompt.toLowerCase(), q])
        ).values()
      ).slice(0, 3);

      uniqueQueries.forEach((query, idx) => {
        // Extract first 5-7 words for cleaner labels
        const words = query.prompt.split(' ');
        const shortLabel = words.length > 7 
          ? words.slice(0, 7).join(' ') + '...' 
          : query.prompt;
        suggestions.push({
          id: `copilot-${query.created_at}`,
          type: 'copilot_prompt',
          label: shortLabel,
          question: query.prompt,
          score: 70 - idx * 5,
        });
      });
    }

    // 5. Context-specific suggestions
    if (pageContext === 'agents' || pageContext === 'manage_agents') {
      suggestions.push({
        id: 'context-workflow',
        type: 'generic_example',
        label: 'Debug agent workflows',
        question: 'Show me workflow errors across all agents and suggest fixes.',
        score: 95,
      });
    } else if (pageContext === 'marketplace') {
      suggestions.push({
        id: 'context-roi',
        type: 'generic_example',
        label: 'Compare template ROI',
        question: 'Show ROI comparison for the top 3 templates in the marketplace.',
        score: 95,
      });
    } else if (pageContext === 'dashboard') {
      suggestions.push({
        id: 'context-scan',
        type: 'generic_example',
        label: 'Scan my website',
        question: 'Scan my website and suggest 3 digital twins we could deploy.',
        score: 95,
      });
      suggestions.push({
        id: 'context-ops',
        type: 'generic_example',
        label: 'Map AI in operations',
        question: 'Map AI opportunities in our operations and prioritize by ROI.',
        score: 90,
      });
    }

    // 6. Filter by query if provided
    let filteredSuggestions = suggestions;
    if (query && query.trim().length > 0) {
      const lowerQuery = query.toLowerCase();
      filteredSuggestions = suggestions.filter(
        (s) =>
          s.label.toLowerCase().includes(lowerQuery) ||
          s.question.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort by score and take top 7
    filteredSuggestions.sort((a, b) => b.score - a.score);
    const topSuggestions = filteredSuggestions.slice(0, 7);

    console.log(`[search-suggestions] Returned ${topSuggestions.length} suggestions for user ${user.id}`);

    return new Response(
      JSON.stringify({
        suggestions: topSuggestions,
        count: topSuggestions.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[search-suggestions] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error', suggestions: [], count: 0 }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
