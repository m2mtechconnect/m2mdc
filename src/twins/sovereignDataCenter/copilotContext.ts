/**
 * Sovereign DC Twin - CoPilot Context & Suggestions
 */

import type { SovereignDCFacility, SimulationRun } from '@/types/sovereignDataCenterTwin';

export interface SovereignDCCoPilotContext {
  twinType: 'sovereign_data_center';
  templateId: 'sovereign-data-center-twin';
  facilityId?: string;
  facilityName?: string;
  region?: string;
  industry: 'Sovereign AI / Data Centre';
  lastSimulation?: {
    type: string;
    name: string;
    summary: string;
  };
  currentKpis?: {
    sovereignComputeRatio: number;
    effectiveAiPue: number;
    gco2PerGpuHour: number;
    sovereignRiskScore: number;
    economicEfficiency: number;
  };
}

/**
 * Build CoPilot context for Sovereign DC Twin
 */
export function buildSovereignDCContext(
  facility?: SovereignDCFacility | null,
  lastRun?: SimulationRun | null
): SovereignDCCoPilotContext {
  const context: SovereignDCCoPilotContext = {
    twinType: 'sovereign_data_center',
    templateId: 'sovereign-data-center-twin',
    industry: 'Sovereign AI / Data Centre',
  };

  if (facility) {
    context.facilityId = facility.id;
    context.facilityName = facility.name;
    context.region = facility.region;
    context.currentKpis = {
      sovereignComputeRatio: facility.baseKpis.sovereignComputeRatioPct,
      effectiveAiPue: facility.baseKpis.effectiveAiPue,
      gco2PerGpuHour: facility.baseKpis.gco2PerGpuHour,
      sovereignRiskScore: facility.baseKpis.sovereignRiskScore,
      economicEfficiency: facility.baseKpis.economicEfficiencyScore,
    };
  }

  if (lastRun) {
    context.lastSimulation = {
      type: lastRun.type,
      name: lastRun.name,
      summary: lastRun.resultsSummary,
    };
  }

  return context;
}

/**
 * CoPilot suggestion chips for Sovereign DC Twin
 */
export const SOVEREIGN_DC_COPILOT_CHIPS = [
  {
    label: 'Explain sovereign compute',
    question: 'What is sovereign compute ratio and why does it matter for Canadian data centres?',
  },
  {
    label: 'QC vs AB emissions',
    question: 'Compare carbon emissions between Quebec hydro-powered facilities and Alberta gas-powered facilities.',
  },
  {
    label: 'Optimize cooling',
    question: 'What are the best strategies to optimize PUE and cooling efficiency in AI data centres?',
  },
  {
    label: 'Carbon price risk',
    question: 'How would a carbon price increase to $200/tonne affect our facility operations and costs?',
  },
  {
    label: 'Incident playbook',
    question: 'Generate an incident response playbook for cooling system failures in Zone B.',
  },
  {
    label: 'Sovereignty compliance',
    question: 'What steps ensure data never leaves Canadian jurisdiction for PIPEDA compliance?',
  },
  // Blueprint-aware chips
  {
    label: 'Blueprint agents',
    question: 'Which agents are defined in the system blueprint and what domains do they cover?',
  },
  {
    label: 'Blueprint workflows',
    question: 'Show all workflows in the blueprint related to thermal and UPS failures.',
  },
  {
    label: 'KPI ownership',
    question: 'What KPIs relate to carbon and cost, and who is responsible for them?',
  },
] as const;

/**
 * Get contextual CoPilot intro message
 */
export function getSovereignDCIntroMessage(
  facilityName?: string,
  lastSimulationName?: string
): string {
  let intro = "You're viewing the Sovereign Green AI Data Centre Twin.";
  
  if (facilityName) {
    intro = `You're viewing the **${facilityName}** digital twin.`;
  }
  
  if (lastSimulationName) {
    intro += ` Last simulation: "${lastSimulationName}".`;
  }
  
  intro += " I can help you analyze KPIs, run scenarios, or explain sovereignty compliance.";
  
  return intro;
}
