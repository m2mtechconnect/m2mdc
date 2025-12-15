/**
 * /v1/builders-create
 * 
 * PURPOSE: Create a new builder draft (agent/twin draft)
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - source: string (optional) - "file" | "questionnaire" | "template" | "url" | "manual" | "homepage" | "dashboard" | "imported"
 * - goal: string (optional)
 * - industry: string (optional)
 * - department: string (optional)
 * - type: string (optional) - "agent" | "process_twin" | "3d_twin"
 * - template_id: string (optional)
 * 
 * RESPONSE:
 * - id: Builder ID
 * - builder: Full builder object
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  source: z.enum(['file', 'questionnaire', 'template', 'url', 'manual', 'homepage', 'dashboard', 'imported', 'manage-agents', 'blank']).nullish(),
  goal: z.string().nullish(),
  industry: z.string().nullish(),
  department: z.string().nullish(),
  type: z.enum(['agent', 'process_twin', '3d_twin']).nullish(),
  template_id: z.string().nullish(), // Accept both UUID and slug strings
});

serve(createHandler({
  name: "builders-create",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { source, goal, industry, department, type, template_id } = input;
    const { supabase, userId, log } = context;

    log("Creating builder draft", { source, goal, industry, department, type });

    // Create draft agent with builder state
    const { data: draft, error: dbError } = await supabase
      .from('agents')
      .insert({
        name: goal || 'Untitled Agent',
        description: `Draft ${type || 'agent'} for ${department || 'unspecified department'}`,
        owner_id: userId,
        status: 'draft',
        version: 'v0',
        template_id: template_id || null,
        config: {
          source: source || 'dashboard',
          goal: goal || '',
          industry: industry || '',
          department: department || '',
          type: type || null,
          template_id: template_id || null,
          workflow: {
            triggers: [],
            actions: [],
            integrations: [],
            hitl: []
          },
          model_config: {
            provider: 'google',
            model: 'google/gemini-2.5-flash',
            rag: {},
            policies: {},
            mcp_servers: []
          },
          step_completed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) {
      log("Builder creation failed", { error: dbError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: dbError.message,
        status: 500,
      };
    }

    log("Builder draft created", { builderId: draft.id });

    return {
      id: draft.id,
      builder: draft
    };
  }
}));
