import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OriginTab = 'templates' | 'industry' | 'mcp';

export interface BuilderSelection {
  originTab: OriginTab | null;
  itemId: string | null;
  itemVersion?: string;
  payload?: Record<string, any>;
  timestamp: number;
}

export interface NormalizedApp {
  id: string;
  name: string;
  category?: string;
  type: 'template' | 'agent' | 'mcp';
  status?: 'connected' | 'not_connected';
  version?: string;
  lastUpdated?: string;
  description?: string;
  features?: string[];
  integrationType?: 'Zapier' | 'API' | 'Native' | 'Other';
  inputs?: FieldDef[];
  defaults?: Record<string, any>;
  requiredSecrets?: string[];
  docsUrl?: string;
  publisher?: {
    name?: string;
    logoUrl?: string;
    url?: string;
  };
  compatibility?: string[];
}

export interface FieldDef {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  label: string;
  required?: boolean;
  default?: any;
  options?: { label: string; value: any }[];
  regex?: string;
  placeholder?: string;
  description?: string;
}

interface BuilderSelectionStore {
  selection: BuilderSelection | null;
  normalizedApp: NormalizedApp | null;
  isUpgradeAvailable: boolean;
  availableVersion?: string;
  
  setSelection: (selection: BuilderSelection) => void;
  setNormalizedApp: (app: NormalizedApp | null) => void;
  setUpgradeAvailable: (available: boolean, version?: string) => void;
  clearSelection: () => void;
  updatePayload: (payload: Record<string, any>) => void;
}

export const useBuilderSelectionStore = create<BuilderSelectionStore>()(
  persist(
    (set) => ({
      selection: null,
      normalizedApp: null,
      isUpgradeAvailable: false,
      availableVersion: undefined,

      setSelection: (selection) =>
        set({ selection, timestamp: Date.now() } as any),

      setNormalizedApp: (app) =>
        set({ normalizedApp: app }),

      setUpgradeAvailable: (available, version) =>
        set({ isUpgradeAvailable: available, availableVersion: version }),

      clearSelection: () =>
        set({ selection: null, normalizedApp: null, isUpgradeAvailable: false, availableVersion: undefined }),

      updatePayload: (payload) =>
        set((state) => ({
          selection: state.selection
            ? { ...state.selection, payload, timestamp: Date.now() }
            : null,
        })),
    }),
    {
      name: 'builder-selection-storage',
      partialize: (state) => ({
        selection: state.selection,
        normalizedApp: state.normalizedApp,
      }),
    }
  )
);
