/**
 * Document Analysis to Blueprint Converter
 * Converts Gemini document analysis results into AgentBlueprint format
 */

import { AgentBlueprint } from '@/types/agentBlueprint';
import type { DocumentAnalysisResult } from '@/hooks/useDocumentAnalysis';

export function documentAnalysisToBlueprint(
  analysis: DocumentAnalysisResult,
  fileName?: string
): AgentBlueprint {
  // Extract recommended agent type (twin vs agent)
  const recommendedType = analysis.recommended_agent_type?.toLowerCase().includes('twin') 
    ? 'process_twin' 
    : 'agent';

  // Extract level from complexity
  let level: AgentBlueprint['level'] = 'Operational';
  if (analysis.estimated_complexity === 'High') {
    level = 'Strategic';
  } else if (analysis.estimated_complexity === 'Medium') {
    level = 'Tactical';
  }

  // Build goals array from KPIs
  const goals: string[] = analysis.detected_kpis.map(kpi => 
    `${kpi.name}: ${kpi.current_estimate} → ${kpi.target_improvement}`
  );

  // If no KPIs, use use_case as goal
  if (goals.length === 0 && analysis.use_case) {
    goals.push(analysis.use_case);
  }

  // Extract system prompt from builder prefill or generate default
  const systemPrompt = analysis.builderPrefill?.step1_goal || 
    `You are an AI assistant specialized in ${analysis.detected_industry}. ${analysis.summary}`;

  // Build workflow from suggested workflows
  const workflowTriggers = analysis.suggested_workflows.map(wf => ({
    type: 'manual',
    name: wf.trigger,
    description: wf.description,
  }));

  const workflowActions = analysis.suggested_workflows.flatMap(wf => 
    wf.actions.map(action => ({
      type: 'custom',
      name: action,
      description: `Execute: ${action}`,
    }))
  );

  // Build the blueprint
  const blueprint: AgentBlueprint = {
    source: 'file',
    createdAt: new Date().toISOString(),

    // Step 1: Summary
    name: analysis.use_case || `${recommendedType} for ${fileName || 'Document'}`,
    description: analysis.summary,
    industry: analysis.detected_industry || null,
    department: analysis.detected_department || null,
    useCase: analysis.use_case || null,
    level,
    type: recommendedType,

    // Business metrics
    goals,
    expectedRoi: analysis.detected_kpis[0]?.target_improvement || null,
    timeSavedPerWeek: extractTimeSaved(analysis),
    efficiencyGain: extractEfficiencyGain(analysis),

    // Step 2: Intelligence Setup
    model: {
      provider: 'gemini',
      modelName: 'google/gemini-2.5-flash',
      temperature: 0.7,
      topK: 20,
      topP: 0.95,
    },

    knowledge: {
      documents: fileName ? [fileName] : [],
      urls: [],
      cloudDrives: {},
      summary: analysis.summary,
    },

    behavior: {
      systemPrompt,
      personaTemplate: `Professional assistant for ${analysis.detected_industry}`,
      communicationStyle: {
        formal: analysis.risk_level === 'High',
        emojis: false,
        detailedExplanations: true,
      },
      safety: {
        hallucinationPrevention: true,
        knowledgeRestrictions: analysis.rag_requirements.needs_rag,
        requireCitations: analysis.compliance_requirements.length > 0,
      },
    },

    // Step 3: Tools & Integrations
    tools: {
      recommendedIntegrations: analysis.suggested_integrations || [],
      preselectedIntegrations: [],
      customApis: [],
    },

    // Step 4: Workflow Builder
    workflow: {
      templateType: 'auto',
      triggers: workflowTriggers,
      actions: workflowActions,
      integrations: analysis.suggested_workflows.flatMap(wf => wf.integration_needed || []),
    },

    // Metadata
    tags: [
      analysis.detected_industry,
      analysis.detected_department,
      recommendedType,
      ...(analysis.compliance_requirements || []),
    ].filter(Boolean),
  };

  return blueprint;
}

/**
 * Extract time saved estimate from analysis
 */
function extractTimeSaved(analysis: DocumentAnalysisResult): string | null {
  // Look for time-related KPIs
  const timeKpi = analysis.detected_kpis.find(kpi => 
    kpi.name.toLowerCase().includes('time') || 
    kpi.name.toLowerCase().includes('hour')
  );

  if (timeKpi) {
    return timeKpi.target_improvement;
  }

  // Default estimate based on complexity
  if (analysis.estimated_complexity === 'High') {
    return '20+ hours/week';
  } else if (analysis.estimated_complexity === 'Medium') {
    return '10-20 hours/week';
  } else {
    return '5-10 hours/week';
  }
}

/**
 * Extract efficiency gain estimate from analysis
 */
function extractEfficiencyGain(analysis: DocumentAnalysisResult): string | null {
  // Look for efficiency-related KPIs
  const efficiencyKpi = analysis.detected_kpis.find(kpi => 
    kpi.name.toLowerCase().includes('efficiency') || 
    kpi.name.toLowerCase().includes('productivity') ||
    kpi.name.toLowerCase().includes('accuracy')
  );

  if (efficiencyKpi) {
    return efficiencyKpi.target_improvement;
  }

  // Default estimate based on complexity
  if (analysis.estimated_complexity === 'High') {
    return '40-60% improvement';
  } else if (analysis.estimated_complexity === 'Medium') {
    return '25-40% improvement';
  } else {
    return '15-25% improvement';
  }
}
