/**
 * /v1/agent-suggestions
 * 
 * PURPOSE: Generate AI-powered agent recommendations based on user queries
 * AUTH: public (no auth required, uses service role for caching)
 * 
 * REQUEST:
 * - query: string (min 2 chars)
 * - chips: string[] (optional filters)
 * - context: any (optional conversation context)
 * 
 * RESPONSE:
 * - suggestions: Array of agent templates with relevance scores
 * - cached: boolean
 * - generated_at/cached_at: ISO timestamp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { callExternalApi } from "../_shared/rest-client.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Input validation schema
const InputSchema = z.object({
  query: z.string().min(2, "Query must be at least 2 characters"),
  chips: z.array(z.string()).default([]),
  context: z.any().optional(),
});

// AI response schema
const AIResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string(),
    }),
  })),
});

// Pattern library with starter templates
const basePatterns = [
  {
    title: 'Campaign Copilot',
    one_liner: 'Plan and draft omni-channel marketing campaigns with AI',
    department: 'Marketing',
    starter_workflow: 'analyze',
    recommended_model: 'google/gemini-3-pro-preview',
    keywords: ['marketing', 'campaign', 'content', 'social', 'email', 'ads'],
    success_metric: 'Qualified MQLs',
    desired_outcome: 'Predictive'
  },
  {
    title: 'Lead Router & SDR Copilot',
    one_liner: 'Qualify and route leads, draft personalized outreach',
    department: 'Sales',
    starter_workflow: 'classify',
    recommended_model: 'google/gemini-3-pro-preview',
    keywords: ['sales', 'lead', 'qualify', 'outreach', 'crm', 'pipeline'],
    success_metric: 'Meetings Booked',
    desired_outcome: 'Prescriptive'
  },
  {
    title: 'Finance Reconciler',
    one_liner: 'Automate invoice and ledger matching with AI',
    department: 'Finance',
    starter_workflow: 'classify',
    recommended_model: 'google/gemini-3-pro-preview',
    keywords: ['finance', 'invoice', 'reconcile', 'accounting', 'ledger', 'expense'],
    success_metric: 'Reconciliation Accuracy',
    desired_outcome: 'Diagnostic'
  },
  {
    title: 'Customer Support Agent',
    one_liner: 'AI-powered ticket routing and response suggestions',
    department: 'Operations',
    starter_workflow: 'classify',
    recommended_model: 'google/gemini-3-pro-preview',
    keywords: ['support', 'customer', 'ticket', 'help', 'service', 'troubleshoot'],
    success_metric: 'Response Time',
    desired_outcome: 'Prescriptive'
  },
  {
    title: 'Product Insights Analyzer',
    one_liner: 'Extract insights from user feedback and product data',
    department: 'Product',
    starter_workflow: 'analyze',
    recommended_model: 'google/gemini-3-pro-preview',
    keywords: ['product', 'feedback', 'insights', 'feature', 'roadmap', 'user'],
    success_metric: 'Feature Adoption',
    desired_outcome: 'Predictive'
  },
  {
    title: 'HR Onboarding Assistant',
    one_liner: 'Automate employee onboarding workflows and document prep',
    department: 'HR',
    starter_workflow: 'mcp',
    recommended_model: 'google/gemini-3-pro-preview',
    keywords: ['hr', 'onboarding', 'employee', 'hiring', 'training', 'compliance'],
    success_metric: 'Onboarding Time',
    desired_outcome: 'Prescriptive'
  },
  {
    title: 'Compliance Document Classifier',
    one_liner: 'Classify and route compliance documents automatically',
    department: 'Legal',
    starter_workflow: 'classify',
    recommended_model: 'google/gemini-3-pro-preview',
    keywords: ['legal', 'compliance', 'document', 'policy', 'regulation', 'audit'],
    success_metric: 'Classification Accuracy',
    desired_outcome: 'Diagnostic'
  },
  {
    title: 'Inventory Predictor',
    one_liner: 'Predict stock levels and automate reorder workflows',
    department: 'Operations',
    starter_workflow: 'analyze',
    recommended_model: 'google/gemini-3-pro-preview',
    keywords: ['inventory', 'stock', 'supply', 'warehouse', 'reorder', 'logistics'],
    success_metric: 'Stockout Rate',
    desired_outcome: 'Predictive'
  },
];

// Helper to create cache key hash
async function createCacheKey(query: string, chips: string[]): Promise<string> {
  const sortedChips = [...chips].sort();
  const keyString = `${query.toLowerCase()}|${sortedChips.join(',')}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(createHandler({
  name: "agent-suggestions",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { query, chips = [] } = input;
    const { log, correlationId } = context;

    // Initialize Supabase with service role for caching
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check cache
    const cacheKey = await createCacheKey(query, chips);
    const { data: cachedData, error: cacheError } = await supabase
      .from('agent_suggestions_cache')
      .select('*')
      .eq('query_hash', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedData && !cacheError) {
      log('Cache HIT');
      
      // Increment hit count (non-blocking)
      void supabase
        .from('agent_suggestions_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('id', cachedData.id);

      return {
        suggestions: cachedData.suggestions,
        cached: true,
        cached_at: cachedData.created_at
      };
    }

    log('Cache MISS');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw { code: 'CONFIG_ERROR', message: 'LOVABLE_API_KEY not configured' };
    }

    // Filter by chips
    let candidates = [...basePatterns];
    if (chips.length > 0) {
      candidates = candidates.filter(pattern => {
        return chips.some((chip: string) => {
          const chipLower = chip.toLowerCase();
          return pattern.department.toLowerCase() === chipLower ||
                 pattern.keywords.some(kw => kw.toLowerCase().includes(chipLower));
        });
      });
    }

    // Use Gemini to rank and expand
    const systemPrompt = `You are an AI agent recommendation system. Given a user's natural language query and a list of agent templates, rank and return the top 5 most relevant agents.

For each agent, return:
- title: Clear agent name
- one_liner: Brief description (max 100 chars)
- department: Primary department
- relevance_score: 0-100 score for how well it matches the query
- starter_workflow: "analyze" | "classify" | "mcp"
- recommended_model: "google/gemini-3-pro-preview"
- success_metric: Default metric for this agent type
- desired_outcome: "Diagnostic" | "Predictive" | "Prescriptive"

Return ONLY valid JSON array. Focus on matching user intent, keywords, and department alignment.`;

    const userPrompt = `User query: "${query}"

Available agent templates:
${JSON.stringify(candidates, null, 2)}

Rank these agents by relevance to the query and return top 5 as JSON array with relevance_score added.`;

    try {
      const aiData = await callExternalApi({
        name: 'gemini-rank-agents',
        url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
        options: {
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
            temperature: 0.3,
          }),
        },
        responseSchema: AIResponseSchema,
        correlationId,
      });

      const content = aiData.choices[0].message.content;
      
      let suggestions;
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
        suggestions = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        log('AI response parse failed, using fallback', { error: String(parseError) });
        
        // Fallback to keyword matching
        const queryLower = query.toLowerCase();
        suggestions = candidates
          .map(pattern => ({
            ...pattern,
            relevance_score: pattern.keywords.reduce((acc, kw) => 
              acc + (queryLower.includes(kw.toLowerCase()) ? 20 : 0), 0)
          }))
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, 5);
      }

      const topSuggestions = suggestions.slice(0, 5);

      // Cache results (non-blocking)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      void supabase
        .from('agent_suggestions_cache')
        .insert({
          query_hash: cacheKey,
          query: query,
          chips: chips,
          suggestions: topSuggestions,
          expires_at: expiresAt
        });

      // Periodic cleanup (1% chance)
      if (Math.random() < 0.01) {
        void supabase.rpc('cleanup_agent_suggestions_cache');
      }

      return {
        suggestions: topSuggestions,
        cached: false,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      log('AI API call failed, using fallback');
      
      // Fallback to simple keyword matching
      const queryLower = query.toLowerCase();
      const scored = candidates.map(pattern => {
        const score = pattern.keywords.reduce((acc, kw) => {
          return acc + (queryLower.includes(kw.toLowerCase()) ? 20 : 0);
        }, 0) + (pattern.title.toLowerCase().includes(queryLower) ? 40 : 0);
        
        return { ...pattern, relevance_score: Math.min(score, 100) };
      });
      
      const ranked = scored
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 5);
      
      return {
        suggestions: ranked,
        cached: false,
        fallback: true
      };
    }
  }
}));
