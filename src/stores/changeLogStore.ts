/**
 * ChangeLog Store - Tracks all builder changes with real-time updates
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChangeType = 'kpi_shift' | 'workflow_change' | 'agent_update' | 'config_change' | 'scenario_change' | 'rollback';

export interface ChangeLogEntry {
  id: string;
  timestamp: Date;
  type: ChangeType;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  domain?: string;
  fieldPath?: string;
  oldValue?: any;
  newValue?: any;
  user?: string;
  rollbackId?: string; // References original change if this is a rollback
}

interface ChangeLogState {
  entries: ChangeLogEntry[];
  maxEntries: number;
  
  // Actions
  addEntry: (entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>) => string;
  removeEntry: (id: string) => void;
  clearEntries: () => void;
  getEntriesByType: (type: ChangeType) => ChangeLogEntry[];
  getEntriesByDomain: (domain: string) => ChangeLogEntry[];
  getRecentEntries: (count: number) => ChangeLogEntry[];
  
  // Rollback support
  createRollbackEntry: (originalId: string) => string | null;
}

export const useChangeLogStore = create<ChangeLogState>()(
  persist(
    (set, get) => ({
      entries: [],
      maxEntries: 100,

      addEntry: (entry) => {
        const id = crypto.randomUUID();
        const newEntry: ChangeLogEntry = {
          ...entry,
          id,
          timestamp: new Date(),
          user: entry.user || 'system',
        };

        set((state) => {
          const entries = [newEntry, ...state.entries].slice(0, state.maxEntries);
          return { entries };
        });

        console.log('[ChangeLog] Entry added:', newEntry.title);
        return id;
      },

      removeEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },

      clearEntries: () => {
        set({ entries: [] });
      },

      getEntriesByType: (type) => {
        return get().entries.filter((e) => e.type === type);
      },

      getEntriesByDomain: (domain) => {
        return get().entries.filter((e) => e.domain === domain);
      },

      getRecentEntries: (count) => {
        return get().entries.slice(0, count);
      },

      createRollbackEntry: (originalId) => {
        const original = get().entries.find((e) => e.id === originalId);
        if (!original) return null;

        const rollbackEntry: Omit<ChangeLogEntry, 'id' | 'timestamp'> = {
          type: 'rollback',
          title: `Rolled back: ${original.title}`,
          description: `Reverted ${original.fieldPath || 'change'} from ${original.newValue} to ${original.oldValue}`,
          impact: 'neutral',
          domain: original.domain,
          fieldPath: original.fieldPath,
          oldValue: original.newValue,
          newValue: original.oldValue,
          rollbackId: originalId,
        };

        return get().addEntry(rollbackEntry);
      },
    }),
    {
      name: 'dc-twin-changelog',
      partialize: (state) => ({ entries: state.entries }),
      // Rehydrate dates
      onRehydrateStorage: () => (state) => {
        if (state?.entries) {
          state.entries = state.entries.map((e) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }));
        }
      },
    }
  )
);

// Helper function to determine impact based on change type and values
export function determineImpact(
  type: ChangeType,
  oldValue: any,
  newValue: any,
  direction?: 'higher_is_better' | 'lower_is_better'
): 'positive' | 'negative' | 'neutral' {
  if (type === 'rollback') return 'neutral';
  
  if (typeof oldValue === 'number' && typeof newValue === 'number') {
    if (direction === 'higher_is_better') {
      return newValue > oldValue ? 'positive' : newValue < oldValue ? 'negative' : 'neutral';
    }
    if (direction === 'lower_is_better') {
      return newValue < oldValue ? 'positive' : newValue > oldValue ? 'negative' : 'neutral';
    }
  }
  
  if (typeof oldValue === 'boolean' && typeof newValue === 'boolean') {
    // For agents/features being enabled
    return newValue ? 'positive' : 'negative';
  }
  
  return 'neutral';
}

// Helper to create change entries from builder updates
export function createChangeEntry(
  type: ChangeType,
  title: string,
  fieldPath: string,
  oldValue: any,
  newValue: any,
  domain?: string,
  direction?: 'higher_is_better' | 'lower_is_better'
): Omit<ChangeLogEntry, 'id' | 'timestamp'> {
  const impact = determineImpact(type, oldValue, newValue, direction);
  
  let description = '';
  if (oldValue !== undefined && newValue !== undefined) {
    description = `Changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`;
  } else if (newValue !== undefined) {
    description = `Set to ${JSON.stringify(newValue)}`;
  }

  return {
    type,
    title,
    description,
    impact,
    domain,
    fieldPath,
    oldValue,
    newValue,
  };
}
