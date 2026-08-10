/**
 * Co-Pilot Context Builder
 * 
 * Builds rich context objects for Co-Pilot from current page state,
 * agent metadata, user activity, and blueprint data.
 */

import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/lib/identifiers';
import { generateDefaultBlueprint } from '@/data/defaultBlueprint';
import { dcToolRegistry, type DcToolDefinition } from '@/data/dcToolRegistry';
import { getSovereigntyEngine, mockDataAssets, mockDataFlows, mockSovereigntyPolicies, mockComplianceFrameworks } from '@/sovereignty';
import { CarbonEngine, REGIONAL_CARBON_INTENSITY } from '@/engines/carbon';
import { FinancialEngine, DEFAULT_FINANCIAL_ASSUMPTIONS } from '@/engines/financial';

export interface SimulationTemplateContext {
  title: string;
  scenarioSummary: string;
  kpis: Array<{ label: string; baseline: number; simulated: number; unit: string }>;
  events: Array<{ label: string; severity?: string; timestampOffsetMin: number }>;
}

export interface TwinContext {
  templateId: string;
  templateName: string;
  templateType: string;
  currentTab: string;
  mockDataEnabled: boolean;
  blueprint?: {
    name?: string;
    agents: string[];
    dataSources: string[];
    integrations: string[];
    workflowCount: number;
    kpiCount: number;
    scenarioCount: number;
    humanRoles: string[];
  };
  kpis?: {
    definitions: any[];
    currentValues: Record<string, number>;
  };
  simulation?: {
    availableScenarios: string[];
    lastScenario?: string;
    lastResults?: any;
  };
  mockData?: {
    facilityStatus?: any;
    recentIncidents?: any[];
    sampleMetrics?: any[];
  };
  sessionMemory?: {
    messageCount: number;
    lastViewed: string;
  };
}

export interface CoPilotContext {
  // Page context
  activePage: 
    | 'dashboard'
    | 'manage_agents'
    | 'agent_detail'
    | 'live'
    | 'workflow'
    | 'blueprint'
    | 'simulation'
    | 'metrics'
    | 'deploy'
    | 'governance'
    | 'builder'
    | 'template_library'
    | 'url_scanner'
    | 'recommendations'
    | 'playbook'
    | 'twin_chat'
    | 'data_centre_twin';
  
  // Agent context
  agentId?: string;
  agentName?: string;
  agentType?: 'digital_twin' | 'agent';
  agentStatus?: string;
  
  // Multi-tenant twin context
  twinId?: string;
  twin?: {
    name: string;
    city: string;
    region: string;
    tier: string;
    capacity_kw: number;
    industry: string | null;
    sovereignty_level: string | null;
    pue_target: number | null;
  };
  location?: {
    name: string;
    city: string;
    province: string | null;
    country: string;
    cloud_region: string | null;
    provider_type: string;
    industry: string;
  };
  
  // Organization context
  industry?: string;
  department?: string;
  teamSize?: number;
  
  // Environment
  environment?: 'dev' | 'test' | 'staging' | 'prod';
  
  // Counts
  workflowsCount?: number;
  integrationsCount?: number;
  totalRuns?: number;
  lastRunAt?: string;
  
  // Source metadata
  sourceType?: 'url_scan' | 'template' | 'manual' | 'file_upload';
  scanSummary?: string;
  templateId?: string;
  
  // Builder context
  builderStep?: number;
  
  // Current tab (for agent detail pages)
  activeTab?: string;
  
  // Simulation template context for Co-Pilot awareness
  simulationTemplate?: SimulationTemplateContext;
  
  // Twin-specific context for template chat
  twinContext?: TwinContext;
  
  // ROI context
  roiContext?: {
    headline?: string;
    benefits?: string[];
  };
  
  // Available DC Tools for CoPilot awareness
  availableTools?: Array<{
    id: string;
    name: string;
    description: string;
    domain: string;
    tabTarget?: string;
  }>;
  
  // Sovereignty context for CoPilot awareness
  sovereigntyContext?: {
    sovereigntyScore: number;
    violationCount: number;
    crossBorderFlows: number;
    certifiedFrameworks: number;
    auditReadinessScore: number;
    riskLevel: string;
    primaryJurisdiction: string;
  };
  
  // Carbon context for CoPilot awareness
  carbonContext?: {
    carbonPerGpuHour: number;
    dailyEmissionsKg: number;
    projectedAnnualEmissionsTons: number;
    carbonEfficiencyScore: number;
    renewablePercent: number;
    regionCarbonIntensity: number;
    region: string;
  };
  
  // Financial context for CoPilot awareness
  financialContext?: {
    costPerGpuHour: number;
    opexPerDay: number;
    opexPerYear: number;
    carbonCostImpactPerYear: number;
    carbonCostPctOfOpex: number;
    roiYears: number;
    npv: number;
    irr: number;
    financialHealthScore: number;
  };
}

/**
 * Build context from current page and agent
 */
export async function buildCoPilotContext(
  page: string,
  agentId?: string,
  additionalContext?: Partial<CoPilotContext>
): Promise<CoPilotContext> {
  const context: CoPilotContext = {
    activePage: page as any,
    ...additionalContext,
  };

  // If we have a real (UUID) agent ID, fetch rich metadata. Sample ids such as
  // `agent-1` would make Postgres reject the request with HTTP 400.
  if (agentId && isUuid(agentId)) {
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          status,
          config,
          template_id,
          total_runs,
          last_heartbeat
        `)
        .eq('id', agentId)
        .single();

      if (agent) {
        context.agentId = agent.id;
        context.agentName = agent.name;
        context.agentStatus = agent.status;
        context.totalRuns = agent.total_runs || 0;
        context.lastRunAt = agent.last_heartbeat || undefined;
        context.templateId = agent.template_id || undefined;

        // Extract from config
        const config = agent.config as any;
        if (config) {
          context.industry = config.industry;
          context.department = config.department;
          context.agentType = config.type || 'agent';
        }

        // Count workflows
        const { count: workflowCount } = await supabase
          .from('agent_workflows')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agentId);
        context.workflowsCount = workflowCount || 0;

        // Count integrations
        const { count: integrationCount } = await supabase
          .from('agent_integrations')
          .select('*', { count: 'exact', head: true })
          .eq('system_id', agentId);
        context.integrationsCount = integrationCount || 0;
      }
    } catch (error) {
      console.error('Failed to build agent context:', error);
    }
  }

  return context;
}

/**
 * Enrich context with blueprint data for DC twin pages
 */
export async function enrichWithBlueprint(
  context: CoPilotContext,
  twinId: string
): Promise<CoPilotContext> {
  try {
    const blueprint = generateDefaultBlueprint(twinId);
    
    // Build twin context with blueprint data
    const twinContext: TwinContext = {
      templateId: blueprint.id,
      templateName: blueprint.name,
      templateType: 'data_centre',
      currentTab: context.activeTab || 'overview',
      mockDataEnabled: true,
      blueprint: {
        name: blueprint.name,
        agents: blueprint.agents.map(a => a.name),
        dataSources: blueprint.dataSources.map(ds => ds.name),
        integrations: blueprint.integrations.map(i => i.name),
        workflowCount: blueprint.workflows.length,
        kpiCount: blueprint.kpis.length,
        scenarioCount: blueprint.simulationScenarios.length,
        humanRoles: blueprint.humanRoles.map(r => r.name),
      },
      simulation: {
        availableScenarios: blueprint.simulationScenarios.map(s => s.name),
      },
    };
    
    // Add DC tools to context for CoPilot awareness
    const availableTools = dcToolRegistry.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      domain: tool.domain,
      tabTarget: tool.tabTarget,
    }));
    
    // Add sovereignty context for CoPilot awareness
    const engine = getSovereigntyEngine();
    const sovereigntyResult = engine.evaluate(
      mockDataFlows,
      mockDataAssets,
      mockSovereigntyPolicies,
      mockComplianceFrameworks,
      'CA-QC'
    );
    
    const sovereigntyContext = {
      sovereigntyScore: sovereigntyResult.sovereigntyScore,
      violationCount: sovereigntyResult.violations.length,
      crossBorderFlows: sovereigntyResult.crossBorderFlowCount,
      certifiedFrameworks: sovereigntyResult.frameworkSummary.certified,
      auditReadinessScore: sovereigntyResult.auditReadinessScore,
      riskLevel: sovereigntyResult.riskLevel,
      primaryJurisdiction: 'CA-QC',
    };
    
    // Build carbon context using CarbonEngine
    const region = 'CA-QC';
    const regionalFeed = REGIONAL_CARBON_INTENSITY[region];
    const carbonInput = {
      pue: 1.2,
      powerKwh: 8500,
      carbonIntensityGPerKwh: regionalFeed.carbonIntensityGPerKwh,
      renewableMixPct: regionalFeed.renewablePercentage,
      activeGpuCount: 384,
    };
    const carbonMetrics = CarbonEngine.evaluate(carbonInput);
    
    const carbonContext = {
      carbonPerGpuHour: carbonMetrics.carbonPerGpuHour,
      dailyEmissionsKg: carbonMetrics.dailyEmissionsKg,
      projectedAnnualEmissionsTons: carbonMetrics.projectedAnnualEmissionsTons,
      carbonEfficiencyScore: carbonMetrics.carbonEfficiencyScore,
      renewablePercent: regionalFeed.renewablePercentage,
      regionCarbonIntensity: regionalFeed.carbonIntensityGPerKwh,
      region,
    };
    
    // Build financial context using FinancialEngine
    const financialInput = {
      powerKwh: 8500,
      pue: 1.2,
      activeGpuCount: 384,
      gpuHoursPerDay: 384 * 24 * 0.8, // 80% utilization
      hourlyEmissionsKg: carbonMetrics.hourlyEmissionsKg,
      assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
      capexTotal: 500_000_000,
      expectedRevenuePerYear: 150_000_000,
    };
    const financialMetrics = FinancialEngine.evaluate(financialInput);
    
    const financialContext = {
      costPerGpuHour: financialMetrics.costPerGpuHour,
      opexPerDay: financialMetrics.opexPerDay,
      opexPerYear: financialMetrics.opexPerYear,
      carbonCostImpactPerYear: financialMetrics.carbonCostImpactPerYear,
      carbonCostPctOfOpex: financialMetrics.carbonCostPctOfOpex,
      roiYears: financialMetrics.roiYears,
      npv: financialMetrics.npv,
      irr: financialMetrics.irr,
      financialHealthScore: financialMetrics.financialHealthScore,
    };
    
    return {
      ...context,
      agentName: blueprint.name,
      agentType: 'digital_twin',
      twinContext,
      workflowsCount: blueprint.workflows.length,
      integrationsCount: blueprint.integrations.length,
      availableTools,
      sovereigntyContext,
      carbonContext,
      financialContext,
    };
  } catch (error) {
    console.error('Failed to enrich context with blueprint:', error);
    return context;
  }
}

/**
 * Format context for display (context chips)
 */
export function formatContextChips(context: CoPilotContext): Array<{ label: string; value: string }> {
  const chips: Array<{ label: string; value: string }> = [];

  if (context.industry) {
    chips.push({ label: 'Industry', value: context.industry });
  }

  if (context.agentName) {
    chips.push({ label: 'Agent', value: context.agentName });
  }

  if (context.environment) {
    chips.push({ label: 'Env', value: context.environment.toUpperCase() });
  }

  if (context.workflowsCount !== undefined) {
    chips.push({ label: 'Workflows', value: String(context.workflowsCount) });
  }

  if (context.integrationsCount !== undefined) {
    chips.push({ label: 'Integrations', value: String(context.integrationsCount) });
  }

  if (context.lastRunAt) {
    chips.push({ label: 'Last Run', value: context.lastRunAt });
  } else if (context.totalRuns === 0) {
    chips.push({ label: 'Last Run', value: 'Never' });
  }

  if (context.sourceType === 'url_scan') {
    chips.push({ label: 'Source', value: 'URL Scan' });
  } else if (context.sourceType === 'template') {
    chips.push({ label: 'Source', value: 'Template' });
  }

  // Add blueprint-specific chips for DC twin pages
  if (context.twinContext?.blueprint) {
    const bp = context.twinContext.blueprint;
    chips.push({ label: 'KPIs', value: String(bp.kpiCount) });
    chips.push({ label: 'Agents', value: String(bp.agents.length) });
    chips.push({ label: 'Scenarios', value: String(bp.scenarioCount) });
  }

  return chips;
}
