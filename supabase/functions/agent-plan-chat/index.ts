import { isManagedAIConfigured, makeAIResponse } from "../_shared/ai-client.ts";
/**
 * /v1/agent-plan-chat
 * 
 * PURPOSE: Preview chat with planned agent
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - message: string (required)
 * - agentName: string (required)
 * - agentDescription: string (optional)
 * - department: string (optional)
 * - desiredOutcome: string (optional)
 * - successMetric: string (optional)
 * - workflow: string (optional)
 * 
 * RESPONSE:
 * - response: AI response text
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message too long"),
  agentName: z.string().min(1, "Agent name is required"),
  agentDescription: z.string().optional().default(""),
  department: z.string().optional().default(""),
  desiredOutcome: z.string().optional().default(""),
  successMetric: z.string().optional().default(""),
  workflow: z.string().optional().default(""),
});

serve(createHandler({
  name: "agent-plan-chat",
  authLevel: "public",
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
    } = input;
    const { log } = context;

    log("Agent plan chat", { agentName });

    // Get Lovable API key
    const LOVABLE_API_KEY = isManagedAIConfigured();
    if (!LOVABLE_API_KEY) {
      throw {
        code: 'CONFIGURATION_ERROR',
        message: 'AI service not configured',
        status: 500,
      };
    }

    // Create system prompt
    const systemPrompt = `You are ${agentName}, an AI agent preview assistant. 

Agent Details:
- Name: ${agentName}
- Description: ${agentDescription}
- Department: ${department}
- Desired Outcome: ${desiredOutcome}
- Success Metric: ${successMetric}
- Workflow Type: ${workflow}
- Response Profile: reasoning

Your role is to:
1. Explain how this agent would work in production
2. Answer questions about the agent's capabilities
3. Provide examples of how the agent would handle specific scenarios
4. Help users understand if this agent fits their needs

Be helpful, concise, and specific about this agent's capabilities. Use the agent configuration details to provide accurate, contextual responses.`;

    const response = await makeAIResponse(
      { messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ] },
      { model: 'reasoning', operation: 'agent-plan-chat' },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log("AI API error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: "Rate limit exceeded. Please try again in a moment.",
          status: 429,
        };
      }
      if (response.status === 402) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: "AI service requires payment. Please contact support.",
          status: 402,
        };
      }
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: "AI gateway error",
        status: 500,
      };
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    log("AI response generated");

    return { response: aiResponse };
  }
}));
