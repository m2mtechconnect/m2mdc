/**
 * /v1/copilot-chat
 * 
 * PURPOSE: AI Co-Pilot chat with optional knowledge grounding
 * AUTH: public (optional user context)
 * 
 * REQUEST:
 * - messages: array (required, chat messages)
 * - role: string (optional: Executive, Manager, Engineer)
 * - useGrounding: boolean (optional, enable knowledge base)
 * - settings: object (optional: model, temperature, maxTokens, systemPrompt)
 * 
 * RESPONSE:
 * - text: AI response text
 * - citations: Array of knowledge sources used
 * - metrics: Latency, model, grounding status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Role-aware system prompts
const ROLE_PROMPTS = {
  Executive: "Prioritize ROI, risk, compliance, time-to-value. Use bulleted answers.",
  Manager: "Prioritize workflow steps, owners, timelines, blockers.",
  Engineer: "Provide technical steps, logs, APIs, and pseudo-code when helpful."
};

// Input validation schema
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1, "At least one message required"),
  role: z.enum(['Executive', 'Manager', 'Engineer']).optional(),
  useGrounding: z.boolean().default(false),
  settings: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    systemPrompt: z.string().optional(),
  }).optional(),
});

serve(createHandler({
  name: "copilot-chat",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { messages, role, useGrounding, settings } = input;
    const { supabase, userId, log } = context;

    log("Co-Pilot request", { messageCount: messages.length, role, useGrounding });

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw {
        code: 'CONFIGURATION_ERROR',
        message: 'Lovable AI not configured. Contact support.',
        status: 500,
      };
    }

    // Model selection - ENFORCE GEMINI 3.X
    const lovableModel = 'google/gemini-3-pro-preview';

    // Build system prompt
    const rolePrompt = role ? ROLE_PROMPTS[role] : '';
    const systemPrompt = `${settings?.systemPrompt || 'You are M2M Co-Pilot.'}\n\n${rolePrompt}`;

    let citations: any[] = [];
    let groundedContext = "";

    // Fetch grounding context if enabled and user is authenticated
    if (useGrounding && userId) {
      log("Fetching grounding context");
      
      try {
        const userQuery = messages[messages.length - 1]?.content || "";
        
        // Fetch knowledge sources
        const { data: knowledgeSources } = await supabase
          .from('knowledge_sources')
          .select('*')
          .eq('user_id', userId)
          .limit(6);

        if (knowledgeSources && knowledgeSources.length > 0) {
          citations = knowledgeSources.map((ks: any) => ({
            title: ks.name,
            url: '',
            snippet: ks.description || ''
          }));

          groundedContext = knowledgeSources.map((ks: any) => 
            `${ks.name}\n${ks.description || ''}`
          ).join('\n\n');

          log("Retrieved knowledge sources", { count: citations.length });
        }
      } catch (error) {
        log("Grounding error", { error: String(error) });
        // Continue without grounding if it fails
      }
    }

    // Prepare messages for AI
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Add grounded context if available
    if (groundedContext) {
      aiMessages.push({
        role: 'system',
        content: `Context from knowledge base:\n\n${groundedContext}\n\nUse this context when answering.`
      });
    }

    const startTime = Date.now();

    log("Calling Lovable AI", { model: lovableModel });

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: lovableModel,
        messages: aiMessages,
        temperature: settings?.temperature || 0.3,
        max_tokens: settings?.maxTokens || 1024,
      })
    });

    const latency = Date.now() - startTime;

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      log("AI call failed", { status });
      
      if (status === 429) {
        throw {
          code: 'RATE_LIMIT',
          message: 'Rate limit exceeded. Please try again in a moment.',
          status: 429,
        };
      }
      if (status === 402) {
        throw {
          code: 'CREDITS_DEPLETED',
          message: 'AI credits depleted. Please add credits to continue.',
          status: 402,
        };
      }
      
      throw {
        code: 'EXTERNAL_API_ERROR',
        message: 'AI call failed. Please try again.',
        status: 500,
      };
    }

    const aiData = await aiResponse.json();
    const text = aiData.choices?.[0]?.message?.content || "No response generated";

    log("Co-Pilot success", { latency, citationCount: citations.length });

    return {
      text,
      citations,
      metrics: {
        latency_ms: latency,
        model: lovableModel,
        grounded: useGrounding && citations.length > 0
      }
    };
  }
}));
