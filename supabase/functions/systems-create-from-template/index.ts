/**
 * /v1/systems-create-from-template
 * 
 * PURPOSE: Create a new system/agent instance from a template
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - templateId: string (required, UUID of template)
 * - templateType: 'm2m' | 'industry' (required, which table to query)
 * - customName: string (optional, override template name)
 * 
 * RESPONSE:
 * - systemId: string (UUID of created system)
 * - name: string
 * - status: string
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  templateId: z.string().uuid(),
  templateType: z.enum(['m2m', 'industry']),
  customName: z.string().optional(),
});

serve(createHandler({
  name: "systems-create-from-template",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { templateId, templateType, customName } = input;
    const { supabase, userId, log } = context;

    log('Creating system from template', { templateId, templateType });

    // Fetch template based on type
    const templateTable = templateType === 'm2m' ? 'm2m_templates' : 'industry_templates';
    const { data: template, error: templateError } = await supabase
      .from(templateTable)
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      log('Template not found', { error: templateError?.message });
      throw {
        code: 'NOT_FOUND',
        message: 'Template not found',
        status: 404,
      };
    }

    // Create system instance from template
    const systemName = customName || `${template.name} (Instance)`;
    const systemConfig = {
      ...template.default_config,
      department: template.default_config?.department || 'Operations',
      category: template.industry || 'General',
      templateType: templateType,
      sourceTemplateId: templateId,
      kpiDefinitions: template.kpi_definitions || [],
      samplePrompts: template.sample_prompts || [],
    };

    const { data: newSystem, error: createError } = await supabase
      .from('agents')
      .insert({
        name: systemName,
        description: template.description || '',
        owner_id: userId,
        template_id: templateId,
        status: 'draft',
        version: 'v1',
        config: systemConfig,
      })
      .select()
      .single();

    if (createError) {
      log('Failed to create system', { error: createError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: createError.message,
        status: 500,
      };
    }

    log('System created successfully', { systemId: newSystem.id });

    return {
      systemId: newSystem.id,
      name: newSystem.name,
      status: newSystem.status,
      templateId: templateId,
    };
  }
}));
