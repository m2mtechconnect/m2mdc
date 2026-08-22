import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { resolveRouterEnvironmentForUser } from "../_shared/ai-provider-connection.ts";
import {
  ModelRouterError,
  makeChatCompletion,
} from "../_shared/model-router.ts";

const InputSchema = z.object({
  modelId: z.string().min(1).max(200),
  targetRegion: z.string().max(100).optional().default('northamerica-northeast1'),
});

// Server-side mirror of canonical frontend ai.model.test grants. This endpoint
// still verifies persisted role grants independently; browser permission state
// is never trusted as authority.
const MODEL_TEST_ROLES = new Set([
  'security_admin',
  'admin',
  'owner',
  'engineer',
  'executive',
]);

serve(createHandler({
  name: 'models-test',
  authLevel: 'user',
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { modelId, targetRegion } = input;
    const { supabase, userId, log } = context;
    if (!userId) throw { code: 'UNAUTHORIZED', message: 'Authenticated user required', status: 401 };

    const { data: roleRows, error: roleError } = await supabase
      .from('user_roles')
      .select('role, scope, expires_at')
      .eq('user_id', userId);
    if (roleError) {
      throw { code: 'AUTHORIZATION_LOOKUP_FAILED', message: 'Unable to resolve model-test authority', status: 500 };
    }

    const now = Date.now();
    const authorized = (roleRows ?? []).some((row: { role?: string | null; scope?: string | null; expires_at?: string | null }) => {
      if (!MODEL_TEST_ROLES.has(row.role ?? '')) return false;
      if (row.scope !== null && row.scope !== undefined && row.scope !== 'global') return false;
      if (!row.expires_at) return true;
      const expiry = new Date(row.expires_at).getTime();
      return Number.isFinite(expiry) && expiry > now;
    });
    if (!authorized) {
      throw { code: 'FORBIDDEN', message: 'Model testing is not permitted for this account', status: 403 };
    }

    const providerResolution = await resolveRouterEnvironmentForUser(userId);
    const startTime = Date.now();
    try {
      const completion = await makeChatCompletion(
        [
          { role: 'system', content: 'Connectivity test. Follow the user instruction exactly.' },
          { role: 'user', content: 'Respond with exactly OK.' },
        ],
        {
          requestedModel: modelId,
          temperature: 0,
          maxTokens: 10,
          env: providerResolution.env,
        },
      );
      const latency = Date.now() - startTime;

      void supabase.from('integration_logs').insert({
        user_id: userId,
        action: 'model_test',
        status: 'success',
        duration_ms: latency,
        details: {
          requested_model: modelId,
          resolved_model: completion.model,
          model_profile: completion.profile,
          provider: completion.provider,
          provider_configuration_source: providerResolution.source,
          provider_connection_id: providerResolution.connectionId,
          target_region: targetRegion,
        },
      });

      log('Model connectivity test completed', {
        provider: completion.provider,
        model: completion.model,
        profile: completion.profile,
        providerSource: providerResolution.source,
        providerConnectionId: providerResolution.connectionId,
        latency,
      });

      return {
        success: true,
        latency,
        response: completion.text,
        requested_model: modelId,
        provider: completion.provider,
        model: completion.model,
        model_profile: completion.profile,
        provider_configuration_source: providerResolution.source,
        provider_connection_id: providerResolution.connectionId,
        region: targetRegion,
      };
    } catch (error) {
      if (error instanceof ModelRouterError) {
        throw { code: error.code, message: error.message, status: error.status };
      }
      throw error;
    }
  },
}));
