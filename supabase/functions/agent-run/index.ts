/**
 * /v1/agent-run
 * 
 * PURPOSE: Execute an AI agent with messages
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - agentId: string (required)
 * - messages: array (required)
 * - params: object (optional: temperature, maxTokens)
 * 
 * RESPONSE:
 * - response: AI response text
 * - latency_ms: Execution time
 * - model: Model used
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const InputSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID"),
  messages: z.array(MessageSchema).min(1, "At least one message required"),
  params: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
});

serve(createHandler({
  name: "agent-run",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agentId, messages, params } = input;
    const { supabase, userId, log } = context;

    log("Executing agent", { agentId, messageCount: messages.length });

    // Fetch agent and verify access (RLS will enforce)
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      log("Agent not found", { error: agentError?.message });
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: 'Agent not found or access denied',
        status: 404,
      };
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      log("LOVABLE_API_KEY not configured");
      throw {
        code: 'CONFIGURATION_ERROR',
        message: 'AI service not configured',
        status: 500,
      };
    }

    // Extract model and settings from agent config
    const modelId = agent.config?.model || agent.model_id || 'google/gemini-2.5-flash';
    const temperature = params?.temperature ?? agent.config?.temperature ?? 0.7;
    const maxTokens = params?.maxTokens ?? agent.config?.max_tokens ?? 1024;
    const systemPrompt = agent.config?.system_prompt || 'You are a helpful AI assistant.';

    // Build messages with system prompt
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const startTime = Date.now();

    log("Calling Lovable AI", { model: modelId });

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: aiMessages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      })
    });

    const latency = Date.now() - startTime;

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log("AI API error", { status: aiResponse.status, error: errorText });
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: aiResponse.status === 429 ? 'Rate limit exceeded' : 'Model call failed',
        status: 500,
      };
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || 'No response';

    // Log run to database (non-blocking)
    void supabase
      .from('agent_runs')
      .insert({
        agent_id: agentId,
        user_id: userId,
        input: { messages },
        output: { response: responseText },
        status: 'completed',
        duration_ms: latency,
        completed_at: new Date().toISOString()
      });

    log("Agent execution completed", { latency });

    return {
      response: responseText,
      latency_ms: latency,
      model: modelId
    };
  }
}));
