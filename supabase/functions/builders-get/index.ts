/**
 * /v1/builders-get
 * 
 * PURPOSE: Get builder draft by ID
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - builderId: string (required, UUID)
 * 
 * RESPONSE:
 * - builder: Full builder object
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  builderId: z.string().uuid(),
});

serve(createHandler({
  name: "builders-get",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { builderId } = input;
    const { supabase, userId, log } = context;

    log("Fetching builder draft", { builderId });

    // The authenticated, RLS-bound client decides whether this caller may read
    // the agent. Do not narrow this to owner_id: org-bound drafts are deliberately
    // visible to authorized members according to the canonical agents policies.
    const { data: fetchedBuilder, error: dbError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', builderId)
      .single();
    let builder = fetchedBuilder;

    if (dbError) {
      log("Builder not found in agents, trying legacy drafts", { error: dbError.message });

      // Legacy agent_drafts has no org_id and remains owner-only. RLS plus this
      // explicit owner predicate prevents broadening the old draft contract.
      const { data: legacyDraft, error: legacyError } = await supabase
        .from('agent_drafts')
        .select('*')
        .eq('id', builderId)
        .eq('owner_id', userId)
        .single();

      if (legacyError || !legacyDraft) {
        log("Builder fetch failed in both agents and agent_drafts", {
          agentsError: dbError.message,
          legacyError: legacyError?.message,
        });
        throw {
          code: 'NOT_FOUND',
          message: 'Builder not found',
          status: 404,
        };
      }

      // Migrate legacy draft (agent_drafts) to new builder record in agents and
      // bind it to the server-resolved active organization when one exists.
      const { data: resolvedOrgId, error: activeOrgError } = await supabase.rpc('active_org_id');
      if (activeOrgError) {
        log("Failed to resolve active organization for legacy builder migration", {
          error: activeOrgError.message,
        });
        throw {
          code: 'DATABASE_ERROR',
          message: 'Failed to resolve active organization',
          status: 500,
        };
      }
      const activeOrgId = typeof resolvedOrgId === 'string' ? resolvedOrgId : null;

      const legacyGoal: any = legacyDraft.goal || {};
      const legacyMeta: any = legacyDraft.meta || {};
      const recommendationData: any = legacyMeta.recommendationData || {};

      const goal = legacyGoal.title || '';
      const industry = recommendationData.industry || '';
      const department = recommendationData.department || '';
      const template_id = legacyDraft.template_ref || null;
      const nowIso = new Date().toISOString();

      const { data: createdBuilder, error: createError } = await supabase
        .from('agents')
        .insert({
          name: goal || 'Untitled Agent',
          description: legacyGoal.problem || 'Draft agent created from recommendation',
          owner_id: userId,
          org_id: activeOrgId,
          status: 'draft',
          version: 'v0',
          template_id,
          config: {
            source: 'homepage',
            goal,
            industry,
            department,
            type: 'agent',
            template_id,
            workflow: {
              triggers: [],
              actions: [],
              integrations: [],
              hitl: [],
            },
            model_config: {
              provider: 'google',
              model: 'google/gemini-3-pro-preview',
              rag: {},
              policies: {},
              mcp_servers: [],
            },
            step_completed: legacyDraft.step_completed || 2,
            created_at: nowIso,
            updated_at: nowIso,
          },
        })
        .select()
        .single();

      if (createError || !createdBuilder) {
        log("Failed to migrate legacy draft to builder", { error: createError?.message });
        throw {
          code: 'DATABASE_ERROR',
          message: 'Failed to migrate legacy draft',
          status: 500,
        };
      }

      log("Migrated legacy draft to builder", {
        legacyDraftId: builderId,
        newBuilderId: createdBuilder.id,
        organizationBound: activeOrgId !== null,
      });
      builder = createdBuilder;
    }

    log("Builder fetched", { builderId: builder.id });

    return {
      builder
    };
  }
}));
