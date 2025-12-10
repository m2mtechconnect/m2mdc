/**
 * DC Twin Builder Store
 * Zustand store for Sovereign Green AI Data Centre Twin builder state
 * Single source of truth for all builder tabs and steps
 * Includes auto-creation mechanism for required entities
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
  DCFinancialModel,
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
  DEFAULT_DC_FINANCIAL_MODEL,
  ARCHETYPE_TO_BUILDER_AGENT_MAP,
  ARCHETYPE_TO_BUILDER_SCENARIO_MAP,
} from '@/types/dcTwinBuilder';
import type { DCRecommendation, DCScanIndustry, DCBlueprintProfile } from '@/types/dcScan';
import type { GreenDcTwinRecommendation } from '@/types/greenDcTwin';

interface DCTwinBuilderActions {
  // Initialization
  initializeFromRecommendation: (recommendation: DCRecommendation, sessionId: string) => void;
  initializeFromGreenDcRecommendation: (recommendation: GreenDcTwinRecommendation, sessionId: string) => void;
  initializeFromScratch: () => void;
  loadFromStorage: () => void;
  
  // Financial
  updateFinancial: (updates: Partial<DCFinancialModel>) => void;
  
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

// ============================================================================
// AUTO-CREATION MECHANISM FOR REQUIRED ENTITIES
// ============================================================================

/**
 * Ensures all required entities (KPIs, agents, workflows, scenarios) exist in state.
 * If any required entity is missing, it will be auto-created with default config.
 * This function does NOT overwrite existing entries.
 */
function ensureRequiredEntities(state: DCTwinBuilderState): DCTwinBuilderState {
  let updated = { ...state };
  let hasChanges = false;

  // 1. Ensure all required KPIs exist
  const existingKpiIds = new Set(updated.kpis.map(k => k.id));
  const missingKpis = REQUIRED_DC_KPIS.filter(k => !existingKpiIds.has(k.id));
  if (missingKpis.length > 0) {
    updated.kpis = [...updated.kpis, ...missingKpis];
    hasChanges = true;
    console.log('[DCTwinBuilder] Auto-created missing KPIs:', missingKpis.map(k => k.id));
  }

  // 2. Ensure all required agents exist
  const existingAgentIds = new Set(updated.agents.map(a => a.id));
  const missingAgents = REQUIRED_DC_AGENTS.filter(a => !existingAgentIds.has(a.id));
  if (missingAgents.length > 0) {
    updated.agents = [...updated.agents, ...missingAgents];
    hasChanges = true;
    console.log('[DCTwinBuilder] Auto-created missing agents:', missingAgents.map(a => a.id));
  }

  // 3. Ensure all required workflows exist
  const existingWorkflowIds = new Set(updated.workflows.map(w => w.id));
  const missingWorkflows = REQUIRED_DC_WORKFLOWS.filter(w => !existingWorkflowIds.has(w.id));
  if (missingWorkflows.length > 0) {
    updated.workflows = [...updated.workflows, ...missingWorkflows];
    hasChanges = true;
    console.log('[DCTwinBuilder] Auto-created missing workflows:', missingWorkflows.map(w => w.id));
  }

  // 4. Ensure all required scenarios exist
  const existingScenarioIds = new Set(updated.scenarios.map(s => s.id));
  const missingScenarios = REQUIRED_DC_SCENARIOS.filter(s => !existingScenarioIds.has(s.id));
  if (missingScenarios.length > 0) {
    updated.scenarios = [...updated.scenarios, ...missingScenarios];
    hasChanges = true;
    console.log('[DCTwinBuilder] Auto-created missing scenarios:', missingScenarios.map(s => s.id));
  }

  // 5. Ensure all required data sources exist
  const existingDataSourceIds = new Set(updated.dataSources.map(ds => ds.id));
  const missingDataSources = REQUIRED_DC_DATA_SOURCES.filter(ds => !existingDataSourceIds.has(ds.id));
  if (missingDataSources.length > 0) {
    updated.dataSources = [...updated.dataSources, ...missingDataSources];
    hasChanges = true;
    console.log('[DCTwinBuilder] Auto-created missing data sources:', missingDataSources.map(ds => ds.id));
  }

  // 6. Ensure deployment checks are populated
  if (updated.deployment.deploymentChecks.length === 0) {
    updated.deployment = {
      ...updated.deployment,
      deploymentChecks: calculateDeploymentChecks(updated),
    };
    hasChanges = true;
    console.log('[DCTwinBuilder] Auto-created deployment checks');
  }

  if (hasChanges) {
    updated.isDirty = true;
  }

  return updated;
}

/**
 * Calculate deployment checks based on current state
 */
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

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useDCTwinBuilderStore = create<DCTwinBuilderStore>()(
  persist(
    (set, get) => ({
      // Initialize with ensured entities
      ...ensureRequiredEntities(createDefaultDCTwinBuilderState()),

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

        // Create base state with updated overview
        const baseState: DCTwinBuilderState = {
          ...defaultState,
          sessionId,
          overview,
          sourceRecommendation: {
            url: recommendation.url,
            detectedIndustry: recommendation.detectedIndustry,
            blueprintProfile: recommendation.blueprintProfile,
          },
          isDirty: true,
          lastSaved: null,
        };

        // Ensure all required entities exist and calculate deployment checks
        const ensuredState = ensureRequiredEntities(baseState);
        ensuredState.deployment.deploymentChecks = calculateDeploymentChecks(ensuredState);

        set(ensuredState);
      },

      initializeFromGreenDcRecommendation: (recommendation, sessionId) => {
        console.log('[DCTwinBuilder] Initializing from Green DC recommendation:', recommendation.archetypeId);
        
        const defaultState = createDefaultDCTwinBuilderState();
        const isMegaRetailer = recommendation.isMegaRetailer || recommendation.archetypeId === 'retail_hyperscale_green_twin';
        
        // Map archetype agent IDs to builder agent IDs
        const mappedAgentIds = recommendation.agents.map(
          agentId => ARCHETYPE_TO_BUILDER_AGENT_MAP[agentId] || agentId
        );
        
        // Map archetype scenario IDs to builder scenario IDs
        const mappedScenarioIds = recommendation.scenarios.map(
          scenarioId => ARCHETYPE_TO_BUILDER_SCENARIO_MAP[scenarioId] || scenarioId
        );
        
        // Get unique scenario IDs that exist in our required scenarios
        const validScenarioIds = new Set(REQUIRED_DC_SCENARIOS.map(s => s.id));
        const uniqueScenarios = [...new Set(mappedScenarioIds)].filter(id => validScenarioIds.has(id));
        
        // Determine capacity for mega-retailers
        const capacityKw = isMegaRetailer ? 20000 : // 20MW for mega-retailers
          recommendation.capacityTier === 'small' ? 500 :
          recommendation.capacityTier === 'medium' ? 2500 :
          recommendation.capacityTier === 'large' ? 10000 : 50000;
        
        // Build enterprise description for mega-retailers
        const description = isMegaRetailer 
          ? `Your organization operates one of the world's largest distributed retail infrastructures. This Twin optimizes both hyperscale data centres and retail edge workloads across thousands of sites.`
          : `AI-powered digital twin for ${recommendation.industry} operations with focus on sustainability and sovereignty.`;
        
        // Map recommendation to overview with customer name and industry
        const overview: DCTwinOverview = {
          ...defaultState.overview,
          twinName: `${recommendation.companyName} Sovereign Green AI Data Centre Twin`,
          twinSlug: `dc-twin-${(recommendation.companyName || recommendation.domain).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          customerName: recommendation.companyName,
          siteUrl: recommendation.domain,
          industry: recommendation.industryId || recommendation.industry,
          twinSummary: recommendation.objectives.join('. '),
          industries: isMegaRetailer 
            ? ['Retail', 'Logistics', 'Supply Chain', 'Edge Computing', 'Sustainability']
            : [recommendation.industry, 'Technology', 'IT Operations', 'Sustainability'],
          primaryUseCases: recommendation.objectives.slice(0, 6),
          capacityKw,
          tier: recommendation.kpiTargets.uptimeTargetPct >= 99.99 ? 'Tier IV' : 'Tier III',
          renewablePercent: recommendation.kpiTargets.renewableShareTargetPct,
          sovereignCompliance: recommendation.kpiTargets.sovereigntyScoreTargetPct >= 80,
          keyCapabilities: recommendation.objectives,
          kpisImproved: [
            `PUE Target: ${recommendation.kpiTargets.pueTarget}`,
            `Renewable: ${recommendation.kpiTargets.renewableShareTargetPct}%`,
            `Sovereignty: ${recommendation.kpiTargets.sovereigntyScoreTargetPct}%`,
            `Uptime: ${recommendation.kpiTargets.uptimeTargetPct}%`,
          ],
        };
        
        // Map financial model with retail-specific fields
        const financial: DCFinancialModel = {
          annualPowerCostUsd: recommendation.financialModel.baselineAnnualCostUsd,
          annualCarbonTonnes: recommendation.financialModel.baselineAnnualCarbonTonnes,
          upgradeSavingsPercent: recommendation.financialModel.greenVariantSavingsCostPct,
          carbonSavingsPercent: recommendation.financialModel.greenVariantSavingsCarbonPct,
          paybackYears: recommendation.financialModel.estimatedPaybackYears,
          // Retail hyperscale fields
          annualColdChainEnergyCostUsd: recommendation.financialModel.annualColdChainEnergyCostUsd,
          annualEdgeComputeEnergyCostUsd: recommendation.financialModel.annualEdgeComputeEnergyCostUsd,
          fleetWideCarbonTaxRiskUsd: recommendation.financialModel.fleetWideCarbonTaxRiskUsd,
          aiWorkloadOptimizationSavingsUsd: recommendation.financialModel.aiWorkloadOptimizationSavingsUsd,
          multiStoreAggregationCount: recommendation.financialModel.multiStoreAggregationCount,
        };
        
        // Update KPI targets based on recommendation + enable retail KPIs for mega-retailers
        const retailKpiIds = ['retail-edge-uptime', 'cold-chain-efficiency', 'gpu-fleet-saturation', 'retail-latency', 'carbon-cost-exposure'];
        const updatedKpis = defaultState.kpis.map(kpi => {
          let updated = { ...kpi };
          if (kpi.id === 'effective-ai-pue') {
            updated.target = recommendation.kpiTargets.pueTarget;
          }
          if (kpi.id === 'sovereign-compute-ratio') {
            updated.target = recommendation.kpiTargets.sovereigntyScoreTargetPct;
          }
          if (kpi.id === 'uptime') {
            updated.target = recommendation.kpiTargets.uptimeTargetPct;
          }
          if (kpi.id === 'gco2-per-gpu-hour') {
            updated.target = recommendation.kpiTargets.carbonIntensityTargetGPerKwh;
          }
          // Enable retail KPIs for mega-retailers
          if (isMegaRetailer && retailKpiIds.includes(kpi.id)) {
            updated.enabled = true;
          }
          return updated;
        });
        
        // Enable agents that are in the recommendation
        const updatedAgents = defaultState.agents.map(agent => ({
          ...agent,
          enabled: mappedAgentIds.includes(agent.id),
        }));
        
        // Enable scenarios that are in the recommendation
        const updatedScenarios = defaultState.scenarios.map(scenario => ({
          ...scenario,
          enabled: uniqueScenarios.includes(scenario.id),
        }));
        
        // Create base state with updated values
        const baseState: DCTwinBuilderState = {
          ...defaultState,
          sessionId,
          overview,
          agents: updatedAgents,
          kpis: updatedKpis,
          scenarios: updatedScenarios,
          financial,
          sourceRecommendation: {
            url: recommendation.domain,
            detectedIndustry: recommendation.industry as DCScanIndustry,
            blueprintProfile: recommendation.archetypeId as DCBlueprintProfile,
          },
          isDirty: true,
          lastSaved: null,
        };

        // Ensure all required entities exist and calculate deployment checks
        const ensuredState = ensureRequiredEntities(baseState);
        ensuredState.deployment.deploymentChecks = calculateDeploymentChecks(ensuredState);

        set(ensuredState);
      },

      initializeFromScratch: () => {
        console.log('[DCTwinBuilder] Initializing from scratch');
        const baseState = createDefaultDCTwinBuilderState();
        const ensuredState = ensureRequiredEntities(baseState);
        ensuredState.deployment.deploymentChecks = calculateDeploymentChecks(ensuredState);
        set(ensuredState);
      },

      loadFromStorage: () => {
        // This is handled by the persist middleware
        // After loading, ensure required entities exist
        const currentState = get();
        const ensuredState = ensureRequiredEntities(currentState);
        if (ensuredState !== currentState) {
          set(ensuredState);
        }
        console.log('[DCTwinBuilder] State loaded from storage and validated');
      },
      
      // =====================================================================
      // FINANCIAL
      // =====================================================================
      
      updateFinancial: (updates) => {
        set((state) => ({
          financial: { ...state.financial, ...updates },
          isDirty: true,
        }));
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
        const baseState = createDefaultDCTwinBuilderState();
        const ensuredState = ensureRequiredEntities(baseState);
        ensuredState.deployment.deploymentChecks = calculateDeploymentChecks(ensuredState);
        set(ensuredState);
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
            summary: state.overview.twinSummary,
            description: state.overview.description,
            industries: state.overview.industries,
            primaryUseCases: state.overview.primaryUseCases,
            targetAudience: state.overview.targetAudience,
            displayRoi: state.overview.displayRoi,
            displayTimeSaved: state.overview.displayTimeSaved,
            businessImpactSummary: state.overview.businessImpactSummary,
            keyBenefits: state.overview.keyBenefits,
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
          integrations: state.integrations,
          workflows: state.workflows.filter((w) => w.enabled),
          scenarios: state.scenarios.filter((s) => s.enabled),
          intelligence: state.intelligence,
          deployment: {
            targetRegion: state.deployment.targetDeploymentRegion,
            cloudRegions: state.deployment.cloudRegions,
            deploymentChecks: state.deployment.deploymentChecks,
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
      // On rehydration, ensure required entities exist
      onRehydrateStorage: () => (state) => {
        if (state) {
          const ensuredState = ensureRequiredEntities(state);
          if (ensuredState.deployment.deploymentChecks.length === 0) {
            ensuredState.deployment.deploymentChecks = calculateDeploymentChecks(ensuredState);
          }
          // Merge ensured state back
          Object.assign(state, ensuredState);
          console.log('[DCTwinBuilder] State rehydrated and validated');
        }
      },
    }
  )
);

// Export a hook to use the store
export function useDCTwinBuilder() {
  return useDCTwinBuilderStore();
}

// Export the ensure function for external use (testing, imports)
export { ensureRequiredEntities, calculateDeploymentChecks };
