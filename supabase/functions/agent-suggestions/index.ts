/**
 * /v1/agent-suggestions
 * Authenticated AI-assisted recommendation ranking with deterministic fallback.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveRouterEnvironmentForUser } from "../_shared/ai-provider-connection.ts";
import {
  ModelRouterError,
  makeChatCompletion,
} from "../_shared/model-router.ts";

const InputSchema = z.object({
  query: z.string().min(2, "Query must be at least 2 characters").max(2000),
  chips: z.array(z.string().max(100)).max(20).default([]),
  context: z.unknown().optional(),
});

const RECOMMENDED_PROFILE = 'profile:reasoning';

const basePatterns = [
  {
    title: 'Campaign Copilot',
    one_liner: 'Plan and draft omni-channel marketing campaigns with AI',
    department: 'Marketing',
    starter_workflow: 'analyze',
    recommended_model: RECOMMENDED_PROFILE,
    keywords: ['marketing', 'campaign', 'content', 'social', 'email', 'ads'],
    success_metric: 'Qualified MQLs',
    desired_outcome: 'Predictive'
  },
  {
    title: 'Lead Router & SDR Copilot',
    one_liner: 'Qualify and route leads, draft personalized outreach',
    department: 'Sales',
    starter_workflow: 'classify',
    recommended_model: RECOMMENDED_PROFILE,
    keywords: ['sales', 'lead', 'qualify', 'outreach', 'crm', 'pipeline'],
    success_metric: 'Meetings Booked',
    desired_outcome: 'Prescriptive'
  },
  {
    title: 'Finance Reconciler',
    one_liner: 'Assist invoice and ledger matching with reviewable findings',
    department: 'Finance',
    starter_workflow: 'classify',
    recommended_model: RECOMMENDED_PROFILE,
    keywords: ['finance', 'invoice', 'reconcile', 'accounting', 'ledger', 'expense'],
    success_metric: 'Reconciliation Accuracy',
    desired_outcome: 'Diagnostic'
  },
  {
    title: 'Customer Support Agent',
    one_liner: 'Assist ticket routing and response suggestions',
    department: 'Operations',
    starter_workflow: 'classify',
    recommended_model: RECOMMENDED_PROFILE,
    keywords: ['support', 'customer', 'ticket', 'help', 'service', 'troubleshoot'],
    success_metric: 'Response Time',
    desired_outcome: 'Prescriptive'
  },
  {
    title: 'Product Insights Analyzer',
    one_liner: 'Extract insights from user feedback and product data',
    department: 'Product',
    starter_workflow: 'analyze',
    recommended_model: RECOMMENDED_PROFILE,
    keywords: ['product', 'feedback', 'insights', 'feature', 'roadmap', 'user'],
    success_metric: 'Feature Adoption',
    desired_outcome: 'Predictive'
  },
  {
    title: 'HR Onboarding Assistant',
    one_liner: 'Assist employee onboarding workflows and document preparation',
    department: 'HR',
    starter_workflow: 'mcp',
    recommended_model: RECOMMENDED_PROFILE,
    keywords: ['hr', 'onboarding', 'employee', 'hiring', 'training', 'compliance'],
    success_metric: 'Onboarding Time',
    desired_outcome: 'Prescriptive'
  },
  {
    title: 'Compliance Document Classifier',
    one_liner: 'Classify and route compliance documents for human review',
    department: 'Legal',
    starter_workflow: 'classify',
    recommended_model: RECOMMENDED_PROFILE,
    keywords: ['legal', 'compliance', 'document', 'policy', 'regulation', 'audit'],
    success_metric: 'Classification Accuracy',
    desired_outcome: 'Diagnostic'
  },
  {
    title: 'Inventory Predictor',
    one_liner: 'Forecast stock risk and recommend reorder actions',
    department: 'Operations',
    starter_workflow: 'analyze',
    recommended_model: RECOMMENDED_PROFILE,
    keywords: ['inventory', 'stock', 'supply', 'warehouse', 'reorder', 'logistics'],
    success_metric: 'Stockout Rate',
    desired_outcome: 'Predictive'
  },
];

async function createCacheKey(query: string, chips: string[]): Promise<string> {
  const keyString = `${query.toLowerCase()}|${[...chips].sort().join(',')}`;
  const data = new TextEncoder().encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function deterministicFallback(query: string, candidates: typeof basePatterns) {
  const queryLower = query.toLowerCase();
  return candidates
    .map(pattern => ({
      ...pattern,
      relevance_score: Math.min(
        pattern.keywords.reduce(
          (score, keyword) => score + (queryLower.includes(keyword.toLowerCase()) ? 20 : 0),
          pattern.title.toLowerCase().includes(queryLower) ? 40 : 0,
        ),
        100,
      ),
    }))
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 5);
}

serve(createHandler({
  name: "agent-suggestions",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { query, chips = [] } = input;
    const { log, userId } = context;
    if (!userId) throw { code: 'UNAUTHORIZED', message: 'Authenticated user required', status: 401 };

    const cache = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const cacheKey = await createCacheKey(query, chips);
    const { data: cachedData, error: cacheError } = await cache
      .from('agent_suggestions_cache')
      .select('*')
      .eq('query_hash', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData && !cacheError) {
      void cache
        .from('agent_suggestions_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('id', cachedData.id);
      return {
        suggestions: cachedData.suggestions,
        cached: true,
        cached_at: cachedData.created_at,
      };
    }

    let candidates = [...basePatterns];
    if (chips.length > 0) {
      candidates = candidates.filter(pattern => chips.some((chip: string) => {
        const normalized = chip.toLowerCase();
        return pattern.department.toLowerCase() === normalized ||
          pattern.keywords.some(keyword => keyword.toLowerCase().includes(normalized));
      }));
    }
    if (candidates.length === 0) candidates = [...basePatterns];

    const systemPrompt = `You rank proposed AURA agent templates. Return ONLY a valid JSON array of up to five entries selected from the supplied templates. Preserve title, one_liner, department, starter_workflow, success_metric, desired_outcome and recommended_model exactly; add only relevance_score from 0 to 100. Do not invent provider-specific model IDs or claim autonomous control.`;
    const userPrompt = `User query: ${JSON.stringify(query)}\nTemplates: ${JSON.stringify(candidates)}`;

    try {
      const providerResolution = await resolveRouterEnvironmentForUser(userId);
      const completion = await makeChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          requestedModel: RECOMMENDED_PROFILE,
          profile: 'reasoning',
          temperature: 0.2,
          maxTokens: 1800,
          env: providerResolution.env,
        },
      );

      let suggestions: Array<Record<string, unknown>>;
      try {
        const jsonMatch = completion.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, completion.text];
        suggestions = JSON.parse(jsonMatch[1] ?? completion.text);
        if (!Array.isArray(suggestions)) throw new Error('Expected array');
      } catch (parseError) {
        log('Recommendation model output was not valid JSON; deterministic fallback used', {
          error: String(parseError),
        });
        suggestions = deterministicFallback(query, candidates);
      }

      const allowedTitles = new Set(candidates.map(candidate => candidate.title));
      const topSuggestions = suggestions
        .filter(item => typeof item?.title === 'string' && allowedTitles.has(item.title as string))
        .slice(0, 5);
      const safeSuggestions = topSuggestions.length > 0
        ? topSuggestions
        : deterministicFallback(query, candidates);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      void cache.from('agent_suggestions_cache').insert({
        query_hash: cacheKey,
        query,
        chips,
        suggestions: safeSuggestions,
        expires_at: expiresAt,
      });

      return {
        suggestions: safeSuggestions,
        cached: false,
        generated_at: new Date().toISOString(),
        provider: completion.provider,
        model: completion.model,
        model_profile: completion.profile,
        provider_configuration_source: providerResolution.source,
        provider_connection_id: providerResolution.connectionId,
        actor_id: userId,
      };
    } catch (error) {
      if (error instanceof ModelRouterError) {
        log('Model router unavailable; deterministic recommendation fallback used', {
          code: error.code,
        });
      } else {
        log('Recommendation model/provider resolution failed; deterministic fallback used', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return {
        suggestions: deterministicFallback(query, candidates),
        cached: false,
        fallback: true,
        model_profile: 'reasoning',
      };
    }
  }
}));
