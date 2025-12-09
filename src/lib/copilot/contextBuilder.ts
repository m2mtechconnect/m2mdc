/**
 * Co-Pilot Context Builder
 * 
 * Builds rich context objects for Co-Pilot from current page state,
 * agent metadata, and user activity.
 */

import { supabase } from '@/integrations/supabase/client';

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
    | 'twin_chat';
  
  // Agent context
  agentId?: string;
  agentName?: string;
  agentType?: 'digital_twin' | 'agent';
  agentStatus?: string;
  
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

  // If we have an agent ID, fetch rich metadata
  if (agentId) {
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

  return chips;
}
