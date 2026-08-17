import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { RecommendationData } from '@/types/recommendation';
import { DigitalTwinConfig } from '@/types/digitalTwin';

export interface BuilderState {
  // Step 1: Define Goal
  systemName: string;
  department: string;
  outcome: string;
  successMetric: string;
  
  // Step 2: Choose Template
  selectedTemplate: string | null;
  
  // Step 3: Configure Intelligence (AI model, RAG, MCP servers, policies)
  connectors: Record<string, string>;
  knowledgeSources: Array<{
    id: string;
    type: 'file' | 'url' | 'repo';
    status: 'queued' | 'ingesting' | 'indexed' | 'failed';
    indexName?: string;
  }>;
  selectedModel: string | null;
  temperature: number;
  topK: number;
  topN: number;
  hybridSearch: boolean;
  geminiEnabled: boolean;
  vertexEnabled: boolean;
  systemPrompt: string;
  
  // Step 4: Build Workflow
  workflowNodes: any[];
  workflowId: string | null;
  
  // Step 5: Deploy
  roiAssumptions: {
    timeSavedMin: number;
    runsPerWeek: number;
    costPerHour: number;
    accuracyPct: number;
    costPerError: number;
  };
  
  // Recommendation context (from AI recommendations)
  recommendationData?: RecommendationData | null;

  // Digital Twin Integration (Phase 6)
  digitalTwinMode: 'none' | 'process_twin';
  digitalTwinDraft?: DigitalTwinConfig | null;
  digitalTwinId?: string | null;
}

/** Inclusive bounds of the builder wizard. */
export const BUILDER_MIN_STEP = 1;
export const BUILDER_MAX_STEP = 6;

interface BuilderStore {
  systemId: string | null;
  currentStep: number;
  state: BuilderState;
  isDirty: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  
  // Actions
  setSystemId: (id: string | null) => void;
  setCurrentStep: (step: number) => void;
  setState: (updates: Partial<BuilderState>) => void;
  setIsDirty: (dirty: boolean) => void;
  setLastSaved: (date: Date | null) => void;
  setIsSaving: (saving: boolean) => void;
  
  // Digital Twin actions (Phase 6)
  setDigitalTwinMode: (mode: 'none' | 'process_twin') => void;
  setDigitalTwinDraft: (config: DigitalTwinConfig | null) => void;
  updateDigitalTwinDraft: (patch: Partial<DigitalTwinConfig>) => void;
  resetDigitalTwinDraft: () => void;
  linkDigitalTwin: (id: string) => void;
  
  // Database operations
  save: () => Promise<void>;
  load: (systemId: string) => Promise<void>;
  reset: () => void;
  resetToInitial: () => void; // Complete reset to initial state
}

const initialState: BuilderState = {
  systemName: '',
  department: '',
  outcome: '',
  successMetric: '',
  selectedTemplate: null,
  connectors: {},
  knowledgeSources: [],
  selectedModel: null,
  temperature: 0.3,
  topK: 20,
  topN: 6,
  hybridSearch: true,
  geminiEnabled: true,
  vertexEnabled: true,
  systemPrompt: '',
  workflowNodes: [],
  workflowId: null,
  roiAssumptions: {
    timeSavedMin: 30,
    runsPerWeek: 40,
    costPerHour: 75,
    accuracyPct: 35,
    costPerError: 500,
  },
  recommendationData: null,
  digitalTwinMode: 'none',
  digitalTwinDraft: null,
  digitalTwinId: null,
};

export const useBuilderStore = create<BuilderStore>()(
  persist(
    (set, get) => ({
      systemId: null,
      currentStep: 1,
      state: initialState,
      isDirty: false,
      lastSaved: null,
      isSaving: false,

      setSystemId: (id) => set({ systemId: id }),
      // The builder has six steps; anything outside that range is a caller bug
      // and previously navigated the wizard to a step that renders nothing.
      setCurrentStep: (step) =>
        set({ currentStep: Math.min(BUILDER_MAX_STEP, Math.max(BUILDER_MIN_STEP, Math.round(step))) }),
      setState: (updates) => set((state) => ({
        state: { ...state.state, ...updates },
        isDirty: true,
      })),
      setIsDirty: (dirty) => set({ isDirty: dirty }),
      setLastSaved: (date) => set({ lastSaved: date }),
      setIsSaving: (saving) => set({ isSaving: saving }),

      // Digital Twin actions (Phase 6)
      setDigitalTwinMode: (mode) => set((state) => ({
        state: { ...state.state, digitalTwinMode: mode },
        isDirty: true,
      })),
      setDigitalTwinDraft: (config) => set((state) => ({
        state: { ...state.state, digitalTwinDraft: config },
        isDirty: true,
      })),
      updateDigitalTwinDraft: (patch) => set((state) => ({
        state: {
          ...state.state,
          digitalTwinDraft: state.state.digitalTwinDraft
            ? { ...state.state.digitalTwinDraft, ...patch }
            : null,
        },
        isDirty: true,
      })),
      resetDigitalTwinDraft: () => set((state) => ({
        state: {
          ...state.state,
          digitalTwinDraft: null,
          digitalTwinMode: 'none',
        },
        isDirty: true,
      })),
      linkDigitalTwin: (id) => set((state) => ({
        state: { ...state.state, digitalTwinId: id },
        isDirty: true,
      })),

      save: async () => {
        const { systemId, currentStep, state, setIsSaving, setLastSaved, setIsDirty, setSystemId, isSaving } = get();
        
        // Prevent concurrent saves
        if (isSaving) {
          console.warn('[builder:save] Save already in progress, skipping');
          return;
        }
        
        const requestId = crypto.randomUUID();
        console.info(`[builder:save:${requestId}] Starting save`, {
          systemId,
          currentStep,
          hasSystemName: !!state.systemName,
          hasDepartment: !!state.department
        });

        setIsSaving(true);
        try {
          // Import dynamically to avoid circular deps
          const { requireSession } = await import('@/lib/authBootstrap');
          const session = await requireSession(); // Auto-redirects if no session
          
          console.info(`[builder:save:${requestId}] Session validated`, { 
            userId: session?.user?.id,
            domain: window.location.hostname,
            hasToken: !!session?.access_token
          });

          if (!systemId) {
            // Create new system
            const payload = {
              name: state.systemName,
              department: state.department,
              outcome: state.outcome,
              successMetric: state.successMetric,
            };
            
            console.info(`[builder:save:${requestId}] Creating new system`, payload);

            const { data, error } = await supabase.functions.invoke('systems-create', {
              body: payload,
              headers: {
                'x-idempotency-key': requestId
              }
            });

            console.info(`[builder:save:${requestId}] Response from systems-create`, {
              hasData: !!data,
              hasError: !!error,
              data,
              error
            });

            if (error) {
              console.error(`[builder:save:${requestId}] Invoke error:`, error);
              console.error(`[builder:save:${requestId}] Error details:`, {
                name: error.name,
                message: error.message,
                context: (error as any).context,
                stack: error.stack,
              });
              
              // Extract the most specific error message
              let errorMessage = error.message || 'Unknown error';
              if ((error as any).context?.message) {
                errorMessage += ` (${(error as any).context.message})`;
              }
              
              throw new Error(`Failed to create system: ${errorMessage}. Function: systems-create. Check console for full details.`);
            }
            
            // The REST handler wraps responses in { success, data, error, correlationId }
            // So the actual system data is at data.data, not data directly
            const responseData = (data as any)?.data || data;
            
            if (responseData?.error) {
              console.error(`[builder:save:${requestId}] Server error:`, responseData.error);
              throw new Error(responseData.error);
            }

            if (!responseData?.system?.id) {
              console.error(`[builder:save:${requestId}] Invalid response structure:`, {
                rawData: data,
                unwrappedData: responseData
              });
              throw new Error('Invalid response from server: missing system ID');
            }

            const newSystemId = responseData.system.id;
            console.info(`[builder:save:${requestId}] System created successfully:`, newSystemId);
            setSystemId(newSystemId);

            // Save step state - use onConflict to handle unique constraint
            const { error: stateError } = await supabase
              .from('system_builder_state')
              .upsert({
                system_id: newSystemId,
                step: currentStep,
                state: state as any,
                completed: false,
              }, {
                onConflict: 'system_id,step',
              });

            if (stateError) {
              console.error(`[builder:save:${requestId}] Failed to save builder state:`, stateError);
            }
          } else {
            // Check if system exists first
            const { data: existingSystem, error: checkError } = await supabase
              .from('agents')
              .select('id, owner_id')
              .eq('id', systemId)
              .maybeSingle();

            if (checkError) {
              console.error(`[builder:save:${requestId}] Error checking system existence:`, checkError);
              throw new Error(`Failed to verify system: ${checkError.message}`);
            }

            if (!existingSystem) {
              console.warn(`[builder:save:${requestId}] System not found, creating new one instead`);
              
              // System doesn't exist, create a new one
              const createPayload = {
                name: state.systemName,
                department: state.department,
                outcome: state.outcome,
                successMetric: state.successMetric,
              };

              const { data: createData, error: createError } = await supabase.functions.invoke('systems-create', {
                body: createPayload,
                headers: {
                  'x-idempotency-key': requestId
                }
              });

              if (createError) {
                console.error(`[builder:save:${requestId}] Create error:`, createError);
                console.error(`[builder:save:${requestId}] Error details:`, {
                  name: createError.name,
                  message: createError.message,
                  context: (createError as any).context,
                  stack: createError.stack,
                });
                
                // Extract the most specific error message
                let errorMessage = createError.message || 'Unknown error';
                if ((createError as any).context?.message) {
                  errorMessage += ` (${(createError as any).context.message})`;
                }
                
                throw new Error(`Failed to create system: ${errorMessage}. Function: systems-create. Check console for full details.`);
              }

              // The REST handler wraps responses in { success, data, error, correlationId }
              const createResponseData = (createData as any)?.data || createData;

              if (createResponseData?.error) {
                console.error(`[builder:save:${requestId}] Server error:`, createResponseData.error);
                throw new Error(createResponseData.error);
              }

              if (!createResponseData?.system?.id) {
                console.error(`[builder:save:${requestId}] Invalid response structure:`, {
                  rawData: createData,
                  unwrappedData: createResponseData
                });
                throw new Error('Invalid response from server: missing system ID');
              }

              const newSystemId = createResponseData.system.id;
              console.info(`[builder:save:${requestId}] System created successfully:`, newSystemId);
              setSystemId(newSystemId);

              // Update URL without reload
              const url = new URL(window.location.href);
              url.searchParams.set('id', newSystemId);
              window.history.replaceState({}, '', url.toString());

              // Save initial state for the new system
              const { error: stateError } = await supabase
                .from('system_builder_state')
                .upsert({
                  system_id: newSystemId,
                  step: currentStep,
                  state: state as any,
                  completed: false,
                }, {
                  onConflict: 'system_id,step',
                });

              if (stateError) {
                console.error(`[builder:save:${requestId}] Failed to save initial builder state:`, stateError);
              }

              console.info(`[builder:save:${requestId}] New system save completed successfully`);
              setLastSaved(new Date());
              setIsDirty(false);
              return;
            }

            // Update existing system
            const payload = {
              id: systemId,
              name: state.systemName,
              department: state.department,
              outcome: state.outcome,
              successMetric: state.successMetric,
              step: currentStep,
              templateId: state.selectedTemplate || null,
              selectedModel: state.selectedModel || null,
              geminiEnabled: state.geminiEnabled,
              vertexEnabled: state.vertexEnabled,
              hybridSearch: state.hybridSearch,
              topK: state.topK,
              topN: state.topN,
              temperature: state.temperature,
              systemPrompt: state.systemPrompt,
              connectors: state.connectors,
              workflowNodes: state.workflowNodes,
              recommendationData: state.recommendationData,
            };

            console.info(`[builder:save:${requestId}] Updating system`, {
              systemId,
              fields: Object.keys(payload)
            });

            const { data, error: updateError } = await supabase.functions.invoke('systems-update', {
              body: payload,
              headers: {
                'x-idempotency-key': requestId
              }
            });

            console.info(`[builder:save:${requestId}] Response from systems-update`, {
              hasData: !!data,
              hasError: !!updateError,
              data,
              error: updateError
            });

            if (updateError) {
              console.error(`[builder:save:${requestId}] Update invoke error:`, updateError);
              throw new Error(`Failed to update system: ${updateError.message}`);
            }

            // The REST handler wraps responses in { success, data, error, correlationId }
            const updateResponseData = (data as any)?.data || data;

            if (updateResponseData?.error) {
              console.error(`[builder:save:${requestId}] Server error:`, updateResponseData.error);
              throw new Error(updateResponseData.error);
            }

            // Update step state - use onConflict to handle unique constraint
            const { error: stateError } = await supabase
              .from('system_builder_state')
              .upsert({
                system_id: systemId,
                step: currentStep,
                state: state as any,
                completed: false,
              }, {
                onConflict: 'system_id,step',
              });

            if (stateError) {
              console.error(`[builder:save:${requestId}] Failed to save builder state:`, stateError);
            }
          }

          console.info(`[builder:save:${requestId}] Save completed successfully`);
          setLastSaved(new Date());
          setIsDirty(false);
        } catch (error) {
          console.error(`[builder:save:${requestId}] Save failed:`, error);
          console.error(`[builder:save:${requestId}] Error details:`, {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          throw error;
        } finally {
          setIsSaving(false);
        }
      },

      load: async (systemId: string) => {
        try {
          // Load system data
          const { data: systemData, error: systemError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', systemId)
            .maybeSingle();

          if (systemError) throw systemError;
          
          if (!systemData) {
            throw new Error('System not found');
          }

          // Load step states
          const { data: stateData } = await supabase
            .from('system_builder_state')
            .select('*')
            .eq('system_id', systemId)
            .order('step', { ascending: false })
            .limit(1)
            .maybeSingle();

          const config = systemData.config as any || {};
          const savedState = (stateData?.state as any) || {};

          set({
            systemId,
            currentStep: stateData?.step || 1,
            state: {
              systemName: systemData.name,
              department: config.department || savedState.department || '',
              outcome: config.outcome || savedState.outcome || '',
              successMetric: config.successMetric || savedState.successMetric || '',
              selectedTemplate: config.templateId || savedState.selectedTemplate || null,
              selectedModel: config.selectedModel || savedState.selectedModel || null,
              geminiEnabled: config.geminiEnabled ?? true,
              vertexEnabled: config.vertexEnabled ?? true,
              hybridSearch: config.hybridSearch ?? true,
              topK: config.topK || savedState.topK || 20,
              topN: config.topN || savedState.topN || 6,
              temperature: config.temperature || savedState.temperature || 0.3,
              systemPrompt: config.systemPrompt || savedState.systemPrompt || '',
              connectors: config.connectors || savedState.connectors || {},
              knowledgeSources: savedState.knowledgeSources || [],
              workflowNodes: config.workflowNodes || savedState.workflowNodes || [],
              workflowId: savedState.workflowId || null,
              roiAssumptions: savedState.roiAssumptions || initialState.roiAssumptions,
              recommendationData: config.recommendationData || savedState.recommendationData || null,
              digitalTwinMode: savedState.digitalTwinMode || 'none',
              digitalTwinDraft: savedState.digitalTwinDraft || null,
              digitalTwinId: savedState.digitalTwinId || null,
            },
            isDirty: false,
            lastSaved: new Date(stateData?.updated_at || systemData.updated_at),
          });
        } catch (error) {
          console.error('Load error:', error);
          throw error;
        }
      },

      reset: () => set({
        systemId: null,
        currentStep: 1,
        state: initialState,
        isDirty: false,
        lastSaved: null,
        isSaving: false,
      }),

      resetToInitial: () => {
        console.log('[builder:resetToInitial] Complete reset to initial state');
        set({
          systemId: null,
          currentStep: 1,
          state: { ...initialState },
          isDirty: false,
          lastSaved: null,
          isSaving: false,
        });
      },
    }),
    {
      name: 'builder-storage',
      partialize: (state) => ({
        systemId: state.systemId,
        currentStep: state.currentStep,
        state: state.state,
      }),
    }
  )
);
