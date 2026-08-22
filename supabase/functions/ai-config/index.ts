import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { resolveRouterEnvironmentForUser } from "../_shared/ai-provider-connection.ts";
import {
  providerReadiness,
  resolveModel,
  type AgentModelProfile,
} from "../_shared/model-router.ts";

const InputSchema = z.object({}).passthrough();
const PROFILES: AgentModelProfile[] = ['fast', 'reasoning', 'supervisor'];

serve(createHandler({
  name: 'ai-config',
  authLevel: 'user',
  inputSchema: InputSchema,
  handler: async (_input, context) => {
    const { userId } = context;
    if (!userId) throw { code: 'UNAUTHORIZED', message: 'Authenticated user required', status: 401 };

    const providerResolution = await resolveRouterEnvironmentForUser(userId);
    const readiness = providerReadiness(providerResolution.env);
    const resolvedProfiles: Record<string, unknown> = {};
    let ready = true;

    for (const profile of PROFILES) {
      try {
        const resolved = resolveModel({ profile, env: providerResolution.env });
        resolvedProfiles[profile] = {
          available: true,
          provider: resolved.provider,
          model: resolved.model,
          endpoint: resolved.endpoint,
        };
      } catch (error) {
        ready = false;
        resolvedProfiles[profile] = {
          available: false,
          reason: error instanceof Error ? error.message : 'Provider is not configured',
        };
      }
    }

    return {
      active_provider: readiness.selectedProvider,
      provider_configuration_source: providerResolution.source,
      provider_connection_id: providerResolution.connectionId,
      ready,
      primary: {
        provider: readiness.selectedProvider,
        available: ready,
        models: resolvedProfiles,
      },
      providers: readiness,
      disclosure: {
        agent_authority: 'human-approved advisory output only',
        nvidia_runtime: 'NVIDIA model availability does not by itself prove NIM/NeMo/self-hosted runtime execution',
        provider_connection: providerResolution.connectionId
          ? 'Selected from an enabled tenant-visible AURA Connections provider with an encrypted server-side credential.'
          : 'No active Connections override; server environment/default provider is in effect.',
        secrets_returned: false,
      },
    };
  },
}));
