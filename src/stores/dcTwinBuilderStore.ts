/**
 * DC Twin Builder Store
 * Zustand store for Sovereign Green AI Data Centre Twin builder state
 * Single source of truth for all builder tabs and steps
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DCTwinBuilderState,
  DCTwinOverview,
  DCAgentConfig,
  DCDataSourceConfig,
  DCKPIConfig,
  DCWorkflowConfig,
  DCScenarioConfig,
  DCIntelligenceConfig,
  DCDeploymentConfig,
} from '@/types/dcTwinBuilder';
import {
  createDefaultDCTwinBuilderState,
  REQUIRED_DC_AGENTS,
  REQUIRED_DC_DATA_SOURCES,
  REQUIRED_DC_KPIS,
  REQUIRED_DC_WORKFLOWS,
  REQUIRED_DC_SCENARIOS,
  DEFAULT_DC_INTELLIGENCE,
  CANADIAN_CLOUD_REGIONS,
  DEFAULT_DEPLOYMENT_STEPS,
} from '@/types/dcTwinBuilder';
import type { DCRecommendation, DCScanIndustry, DCBlueprintProfile } from '@/types/dcScan';

interface DCTwinBuilderActions {
  // Initialization
  initializeFromRecommendation: (recommendation: DCRecommendation, sessionId: string) => void;
  initializeFromScratch: () => void;
  loadFromStorage: () => void;
  
  // Step 1: Overview
  updateOverview: (updates: Partial<DCTwinOverview>) => void;
  
  // Step 2 & 3: Blueprint
  updateAgents: (agents: DCAgentConfig[]) => void;
  toggleAgent: (agentId: string, enabled: boolean) => void;
  updateDataSources: (dataSources: DCDataSourceConfig[]) => void;
  toggleDataSource: (dataSourceId: string, enabled: boolean) => void;
  updateKPIs: (kpis: DCKPIConfig[]) => void;
  toggleKPI: (kpiId: string, enabled: boolean) => void;
  addIntegration: (integration: { id: string; name: string; type: string; connected: boolean; config: Record<string, any> }) => void;
  removeIntegration: (integrationId: string) => void;
  
  // Preview (Intelligence)
  updateIntelligence: (updates: Partial<DCIntelligenceConfig>) => void;
  addSampleQuery: (query: string) => void;
  removeSampleQuery: (index: number) => void;
  
  // Step 4: Workflows & Scenarios
  updateWorkflows: (workflows: DCWorkflowConfig[]) => void;
  toggleWorkflow: (workflowId: string, enabled: boolean) => void;
  updateScenarios: (scenarios: DCScenarioConfig[]) => void;
  toggleScenario: (scenarioId: string, enabled: boolean) => void;
  
  // Step 5: Deployment
  updateDeployment: (updates: Partial<DCDeploymentConfig>) => void;
  setTargetRegion: (regionCode: string) => void;
  updateDeploymentCheckStatus: (checkId: string, status: 'pass' | 'fail' | 'pending') => void;
  updateOrchestratorStepStatus: (step: number, status: 'pending' | 'in_progress' | 'completed' | 'failed') => void;
  
  // Navigation
  setCurrentStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  
  // State management
  markDirty: () => void;
  markSaved: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  
  // Computed / derived
  getReadinessScore: () => number;
  isReadyForDeployment: () => boolean;
  getBlueprintJSON: () => Record<string, any>;
}

type DCTwinBuilderStore = DCTwinBuilderState & DCTwinBuilderActions;

export const useDCTwinBuilderStore = create<DCTwinBuilderStore>()(
  persist(
    (set, get) => ({
      ...createDefaultDCTwinBuilderState(),

      // =====================================================================
      // INITIALIZATION
      // =====================================================================
      
      initializeFromRecommendation: (recommendation, sessionId) => {
        console.log('[DCTwinBuilder] Initializing from recommendation:', recommendation.blueprintProfile);
        
        const defaultState = createDefaultDCTwinBuilderState();
        
        // Map recommendation to overview
        const overview: DCTwinOverview = {
          ...defaultState.overview,
          twinName: `Sovereign Green AI Data Centre Twin for ${new URL(recommendation.url).hostname.replace('www.', '')}`,
          twinSummary: recommendation.summary,
          description: recommendation.summary,
          industries: [recommendation.detectedIndustry, 'Technology', 'IT Operations', 'Sustainability'],
          capacityKw: recommendation.suggestedCapacityKw,
          tier: recommendation.suggestedTier,
          keyCapabilities: recommendation.coreAgents,
          kpisImproved: recommendation.mainKPIs,
        };

        // Calculate deployment checks based on configuration
        const deploymentChecks = calculateDeploymentChecks(defaultState);

        set({
          ...defaultState,
          sessionId,
          overview,
          deployment: {
            ...defaultState.deployment,
            deploymentChecks,
          },
          sourceRecommendation: {
            url: recommendation.url,
            detectedIndustry: recommendation.detectedIndustry,
            blueprintProfile: recommendation.blueprintProfile,
          },
          isDirty: true,
          lastSaved: null,
        });
      },

      initializeFromScratch: () => {
        console.log('[DCTwinBuilder] Initializing from scratch');
        set(createDefaultDCTwinBuilderState());
      },

      loadFromStorage: () => {
        // This is handled by the persist middleware
        console.log('[DCTwinBuilder] State loaded from storage');
      },

      // =====================================================================
      // STEP 1: OVERVIEW
      // =====================================================================
      
      updateOverview: (updates) => {
        set((state) => ({
          overview: { ...state.overview, ...updates },
          isDirty: true,
        }));
      },

      // =====================================================================
      // STEP 2 & 3: BLUEPRINT
      // =====================================================================
      
      updateAgents: (agents) => {
        set({ agents, isDirty: true });
      },

      toggleAgent: (agentId, enabled) => {
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId ? { ...a, enabled } : a
          ),
          isDirty: true,
        }));
      },

      updateDataSources: (dataSources) => {
        set({ dataSources, isDirty: true });
      },

      toggleDataSource: (dataSourceId, enabled) => {
        set((state) => ({
          dataSources: state.dataSources.map((ds) =>
            ds.id === dataSourceId ? { ...ds, enabled } : ds
          ),
          isDirty: true,
        }));
      },

      updateKPIs: (kpis) => {
        set({ kpis, isDirty: true });
      },

      toggleKPI: (kpiId, enabled) => {
        set((state) => ({
          kpis: state.kpis.map((k) =>
            k.id === kpiId ? { ...k, enabled } : k
          ),
          isDirty: true,
        }));
      },

      addIntegration: (integration) => {
        set((state) => ({
          integrations: [...state.integrations, integration],
          isDirty: true,
        }));
      },

      removeIntegration: (integrationId) => {
        set((state) => ({
          integrations: state.integrations.filter((i) => i.id !== integrationId),
          isDirty: true,
        }));
      },

      // =====================================================================
      // PREVIEW (INTELLIGENCE)
      // =====================================================================
      
      updateIntelligence: (updates) => {
        set((state) => ({
          intelligence: { ...state.intelligence, ...updates },
          isDirty: true,
        }));
      },

      addSampleQuery: (query) => {
        set((state) => ({
          intelligence: {
            ...state.intelligence,
            sampleQueries: [...state.intelligence.sampleQueries, query],
          },
          isDirty: true,
        }));
      },

      removeSampleQuery: (index) => {
        set((state) => ({
          intelligence: {
            ...state.intelligence,
            sampleQueries: state.intelligence.sampleQueries.filter((_, i) => i !== index),
          },
          isDirty: true,
        }));
      },

      // =====================================================================
      // STEP 4: WORKFLOWS & SCENARIOS
      // =====================================================================
      
      updateWorkflows: (workflows) => {
        set({ workflows, isDirty: true });
      },

      toggleWorkflow: (workflowId, enabled) => {
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === workflowId ? { ...w, enabled } : w
          ),
          isDirty: true,
        }));
      },

      updateScenarios: (scenarios) => {
        set({ scenarios, isDirty: true });
      },

      toggleScenario: (scenarioId, enabled) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === scenarioId ? { ...s, enabled } : s
          ),
          isDirty: true,
        }));
      },

      // =====================================================================
      // STEP 5: DEPLOYMENT
      // =====================================================================
      
      updateDeployment: (updates) => {
        set((state) => ({
          deployment: { ...state.deployment, ...updates },
          isDirty: true,
        }));
      },

      setTargetRegion: (regionCode) => {
        set((state) => ({
          deployment: { ...state.deployment, targetDeploymentRegion: regionCode },
          isDirty: true,
        }));
      },

      updateDeploymentCheckStatus: (checkId, status) => {
        set((state) => ({
          deployment: {
            ...state.deployment,
            deploymentChecks: state.deployment.deploymentChecks.map((c) =>
              c.id === checkId ? { ...c, status } : c
            ),
          },
        }));
      },

      updateOrchestratorStepStatus: (step, status) => {
        set((state) => ({
          deployment: {
            ...state.deployment,
            orchestratorSteps: state.deployment.orchestratorSteps.map((s) =>
              s.step === step ? { ...s, status } : s
            ),
          },
        }));
      },

      // =====================================================================
      // NAVIGATION
      // =====================================================================
      
      setCurrentStep: (step) => {
        set({ currentStep: step });
      },

      markStepComplete: (step) => {
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        }));
      },

      // =====================================================================
      // STATE MANAGEMENT
      // =====================================================================
      
      markDirty: () => set({ isDirty: true }),
      markSaved: () => set({ isDirty: false, lastSaved: new Date() }),
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      
      reset: () => {
        console.log('[DCTwinBuilder] Resetting state');
        set(createDefaultDCTwinBuilderState());
      },

      // =====================================================================
      // COMPUTED / DERIVED
      // =====================================================================
      
      getReadinessScore: () => {
        const state = get();
        let score = 0;

        // Overview completeness (20 points)
        if (state.overview.twinName) score += 5;
        if (state.overview.twinSummary || state.overview.description) score += 5;
        if (state.overview.industries.length > 0) score += 5;
        if (state.overview.capacityKw > 0) score += 5;

        // Agents enabled (15 points)
        const enabledAgents = state.agents.filter((a) => a.enabled).length;
        score += Math.min(15, enabledAgents * 2);

        // Data sources configured (15 points)
        const enabledDataSources = state.dataSources.filter((ds) => ds.enabled).length;
        score += Math.min(15, enabledDataSources * 3);

        // KPIs enabled (10 points)
        const enabledKPIs = state.kpis.filter((k) => k.enabled).length;
        score += Math.min(10, enabledKPIs * 1.5);

        // Workflows enabled (15 points)
        const enabledWorkflows = state.workflows.filter((w) => w.enabled).length;
        score += Math.min(15, enabledWorkflows * 4);

        // Scenarios enabled (10 points)
        const enabledScenarios = state.scenarios.filter((s) => s.enabled).length;
        score += Math.min(10, enabledScenarios * 1.5);

        // Deployment configured (15 points)
        if (state.deployment.targetDeploymentRegion) score += 10;
        const passedChecks = state.deployment.deploymentChecks.filter((c) => c.status === 'pass').length;
        score += Math.min(5, passedChecks);

        return Math.min(100, Math.round(score));
      },

      isReadyForDeployment: () => {
        const state = get();
        const score = get().getReadinessScore();
        
        // Require at least 70% score and critical checks passed
        if (score < 70) return false;
        
        // Require at least one enabled agent
        if (!state.agents.some((a) => a.enabled)) return false;
        
        // Require target region selected
        if (!state.deployment.targetDeploymentRegion) return false;
        
        return true;
      },

      getBlueprintJSON: () => {
        const state = get();
        
        return {
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          twin: {
            name: state.overview.twinName,
            slug: state.overview.twinSlug,
            description: state.overview.description,
            industries: state.overview.industries,
            facility: {
              location: state.overview.facilityLocation,
              regionCode: state.overview.regionCode,
              capacityKw: state.overview.capacityKw,
              tier: state.overview.tier,
              gpuFleet: state.overview.gpuFleet,
              coolingType: state.overview.coolingType,
              powerTopology: state.overview.powerTopology,
              renewablePercent: state.overview.renewablePercent,
              sovereignCompliance: state.overview.sovereignCompliance,
            },
          },
          agents: state.agents.filter((a) => a.enabled),
          dataSources: state.dataSources.filter((ds) => ds.enabled),
          kpis: state.kpis.filter((k) => k.enabled),
          workflows: state.workflows.filter((w) => w.enabled),
          scenarios: state.scenarios.filter((s) => s.enabled),
          intelligence: state.intelligence,
          deployment: {
            targetRegion: state.deployment.targetDeploymentRegion,
            cloudRegions: state.deployment.cloudRegions,
          },
          sourceRecommendation: state.sourceRecommendation,
        };
      },
    }),
    {
      name: 'dc-twin-builder-storage',
      partialize: (state) => ({
        builderId: state.builderId,
        sessionId: state.sessionId,
        overview: state.overview,
        agents: state.agents,
        dataSources: state.dataSources,
        kpis: state.kpis,
        integrations: state.integrations,
        intelligence: state.intelligence,
        workflows: state.workflows,
        scenarios: state.scenarios,
        deployment: state.deployment,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        sourceRecommendation: state.sourceRecommendation,
      }),
    }
  )
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateDeploymentChecks(state: DCTwinBuilderState) {
  const checks = [
    {
      id: 'check-region-selected',
      name: 'Target Region Selected',
      category: 'sovereignty' as const,
      status: state.deployment.targetDeploymentRegion ? 'pass' : 'pending',
      requiresConfigAction: !state.deployment.targetDeploymentRegion,
    },
    {
      id: 'check-agents-enabled',
      name: 'Core Agents Enabled',
      category: 'workflows' as const,
      status: state.agents.filter((a) => a.enabled).length >= 3 ? 'pass' : 'pending',
      requiresConfigAction: state.agents.filter((a) => a.enabled).length < 3,
    },
    {
      id: 'check-data-sources',
      name: 'Data Sources Connected',
      category: 'telemetry' as const,
      status: state.dataSources.filter((ds) => ds.enabled).length >= 3 ? 'pass' : 'pending',
      requiresConfigAction: state.dataSources.filter((ds) => ds.enabled).length < 3,
    },
    {
      id: 'check-kpis-configured',
      name: 'KPIs Configured',
      category: 'kpis' as const,
      status: state.kpis.filter((k) => k.enabled).length >= 5 ? 'pass' : 'pending',
      requiresConfigAction: state.kpis.filter((k) => k.enabled).length < 5,
    },
    {
      id: 'check-workflows-enabled',
      name: 'Workflows Enabled',
      category: 'workflows' as const,
      status: state.workflows.filter((w) => w.enabled).length >= 2 ? 'pass' : 'pending',
      requiresConfigAction: state.workflows.filter((w) => w.enabled).length < 2,
    },
    {
      id: 'check-sovereignty',
      name: 'Sovereignty Compliance',
      category: 'sovereignty' as const,
      status: state.overview.sovereignCompliance ? 'pass' : 'pending',
      requiresConfigAction: !state.overview.sovereignCompliance,
    },
  ];

  return checks as DCTwinBuilderState['deployment']['deploymentChecks'];
}

// Export a hook to use the store
export function useDCTwinBuilder() {
  return useDCTwinBuilderStore();
}
