/**
 * Unified Template Service
 * Single source of truth for ALL template data
 * Loads from agent_templates Supabase table ONLY
 * 
 * This replaces all JSON file loading and provides:
 * - Schema validation
 * - Auto-repair of missing fields
 * - Consistent data structure
 * - Real-time updates
 */

import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Comprehensive template schema
export const TemplateSchema = z.object({
  // Core identification
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  icon: z.string(),
  
  // Classification
  industry: z.string().optional(),
  department: z.string().optional(),
  twin_type: z.enum(['operational', 'workforce', 'compliance', 'financial', 'supply_chain', 'predictive', 'sales_agent', 'support_agent', 'risk_agent']).optional(),
  
  // Metadata
  certified: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(0),
  downloads: z.number().default(0),
  roi_pct: z.number().default(0),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  
  // Configuration
  default_config: z.object({
    // LLM settings
    model: z.string().optional(),
    provider: z.string().optional(),
    temperature: z.number().optional(),
    
    // System prompt
    system_prompt: z.string().optional(),
    
    // Knowledge sources
    knowledge: z.array(z.any()).optional(),
    
    // Workflow
    workflow: z.object({
      triggers: z.array(z.string()).optional(),
      actions: z.array(z.any()).optional(),
      integrations: z.array(z.string()).optional(),
    }).optional(),
    workflows: z.array(z.any()).optional(),
    
    // Tools & Integrations - accept both string IDs and objects
    connectors: z.array(z.union([z.string(), z.object({ id: z.string() }).passthrough()])).optional(),
    mcp_servers: z.array(z.any()).optional(),
    
    // RAG configuration
    rag: z.object({
      provider: z.string().optional(),
      hybrid_search: z.boolean().optional(),
      top_k: z.number().optional(),
      embedding_model: z.string().optional(),
    }).optional(),
    
    // Metrics
    metrics_defaults: z.object({
      time_saved_per_run_min: z.number().optional(),
      runs_per_week: z.number().optional(),
      loaded_cost_per_hour: z.number().optional(),
      accuracy_improvement_pct: z.number().optional(),
      cost_per_error: z.number().optional(),
    }).optional(),
    
    // Additional fields
    blueprint: z.any().optional(),
    blueprint_json: z.any().optional(),
    kpis: z.array(z.any()).optional(),
    kpi_block: z.any().optional(),
    roi_block: z.any().optional(),
    simulation_scripts: z.array(z.any()).optional(),
    day_in_life: z.string().optional(),
    problem_statement: z.string().optional(),
    summary: z.string().optional(),
    industries: z.array(z.string()).optional(),
    departments: z.array(z.string()).optional(),
    cloud_deployment: z.any().optional(),
    preview_sections: z.any().optional(),
    cloud_metadata: z.any().optional(),
    simulation_preview_config: z.any().optional(),
    target_users: z.array(z.any()).optional(),
  }).default({}),
  
  // KPI definitions
  kpi_definitions: z.any().optional(),
  
  // Sample prompts
  sample_prompts: z.array(z.string()).default([]),
  
  // Recommended models
  recommended_models: z.array(z.string()).default([]),
  
  // Timestamps
  created_at: z.string(),
  updated_at: z.string(),
});

export type ValidatedTemplate = z.infer<typeof TemplateSchema>;

/**
 * Auto-repair template with missing or invalid fields
 */
function repairTemplate(template: any): ValidatedTemplate {
  const config = template.default_config || {};
  
  // Extract KPI block - handle various locations
  const kpiBlock = config.kpi_block || config.kpis || [];
  const roiBlock = config.roi_block || {};
  
  // If kpi_block is missing but roi_block exists, derive KPIs from ROI
  let kpis = kpiBlock;
  if ((!kpiBlock || (Array.isArray(kpiBlock) && kpiBlock.length === 0)) && roiBlock.example_impact_estimates) {
    kpis = roiBlock.example_impact_estimates.map((est: any) => ({
      label: est.label,
      key: est.metric,
      unit: '%',
      direction: 'higher',
      target: est.estimated_range
    }));
  }
  
  return {
    id: template.id || `template-${Date.now()}`,
    name: template.name || 'Untitled Template',
    description: template.description || 'No description available',
    category: template.category || 'general',
    icon: template.icon || '🤖',
    
    industry: template.industry || config.industry || config.industries?.[0] || undefined,
    department: template.department || config.department || config.departments?.[0] || undefined,
    twin_type: template.twin_type || config.type || undefined,
    
    certified: Boolean(template.certified),
    rating: typeof template.rating === 'number' ? template.rating : 0,
    downloads: typeof template.downloads === 'number' ? template.downloads : 0,
    roi_pct: typeof template.roi_pct === 'number' ? template.roi_pct : (roiBlock.example_impact_estimates?.[0]?.estimated_annual_roi_pct || 0),
    tags: Array.isArray(template.tags) ? template.tags : [],
    difficulty: template.difficulty || config.difficulty || undefined,
    
    default_config: {
      model: config.model || 'google/gemini-2.5-flash',
      provider: config.provider || 'google',
      temperature: typeof config.temperature === 'number' ? config.temperature : 0.7,
      system_prompt: config.system_prompt || template.system_prompt || `You are ${template.name}. Assist users professionally and accurately.`,
      knowledge: config.knowledge || [],
      workflow: config.workflow || { triggers: [], actions: [], integrations: [] },
      workflows: config.workflows || [],
      connectors: config.connectors || [],
      mcp_servers: config.mcp_servers || [],
      rag: config.rag || {},
      metrics_defaults: config.metrics_defaults || {},
      blueprint: config.blueprint || template.blueprint || {},
      blueprint_json: config.blueprint_json || config.blueprint || {},
      kpis: kpis,
      kpi_block: config.kpi_block || { kpis },
      roi_block: roiBlock,
      simulation_scripts: config.simulation_scripts || [],
      day_in_life: config.day_in_life || generateDayInLife(template),
      problem_statement: config.problem_statement || template.description,
      summary: config.summary || template.description,
      industries: config.industries || (template.industry ? [template.industry] : []),
      departments: config.departments || (template.department ? [template.department] : []),
      cloud_deployment: config.cloud_deployment || config.cloud_metadata || {},
      preview_sections: config.preview_sections || {},
      cloud_metadata: config.cloud_metadata || config.cloud_deployment || {},
      simulation_preview_config: config.simulation_preview_config || null,
      target_users: config.target_users || config.targetUsers || [],
    },
    
    kpi_definitions: template.kpi_definitions || {},
    sample_prompts: Array.isArray(template.sample_prompts) ? template.sample_prompts : [],
    recommended_models: Array.isArray(template.recommended_models) ? template.recommended_models : ['google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
    
    created_at: template.created_at || new Date().toISOString(),
    updated_at: template.updated_at || new Date().toISOString(),
  };
}

/**
 * Generate "Day in the Life" narrative if missing
 */
function generateDayInLife(template: any): string {
  const name = template.name || 'This agent';
  const industry = template.industry || 'business operations';
  const description = template.description || 'assists with various tasks';
  
  return `# A Day in the Life of ${name}

## Morning
${name} starts the day by analyzing incoming requests and prioritizing tasks based on urgency and importance. It reviews data from connected systems and prepares insights for the team.

## Midday  
Throughout the day, ${name} ${description.toLowerCase()}. It processes information in real-time, provides recommendations, and automates routine workflows to save time and reduce errors.

## Afternoon
As business hours continue, ${name} monitors key metrics and alerts stakeholders to any anomalies or opportunities. It learns from interactions to continuously improve its responses.

## Evening
Before the day ends, ${name} generates summary reports, tracks progress against goals, and prepares recommendations for the next day. All work is logged and auditable for compliance.

## Impact
By handling routine tasks automatically and providing intelligent insights, ${name} helps teams in ${industry} work more efficiently and make better decisions.`;
}

/**
 * Validate and repair a template
 */
export function validateTemplate(template: any): { valid: boolean; template: ValidatedTemplate; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Try to validate with schema
    const validated = TemplateSchema.parse(template);
    return { valid: true, template: validated, errors: [] };
  } catch (error) {
    // Validation failed, try to repair
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    }
    
    const repaired = repairTemplate(template);
    
    // Try to validate repaired template
    try {
      const validated = TemplateSchema.parse(repaired);
      return { valid: true, template: validated, errors: [`Auto-repaired: ${errors.join(', ')}`] };
    } catch (repairError) {
      return { valid: false, template: repaired, errors };
    }
  }
}

/**
 * Load all templates from Supabase
 * This is now the ONLY way to load templates
 */
export async function loadAllTemplates(): Promise<ValidatedTemplate[]> {
  console.log('[TemplateService] Loading templates from Supabase...');
  
  try {
    const { data: templates, error } = await supabase
      .from('agent_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[TemplateService] Error loading templates:', error);
      throw error;
    }
    
    if (!templates || templates.length === 0) {
      console.warn('[TemplateService] No templates found in database');
      return [];
    }
    
    console.log(`[TemplateService] Loaded ${templates.length} templates from Supabase`);
    
    // Validate and repair each template
    const validatedTemplates: ValidatedTemplate[] = [];
    
    for (const template of templates) {
      const result = validateTemplate(template);
      
      if (result.errors.length > 0) {
        console.warn(`[TemplateService] Template ${template.id} had validation issues:`, result.errors);
      }
      
      validatedTemplates.push(result.template);
    }
    
    // Sort: YVR first, then by rating, then by downloads
    validatedTemplates.sort((a, b) => {
      // YVR always first
      if (a.id === 'YVR_AIRPORT_DIGITAL_TWIN') return -1;
      if (b.id === 'YVR_AIRPORT_DIGITAL_TWIN') return 1;
      
      // Then by rating
      if (a.rating !== b.rating) return b.rating - a.rating;
      
      // Then by downloads
      return b.downloads - a.downloads;
    });
    
    console.log(`[TemplateService] Returning ${validatedTemplates.length} validated templates (YVR featured first)`);
    
    return validatedTemplates;
  } catch (error) {
    console.error('[TemplateService] Failed to load templates:', error);
    return [];
  }
}

/**
 * Load a single template by ID
 */
export async function loadTemplateById(templateId: string): Promise<ValidatedTemplate | null> {
  console.log('[TemplateService] Loading template:', templateId);
  
  try {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (error) {
      console.error('[TemplateService] Error loading template:', error);
      return null;
    }
    
    if (!data) {
      console.warn('[TemplateService] Template not found:', templateId);
      return null;
    }
    
    const { template, errors } = validateTemplate(data);
    
    if (errors.length > 0) {
      console.log(`[TemplateService] Template ${templateId} validation:`, errors);
    }
    
    return template;
  } catch (error) {
    console.error('[TemplateService] Failed to load template:', error);
    return null;
  }
}

/**
 * Search templates by query
 */
export async function searchTemplates(query: string, filters?: {
  industry?: string;
  department?: string;
  type?: string;
  certified?: boolean;
  minRating?: number;
}): Promise<ValidatedTemplate[]> {
  console.log('[TemplateService] Searching templates:', { query, filters });
  
  // Build query step by step to avoid deep type instantiation
  const queryBuilder = supabase
    .from('agent_templates')
    .select('*')
    .order('downloads', { ascending: false });
  
  // Apply text search
  let finalQuery = query 
    ? queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`) 
    : queryBuilder;
  
  // Note: Additional filters would require client-side filtering
  // to avoid TypeScript deep instantiation errors
  const { data, error } = await finalQuery;
  
  if (error) {
    console.error('[TemplateService] Search error:', error);
    throw error;
  }
  
  // Validate all results
  let validated = (data || []).map(t => validateTemplate(t).template);
  
  // Apply client-side filters
  if (filters?.industry) {
    validated = validated.filter(t => t.industry === filters.industry);
  }
  if (filters?.department) {
    validated = validated.filter(t => t.department === filters.department);
  }
  if (filters?.type) {
    validated = validated.filter(t => t.twin_type === filters.type);
  }
  if (filters?.certified !== undefined) {
    validated = validated.filter(t => t.certified === filters.certified);
  }
  if (filters?.minRating) {
    validated = validated.filter(t => t.rating >= filters.minRating);
  }
  
  console.log(`[TemplateService] Found ${validated.length} matching templates`);
  
  return validated;
}

/**
 * Get template statistics
 */
export async function getTemplateStats() {
  const templates = await loadAllTemplates();
  
  const byIndustry = new Map<string, number>();
  const byType = new Map<string, number>();
  let certified = 0;
  let totalRating = 0;
  let ratedCount = 0;
  
  for (const t of templates) {
    if (t.industry) {
      byIndustry.set(t.industry, (byIndustry.get(t.industry) || 0) + 1);
    }
    if (t.twin_type) {
      byType.set(t.twin_type, (byType.get(t.twin_type) || 0) + 1);
    }
    if (t.certified) {
      certified++;
    }
    if (t.rating > 0) {
      totalRating += t.rating;
      ratedCount++;
    }
  }
  
  return {
    total: templates.length,
    byIndustry: Object.fromEntries(byIndustry),
    byType: Object.fromEntries(byType),
    certified,
    avgRating: ratedCount > 0 ? totalRating / ratedCount : 0,
  };
}
