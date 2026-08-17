import { AgentBlueprint, TemplateSourceEntry } from "@/types/agentBlueprint";
import type { ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';
import { autoRepairWorkflow, validateRepairedWorkflow } from '@/lib/validation/workflowAutoRepair';

/**
 * Converts a validated template into an AgentBlueprint for the Builder
 * Works with unified template service schema
 * 
 * @param template - Validated template from unified service
 * @param sourceEntry - Where the template was selected from
 */
export function templateToBlueprint(
  template: ValidatedTemplate, 
  sourceEntry: TemplateSourceEntry = "marketplace"
): AgentBlueprint {
  const config = template.default_config as any || {};
  
  // Handle workflows - can be in config.workflows (Data Centre) or config.workflow (legacy)
  const workflowsArray = Array.isArray(config.workflows) ? config.workflows : [];
  const workflowLegacy = config.workflow || { triggers: [], actions: [], integrations: [] };
  
  // Templates authored as JSON files carry these at the top level; builder
  // drafts carry them inside default_config. Support both.
  const metrics = config.metrics_defaults || (template as any).metrics_defaults || {};
  const blueprint = config.blueprint_json || config.blueprint || (template as any).blueprint || {};
  const llm = config.llm || (template as any).llm || {};
  
  // Extract KPI block - handle various structures
  const kpiBlock = config.kpi_block || {};
  const roiBlock = config.roi_block || {};
  const kpis = kpiBlock.kpis || config.kpis || blueprint.kpis || [];
  
  // Extract day in the life content
  const previewSections = config.preview_sections || {};
  const dayInLifeSection = previewSections.day_in_the_life || {};
  const dayInLifeRoles = Array.isArray(dayInLifeSection.roles) ? dayInLifeSection.roles : [];
  const dayInLifeNarrative = dayInLifeRoles.map(r => `**${r.role}**: ${r.narrative}`).join('\n\n') 
    || config.day_in_life 
    || '';

  // Get industries and departments (handle arrays from Data Centre template)
  const industries = Array.isArray(config.industries) ? config.industries : (template.industry ? [template.industry] : []);
  const departments = Array.isArray(config.departments) ? config.departments : (template.department ? [template.department] : []);
  const primaryIndustry = industries[0] || template.industry || null;
  const primaryDepartment = departments[0] || template.department || null;

  // Calculate time saved
  const timeSavedPerWeek = metrics.time_saved_per_run_min && metrics.runs_per_week
    ? `${Math.round((metrics.time_saved_per_run_min * metrics.runs_per_week) / 60)} hrs/week`
    : null;

  // Calculate efficiency gain
  const efficiencyGain = metrics.accuracy_improvement_pct
    ? `${metrics.accuracy_improvement_pct}%`
    : null;
  
  // Extract goals from KPIs or problem statement
  let goals: string[] = [];
  if (kpis.length > 0) {
    goals = kpis.map((k: any) => {
      const label = k.label || k.name || k.key;
      const target = k.target_value ?? k.target;
      if (target === undefined || target === null) return label;
      const rawUnit = k.unit || k.metric || '';
      const unit = rawUnit === 'percentage' ? '%' : rawUnit === 'ratio' || rawUnit === 'score' ? '' : rawUnit;
      return `${label}: ${target}${unit}`;
    });
  } else if (config.problem_statement) {
    goals = [config.problem_statement];
  } else {
    goals = ['Automate processes', 'Improve efficiency', 'Reduce errors'];
  }

  // Build workflow from either workflows array or legacy workflow
  let triggers: any[] = [];
  let actions: any[] = [];
  let integrations: string[] = [];
  
  if (workflowsArray.length > 0) {
    // Extract from workflows array (Data Centre template structure)
    workflowsArray.forEach((wf: any) => {
      if (wf.trigger) {
        triggers.push({
          id: wf.id,
          name: wf.name,
          type: wf.trigger.type || 'trigger',
          config: wf.trigger
        });
      }
      if (Array.isArray(wf.actions)) {
        actions.push(...wf.actions.map((a: any, idx: number) => ({
          id: `${wf.id}-action-${idx}`,
          name: a.type || a.name || 'Action',
          type: 'action',
          config: a
        })));
      }
    });
  } else {
    // Use legacy workflow structure
    triggers = Array.isArray(workflowLegacy.triggers) 
      ? workflowLegacy.triggers.map((t: any) => typeof t === 'string' ? { name: t, type: 'trigger' } : t)
      : [];
    actions = Array.isArray(workflowLegacy.actions) 
      ? workflowLegacy.actions.map((a: any) => typeof a === 'string' ? { name: a, type: 'action' } : a)
      : blueprint.workflow_steps?.map((s: any) => ({ name: s.label, type: s.type })) || [];
    integrations = Array.isArray(workflowLegacy.integrations) 
      ? workflowLegacy.integrations 
      : [];
  }

  // Templates may describe their flow as a flat node list.
  if (triggers.length === 0 && actions.length === 0 && Array.isArray(config.workflowNodes)) {
    config.workflowNodes.forEach((node: any, idx: number) => {
      const entry = {
        id: node.id || `node-${idx}`,
        name: node.name || node.label || node.type || 'Step',
        type: node.type || 'action',
        config: node,
      };
      if (node.type === 'trigger' || node.type === 'ingest' || node.type === 'monitor') {
        triggers.push(entry);
      } else {
        actions.push(entry);
      }
    });
  }
  
  // Extract data sources from blueprint_json
  const dataSources = Array.isArray(blueprint.data_sources) ? blueprint.data_sources : [];
  const blueprintIntegrations = Array.isArray(blueprint.integrations) ? blueprint.integrations : [];
  
  // Combine integrations from multiple sources
  const allIntegrations = [
    ...integrations,
    ...dataSources.filter((ds: any) => ds.required).map((ds: any) => ds.name),
    ...blueprintIntegrations.map((bi: any) => (typeof bi === 'string' ? bi : bi.name))
  ];
  const uniqueIntegrations = Array.from(new Set(allIntegrations));

  // Auto-repair workflow to prevent deployment failures
  const rawWorkflow = { triggers, actions, integrations: uniqueIntegrations };
  const repairedWorkflow = autoRepairWorkflow(rawWorkflow);
  const validation = validateRepairedWorkflow(repairedWorkflow);
  
  if (!validation.isValid) {
    console.warn(`[templateToBlueprint] Workflow validation warnings for ${template.name}:`, validation.errors);
  }
  
  console.log(`[templateToBlueprint] Workflow after auto-repair for ${template.name}:`, {
    triggers: repairedWorkflow.triggers?.length || 0,
    actions: repairedWorkflow.actions?.length || 0,
    valid: validation.isValid
  });

  return {
    source: "template",
    sourceEntry,
    templateId: template.id,
    templateName: template.name,
    certified: template.certified,
    rating: template.rating,
    downloads: template.downloads,
    
    // Step 1: Summary
    name: config.short_name || template.name,
    description: template.description,
    industry: primaryIndustry,
    department: primaryDepartment,
    useCase: config.problem_statement || config.summary || template.description,
    level: template.difficulty as any || config.level || null,
    type: ((template as any).twin_type || config.type || 'agent') as any,
    
    // Business metrics
    goals,
    expectedRoi: config.roi_block?.example_impact_estimates?.[0]?.estimated_range || (template.roi_pct ?? (template as any).roi_hint ? `${template.roi_pct ?? (template as any).roi_hint}%` : null),
    timeSavedPerWeek,
    efficiencyGain,
    
    // Step 2: Intelligence Setup
    model: {
      provider: config.provider || llm.provider || (config.selectedModel ? String(config.selectedModel).split('/')[0] : null) || 'google',
      modelName: config.model || llm.model || config.selectedModel || 'google/gemini-2.5-flash',
      temperature: config.temperature ?? llm.temperature ?? 0.7,
      topK: config.rag?.top_k || 20,
      topP: 0.95,
    },
    
    knowledge: {
      documents: [],
      urls: [],
      cloudDrives: {},
      summary: dataSources.length > 0
        ? dataSources.map((ds: any) => ds.name).join(', ')
        : (config.knowledge && Array.isArray(config.knowledge)
          ? config.knowledge.map((k: any) => k.type || k).join(', ')
          : null),
    },
    
    behavior: {
      systemPrompt: config.system_prompt || config.systemPrompt || (template as any).system_prompt || `You are ${template.name}. ${config.problem_statement || 'Assist users professionally and accurately.'}`,
      personaTemplate: dayInLifeNarrative || null,
      communicationStyle: {
        formal: config.communicationStyle?.formal ?? true,
        emojis: config.communicationStyle?.emojis ?? false,
        detailedExplanations: config.communicationStyle?.detailedExplanations ?? true,
      },
      safety: {
        hallucinationPrevention: true,
        knowledgeRestrictions: true,
        requireCitations: true,
      },
    },
    
    // Step 3: Tools & Integrations
    tools: {
      recommendedIntegrations: uniqueIntegrations,
      preselectedIntegrations: uniqueIntegrations,
      customApis: [],
    },
    
    // Step 4: Workflow Builder (auto-repaired)
    workflow: {
      templateType: "auto",
      triggers: repairedWorkflow.triggers || [],
      actions: repairedWorkflow.actions || [],
      integrations: uniqueIntegrations,
    },
    
    // Template metadata
    tags: Array.isArray(config.tags) ? config.tags : template.tags,
  };
}
