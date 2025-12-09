import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Recommendation {
  id: string;
  department: string;
  title: string;
  description: string;
  nextStep: string;
  tags: string[];
  confidence: number;
  impact: string;
  effort: string;
  fundingHints?: string[];
  sources: string[];
  blueprintId: string;
  defaultAgents: any[];
  defaultDatasets?: string[];
  defaultConnections?: string[];
}

interface RecommendationsState {
  // Filters and UI state
  activeFilter: string;
  scrollPosition: number;
  
  // Generated recommendations
  generatedItems: Recommendation[];
  lastGenerated: string | null; // Stores the domain/URL, not timestamp
  generatedAt: number | null; // Timestamp for cache invalidation
  
  // Actions
  setActiveFilter: (filter: string) => void;
  setScrollPosition: (position: number) => void;
  setGeneratedItems: (items: Recommendation[]) => void;
  setLastGenerated: (domain: string | null) => void; // Pass domain/URL, not timestamp
  clearStaleData: () => void; // Clear data older than 1 hour
  resetState: () => void;
}

const initialState = {
  activeFilter: 'All',
  scrollPosition: 0,
  generatedItems: [],
  lastGenerated: null,
  generatedAt: null,
};

export const useRecommendationsStore = create<RecommendationsState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setActiveFilter: (filter: string) => set({ activeFilter: filter }),
      
      setScrollPosition: (position: number) => set({ scrollPosition: position }),
      
      setGeneratedItems: (items: Recommendation[]) => 
        set({ generatedItems: items, generatedAt: Date.now() }),
      
      setLastGenerated: (domain: string | null) => {
        // Validate domain format - reject if it looks like a timestamp
        if (domain && /^\d{4}-\d{2}-\d{2}T/.test(domain)) {
          console.warn('[RecommendationsStore] Rejecting timestamp as domain:', domain);
          return;
        }
        set({ lastGenerated: domain, generatedAt: Date.now() });
      },
      
      clearStaleData: () => {
        const state = get();
        const ONE_HOUR = 60 * 60 * 1000;
        if (state.generatedAt && Date.now() - state.generatedAt > ONE_HOUR) {
          set({ generatedItems: [], lastGenerated: null, generatedAt: null });
        }
      },
      
      resetState: () => set(initialState),
    }),
    {
      name: 'recommendations-storage',
    }
  )
);
