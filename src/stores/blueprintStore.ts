/**
 * Blueprint Store
 * Manages the current Agent Blueprint state across the application
 * Used to hydrate the Builder from different intake flows
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AgentBlueprint, createEmptyBlueprint } from '@/types/agentBlueprint';

interface BlueprintStore {
  // Current blueprint being edited/viewed
  currentBlueprint: AgentBlueprint | null;
  
  // Whether the blueprint has unsaved changes
  isDirty: boolean;
  
  // Last time the blueprint was saved/loaded
  lastUpdated: Date | null;
  
  // Actions
  setBlueprint: (blueprint: AgentBlueprint) => void;
  updateBlueprint: (updates: Partial<AgentBlueprint>) => void;
  clearBlueprint: () => void;
  markClean: () => void;
  markDirty: () => void;
  
  // Helper to check if a blueprint exists
  hasBlueprint: () => boolean;
}

export const useBlueprintStore = create<BlueprintStore>()(
  persist(
    (set, get) => ({
      currentBlueprint: null,
      isDirty: false,
      lastUpdated: null,

      setBlueprint: (blueprint: AgentBlueprint) => {
        console.log('[BlueprintStore] Setting blueprint:', {
          source: blueprint.source,
          name: blueprint.name,
          hasIndustry: !!blueprint.industry,
          hasDepartment: !!blueprint.department,
          hasModel: !!blueprint.model,
          hasWorkflow: !!blueprint.workflow?.actions?.length,
        });
        
        set({
          currentBlueprint: blueprint,
          isDirty: false,
          lastUpdated: new Date(),
        });
      },

      updateBlueprint: (updates: Partial<AgentBlueprint>) => {
        const current = get().currentBlueprint;
        
        if (!current) {
          console.warn('[BlueprintStore] Cannot update - no current blueprint');
          return;
        }

        const updated: AgentBlueprint = {
          ...current,
          ...updates,
          // Deep merge nested objects
          model: updates.model ? { ...current.model, ...updates.model } : current.model,
          knowledge: updates.knowledge ? { ...current.knowledge, ...updates.knowledge } : current.knowledge,
          behavior: updates.behavior ? { ...current.behavior, ...updates.behavior } : current.behavior,
          tools: updates.tools ? { ...current.tools, ...updates.tools } : current.tools,
          workflow: updates.workflow ? { ...current.workflow, ...updates.workflow } : current.workflow,
        };

        console.log('[BlueprintStore] Updating blueprint:', Object.keys(updates));
        
        set({
          currentBlueprint: updated,
          isDirty: true,
          lastUpdated: new Date(),
        });
      },

      clearBlueprint: () => {
        console.log('[BlueprintStore] Clearing blueprint');
        set({
          currentBlueprint: null,
          isDirty: false,
          lastUpdated: null,
        });
      },

      markClean: () => set({ isDirty: false }),
      markDirty: () => set({ isDirty: true }),
      
      hasBlueprint: () => get().currentBlueprint !== null,
    }),
    {
      name: 'blueprint-storage',
      // Only persist the blueprint, not the dirty/updated flags
      partialize: (state) => ({ 
        currentBlueprint: state.currentBlueprint 
      }),
    }
  )
);
