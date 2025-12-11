/**
 * Simulation Snapshot Store
 * Manages blueprint snapshots for simulation runs
 * Ensures simulation always references a frozen configuration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SimulationBlueprintSnapshot } from '@/types/simulationSnapshot';
import type { DataCentreBlueprint } from '@/types/dataCentreBlueprint';
import { createSimulationSnapshot } from '@/types/simulationSnapshot';

interface SimulationSnapshotStore {
  /** Current active simulation's blueprint snapshot */
  currentSnapshot: SimulationBlueprintSnapshot | null;
  
  /** History of recent simulation snapshots (last 10) */
  snapshotHistory: SimulationBlueprintSnapshot[];
  
  /** Whether snapshot panel is open */
  isSnapshotPanelOpen: boolean;
  
  // Actions
  
  /** Create and set a new snapshot for a simulation run */
  captureSnapshot: (
    blueprint: DataCentreBlueprint,
    runId: string,
    options?: {
      activeAgentIds?: string[];
      activeKpiIds?: string[];
      activeScenarioIds?: string[];
    }
  ) => SimulationBlueprintSnapshot;
  
  /** Clear current snapshot (e.g., when simulation ends) */
  clearCurrentSnapshot: () => void;
  
  /** Get a snapshot by run ID from history */
  getSnapshotByRunId: (runId: string) => SimulationBlueprintSnapshot | undefined;
  
  /** Open/close the snapshot panel */
  setSnapshotPanelOpen: (open: boolean) => void;
  
  /** Mark a workflow as triggered during simulation */
  addTriggeredWorkflow: (workflowId: string) => void;
}

export const useSimulationSnapshotStore = create<SimulationSnapshotStore>()(
  persist(
    (set, get) => ({
      currentSnapshot: null,
      snapshotHistory: [],
      isSnapshotPanelOpen: false,

      captureSnapshot: (blueprint, runId, options) => {
        const snapshot = createSimulationSnapshot(blueprint, runId, options);
        
        set(state => ({
          currentSnapshot: snapshot,
          // Add to history, keeping last 10
          snapshotHistory: [snapshot, ...state.snapshotHistory].slice(0, 10),
        }));
        
        console.log('[SimulationSnapshot] Captured snapshot:', {
          runId,
          blueprintId: blueprint.id,
          version: blueprint.version,
          agents: snapshot.activeAgentIds?.length ?? blueprint.agents.length,
          kpis: snapshot.activeKpiIds?.length ?? blueprint.kpis.length,
        });
        
        return snapshot;
      },

      clearCurrentSnapshot: () => {
        set({ currentSnapshot: null });
      },

      getSnapshotByRunId: (runId) => {
        const { currentSnapshot, snapshotHistory } = get();
        
        if (currentSnapshot?.simulationRunId === runId) {
          return currentSnapshot;
        }
        
        return snapshotHistory.find(s => s.simulationRunId === runId);
      },

      setSnapshotPanelOpen: (open) => {
        set({ isSnapshotPanelOpen: open });
      },

      addTriggeredWorkflow: (workflowId) => {
        set(state => {
          if (!state.currentSnapshot) return state;
          
          const triggeredWorkflowIds = state.currentSnapshot.triggeredWorkflowIds || [];
          if (triggeredWorkflowIds.includes(workflowId)) return state;
          
          return {
            currentSnapshot: {
              ...state.currentSnapshot,
              triggeredWorkflowIds: [...triggeredWorkflowIds, workflowId],
            },
          };
        });
      },
    }),
    {
      name: 'simulation-snapshots',
      partialize: (state) => ({
        snapshotHistory: state.snapshotHistory,
      }),
    }
  )
);
