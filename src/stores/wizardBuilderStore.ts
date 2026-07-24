import { create } from 'zustand';
import { builderService, BuilderConfig } from '@/services/builderService';
import { AgentBlueprint } from '@/types/agentBlueprint';
import { useBlueprintStore } from '@/stores/blueprintStore';

export interface BuilderTool {
  id: string;
  type: 'integration' | 'mcp' | 'api';
  name: string;
  category?: string;
  enabled: boolean;
  connected: boolean;
  config: Record<string, any>;
}

export interface BuilderApiConnector {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  authType: string;
  headers: Record<string, string>;
}

export interface WizardBuilderState {
  // Backend-synced state
  builderId: string | null;
  goal: string;
  industry: string;
  department: string;
  type: 'agent' | 'process_twin' | '3d_twin' | null;
  template: string;
  templateConfig: Record<string, any>;
  workflow: {
    triggers: string[];
    actions: string[];
    integrations: string[];
    hitl: string[];
  };
  modelConfig: {
    provider: string;
    model: string;
    rag?: Record<string, any>;
    policies?: Record<string, any>;
    mcp_servers?: any[];
  };
  tools: BuilderTool[];
  apiConnectors: BuilderApiConnector[];

  // UI state
  currentStep: number;
  completedSteps: number[];
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;

  // Actions
  initializeBuilder: (params: URLSearchParams, geminiAnalysis?: any, prefilled?: any, blueprint?: AgentBlueprint) => Promise<void>;
  loadBuilder: (builderId: string) => Promise<void>;
  setGoal: (goal: string) => Promise<void>;
  setIndustryDepartment: (industry: string, department: string) => Promise<void>;
  setType: (type: 'agent' | 'process_twin' | '3d_twin') => Promise<void>;
  setTemplate: (template: string, config?: Record<string, any>) => Promise<void>;
  setWorkflow: (workflow: Partial<WizardBuilderState['workflow']>) => Promise<void>;
  setModelConfig: (config: Partial<WizardBuilderState['modelConfig']>) => Promise<void>;
  setTools: (tools: BuilderTool[]) => Promise<void>;
  addApiConnector: (connector: Omit<BuilderApiConnector, 'id'>) => Promise<void>;
  removeApiConnector: (id: string) => Promise<void>;
  setCurrentStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  deployBuilder: () => Promise<{ success: boolean; agentUrl?: string; message?: string }>;
  reset: () => void;
}

const initialState = {
  builderId: null,
  goal: '',
  industry: '',
  department: '',
  type: null,
  template: '',
  templateConfig: {},
  workflow: {
    triggers: [],
    actions: [],
    integrations: [],
    hitl: [],
  },
  modelConfig: {
    provider: 'google',
    model: 'google/gemini-2.5-flash',
    rag: {},
    policies: {},
    mcp_servers: [],
  },
  tools: [],
  apiConnectors: [],
  currentStep: 1,
  completedSteps: [],
  isLoading: false,
  error: null,
  lastSaved: null,
};

export const useWizardBuilderStore = create<WizardBuilderState>()((set, get) => ({
  ...initialState,

  initializeBuilder: async (params, geminiAnalysis, prefilled, blueprint) => {
    // In-flight guard: prevent duplicate creation from React Strict Mode
    // double-invocation, effect re-fires, or rapid double-clicks.
    if (get().isLoading) {
      console.log('⏭️ [STORE] initializeBuilder skipped — already in flight');
      return;
    }
    // Idempotency guard: if a draft is already loaded and no new intent
    // params request a fresh one, do nothing.
    if (get().builderId && !params.get('new') && !params.get('draft') && !params.get('builderId') && !params.get('templateId') && !params.get('session') && !blueprint) {
      console.log('⏭️ [STORE] initializeBuilder skipped — draft already loaded');
      return;
    }
    set({ isLoading: true, error: null });
    
    try {
      // Priority -1: Check for session param and load session data
      const sessionParam = params.get('session');
      if (sessionParam && !blueprint) {
        console.log('🔍 [STORE] session detected in URL - loading session:', sessionParam);
        
        try {
          const { getBuilderSession } = await import('@/lib/intake/sessionManager');
          
          // Load session using the session manager
          const session = await getBuilderSession(sessionParam);
          
          if (session && session.blueprint) {
            console.log('✅ [STORE] Session loaded - using blueprint from session');
            
            // Store in blueprintStore so it's available throughout the app
            useBlueprintStore.getState().setBlueprint(session.blueprint);
            
            // Use this blueprint for initialization
            blueprint = session.blueprint;
          } else {
            console.warn('⚠️ [STORE] Session not found or has no blueprint:', sessionParam);
          }
        } catch (err) {
          console.error('❌ [STORE] Error loading session:', err);
        }
      }
      
      // Priority 0: Check for templateId in URL params and load template
      const templateIdParam = params.get('templateId');
      if (templateIdParam && !blueprint) {
        console.log('🔍 [STORE] templateId detected in URL - loading template:', templateIdParam);
        
        try {
          // Dynamically import dependencies
          const [{ supabase }, { templateToBlueprint }, { loadAllTemplates }] = await Promise.all([
            import('@/integrations/supabase/client'),
            import('@/lib/builder/templateToBlueprint'),
            import('@/lib/templateLoader')
          ]);
          
          // Try loading from JSON blueprints first
          const jsonTemplates = loadAllTemplates();
          let template = jsonTemplates.find((t: any) => t.id === templateIdParam);
          
          // If not in JSON, try loading from database
          if (!template) {
            console.log('📥 [STORE] Template not in JSON, fetching from database...');
            const { data, error } = await supabase
              .from('industry_templates')
              .select('*')
              .eq('id', templateIdParam)
              .single();
            
            if (error) {
              console.error('❌ [STORE] Failed to fetch template from database:', error);
            } else {
              template = data as any;
            }
          }
          
          if (template) {
            console.log('✅ [STORE] Template loaded - converting to blueprint');
            const convertedBlueprint = templateToBlueprint(template as any, 'marketplace');
            
            // Store in blueprintStore so it's available throughout the app
            useBlueprintStore.getState().setBlueprint(convertedBlueprint);
            
            // Use this blueprint for initialization
            blueprint = convertedBlueprint;
          } else {
            console.warn('⚠️ [STORE] Template not found:', templateIdParam);
            set({ 
              error: `Template "${templateIdParam}" not found. Creating blank draft instead.`,
              isLoading: false 
            });
          }
        } catch (err) {
          console.error('❌ [STORE] Error loading template:', err);
          set({ 
            error: 'Failed to load template. Creating blank draft instead.',
            isLoading: false 
          });
        }
      }
      
      // Priority 1: Check for blueprint from blueprintStore if not passed
      const blueprintToUse = blueprint || useBlueprintStore.getState().currentBlueprint;
      
      if (blueprintToUse) {
        console.log('🎯 [STORE] Blueprint detected - hydrating from blueprint', {
          source: blueprintToUse.source,
          name: blueprintToUse.name,
        });
        
        // Import the converter
        const { blueprintToBuilderState } = await import('@/lib/builder/blueprintHelpers');
        
        // Convert blueprint to builder state
        const builderState = blueprintToBuilderState(blueprintToUse);
        
        // Create a new draft with blueprint data
        // Note: template_id is only passed if it's a valid UUID
        // Template slugs like "retail_inventory_optimization" are NOT UUIDs
        const createParams: any = {
          source: blueprintToUse.source as any,
          goal: blueprintToUse.description,
          industry: blueprintToUse.industry || undefined,
          department: blueprintToUse.department || undefined,
          type: blueprintToUse.type || undefined,
        };
        
        // Only include template_id if it looks like a UUID (8-4-4-4-12 format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (blueprintToUse.templateId && uuidRegex.test(blueprintToUse.templateId)) {
          createParams.template_id = blueprintToUse.templateId;
        }
        
        const { id, builder } = await builderService.create(createParams);

        console.log('✅ [STORE] Draft created from blueprint:', { id });

        // Apply the blueprint data to state
        set({
          builderId: id,
          goal: blueprintToUse.description || '',
          industry: blueprintToUse.industry || '',
          department: blueprintToUse.department || '',
          type: blueprintToUse.type || 'agent', // Default to 'agent' if not specified
          template: blueprintToUse.templateId || '',
          workflow: builderState.workflow || initialState.workflow,
          modelConfig: builderState.modelConfig || initialState.modelConfig,
          isLoading: false,
          lastSaved: new Date(),
          error: null,
        });

        // Save the blueprint data to backend
        try {
          await builderService.update(id, {
            workflow: builderState.workflow,
            model_config: builderState.modelConfig,
          });
          console.log('💾 [STORE] Blueprint data saved to backend');
        } catch (err) {
          console.error('❌ [STORE] Failed to save blueprint data:', err);
        }

        // Auto-advance to appropriate step based on blueprint completeness
        const stepParam = params.get('step');
        if (stepParam) {
          const requestedStep = parseInt(stepParam, 10);
          if (requestedStep >= 1 && requestedStep <= 5) {
            console.log('📍 [STORE] Using requested step:', requestedStep);
            set({ currentStep: requestedStep });
            return;
          }
        }

        // Smart step selection based on blueprint completeness
        if (blueprintToUse.workflow?.actions?.length > 0) {
          console.log('📍 [STORE] Blueprint has workflow - starting at step 5');
          set({ currentStep: 5 }); // Go to simulation if workflow is ready
        } else if (blueprintToUse.tools?.recommendedIntegrations?.length > 0) {
          console.log('📍 [STORE] Blueprint has tools - starting at step 4');
          set({ currentStep: 4 }); // Go to workflow if tools are configured
        } else if (blueprintToUse.model?.modelName) {
          console.log('📍 [STORE] Blueprint has model - starting at step 3');
          set({ currentStep: 3 }); // Go to tools if model is configured
        } else {
          console.log('📍 [STORE] Blueprint loaded - starting at step 2');
          set({ currentStep: 2 }); // Start at intelligence setup
        }

        // Keep blueprint in store during editing (don't clear yet)
        // This allows steps to access blueprint data
        console.log('🔄 [STORE] Maintaining blueprint in session for editing');
        
        return;
      }

      // Priority 2: Load existing draft if builderId provided
      const builderId = params.get('draft') || params.get('builderId');
      const source = params.get('from') || params.get('source');
      
      // If builderId exists, load existing draft
      if (builderId) {
        console.log('🔄 [STORE] Loading existing draft:', builderId);
        await get().loadBuilder(builderId);
        return;
      }

      // Otherwise create new draft with prefilled values
      const goal = params.get('goal') || prefilled?.description || '';
      const industry = params.get('industry') || prefilled?.industry || '';
      const department = params.get('department') || prefilled?.department || '';
      const template = params.get('template') || '';
      const type = params.get('type') as 'agent' | 'process_twin' | '3d_twin' | null;

      console.log('🆕 [STORE] Creating new draft', { 
        goal, 
        industry, 
        department, 
        template, 
        type, 
        source,
        hasGeminiAnalysis: !!geminiAnalysis,
        hasPrefilled: !!prefilled 
      });

      const { id, builder } = await builderService.create({
        source: source as any,
        goal: goal || undefined,
        industry: industry || undefined,
        department: department || undefined,
        type: type || undefined,
        template_id: template || undefined,
      });

      console.log('✅ [STORE] Draft created:', { id, builder });

      const config = builder.config as BuilderConfig;

      // Auto-generate workflow with gemini analysis if available
      let workflow = config.workflow || initialState.workflow;
      
      if (geminiAnalysis && prefilled) {
        console.log('🤖 [STORE] Using Gemini analysis to generate enhanced workflow');
        const { generateWorkflow } = await import('@/lib/workflow/workflowGenerator');
        
        // Generate workflow with gemini insights
        workflow = generateWorkflow({
          goal: config.goal || geminiAnalysis.use_case,
          industry: config.industry || geminiAnalysis.detected_industry,
          department: config.department || geminiAnalysis.detected_department,
          type: config.type,
          template: config.template_id,
        });
        
        // Enhance with gemini suggestions
        if (geminiAnalysis.suggested_workflows?.length > 0) {
          workflow.actions = geminiAnalysis.suggested_workflows.map((wf: any) => wf.name);
        }
        if (geminiAnalysis.suggested_integrations?.length > 0) {
          workflow.integrations = geminiAnalysis.suggested_integrations;
        }
        
        console.log('✨ [STORE] Enhanced workflow with Gemini insights', { workflow });
        
        // Save the enhanced workflow
        try {
          await builderService.update(id, { workflow });
          console.log('💾 [STORE] Enhanced workflow saved');
        } catch (err) {
          console.error('❌ [STORE] Failed to save enhanced workflow:', err);
        }
      } else if (!workflow.actions || workflow.actions.length === 0) {
        console.log('🔧 [STORE] Auto-generating default workflow');
        const { generateWorkflow } = await import('@/lib/workflow/workflowGenerator');
        workflow = generateWorkflow({
          goal: config.goal,
          industry: config.industry,
          department: config.department,
          type: config.type,
          template: config.template_id,
        });
        
        // Save the generated workflow
        try {
          await builderService.update(id, { workflow });
          console.log('💾 [STORE] Default workflow saved');
        } catch (err) {
          console.error('❌ [STORE] Failed to save default workflow:', err);
        }
      }

      // Enhance model config with gemini analysis
      let modelConfig = config.model_config || initialState.modelConfig;
      if (geminiAnalysis && prefilled?.ragSources) {
        console.log('📚 [STORE] Adding RAG sources from Gemini analysis');
        modelConfig = {
          ...modelConfig,
          rag: {
            enabled: true,
            sources: prefilled.ragSources,
          },
        };
      }

      set({
        builderId: id,
        goal: config.goal || prefilled?.description || '',
        industry: config.industry || prefilled?.industry || '',
        department: config.department || prefilled?.department || '',
        type: config.type || 'agent', // Default to 'agent' if not specified
        template: config.template_id || '',
        workflow,
        modelConfig,
        isLoading: false,
        lastSaved: new Date(),
        error: null,
      });

      console.log('💾 [STORE] State updated', {
        builderId: id,
        goal: config.goal || prefilled?.description,
        industry: config.industry || prefilled?.industry,
        workflow,
        modelConfig,
      });

      // Auto-advance to first unfilled step (5-step builder, no Goal step)
      const state = get();
      
      // Check for step param first
      const stepParam = params.get('step');
      if (stepParam) {
        const requestedStep = parseInt(stepParam, 10);
        if (requestedStep >= 1 && requestedStep <= 5) {
          console.log('📍 [STORE] Using requested step:', requestedStep);
          set({ currentStep: requestedStep });
          return;
        }
      }
      
      // If gemini analysis exists, start at step 2 (Intelligence) since summary is pre-filled
      if (geminiAnalysis) {
        console.log('🎯 [STORE] Gemini analysis detected - starting at step 2 (Intelligence)');
        set({ currentStep: 2 });
        return;
      }
      
      // Otherwise auto-advance based on filled fields
      if (state.industry && state.department && state.type && state.template && state.workflow?.actions?.length > 0) {
        console.log('📍 [STORE] Auto-advancing to step 5 (Simulation)');
        set({ currentStep: 5 }); // Simulation & Deploy
      } else if (state.industry && state.department && state.type && state.template) {
        console.log('📍 [STORE] Auto-advancing to step 4 (Workflow)');
        set({ currentStep: 4 }); // Workflow Builder
      } else if (state.industry && state.department && state.type) {
        console.log('📍 [STORE] Auto-advancing to step 3 (Tools)');
        set({ currentStep: 3 }); // Tools & Integrations
      } else if (state.industry && state.department) {
        console.log('📍 [STORE] Auto-advancing to step 2 (Intelligence)');
        set({ currentStep: 2 }); // Intelligence Setup
      } else {
        console.log('📍 [STORE] Starting at step 1 (Summary)');
        set({ currentStep: 1 }); // Agent/Twin Summary
      }
    } catch (error) {
      console.error('❌ [STORE] Failed to initialize:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize builder';
      set({ 
        error: errorMsg,
        isLoading: false 
      });
      throw error; // Re-throw so the component can handle it
    }
  },

  loadBuilder: async (builderId) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('[Builder] Loading draft:', builderId);
      const { builder } = await builderService.get(builderId);
      const config = builder.config as BuilderConfig;

      console.log('[Builder] Draft loaded:', { builderId, config });

      // Auto-generate workflow if empty
      let workflow = config.workflow || initialState.workflow;
      if (!workflow.actions || workflow.actions.length === 0) {
        console.log('[Builder] Auto-generating empty workflow');
        const { generateWorkflow } = await import('@/lib/workflow/workflowGenerator');
        workflow = generateWorkflow({
          goal: config.goal,
          industry: config.industry,
          department: config.department,
          type: config.type,
          template: config.template_id,
        });
        
        // Save the generated workflow immediately
        try {
          await builderService.update(builder.id, { workflow });
          console.log('[Builder] Auto-generated workflow saved');
        } catch (err) {
          console.error('[Builder] Failed to save auto-generated workflow:', err);
        }
      }

      set({
        builderId: builder.id,
        goal: config.goal || '',
        industry: config.industry || '',
        department: config.department || '',
        type: config.type || null,
        template: config.template_id || '',
        workflow,
        modelConfig: config.model_config || initialState.modelConfig,
        currentStep: (config.step_completed || 0) + 1,
        isLoading: false,
        lastSaved: new Date(builder.updated_at),
        error: null,
      });
    } catch (error) {
      console.error('[Builder] Failed to load draft:', builderId, error);
      
      // If draft doesn't exist, create a new one instead of failing
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('404'))) {
        console.log('[Builder] Draft not found, creating new one');
        set({ error: null }); // Clear error
        
        // Create new draft without params
        try {
          const { id, builder } = await builderService.create({ source: 'dashboard' });
          const config = builder.config as BuilderConfig;
          
          // Auto-generate workflow if empty
          let workflow = config.workflow || initialState.workflow;
          if (!workflow.actions || workflow.actions.length === 0) {
            const { generateWorkflow } = await import('@/lib/workflow/workflowGenerator');
            workflow = generateWorkflow({
              goal: config.goal,
              industry: config.industry,
              department: config.department,
              type: config.type,
              template: config.template_id,
            });
            
            // Save the generated workflow
            try {
              await builderService.update(id, { workflow });
            } catch (err) {
              console.error('[Builder] Failed to save auto-generated workflow:', err);
            }
          }
          
          set({
            builderId: id,
            goal: config.goal || '',
            industry: config.industry || '',
            department: config.department || '',
            type: config.type || null,
            template: config.template_id || '',
            workflow,
            modelConfig: config.model_config || initialState.modelConfig,
            isLoading: false,
            lastSaved: new Date(),
            error: null,
          });
        } catch (createError) {
          const errorMsg = createError instanceof Error ? createError.message : 'Failed to create builder';
          set({ 
            error: errorMsg,
            isLoading: false 
          });
        }
      } else {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load builder',
          isLoading: false 
        });
      }
    }
  },

  setGoal: async (goal) => {
    const { builderId } = get();
    if (!builderId) {
      console.error('[Store] Cannot update goal: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    set({ goal, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { goal });
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] Goal updated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save goal';
      console.error('[Store] Failed to update goal:', error);
      set({ 
        error: errorMsg,
        isLoading: false 
      });
      throw error;
    }
  },

  setIndustryDepartment: async (industry, department) => {
    const { builderId } = get();
    if (!builderId) {
      console.error('[Store] Cannot update industry/department: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    set({ industry, department, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { industry, department });
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] Industry/department updated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save industry/department';
      console.error('[Store] Failed to update industry/department:', error);
      set({ 
        error: errorMsg,
        isLoading: false 
      });
      throw error;
    }
  },

  setType: async (type) => {
    const { builderId } = get();
    if (!builderId) {
      console.error('[Store] Cannot update type: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    set({ type, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { type });
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] Type updated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save type';
      console.error('[Store] Failed to update type:', error);
      set({ 
        error: errorMsg,
        isLoading: false 
      });
      throw error;
    }
  },

  setTemplate: async (template, config) => {
    const { builderId } = get();
    if (!builderId) {
      console.error('[Store] Cannot update template: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    set({ template, templateConfig: config || {}, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { template_id: template });
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] Template updated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save template';
      console.error('[Store] Failed to update template:', error);
      set({ 
        error: errorMsg,
        isLoading: false 
      });
      throw error;
    }
  },

  setWorkflow: async (workflowUpdate) => {
    const { builderId, workflow } = get();
    if (!builderId) {
      console.error('[Store] Cannot update workflow: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    const newWorkflow = { ...workflow, ...workflowUpdate };
    set({ workflow: newWorkflow, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { workflow: newWorkflow });
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] Workflow updated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save workflow';
      console.error('[Store] Failed to update workflow:', error);
      set({ 
        error: errorMsg,
        isLoading: false 
      });
      // Re-throw so caller can handle
      throw error;
    }
  },

  setModelConfig: async (configUpdate) => {
    const { builderId, modelConfig } = get();
    if (!builderId) {
      console.error('[Store] Cannot update model config: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    const newConfig = { ...modelConfig, ...configUpdate };
    set({ modelConfig: newConfig, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { model_config: newConfig });
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] Model config updated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save model config';
      console.error('[Store] Failed to update model config:', error);
      set({ 
        error: errorMsg,
        isLoading: false 
      });
      throw error;
    }
  },

  setTools: async (tools) => {
    const { builderId } = get();
    if (!builderId) {
      console.error('[Store] Cannot update tools: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    set({ tools, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { tools } as any);
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] Tools updated successfully:', tools.length, 'tools');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save tools';
      console.error('[Store] Failed to update tools:', error);
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  addApiConnector: async (connector) => {
    const { builderId, apiConnectors } = get();
    if (!builderId) {
      console.error('[Store] Cannot add API connector: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    const newConnector = { ...connector, id: `api-${Date.now()}` };
    const updatedConnectors = [...apiConnectors, newConnector];
    set({ apiConnectors: updatedConnectors, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { api_connectors: updatedConnectors } as any);
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] API connector added:', newConnector.name);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add API connector';
      console.error('[Store] Failed to add API connector:', error);
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  removeApiConnector: async (id) => {
    const { builderId, apiConnectors } = get();
    if (!builderId) {
      console.error('[Store] Cannot remove API connector: No builderId');
      return Promise.reject(new Error('No builderId available'));
    }

    const updatedConnectors = apiConnectors.filter(c => c.id !== id);
    set({ apiConnectors: updatedConnectors, isLoading: true, error: null });
    
    try {
      await builderService.update(builderId, { api_connectors: updatedConnectors } as any);
      set({ isLoading: false, lastSaved: new Date() });
      console.log('[Store] API connector removed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove API connector';
      console.error('[Store] Failed to remove API connector:', error);
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  setCurrentStep: (step) => {
    set({ currentStep: step });
  },

  markStepComplete: (step) => {
    const { builderId, completedSteps } = get();
    const newCompleted = [...new Set([...completedSteps, step])];
    set({ completedSteps: newCompleted });

    if (builderId) {
      builderService.update(builderId, { step_completed: step }).catch(console.error);
    }
  },

  deployBuilder: async () => {
    const { builderId, goal, industry, department, type, template, workflow } = get();
    if (!builderId) {
      return { success: false, message: 'No builder to deploy' };
    }

    set({ isLoading: true, error: null });

    try {
      // Ensure workflow actions exist on the backend before deploying
      let effectiveWorkflow = workflow;
      if (!effectiveWorkflow?.actions || effectiveWorkflow.actions.length === 0) {
        console.log('[Builder] No workflow actions found at deploy time, auto-generating workflow');
        const { generateWorkflow } = await import('@/lib/workflow/workflowGenerator');
        effectiveWorkflow = generateWorkflow({
          goal,
          industry,
          department,
          type: type || 'agent',
          template,
        });

        // CRITICAL: Must successfully save workflow before deploying
        try {
          await builderService.update(builderId, { workflow: effectiveWorkflow });
          console.log('[Builder] Auto-generated workflow saved before deploy');
          // Update local state immediately
          set({ workflow: effectiveWorkflow, lastSaved: new Date() });
          
          // Verify workflow was saved by reading it back
          const { builder } = await builderService.get(builderId);
          const savedConfig = builder.config as BuilderConfig;
          if (!savedConfig.workflow?.actions || savedConfig.workflow.actions.length === 0) {
            throw new Error('Workflow was not properly saved to backend');
          }
          console.log('[Builder] Verified workflow saved successfully:', savedConfig.workflow.actions.length, 'actions');
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to save workflow';
          console.error('[Builder] CRITICAL: Failed to save auto-generated workflow before deploy:', err);
          set({ isLoading: false, error: errorMsg });
          return { success: false, message: `Cannot deploy: ${errorMsg}` };
        }
      } else {
        // Verify existing workflow on backend before deploying
        console.log('[Builder] Verifying existing workflow on backend...');
        try {
          const { builder } = await builderService.get(builderId);
          const savedConfig = builder.config as BuilderConfig;
          if (!savedConfig.workflow?.actions || savedConfig.workflow.actions.length === 0) {
            console.warn('[Builder] Backend workflow is empty, re-saving...');
            await builderService.update(builderId, { workflow: effectiveWorkflow });
            console.log('[Builder] Re-saved workflow to backend');
          }
        } catch (err) {
          console.error('[Builder] Failed to verify backend workflow:', err);
          // Continue anyway if verification fails, but log it
        }
      }

      console.log('[Builder] Proceeding to deploy with workflow actions:', effectiveWorkflow.actions.length);
      const result = await builderService.deploy(builderId);
      set({ isLoading: false });
      
      if (result.status === 'success') {
        return { success: true, agentUrl: result.agent_url };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      const message = error instanceof Error ? error.message : 'Deployment failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  reset: () => {
    set(initialState);
  },
}));
