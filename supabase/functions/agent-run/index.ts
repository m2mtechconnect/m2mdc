/**
 * /v1/agent-run
 * Execute an authenticated AURA agent conversation through the canonical
 * provider/model router. Agent role and model provider remain separate.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";
import {
  ModelRouterError,
  makeChatCompletion,
  profileForAgent,
} from "../_shared/model-router.ts";

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const InputSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID"),
  messages: z.array(MessageSchema).min(1, "At least one message required"),
  params: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().max(32768).optional(),
  }).optional(),
});

serve(createHandler({
  name: "agent-run",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agentId, messages, params } = input;
    const { supabase, userId, log } = context;

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: 'Agent not found or access denied',
        status: 404,
      };
    }

    const config = (agent.config ?? {}) as Record<string, unknown>;
    const requestedModel = typeof config.model === 'string'
      ? config.model
      : typeof agent.model_id === 'string'
        ? agent.model_id
        : null;
    const temperature = params?.temperature ??
      (typeof config.temperature === 'number' ? config.temperature : 0.3);
    const maxTokens = params?.maxTokens ??
      (typeof config.max_tokens === 'number' ? config.max_tokens : 2048);
    const systemPrompt =
      (typeof config.system_prompt === 'string' && config.system_prompt) ||
      (typeof config.systemPrompt === 'string' && config.systemPrompt) ||
      'You are an AURA advisory agent. Ground conclusions in supplied evidence, distinguish facts from recommendations, and never claim to actuate infrastructure.';

    const profile = profileForAgent({
      slug: typeof agent.slug === 'string' ? agent.slug : null,
      name: typeof agent.name === 'string' ? agent.name : null,
      domain: typeof agent.domain === 'string' ? agent.domain : null,
      config,
    });

    const startTime = Date.now();
    try {
      const completion = await makeChatCompletion(
        [{ role: 'system', content: systemPrompt }, ...messages],
        { requestedModel, profile, temperature, maxTokens },
      );
      const latency = Date.now() - startTime;

      void supabase.from('agent_runs').insert({
        agent_id: agentId,
        user_id: userId,
        input: { messages },
        output: {
          response: completion.text,
          provider: completion.provider,
          model: completion.model,
          model_profile: completion.profile,
        },
        status: 'completed',
        duration_ms: latency,
        completed_at: new Date().toISOString(),
      });

      log("Agent execution completed", {
        latency,
        provider: completion.provider,
        model: completion.model,
        profile: completion.profile,
      });

      return {
        response: completion.text,
        latency_ms: latency,
        provider: completion.provider,
        model: completion.model,
        model_profile: completion.profile,
      };
    } catch (error) {
      if (error instanceof ModelRouterError) {
        throw { code: error.code, message: error.message, status: error.status };
      }
      throw error;
    }
  }
}));
