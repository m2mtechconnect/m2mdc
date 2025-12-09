/**
 * Hook to sync builder state with digital twin draft
 * Keeps DigitalTwinConfig in sync across all 6 builder steps
 */

import { useEffect, useCallback } from 'react';
import { useBuilderStore } from '@/stores/builderStore';
import { DigitalTwinConfig } from '@/types/digitalTwin';

export function useDigitalTwinSync() {
  const state = useBuilderStore((s) => s.state);
  const updateDigitalTwinDraft = useBuilderStore((s) => s.updateDigitalTwinDraft);

  /**
   * Sync Step 1 (Goal) → Twin Config
   */
  const syncGoalToTwin = useCallback(() => {
    if (state.digitalTwinMode === 'none' || !state.digitalTwinDraft) return;

    updateDigitalTwinDraft({
      goal: state.outcome || state.systemName,
    });
  }, [state.digitalTwinMode, state.digitalTwinDraft, state.outcome, state.systemName, updateDigitalTwinDraft]);

  /**
   * Sync Step 3 (System Prompt) → AI Decision Nodes
   */
  const syncPromptToTwin = useCallback(() => {
    if (state.digitalTwinMode === 'none' || !state.digitalTwinDraft) return;

    const updatedNodes = state.digitalTwinDraft.workflow.nodes.map((node) => {
      // Update AI decision nodes with the latest prompt
      if (node.type === 'action' && node.config.actionType === 'ai_decision') {
        return {
          ...node,
          config: {
            ...node.config,
            prompt: state.systemPrompt || node.config.prompt,
          },
        };
      }
      return node;
    });

    updateDigitalTwinDraft({
      workflow: {
        ...state.digitalTwinDraft.workflow,
        nodes: updatedNodes,
      },
    });
  }, [
    state.digitalTwinMode,
    state.digitalTwinDraft,
    state.systemPrompt,
    updateDigitalTwinDraft,
  ]);

  /**
   * Sync Step 4 (Tools) → Twin Config
   */
  const syncToolsToTwin = useCallback(() => {
    if (state.digitalTwinMode === 'none' || !state.digitalTwinDraft) return;

    // Extract tool IDs from connectors
    const toolIds = Object.keys(state.connectors || {});

    // We don't have a dedicated tools array in the minimal DigitalTwinConfig yet
    // For now, we can store this in workflow node configs or settings
    // This is a placeholder for future enhancement
  }, [state.digitalTwinMode, state.digitalTwinDraft, state.connectors, updateDigitalTwinDraft]);

  /**
   * Sync Step 5 (Workflow) → Twin Workflow
   */
  const syncWorkflowToTwin = useCallback(() => {
    if (state.digitalTwinMode === 'none' || !state.digitalTwinDraft) return;

    // If builder has custom workflow nodes, sync them to the twin draft
    // For Phase 6, we assume digitalTwinDraft.workflow is the source of truth
    // So this is mainly a placeholder for future bidirectional sync
  }, [state.digitalTwinMode, state.digitalTwinDraft, state.workflowNodes, updateDigitalTwinDraft]);

  // Auto-sync when relevant fields change
  useEffect(() => {
    syncGoalToTwin();
  }, [state.outcome, state.systemName]);

  useEffect(() => {
    syncPromptToTwin();
  }, [state.systemPrompt]);

  useEffect(() => {
    syncToolsToTwin();
  }, [state.connectors]);

  useEffect(() => {
    syncWorkflowToTwin();
  }, [state.workflowNodes]);

  return {
    syncGoalToTwin,
    syncPromptToTwin,
    syncToolsToTwin,
    syncWorkflowToTwin,
  };
}
