/**
 * /v1/agent-stream
 * 
 * PURPOSE: Execute agent with streaming response
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - agentId: string (required, UUID)
 * - messages: array (required)
 * - params: object (optional: temperature, maxTokens)
 * 
 * RESPONSE:
 * - Server-Sent Events stream
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_RUNS_PER_HOUR = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 90000;

// Message schema
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

// Input validation schema
const InputSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID"),
  messages: z.array(MessageSchema).min(1, "At least one message required"),
  params: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
});

serve(createHandler({
  name: "agent-stream",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agentId, messages, params } = input;
    const { supabase, userId, log } = context;

    // Rate limiting check
    const now = Date.now();
    const userLimit = rateLimits.get(userId!);
    
    if (userLimit) {
      if (now < userLimit.resetAt) {
        if (userLimit.count >= MAX_RUNS_PER_HOUR) {
          throw {
            code: ErrorCodes.EXTERNAL_API_ERROR,
            message: 'Rate limit exceeded. Max 30 runs per hour.',
            status: 429,
          };
        }
        userLimit.count++;
      } else {
        rateLimits.set(userId!, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      rateLimits.set(userId!, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    log("Streaming agent", { agentId, messageCount: messages.length });

    // Fetch agent
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

    // Extract model and settings - ENFORCE GEMINI 3.X
    const modelId = agent.config?.model || agent.model_id || 'google/gemini-3-pro-preview';
    const temperature = params?.temperature ?? agent.config?.temperature ?? 0.7;
    const maxTokens = params?.maxTokens ?? agent.config?.max_tokens ?? 2048;
    const systemPrompt = agent.config?.system_prompt || 'You are a helpful AI assistant.';

    // Build messages with system prompt
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const startTime = Date.now();

    log("Calling Lovable AI", { model: modelId });

    // Call Lovable AI Gateway with streaming
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
        stream: true,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log("AI API error", { status: aiResponse.status, error: errorText });
      
      let errorMsg = 'AI service error';
      if (aiResponse.status === 429) {
        errorMsg = 'Rate limit exceeded. Please try again later.';
      } else if (aiResponse.status === 402) {
        errorMsg = 'Payment required. Please add funds to your Lovable AI workspace.';
      }
      
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: errorMsg,
        status: aiResponse.status,
      };
    }

    // Store run metadata
    let fullResponse = '';
    const runId = crypto.randomUUID();

    // Stream response
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

            // Forward chunk to client
            controller.enqueue(value);

            // Extract text for logging
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter((line: string) => line.trim().startsWith('data: '));
            
            for (const line of lines) {
              const data = line.replace('data: ', '').trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch (e) {
                // Ignore parse errors
              }
            }
          }

          // Log completed run (non-blocking)
          const latency = Date.now() - startTime;
          void supabase.from('agent_runs').insert({
            id: runId,
            agent_id: agentId,
            user_id: userId,
            input: { messages },
            output: { response: fullResponse },
            status: 'completed',
            duration_ms: latency,
            completed_at: new Date().toISOString()
          });

          log("Stream completed", { latency });
          controller.close();
        } catch (err) {
          log("Stream error", { error: String(err) });
          
          // Log failed run (non-blocking)
          void supabase.from('agent_runs').insert({
            id: runId,
            agent_id: agentId,
            user_id: userId,
            input: { messages },
            output: { error: err instanceof Error ? err.message : 'Stream error' },
            status: 'failed',
            duration_ms: Date.now() - startTime,
            completed_at: new Date().toISOString()
          });

          controller.error(err);
        }
      }
    });

    return { stream };
  }
}));
