import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { loadAllTemplates, type DigitalTwinBlueprint } from '@/lib/templateLoader';

export interface BuilderTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  certified?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  roi?: number;
  rating?: number;
  downloads?: number;
  default_config?: any;
  kpi_definitions?: any[];
  sample_prompts?: string[];
  recommended_models?: string[];
  marketplace_type: 'template';
}

interface BuilderTemplatesStore {
  templates: BuilderTemplate[];
  isLoading: boolean;
  error: string | null;
  
  loadTemplates: () => Promise<void>;
  getTemplateById: (id: string) => BuilderTemplate | null;
}

export const useBuilderTemplatesStore = create<BuilderTemplatesStore>((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,

  loadTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates: BuilderTemplate[] = [];

      // Load from JSON files first (instant, cached)
      const jsonTemplates = loadAllTemplates();
      jsonTemplates.forEach((t: DigitalTwinBlueprint) => {
        templates.push({
          id: t.id,
          name: t.name,
          description: t.description,
          category: 'Industry Solutions',
          icon: '🤖',
          certified: t.certified,
          difficulty: t.difficulty,
          roi: t.roi_hint,
          rating: t.rating,
          downloads: t.downloads,
          default_config: {
            grounding: (t as any).grounding,
            rag: t.rag,
            llm: t.llm,
            workflow: t.workflow,
            system_prompt: t.system_prompt,
            knowledge: t.knowledge,
            connectors: t.connectors,
            metrics_defaults: t.metrics_defaults,
          },
          kpi_definitions: [],
          sample_prompts: [],
          recommended_models: [],
          marketplace_type: 'template',
        });
      });

      // Load from agent_templates table (lean query)
      const { data: dbTemplates } = await supabase
        .from('agent_templates')
        .select('id,name,description,category,icon,default_config,kpi_definitions,sample_prompts,recommended_models')
        .order('name')
        .limit(50);

      (dbTemplates || []).forEach(t => {
        templates.push({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          icon: t.icon,
          certified: false,
          difficulty: undefined,
          roi: undefined,
          rating: undefined,
          downloads: undefined,
          default_config: typeof t.default_config === 'object' ? t.default_config : {},
          kpi_definitions: Array.isArray(t.kpi_definitions) ? t.kpi_definitions : [],
          sample_prompts: Array.isArray(t.sample_prompts) ? t.sample_prompts.map(String) : [],
          recommended_models: Array.isArray(t.recommended_models) ? t.recommended_models.map(String) : [],
          marketplace_type: 'template',
        });
      });

      set({ templates, isLoading: false });
    } catch (error) {
      console.error('Error loading builder templates:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load templates',
        isLoading: false 
      });
    }
  },

  getTemplateById: (id: string) => {
    const { templates } = get();
    return templates.find(t => t.id === id) || null;
  },
}));
