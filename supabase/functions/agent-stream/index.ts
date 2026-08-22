/**
 * /v1/agent-stream
 * Authenticated streaming execution through the canonical model router.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";
import { resolveRouterEnvironmentForUser } from "../_shared/ai-provider-connection.ts";
import {
  ModelRouterError,
  profileForAgent,
  requestChatCompletion,
} from "../_shared/model-router.ts";

// Best-effort instance-local limiter. It is deliberately not described as a
// durable/global quota; a future distributed limiter remains a separate gate.
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_RUNS_PER_HOUR = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 90_000;

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
  name: "agent-stream",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agentId, messages, params } = input;
    const { supabase, userId, log } = context;
    if (!userId) throw { code: 'UNAUTHORIZED', message: 'Authenticated user required', status: 401 };

    const now = Date.now();
    const userLimit = rateLimits.get(userId);
    if (userLimit && now < userLimit.resetAt) {
      if (userLimit.count >= MAX_RUNS_PER_HOUR) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: 'Rate limit exceeded. Max 30 streaming runs per function instance per hour.',
          status: 429,
        };
      }
      userLimit.count += 1;
    } else {
      rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    if (agentError || !agent) {
      throw { code: ErrorCodes.NOT_FOUND, message: 'Agent not found or access denied', status: 404 };
    }

    const config = (agent.config ?? {}) as Record<string, unknown>;
    const requestedModel = typeof config.model === 'string'
      ? config.model
      : typeof agent.model_id === 'string'
        ? agent.model_id
        : null;
    const profile = profileForAgent({
      slug: typeof agent.slug === 'string' ? agent.slug : null,
      name: typeof agent.name === 'string' ? agent.name : null,
      domain: typeof agent.domain === 'string' ? agent.domain : null,
      config,
    });
    const systemPrompt =
      (typeof config.system_prompt === 'string' && config.system_prompt) ||
      (typeof config.systemPrompt === 'string' && config.systemPrompt) ||
      'You are an AURA advisory agent. Ground conclusions in supplied evidence, distinguish facts from recommendations, and never claim to actuate infrastructure.';

    const fetchWithTimeout: typeof fetch = (input, init) => fetch(input, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const providerResolution = await resolveRouterEnvironmentForUser(userId);
    const startTime = Date.now();
    try {
      const { response: aiResponse, resolved } = await requestChatCompletion(
        [{ role: 'system', content: systemPrompt }, ...messages],
        {
          requestedModel,
          profile,
          temperature: params?.temperature ?? (typeof config.temperature === 'number' ? config.temperature : 0.3),
          maxTokens: params?.maxTokens ?? (typeof config.max_tokens === 'number' ? config.max_tokens : 2048),
          stream: true,
          fetchImpl: fetchWithTimeout,
          env: providerResolution.env,
        },
      );

      if (!aiResponse.ok) {
        throw new ModelRouterError(
          'MODEL_PROVIDER_ERROR',
          `${resolved.provider} model request failed with HTTP ${aiResponse.status}`,
          aiResponse.status === 429 ? 429 : 502,
        );
      }

      let fullResponse = '';
      const runId = crypto.randomUUID();
      const stream = new ReadableStream({
        async start(controller) {
          const reader = aiResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n').filter((line: string) => line.trim().startsWith('data: '));
              for (const line of lines) {
                const data = line.replace('data: ', '').trim();
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) fullResponse += content;
                } catch {
                  // Provider chunks can split JSON frames; forwarding is authoritative.
                }
              }
            }

            const latency = Date.now() - startTime;
            void supabase.from('agent_runs').insert({
              id: runId,
              agent_id: agentId,
              user_id: userId,
              input: { messages },
              output: {
                response: fullResponse,
                provider: resolved.provider,
                model: resolved.model,
                model_profile: resolved.profile,
                provider_configuration_source: providerResolution.source,
                provider_connection_id: providerResolution.connectionId,
              },
              status: 'completed',
              duration_ms: latency,
              completed_at: new Date().toISOString(),
            });
            log("Stream completed", {
              latency,
              provider: resolved.provider,
              model: resolved.model,
              profile: resolved.profile,
              providerSource: providerResolution.source,
              providerConnectionId: providerResolution.connectionId,
            });
            controller.close();
          } catch (err) {
            void supabase.from('agent_runs').insert({
              id: runId,
              agent_id: agentId,
              user_id: userId,
              input: { messages },
              output: {
                error: err instanceof Error ? err.message : 'Stream error',
                provider: resolved.provider,
                model: resolved.model,
                model_profile: resolved.profile,
                provider_configuration_source: providerResolution.source,
                provider_connection_id: providerResolution.connectionId,
              },
              status: 'failed',
              duration_ms: Date.now() - startTime,
              completed_at: new Date().toISOString(),
            });
            controller.error(err);
          }
        }
      });

      return {
        stream,
        provider: resolved.provider,
        model: resolved.model,
        model_profile: resolved.profile,
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
