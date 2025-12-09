/**
 * Blueprint Helper Functions
 * Utilities for converting blueprints to/from builder state
 * and navigating to the builder with a blueprint
 */

import { AgentBlueprint } from '@/types/agentBlueprint';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useNavigate } from 'react-router-dom';
import { WizardBuilderState } from '@/stores/wizardBuilderStore';
import { trackEvent } from '@/lib/telemetry';

/**
 * Convert an AgentBlueprint to WizardBuilderState format
 * This allows the builder to hydrate from a blueprint
 */
export function blueprintToBuilderState(blueprint: AgentBlueprint): Partial<WizardBuilderState> {
  console.log('[BlueprintHelpers] Converting blueprint to builder state:', {
    source: blueprint.source,
    name: blueprint.name,
  });

  return {
    goal: blueprint.description || '',
    industry: blueprint.industry || '',
    department: blueprint.department || '',
    type: blueprint.type || null,
    template: blueprint.templateId || '',
    templateConfig: {},
    
    workflow: {
      triggers: blueprint.workflow.triggers || [],
      actions: blueprint.workflow.actions || [],
      integrations: blueprint.workflow.integrations || [],
      hitl: [], // Human-in-the-loop not in blueprint schema yet
    },
    
    modelConfig: {
      provider: blueprint.model.provider || 'google',
      model: blueprint.model.modelName || 'google/gemini-2.5-flash',
      rag: blueprint.knowledge.documents?.length || blueprint.knowledge.urls?.length 
        ? {
            enabled: true,
            sources: [
              ...(blueprint.knowledge.documents || []),
              ...(blueprint.knowledge.urls || []),
            ],
          }
        : undefined,
      policies: blueprint.behavior.safety ? {
        hallucinationPrevention: blueprint.behavior.safety.hallucinationPrevention,
        requireCitations: blueprint.behavior.safety.requireCitations,
      } : undefined,
      mcp_servers: [], // Not in blueprint schema yet
    },
  };
}

/**
 * Convert WizardBuilderState back to AgentBlueprint format
 * Useful for exporting or saving blueprints
 */
export function builderStateToBlueprint(
  state: WizardBuilderState,
  source: AgentBlueprint['source'] = 'manual'
): AgentBlueprint {
  return {
    source,
    name: state.goal || 'Untitled Agent',
    description: state.goal || '',
    industry: state.industry || null,
    department: state.department || null,
    type: state.type,
    goals: [state.goal].filter(Boolean),
    
    model: {
      provider: state.modelConfig?.provider || 'gemini',
      modelName: state.modelConfig?.model || 'google/gemini-2.5-flash',
    },
    
    knowledge: {
      documents: [],
      urls: [],
      cloudDrives: {},
    },
    
    behavior: {
      systemPrompt: '',
      communicationStyle: {},
      safety: state.modelConfig?.policies ? {
        hallucinationPrevention: state.modelConfig.policies.hallucinationPrevention,
        requireCitations: state.modelConfig.policies.requireCitations,
      } : undefined,
    },
    
    tools: {
      recommendedIntegrations: state.workflow?.integrations || [],
      preselectedIntegrations: [],
      customApis: [],
    },
    
    workflow: {
      templateType: 'auto',
      triggers: state.workflow?.triggers || [],
      actions: state.workflow?.actions || [],
      integrations: state.workflow?.integrations || [],
    },
    
    templateId: state.template || undefined,
  };
}

/**
 * Navigate to the Builder with a blueprint
 * This is the main entry point for all intake flows
 * 
 * @param blueprint - The agent blueprint to use
 * @param navigate - React Router navigate function
 * @param startStep - Optional: which step to start on (1-5)
 */
export function openBuilderWithBlueprint(
  blueprint: AgentBlueprint,
  navigate: ReturnType<typeof useNavigate>,
  startStep?: number
) {
  console.log('[BlueprintHelpers] Opening builder with blueprint:', {
    source: blueprint.source,
    name: blueprint.name,
    startStep,
  });

  // Track analytics
  trackEvent('builder.intake.started', {
    source: blueprint.source,
    hasIndustry: !!blueprint.industry,
    hasDepartment: !!blueprint.department,
    hasWorkflow: !!blueprint.workflow.actions?.length,
    startStep: startStep || 1,
  });

  // Store the blueprint in the blueprint store
  const { setBlueprint } = useBlueprintStore.getState();
  setBlueprint(blueprint);

  // Build URL params
  const params = new URLSearchParams({
    source: blueprint.source,
    from: blueprint.source, // Legacy param
  });

  // Add goal/description if available
  if (blueprint.description) {
    params.set('goal', blueprint.description);
  }

  // Add industry/department if available
  if (blueprint.industry) {
    params.set('industry', blueprint.industry);
  }
  if (blueprint.department) {
    params.set('department', blueprint.department);
  }

  // Add type if available
  if (blueprint.type) {
    params.set('type', blueprint.type);
  }

  // Add template if available
  if (blueprint.templateId) {
    params.set('template', blueprint.templateId);
  }

  // Add step parameter if specified
  if (startStep && startStep >= 1 && startStep <= 5) {
    params.set('step', startStep.toString());
  }

  // Navigate to builder with state
  const url = `/builder?${params.toString()}`;
  
  console.log('[BlueprintHelpers] Navigating to:', url);
  
  // Pass blueprint data via navigation state for immediate hydration
  navigate(url, {
    state: {
      blueprint,
      prefilled: blueprintToBuilderState(blueprint),
    },
  });
}

/**
 * Hook version of openBuilderWithBlueprint for use in components
 */
export function useOpenBuilderWithBlueprint() {
  const navigate = useNavigate();
  
  return (blueprint: AgentBlueprint, startStep?: number) => {
    openBuilderWithBlueprint(blueprint, navigate, startStep);
  };
}
