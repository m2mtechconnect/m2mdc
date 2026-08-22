import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
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
  handler: async () => {
    const readiness = providerReadiness();
    const resolvedProfiles: Record<string, unknown> = {};
    let ready = true;

    for (const profile of PROFILES) {
      try {
        const resolved = resolveModel({ profile });
        resolvedProfiles[profile] = {
          available: true,
          provider: resolved.provider,
          model: resolved.model,
          // Endpoint host/path is operational metadata, never an API key.
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
        secrets_returned: false,
      },
    };
  },
}));
