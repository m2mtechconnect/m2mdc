/**
 * /v1/builders-create
 *
 * Creates an authenticated builder draft. Twin/process-twin drafts may bind to
 * an existing facility twin. The server validates that the caller can read the
 * requested twin through the caller's RLS-bound client before persisting it.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  source: z.enum(['file', 'questionnaire', 'template', 'url', 'manual', 'homepage', 'dashboard', 'imported', 'manage-agents', 'blank', 'facility']).nullish(),
  goal: z.string().nullish(),
  industry: z.string().nullish(),
  department: z.string().nullish(),
  type: z.enum(['agent', 'process_twin', '3d_twin']).nullish(),
  template_id: z.string().nullish(),
  twin_id: z.string().uuid().nullish(),
});

serve(createHandler({
  name: "builders-create",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { source, goal, industry, department, type, template_id, twin_id } = input;
    const { supabase, userId, log } = context;

    log("Creating builder draft", { source, goal, industry, department, type, twinId: twin_id ?? null });

    const { data: resolvedActiveOrgId, error: activeOrgError } = await supabase.rpc('active_org_id');
    if (activeOrgError) {
      log("Builder tenant resolution failed", { error: activeOrgError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Unable to resolve active organization',
        status: 500,
      };
    }
    const activeOrgId = typeof resolvedActiveOrgId === 'string' ? resolvedActiveOrgId : null;

    // The user-level Supabase client is RLS-bound. An invisible facility must
    // look exactly like a missing facility, so the browser cannot bind a draft
    // to an arbitrary twin id.
    if (twin_id) {
      const { data: facility, error: facilityError } = await supabase
        .from('data_centre_twins')
        .select('id')
        .eq('id', twin_id)
        .maybeSingle();

      if (facilityError || !facility) {
        log('Builder facility binding rejected', { twinId: twin_id, error: facilityError?.message });
        throw {
          code: 'NOT_FOUND',
          message: 'Facility is not available to this user',
          status: 404,
        };
      }
    }

    const { data: draft, error: dbError } = await supabase
      .from('agents')
      .insert({
        name: goal || 'Untitled Build',
        description: `Draft ${type || 'agent'} for ${department || 'unspecified department'}`,
        owner_id: userId,
        org_id: activeOrgId,
        status: 'draft',
        version: 'v0',
        template_id: template_id || null,
        config: {
          source: source || 'dashboard',
          goal: goal || '',
          industry: industry || '',
          department: department || '',
          type: type || null,
          template_id: template_id || null,
          twin_id: twin_id || null,
          workflow: {
            triggers: [],
            actions: [],
            integrations: [],
            hitl: []
          },
          model_config: {
            provider: 'google',
            model: 'google/gemini-2.5-flash',
            rag: {},
            policies: {},
            mcp_servers: []
          },
          step_completed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) {
      log("Builder creation failed", { error: dbError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: dbError.message,
        status: 500,
      };
    }

    log("Builder draft created", { builderId: draft.id, twinId: twin_id ?? null });

    return {
      id: draft.id,
      builder: draft
    };
  }
}));