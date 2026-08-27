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

    // Tenant boundary: creation fails closed BEFORE any data access when the
    // server-verified active organization is absent. org_id is persisted only
    // from this server authority, never from browser input.
    if (!activeOrgId) {
      log("Builder creation rejected: no verified active organization");
      throw {
        code: 'FORBIDDEN',
        message: 'No active organization could be verified for this account',
        status: 403,
      };
    }

    let facility: {
      id: string;
      name: string;
      city: string;
      region_code: string;
      industry: string | null;
      tier: string;
      capacity_kw: number;
      pue_target: number | null;
      renewable_target_pct: number | null;
      sovereignty_level: string | null;
    } | null = null;

    // The user-level Supabase client is RLS-bound. An invisible facility must
    // look exactly like a missing facility, so the browser cannot bind a draft
    // to an arbitrary twin id.
    if (twin_id) {
      const { data: resolvedFacility, error: facilityError } = await supabase
        .from('data_centre_twins')
        .select('id, name, city, region_code, industry, tier, capacity_kw, pue_target, renewable_target_pct, sovereignty_level')
        .eq('id', twin_id)
        .maybeSingle();

      if (facilityError || !resolvedFacility) {
        log('Builder facility binding rejected', { twinId: twin_id, error: facilityError?.message });
        throw {
          code: 'NOT_FOUND',
          message: 'Facility is not available to this user',
          status: 404,
        };
      }
      facility = resolvedFacility;
    }

    const facilityBuildName = facility ? `${facility.name} Digital Twin` : null;
    const facilityDepartment = facility ? 'Data Centre Operations' : '';

    const { data: draft, error: dbError } = await supabase
      .from('agents')
      .insert({
        name: goal || facilityBuildName || 'Untitled Build',
        description: facility
          ? `Draft ${type || '3d_twin'} for ${facility.name}`
          : `Draft ${type || 'agent'} for ${department || 'unspecified department'}`,
        owner_id: userId,
        org_id: activeOrgId,
        status: 'draft',
        version: 'v0',
        template_id: template_id || null,
        twin_id: twin_id || null,
        config: {
          source: source || 'dashboard',
          goal: goal || (facility ? `Configure and operate ${facility.name}` : ''),
          industry: industry || facility?.industry || '',
          department: department || facilityDepartment,
          type: type || null,
          template_id: template_id || null,
          twin_id: twin_id || null,
          facility: facility ? {
            id: facility.id,
            name: facility.name,
            city: facility.city,
            region_code: facility.region_code,
            tier: facility.tier,
            capacity_kw: facility.capacity_kw,
            pue_target: facility.pue_target,
            renewable_target_pct: facility.renewable_target_pct,
            sovereignty_level: facility.sovereignty_level,
          } : null,
          workflow: {
            triggers: [],
            actions: [],
            integrations: [],
            hitl: []
          },
          model_config: {
            // Managed AI contract: new drafts persist only the stable,
            // provider-neutral response profile. Runtime provider/model
            // resolution stays server-owned.
            response_profile: 'balanced',
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