/**
 * Middleware to keep blueprint and wizard stores in sync
 * This enables bidirectional data flow between the two systems
 */
import { useBlueprintStore } from './blueprintStore';
import { WizardBuilderState } from './wizardBuilderStore';
import { AgentBlueprint } from '@/types/agentBlueprint';

/**
 * Syncs wizard store changes back to blueprint store
 * Call this whenever wizard state changes to keep blueprint up-to-date
 */
export function syncWizardToBlueprint(wizardState: Partial<WizardBuilderState>) {
  const { currentBlueprint, updateBlueprint } = useBlueprintStore.getState();
  
  if (!currentBlueprint) return;

  const updates: Partial<AgentBlueprint> = {};

  // Map wizard fields to blueprint fields
  if (wizardState.goal !== undefined) {
    updates.description = wizardState.goal;
  }
  
  if (wizardState.industry !== undefined) {
    updates.industry = wizardState.industry;
  }
  
  if (wizardState.department !== undefined) {
    updates.department = wizardState.department;
  }
  
  if (wizardState.type !== undefined) {
    updates.type = wizardState.type;
  }
  
  if (wizardState.template !== undefined) {
    updates.templateId = wizardState.template;
    updates.templateName = wizardState.template;
  }

  if (wizardState.modelConfig !== undefined) {
    updates.model = {
      provider: wizardState.modelConfig.provider as any,
      modelName: wizardState.modelConfig.model,
      temperature: 0.7,
      topK: 20,
      topP: 0.95,
    };
  }

  if (wizardState.workflow !== undefined) {
    updates.workflow = {
      templateType: 'auto',
      triggers: wizardState.workflow.triggers || [],
      actions: wizardState.workflow.actions || [],
      integrations: wizardState.workflow.integrations || [],
    };
    
    updates.tools = {
      recommendedIntegrations: wizardState.workflow.integrations || [],
      preselectedIntegrations: wizardState.workflow.integrations || [],
    };
  }

  // Only update if we have changes
  if (Object.keys(updates).length > 0) {
    updateBlueprint(updates);
  }
}

/**
 * Keeps blueprint data accessible during builder session
 * Call this to persist blueprint in store while editing
 */
export function maintainBlueprintInSession(blueprint: AgentBlueprint) {
  const { setBlueprint } = useBlueprintStore.getState();
  setBlueprint(blueprint);
}
