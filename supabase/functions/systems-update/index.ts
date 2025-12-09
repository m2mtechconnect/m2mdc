/**
 * /v1/systems-update
 * 
 * PURPOSE: Update an existing AI system configuration
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - id: string (required, system ID)
 * - name: string (optional)
 * - department: string (optional, enum)
 * - outcome: string (optional, enum)
 * - successMetric: string (optional)
 * - step: number (optional, 1-6)
 * - selectedModel: string (optional)
 * - geminiEnabled: boolean (optional)
 * - vertexEnabled: boolean (optional)
 * - hybridSearch: boolean (optional)
 * - topK: number (optional, 1-100)
 * - topN: number (optional, 1-20)
 * - temperature: number (optional, 0-2)
 * - systemPrompt: string (optional)
 * - connectors: object (optional)
 * - workflowNodes: array (optional)
 * - recommendationData: any (optional)
 * 
 * RESPONSE:
 * - system: Updated system/agent object
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Validation enums
const departmentEnum = ['Finance', 'Operations', 'Marketing', 'Sales', 'HR', 'IT', 'Engineering', 'Customer Support', 'Legal', 'Product', 'Human Resources'];
const outcomeEnum = ['Compliance', 'Predictive', 'Conversational', 'Automation'];

// Input validation schema
const InputSchema = z.object({
  id: z.string().uuid("Invalid system ID"),
  name: z.string().min(2).max(200).optional(),
  department: z.enum(departmentEnum as [string, ...string[]]).optional(),
  outcome: z.enum(outcomeEnum as [string, ...string[]]).optional(),
  successMetric: z.string().max(500).optional(),
  step: z.number().int().min(1).max(6).optional(),
  templateId: z.string().trim().min(1).max(100).nullable().optional(),
  selectedModel: z.string().nullable().optional(),
  geminiEnabled: z.boolean().optional(),
  vertexEnabled: z.boolean().optional(),
  hybridSearch: z.boolean().optional(),
  topK: z.number().int().min(1).max(100).optional(),
  topN: z.number().int().min(1).max(20).optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().optional(),
  connectors: z.record(z.unknown()).optional(),
  workflowNodes: z.array(z.unknown()).optional(),
  recommendationData: z.unknown().optional(),
});

serve(createHandler({
  name: "systems-update",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { id: systemId, name, ...updates } = input;
    const { supabase, userId, log } = context;

    log("Updating system", { systemId, updates: Object.keys(updates) });

    // Get existing agent to verify ownership and merge config
    const { data: existing, error: fetchError } = await supabase
      .from('agents')
      .select('config, name')
      .eq('id', systemId)
      .eq('owner_id', userId)
      .maybeSingle();

    if (fetchError) {
      log("Fetch error", { error: fetchError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: fetchError.message,
        status: 500,
      };
    }

    if (!existing) {
      log("System not found or access denied", { systemId });
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: 'System not found or you do not have permission to update it',
        status: 404,
      };
    }

    // Merge config with existing values
    const existingConfig = (existing?.config as any) || {};
    const updatedConfig = {
      ...existingConfig,
      ...(updates.department !== undefined && { department: updates.department }),
      ...(updates.outcome !== undefined && { outcome: updates.outcome }),
      ...(updates.successMetric !== undefined && { successMetric: updates.successMetric }),
      ...(updates.step !== undefined && { step: updates.step }),
      ...(updates.templateId !== undefined && { templateId: updates.templateId }),
      ...(updates.selectedModel !== undefined && { selectedModel: updates.selectedModel }),
      ...(updates.geminiEnabled !== undefined && { geminiEnabled: updates.geminiEnabled }),
      ...(updates.vertexEnabled !== undefined && { vertexEnabled: updates.vertexEnabled }),
      ...(updates.hybridSearch !== undefined && { hybridSearch: updates.hybridSearch }),
      ...(updates.topK !== undefined && { topK: updates.topK }),
      ...(updates.topN !== undefined && { topN: updates.topN }),
      ...(updates.temperature !== undefined && { temperature: updates.temperature }),
      ...(updates.systemPrompt !== undefined && { systemPrompt: updates.systemPrompt }),
      ...(updates.connectors !== undefined && { connectors: updates.connectors }),
      ...(updates.workflowNodes !== undefined && { workflowNodes: updates.workflowNodes }),
      ...(updates.recommendationData !== undefined && { recommendationData: updates.recommendationData }),
    };

    // Update agent
    const updateData: any = {
      config: updatedConfig,
      updated_at: new Date().toISOString()
    };
    if (name) updateData.name = name;

    const { data: agent, error: updateError } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', systemId)
      .eq('owner_id', userId)
      .select()
      .single();

    if (updateError) {
      log("Update error", { error: updateError.message, code: updateError.code });
      throw {
        code: 'DATABASE_ERROR',
        message: updateError.message,
        status: 500,
      };
    }

    log("System updated successfully", { systemId: agent.id });

    return { system: agent };
  }
}));
