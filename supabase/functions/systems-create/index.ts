/**
 * /v1/systems-create
 * 
 * PURPOSE: Create a new AI system (agent draft)
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - name: string (required, min 2 chars)
 * - department: string (required, enum)
 * - outcome: string (optional, enum)
 * - successMetric: string (optional)
 * 
 * RESPONSE:
 * - system: Created system/agent object
 * - id: System ID
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Validation enums
const departmentEnum = ['Finance', 'Operations', 'Marketing', 'Sales', 'HR', 'IT', 'Engineering', 'Customer Support', 'Legal', 'Product', 'Human Resources'];
const outcomeEnum = ['Compliance', 'Predictive', 'Conversational', 'Automation'];

// Input validation schema
const InputSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  department: z.enum(departmentEnum as [string, ...string[]]),
  outcome: z.enum(outcomeEnum as [string, ...string[]]).optional(),
  successMetric: z.string().max(500).optional(),
});

serve(createHandler({
  name: "systems-create",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { name, department, outcome, successMetric } = input;
    const { supabase, userId, log } = context;

    log("Creating system", { name, department, outcome });

    // Create draft agent with proper config
    const { data: agent, error: dbError } = await supabase
      .from('agents')
      .insert({
        name,
        description: `${outcome || 'AI'} system for ${department}`,
        owner_id: userId,
        status: 'draft',
        version: 'v0',
        config: {
          department,
          outcome,
          successMetric,
          step: 1,
          selectedModel: 'google/gemini-2.5-flash',
          geminiEnabled: true,
          vertexEnabled: false,
          hybridSearch: true,
          topK: 20,
          topN: 6,
          temperature: 0.3,
          systemPrompt: '',
          connectors: {},
          workflowNodes: [],
        }
      })
      .select()
      .single();

    if (dbError) {
      log("System creation failed", { error: dbError.message, code: dbError.code });
      throw {
        code: 'DATABASE_ERROR',
        message: dbError.message,
        status: 500,
      };
    }

    log("System created successfully", { systemId: agent.id });

    return {
      system: agent,
      id: agent.id,
    };
  }
}));
