/**
 * /v1/agent-execute
 * 
 * PURPOSE: Execute agent conversation
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - agentId: string (required, UUID)
 * - conversationId: string (optional, UUID)
 * - message: string (required, max 10000 chars)
 * - stream: boolean (optional, default: false)
 * 
 * RESPONSE:
 * - conversationId: UUID of conversation
 * - response: AI response text
 * - duration_ms: Execution time
 * - usage: Token usage stats
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
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
    const { agentId, conversationId, message } = input;
    const { supabase, userId, log } = context;
    const startTime = Date.now();

    log("Executing agent", { agentId, hasConversationId: !!conversationId });

    // Get agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) {
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: 'Agent not found',
        status: 404,
      };
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      const { data: existingConv } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      conversation = existingConv;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: userId,
          title: message.substring(0, 50),
        })
        .select()
        .maybeSingle();
      
      if (convError) throw convError;
      if (!newConv) throw new Error('Failed to create conversation');
      conversation = newConv;
    }

    // Store user message
    await supabase
      .from('agent_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
      });

    // Get conversation history
    const { data: messages } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    // Build message array for AI
    const aiMessages = messages?.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })) || [];

    // Add system prompt
    const systemPrompt = agent.config?.systemPrompt || 
      'You are a helpful AI assistant. Provide accurate, grounded responses.';
    
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...aiMessages,
    ];

    // Get Lovable API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw {
        code: 'CONFIGURATION_ERROR',
        message: 'AI service not configured',
        status: 500,
      };
    }

    const model = agent.config?.model || 'google/gemini-2.5-flash';
    const temperature = agent.config?.temperature || 0.7;

    log("Calling Lovable AI", { model });

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: 2000,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log("AI API error", { status: aiResponse.status, error: errorText });
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: aiResponse.status === 429 ? 'Rate limit exceeded' : 'AI API error',
        status: 500,
      };
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      log("No message in AI response", { aiData });
      throw new Error('Invalid AI response format');
    }

    // Store assistant message
    await supabase
      .from('agent_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        metadata: {
          model,
          tokens: aiData.usage,
        },
      });

    const duration = Date.now() - startTime;

    // Create run record (non-blocking)
    void supabase
      .from('agent_runs')
      .insert({
        agent_id: agentId,
        user_id: userId,
        input: { message },
        output: { response: assistantMessage },
        status: 'completed',
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      });

    // Update agent stats (non-blocking)
    void supabase
      .from('agents')
      .update({ total_runs: (agent.total_runs || 0) + 1 })
      .eq('id', agentId);

    log("Agent execution completed", { duration });

    return {
      conversationId: conversation.id,
      response: assistantMessage,
      duration_ms: duration,
      usage: aiData.usage,
    };
  }
}));
