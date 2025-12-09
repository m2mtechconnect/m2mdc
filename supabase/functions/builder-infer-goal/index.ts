/**
 * /v1/builder-infer-goal
 * 
 * PURPOSE: Infer department, outcome, and success metric from system name
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - systemName: string (required)
 * - department: string (optional, current department)
 * - description: string (optional)
 * 
 * RESPONSE:
 * - department: Inferred department
 * - outcome: Inferred outcome type
 * - successMetric: Inferred success metric
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const DEPARTMENTS = ['Finance', 'Operations', 'Marketing', 'Sales', 'HR', 'IT', 'Engineering', 'Customer Support', 'Legal', 'Product', 'Human Resources'];
const OUTCOMES = ['Compliance', 'Predictive', 'Conversational', 'Automation'];
const SUCCESS_METRICS = ['hours_saved', 'accuracy_improved', 'cost_reduced', 'response_time'];

// Input validation schema
const InputSchema = z.object({
  systemName: z.string().min(1, "System name is required"),
  department: z.string().optional(),
  description: z.string().optional(),
});

serve(createHandler({
  name: "builder-infer-goal",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { systemName, department, description } = input;
    const { log } = context;

    log("Inferring goal", { systemName, department });

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw {
        code: 'CONFIGURATION_ERROR',
        message: 'AI service not configured',
        status: 500,
      };
    }

    const systemPrompt = `You are an AI system design expert. Given a system name and optional context, infer the most appropriate:
1. Department: One of [${DEPARTMENTS.join(', ')}]
2. Outcome: One of [${OUTCOMES.join(', ')}]
3. Success Metric: One of [${SUCCESS_METRICS.join(', ')}]

Guidelines:
- Compliance: For regulatory, policy, audit systems
- Predictive: For forecasting, analytics, trend analysis
- Conversational: For customer support, chat, Q&A systems
- Automation: For workflow automation, task processing

Return only JSON with keys: department, outcome, successMetric`;

    const userPrompt = `System Name: "${systemName}"
${department ? `Current Department: ${department}` : ''}
${description ? `Description: ${description}` : ''}

Infer the best department, outcome, and successMetric for this AI system.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log("AI API error", { status: aiResponse.status, error: errorText });
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: 'AI inference failed',
        status: 500,
      };
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: 'No content generated',
        status: 500,
      };
    }

    // Parse AI response
    let inference;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      inference = JSON.parse(jsonStr);
    } catch (parseError) {
      log("JSON parse error, using heuristics", { error: String(parseError) });
      
      // Fallback to basic heuristics
      const lowerName = systemName.toLowerCase();
      inference = {
        department: department || (
          lowerName.includes('finance') || lowerName.includes('accounting') ? 'Finance' :
          lowerName.includes('sales') || lowerName.includes('marketing') ? 'Sales' :
          lowerName.includes('hr') || lowerName.includes('human') ? 'HR' :
          lowerName.includes('support') || lowerName.includes('customer') ? 'Customer Support' :
          lowerName.includes('engineer') || lowerName.includes('tech') ? 'Engineering' :
          'Operations'
        ),
        outcome: (
          lowerName.includes('compliance') || lowerName.includes('policy') || lowerName.includes('audit') ? 'Compliance' :
          lowerName.includes('forecast') || lowerName.includes('predict') || lowerName.includes('analytic') ? 'Predictive' :
          lowerName.includes('chat') || lowerName.includes('support') || lowerName.includes('assistant') ? 'Conversational' :
          'Automation'
        ),
        successMetric: (
          lowerName.includes('cost') || lowerName.includes('save') ? 'cost_reduced' :
          lowerName.includes('accuracy') || lowerName.includes('quality') ? 'accuracy_improved' :
          lowerName.includes('time') || lowerName.includes('speed') || lowerName.includes('fast') ? 'response_time' :
          'hours_saved'
        )
      };
    }

    // Validate and sanitize response
    const result: Record<string, string> = {};

    if (inference.department && DEPARTMENTS.includes(inference.department)) {
      result.department = inference.department;
    }

    if (inference.outcome && OUTCOMES.includes(inference.outcome)) {
      result.outcome = inference.outcome;
    }

    if (inference.successMetric && SUCCESS_METRICS.includes(inference.successMetric)) {
      result.successMetric = inference.successMetric;
    }

    log("Goal inferred", result);

    return result;
  }
}));
