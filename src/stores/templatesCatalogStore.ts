import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { loadAllTemplates, type ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';

export interface TemplateCatalogItem {
  id: string;
  title: string;
  description: string;
  industry: string;
  badges: string[];
  roiPct: number;
  rating: number;
  runsCount: number;
  certified: boolean;
  tags: string[];
  icon: string;
  logoUrl?: string;
  previewMdUrl?: string;
  lastUpdated: string;
  type: 'template' | 'agent' | 'connector';
  config: {
    grounding: boolean;
    rag?: any;
    llm?: any;
    workflow?: any;
    system_prompt?: string;
    knowledge?: any[];
    connectors?: any[];
    metrics_defaults?: any;
  };
}

interface TemplatesCatalogStore {
  items: TemplateCatalogItem[];
  isLoading: boolean;
  error: string | null;
  
  // Filters
  selectedIndustries: string[];
  selectedBadges: string[];
  certified: boolean;
  searchQuery: string;
  
  // Actions
  loadCatalog: () => Promise<void>;
  setIndustryFilter: (industries: string[]) => void;
  setBadgeFilter: (badges: string[]) => void;
  setCertifiedFilter: (certified: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  
  // Selection
  selectTemplate: (templateId: string, source: 'marketplace' | 'builder') => Promise<void>;
}

export const useTemplatesCatalogStore = create<TemplatesCatalogStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  selectedIndustries: [],
  selectedBadges: [],
  certified: false,
  searchQuery: '',

  loadCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load from unified template service (single source of truth)
      const templates = await loadAllTemplates();

      const catalogItems: TemplateCatalogItem[] = templates.map((t: ValidatedTemplate) => ({
        id: t.id,
        title: t.name,
        description: t.description,
        industry: t.industry || t.category,
        badges: t.tags,
        roiPct: t.roi_pct,
        rating: t.rating,
        runsCount: t.downloads,
        certified: t.certified,
        tags: t.tags,
        icon: t.icon,
        lastUpdated: t.updated_at,
        type: 'template' as const,
        config: {
          grounding: t.default_config.rag?.provider ? true : false,
          rag: t.default_config.rag,
          llm: {
            provider: t.default_config.provider,
            model: t.default_config.model,
            temperature: t.default_config.temperature,
          },
          workflow: t.default_config.workflow,
          system_prompt: t.default_config.system_prompt,
          knowledge: t.default_config.knowledge,
          connectors: t.default_config.connectors,
          metrics_defaults: t.default_config.metrics_defaults,
        },
      }));

      console.log(`[TemplatesCatalog] Loaded ${catalogItems.length} templates`);
      set({ items: catalogItems, isLoading: false });
    } catch (error) {
      console.error('[TemplatesCatalog] Error loading catalog:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load catalog',
        isLoading: false 
      });
    }
  },

  setIndustryFilter: (industries) => set({ selectedIndustries: industries }),
  setBadgeFilter: (badges) => set({ selectedBadges: badges }),
  setCertifiedFilter: (certified) => set({ certified }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  clearFilters: () => set({
    selectedIndustries: [],
    selectedBadges: [],
    certified: false,
    searchQuery: '',
  }),

  selectTemplate: async (templateId: string, source: 'marketplace' | 'builder') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Log telemetry
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'template_use',
        entity_type: 'template',
        entity_id: templateId,
        details: { source },
      });

      console.log(`Template ${templateId} selected from ${source}`);
    } catch (error) {
      console.error('Error tracking template selection:', error);
    }
  },
}));

// Computed selector for filtered items
export const useFilteredTemplates = () => {
  const store = useTemplatesCatalogStore();
  
  return store.items.filter((item) => {
    const matchesSearch = store.searchQuery === '' || 
      item.title.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(store.searchQuery.toLowerCase());
    
    const matchesIndustry = store.selectedIndustries.length === 0 ||
      store.selectedIndustries.includes(item.industry);
    
    const matchesBadges = store.selectedBadges.length === 0 ||
      store.selectedBadges.some(badge => item.badges.includes(badge));
    
    const matchesCertified = !store.certified || item.certified;
    
    return matchesSearch && matchesIndustry && matchesBadges && matchesCertified;
  });
};
