/**
 * /v1/agent-plan-chat
 * Authenticated preview chat for a planned agent. The requested model is a
 * profile hint only and must resolve through the canonical runtime allowlist.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { resolveRouterEnvironmentForUser } from "../_shared/ai-provider-connection.ts";
import {
  ModelRouterError,
  makeChatCompletion,
} from "../_shared/model-router.ts";

const InputSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message too long"),
  agentName: z.string().min(1, "Agent name is required").max(200),
  agentDescription: z.string().max(2000).optional().default(""),
  department: z.string().max(200).optional().default(""),
  desiredOutcome: z.string().max(500).optional().default(""),
  successMetric: z.string().max(500).optional().default(""),
  workflow: z.string().max(200).optional().default(""),
  model: z.string().max(200).optional(),
});

serve(createHandler({
  name: "agent-plan-chat",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const {
      message,
      agentName,
      agentDescription,
      department,
      desiredOutcome,
      successMetric,
      workflow,
      model,
    } = input;
    const { log, userId } = context;
    if (!userId) throw { code: 'UNAUTHORIZED', message: 'Authenticated user required', status: 401 };

    const systemPrompt = `You are previewing the proposed AURA agent "${agentName}".

Agent details:
- Description: ${agentDescription || 'Not supplied'}
- Department/domain: ${department || 'Not supplied'}
- Desired outcome: ${desiredOutcome || 'Not supplied'}
- Success metric: ${successMetric || 'Not supplied'}
- Workflow type: ${workflow || 'Not supplied'}

Explain likely behavior, evidence requirements, limitations and human-approval steps. Do not claim the preview can actuate infrastructure, access data that was not supplied, or use a provider/model that the runtime did not actually resolve.`;

    const providerResolution = await resolveRouterEnvironmentForUser(userId);
    try {
      const completion = await makeChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        {
          requestedModel: model ?? null,
          profile: 'reasoning',
          temperature: 0.3,
          maxTokens: 1600,
          env: providerResolution.env,
        },
      );

      log("Agent preview response generated", {
        provider: completion.provider,
        model: completion.model,
        profile: completion.profile,
        providerSource: providerResolution.source,
        providerConnectionId: providerResolution.connectionId,
      });

      return {
        response: completion.text,
        provider: completion.provider,
        model: completion.model,
        model_profile: completion.profile,
        provider_configuration_source: providerResolution.source,
        provider_connection_id: providerResolution.connectionId,
      };
    } catch (error) {
      if (error instanceof ModelRouterError) {
        throw { code: error.code, message: error.message, status: error.status };
      }
      throw error;
    }
  }
}));
