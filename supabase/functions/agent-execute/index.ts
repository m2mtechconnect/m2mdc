/**
 * /v1/agent-execute
 * Authenticated conversational execution through the canonical model router.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";
import { resolveRouterEnvironmentForUser } from "../_shared/ai-provider-connection.ts";
import {
  ModelRouterError,
  makeChatCompletion,
  profileForAgent,
  type ModelMessage,
} from "../_shared/model-router.ts";

const InputSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID"),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, "Message is required").max(10000, "Message too long (max 10000 characters)"),
  stream: z.boolean().optional().default(false),
});

serve(createHandler({
  name: "agent-execute",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agentId, conversationId, message, stream } = input;
    const { supabase, userId, log } = context;
    if (!userId) throw { code: 'UNAUTHORIZED', message: 'Authenticated user required', status: 401 };
    const startTime = Date.now();

    if (stream) {
      throw {
        code: 'STREAMING_ENDPOINT_REQUIRED',
        message: 'Use agent-stream for streaming execution',
        status: 400,
      };
    }

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) {
      throw { code: ErrorCodes.NOT_FOUND, message: 'Agent not found', status: 404 };
    }

    let conversation: { id: string } | null = null;
    if (conversationId) {
      const { data: existingConv, error: conversationError } = await supabase
        .from('agent_conversations')
        .select('id, agent_id, user_id')
        .eq('id', conversationId)
        .eq('agent_id', agentId)
        .eq('user_id', userId)
        .maybeSingle();
      if (conversationError) throw conversationError;
      if (!existingConv) {
        throw {
          code: ErrorCodes.NOT_FOUND,
          message: 'Conversation not found for this agent and user',
          status: 404,
        };
      }
      conversation = existingConv;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: userId,
          title: message.substring(0, 50),
        })
        .select('id')
        .maybeSingle();
      if (convError) throw convError;
      if (!newConv) throw new Error('Failed to create conversation');
      conversation = newConv;
    }

    const { error: userMessageError } = await supabase
      .from('agent_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
      });
    if (userMessageError) throw userMessageError;

    const { data: messages, error: historyError } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    if (historyError) throw historyError;

    const config = (agent.config ?? {}) as Record<string, unknown>;
    const requestedModel = typeof config.model === 'string' ? config.model : null;
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

    const history: ModelMessage[] = (messages ?? [])
      .filter((entry: { role?: string; content?: string }) =>
        ['user', 'assistant', 'system'].includes(entry.role ?? '') && typeof entry.content === 'string')
      .map((entry: { role: string; content: string }) => ({
        role: entry.role as ModelMessage['role'],
        content: entry.content,
      }));

    const providerResolution = await resolveRouterEnvironmentForUser(userId);
    try {
      const completion = await makeChatCompletion(
        [{ role: 'system', content: systemPrompt }, ...history],
        {
          requestedModel,
          profile,
          temperature: typeof config.temperature === 'number' ? config.temperature : 0.3,
          maxTokens: typeof config.max_tokens === 'number' ? config.max_tokens : 2000,
          env: providerResolution.env,
        },
      );

      const { error: assistantMessageError } = await supabase
        .from('agent_messages')
        .insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: completion.text,
          metadata: {
            provider: completion.provider,
            model: completion.model,
            model_profile: completion.profile,
            provider_configuration_source: providerResolution.source,
            provider_connection_id: providerResolution.connectionId,
            tokens: completion.usage,
          },
        });
      if (assistantMessageError) throw assistantMessageError;

      const duration = Date.now() - startTime;
      void supabase.from('agent_runs').insert({
        agent_id: agentId,
        user_id: userId,
        input: { message },
        output: {
          response: completion.text,
          provider: completion.provider,
          model: completion.model,
          model_profile: completion.profile,
          provider_configuration_source: providerResolution.source,
          provider_connection_id: providerResolution.connectionId,
        },
        status: 'completed',
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      });

      void supabase
        .from('agents')
        .update({ total_runs: (agent.total_runs || 0) + 1 })
        .eq('id', agentId);

      log("Agent execution completed", {
        duration,
        provider: completion.provider,
        model: completion.model,
        profile: completion.profile,
        providerSource: providerResolution.source,
        providerConnectionId: providerResolution.connectionId,
      });

      return {
        conversationId: conversation.id,
        response: completion.text,
        duration_ms: duration,
        usage: completion.usage,
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
