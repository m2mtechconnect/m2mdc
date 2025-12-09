/**
 * /v1/agent-draft-from-reco
 * 
 * PURPOSE: Create agent draft from recommendation
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - recommendationId: string (required)
 * - blueprintId: string (optional)
 * - title: string (required)
 * - description: string (optional)
 * - defaultAgents: array (optional)
 * - defaultDatasets: array (optional)
 * - defaultConnections: array (optional)
 * - siteDomain: string (optional)
 * - siteId: string (optional)
 * - recommendationData: object (optional)
 * - forceNew: boolean (optional, default: false)
 * 
 * RESPONSE:
 * - draftId: UUID of created draft
 * - nextUrl: URL to builder page
 * - message: Success message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  recommendationId: z.string().min(1, "Recommendation ID is required"),
  blueprintId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  defaultAgents: z.array(z.unknown()).optional().default([]),
  defaultDatasets: z.array(z.unknown()).optional().default([]),
  defaultConnections: z.array(z.unknown()).optional().default([]),
  siteDomain: z.string().optional(),
  siteId: z.string().uuid().optional(),
  recommendationData: z.record(z.unknown()).optional(),
  forceNew: z.boolean().optional().default(false),
});

serve(createHandler({
  name: "agent-draft-from-reco",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { supabase, userId, log } = context;
    const {
      recommendationId,
      blueprintId,
      title,
      description,
      defaultAgents,
      defaultDatasets,
      defaultConnections,
      siteDomain,
      siteId: providedSiteId,
      recommendationData,
      forceNew,
    } = input;

    log("Creating draft from recommendation", { 
      recommendationId, 
      blueprintId,
      forceNew 
    });

    // Look up site_id from domain if not provided
    let siteId = providedSiteId;
    if (!siteId && siteDomain) {
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('domain', siteDomain)
        .single();
      
      siteId = site?.id;
    }

    // Create idempotency key
    const encoder = new TextEncoder();
    const uniqueString = forceNew 
      ? `${userId}-${recommendationId}-${blueprintId}-${Date.now()}`
      : `${userId}-${recommendationId}-${blueprintId}`;
    const data = encoder.encode(uniqueString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const idempotencyKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check for existing draft if not forced to create new
    if (!forceNew) {
      const { data: existingDraft } = await supabase
        .from('agent_drafts')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (existingDraft) {
        log("Returning existing draft", { draftId: existingDraft.id });
        return {
          draftId: existingDraft.id,
          nextUrl: `/builder?draft=${existingDraft.id}&from=reco&step=3`,
          message: 'Draft already exists',
        };
      }
    }

    // Standardize recommendation data
    const standardizedRecommendationData = recommendationData ? {
      id: recommendationData.id || recommendationId,
      source: 'url_recommendations',
      title: recommendationData.title || title,
      problem: recommendationData.problem || recommendationData.description || description,
      solution: recommendationData.solution || recommendationData.description || description,
      impact: recommendationData.impact,
      tags: recommendationData.tags || [],
      industry: recommendationData.industry,
      department: recommendationData.department,
      systemName: recommendationData.systemName || title,
      subtitle: recommendationData.subtitle,
      description: recommendationData.description || description,
      recommendation: recommendationData.recommendation,
      roi: recommendationData.roi,
      annualSavings: recommendationData.annualSavings,
      timeSavedPerWeek: recommendationData.timeSavedPerWeek,
      accuracyImprovement: recommendationData.accuracyImprovement,
      model: recommendationData.model,
      vendor: recommendationData.vendor,
      contextWindow: recommendationData.contextWindow,
      topK: recommendationData.topK,
      topN: recommendationData.topN,
      temperature: recommendationData.temperature,
      workflowCount: recommendationData.workflowCount,
      connectedToolsCount: recommendationData.connectedToolsCount,
      optimizations: recommendationData.optimizations,
      raw: recommendationData,
    } : null;

    log("Creating new draft", { hasRecommendationData: !!standardizedRecommendationData });

    // Create new draft
    const { data: draft, error: draftError } = await supabase
      .from('agent_drafts')
      .insert({
        owner_id: userId,
        site_id: siteId,
        idempotency_key: idempotencyKey,
        status: 'DRAFT',
        step_completed: 2,
        goal: {
          title,
          problem: description,
          successCriteria: [
            'Pilot live in 30 days',
            '>10% baseline KPI improvement',
          ],
          sourceDomain: siteDomain,
        },
        template_ref: blueprintId,
        config: {
          agents: defaultAgents,
          datasets: defaultDatasets,
          connections: defaultConnections,
        },
        meta: {
          recommendationId,
          createdFrom: 'url-recommendations',
          recommendationData: standardizedRecommendationData,
        },
      })
      .select()
      .single();

    if (draftError) {
      log("Draft creation failed", { error: draftError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: draftError.message,
        status: 500,
      };
    }

    log("Draft created successfully", { draftId: draft.id });

    return {
      draftId: draft.id,
      nextUrl: `/builder?draft=${draft.id}&from=reco&step=3`,
      message: 'Draft created successfully',
    };
  }
}));
