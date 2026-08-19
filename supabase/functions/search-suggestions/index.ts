import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";


interface SearchSuggestion {
  id: string;
  type: 'url_scan' | 'agent' | 'template' | 'copilot_prompt' | 'generic_example';
  label: string;
  question: string;
  score: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    // Run ALL database queries in parallel for speed
    const [scansResult, agentsResult, templatesResult, queriesResult] = await Promise.all([
      // 1. Recent URL scans (limit to 3 for speed)
      supabase
        .from('captured_pages')
        .select('id, url, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      
      // 2. Recent agents (limit to 3 for speed)
      supabase
        .from('agents')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(3),
      
      // 3. Templates (limit to 2 for speed)
      supabase
        .from('agent_templates')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(2),
      
      // 4. Recent Co-Pilot queries (limit to 5 for speed)
      supabase
        .from('copilot_events')
        .select('prompt, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    // Process results
    const recentScans = scansResult.data;
    const recentAgents = agentsResult.data;
    const templates = templatesResult.data;
    const recentQueries = queriesResult.data;

    // 1. URL scans
    if (recentScans && recentScans.length > 0) {
      const mostRecent = recentScans[0];
      try {
        const domain = new URL(mostRecent.url).hostname.replace('www.', '');
        suggestions.push({
          id: `scan-${mostRecent.id}`,
          type: 'url_scan',
          label: `Scan ${domain}`,
          question: `Scan ${mostRecent.url} and suggest 3 digital twins we could deploy.`,
          score: 100,
        });
      } catch {
        // Invalid URL, skip
      }
    }

    // 2. Agents
    if (recentAgents && recentAgents.length > 0) {
      const mostRecent = recentAgents[0];
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

    // 3. Templates
    if (templates && templates.length > 0) {
      const topTemplate = templates[0];
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

    // 4. Recent queries (dedupe inline)
    if (recentQueries) {
      const seen = new Set<string>();
      let count = 0;
      for (const q of recentQueries) {
        if (count >= 3) break;
        if (!q.prompt || q.prompt.length > 100) continue;
        const key = q.prompt.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        
        const words = q.prompt.split(' ');
        const shortLabel = words.length > 7 ? words.slice(0, 7).join(' ') + '...' : q.prompt;
        suggestions.push({
          id: `copilot-${q.created_at}`,
          type: 'copilot_prompt',
          label: shortLabel,
          question: q.prompt,
          score: 70 - count * 5,
        });
        count++;
      }
    }

    // 5. Context-specific (static, no DB call)
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
        (s) => s.label.toLowerCase().includes(lowerQuery) || s.question.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort by score and take top 7
    filteredSuggestions.sort((a, b) => b.score - a.score);
    const topSuggestions = filteredSuggestions.slice(0, 7);

    const duration = Date.now() - startTime;
    console.log(`[search-suggestions] ${topSuggestions.length} suggestions in ${duration}ms`);

    return new Response(
      JSON.stringify({ suggestions: topSuggestions, count: topSuggestions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[search-suggestions] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error', suggestions: [], count: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
