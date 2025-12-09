/**
 * Builder Session Manager
 * Handles creating and updating builder sessions in the database
 */

import { supabase } from '@/integrations/supabase/client';
import { AgentBlueprint } from '@/types/agentBlueprint';
import { BuilderSession, IntakeSource } from './types';

/**
 * Create a new builder session
 */
export async function createBuilderSession(
  blueprint: AgentBlueprint,
  userId: string
): Promise<BuilderSession> {
  console.log('[SessionManager] Creating new builder session', {
    source: blueprint.source,
    userId,
    blueprintName: blueprint.name,
  });

  // Use agent_drafts table for builder sessions
  const { data, error } = await supabase
    .from('agent_drafts')
    .insert({
      owner_id: userId,
      goal: {
        name: blueprint.name,
        description: blueprint.description,
        industry: blueprint.industry,
        department: blueprint.department,
        type: blueprint.type,
      } as any,
      config: {
        blueprint: blueprint, // Store full blueprint
        source: blueprint.source,
        model: blueprint.model,
        knowledge: blueprint.knowledge,
        behavior: blueprint.behavior,
        tools: blueprint.tools,
        workflow: blueprint.workflow,
      } as any,
      meta: {
        templateId: blueprint.templateId,
        templateName: blueprint.templateName,
        certified: blueprint.certified,
      } as any,
      status: 'DRAFT',
      step_completed: 1, // Started at step 1
    })
    .select()
    .single();

  if (error) {
    console.error('[SessionManager] Failed to create session:', error);
    throw new Error(`Failed to create builder session: ${error.message}`);
  }

  console.log('[SessionManager] Session created successfully:', data.id);

  const config = data.config as any;

  return {
    id: data.id,
    userId,
    blueprint,
    wizardState: config as Record<string, any>,
    source: blueprint.source,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.created_at || new Date().toISOString(),
    lastStep: data.step_completed || 1,
  };
}

/**
 * Update an existing builder session
 */
export async function updateBuilderSession(
  sessionId: string,
  updates: {
    blueprint?: AgentBlueprint;
    wizardState?: Record<string, any>;
    lastStep?: number;
  }
): Promise<BuilderSession> {
  console.log('[SessionManager] Updating builder session:', sessionId, updates);

  // Build update payload
  const updatePayload: any = {};

  if (updates.blueprint) {
    updatePayload.config = {
      blueprint: updates.blueprint,
      source: updates.blueprint.source,
      model: updates.blueprint.model,
      knowledge: updates.blueprint.knowledge,
      behavior: updates.blueprint.behavior,
      tools: updates.blueprint.tools,
      workflow: updates.blueprint.workflow,
      ...updates.wizardState,
    } as any;

    updatePayload.goal = {
      name: updates.blueprint.name,
      description: updates.blueprint.description,
      industry: updates.blueprint.industry,
      department: updates.blueprint.department,
      type: updates.blueprint.type,
    } as any;
  }

  if (updates.lastStep !== undefined) {
    updatePayload.step_completed = updates.lastStep;
  }

  const { data, error } = await supabase
    .from('agent_drafts')
    .update(updatePayload)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('[SessionManager] Failed to update session:', error);
    throw new Error(`Failed to update builder session: ${error.message}`);
  }

  console.log('[SessionManager] Session updated successfully');

  const config = data.config as any;
  const blueprint = config?.blueprint as AgentBlueprint;

  return {
    id: data.id,
    userId: data.owner_id,
    blueprint: blueprint || updates.blueprint!,
    wizardState: config as Record<string, any>,
    source: (config?.source || blueprint?.source || 'manual') as IntakeSource,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastStep: data.step_completed || 1,
  };
}

/**
 * Get an existing builder session
 */
export async function getBuilderSession(sessionId: string): Promise<BuilderSession | null> {
  const { data, error } = await supabase
    .from('agent_drafts')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    console.error('[SessionManager] Session not found:', sessionId);
    return null;
  }

  const config = data.config as any;
  const blueprint = config?.blueprint as AgentBlueprint;

  return {
    id: data.id,
    userId: data.owner_id,
    blueprint,
    wizardState: config as Record<string, any>,
    source: (config?.source || blueprint?.source || 'manual') as IntakeSource,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.created_at || new Date().toISOString(),
    lastStep: data.step_completed || 1,
  };
}

/**
 * Delete a builder session
 */
export async function deleteBuilderSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('agent_drafts')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('[SessionManager] Failed to delete session:', error);
    throw new Error(`Failed to delete builder session: ${error.message}`);
  }

  console.log('[SessionManager] Session deleted:', sessionId);
}
