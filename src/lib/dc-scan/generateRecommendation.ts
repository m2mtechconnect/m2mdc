/**
 * Generate a complete DC Recommendation from scan signals and template
 */

import type { 
  DCScanSignals, 
  DCBlueprintTemplate, 
  DCRecommendation,
  DCScanIndustry
} from "@/types/dcScan";
import { INDUSTRY_LABELS } from "@/types/dcScan";

// Agent slug to display name mapping
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  thermal_guardian: "Thermal Guardian Agent",
  power_monitor: "Power & UPS Monitor",
  cooling_optimizer: "Cooling Optimization Agent",
  sovereignty_sentinel: "Sovereignty Sentinel",
  financial_carbon_agent: "Financial & Carbon Agent",
  incident_response: "Incident Response Agent",
  workload_orchestrator: "Workload Orchestrator",
  gpu_scheduler: "GPU Scheduler Agent",
  network_monitor: "Network Monitor Agent",
  facility_safety: "Facility Safety Agent"
};

/**
 * Generate a human-readable summary based on signals and template
 */
function generateSummary(
  signals: DCScanSignals, 
  template: DCBlueprintTemplate
): string {
  const industryLabel = INDUSTRY_LABELS[signals.industry];
  const domain = new URL(signals.url).hostname.replace("www.", "");
  
  // Build context based on detected signals
  const contexts: string[] = [];
  
  if (signals.aiIntensityScore >= 40) {
    contexts.push("AI/ML capabilities");
  }
  if (signals.scaleSignals.globalPresence) {
    contexts.push("global operations");
  }
  if (signals.complianceKeywords.length > 0) {
    contexts.push(`compliance requirements (${signals.complianceKeywords.slice(0, 3).join(", ")})`);
  }
  if (signals.sustainabilityKeywords.length > 0) {
    contexts.push("sustainability focus");
  }
  
  const contextStr = contexts.length > 0 
    ? ` with ${contexts.join(", ")}`
    : "";
  
  return `Based on analysis of ${domain}, your organization operates in the ${industryLabel} sector${contextStr}. We recommend the ${template.name} optimized for ${template.complianceFocus.slice(0, 2).join(" and ")} compliance with a target PUE of ${template.targetPue} and ${template.renewableTargetPct}% renewable energy.`;
}

/**
 * Estimate capacity based on scale signals
 */
function estimateCapacity(
  signals: DCScanSignals, 
  templateDefault: number
): number {
  const scaleMultipliers: Record<string, number> = {
    small: 0.5,
    medium: 1.0,
    large: 1.5,
    hyperscale: 3.0
  };
  
  const multiplier = scaleMultipliers[signals.scaleSignals.careersPageHints] || 1.0;
  
  // AI-heavy workloads need more power
  const aiBoost = signals.aiIntensityScore >= 60 ? 1.5 : 
                  signals.aiIntensityScore >= 40 ? 1.2 : 1.0;
  
  return Math.round(templateDefault * multiplier * aiBoost);
}

/**
 * Generate the main KPIs list
 */
function generateMainKPIs(template: DCBlueprintTemplate): string[] {
  return [
    `PUE < ${template.targetPue}`,
    `${template.renewableTargetPct}% Renewable Energy`,
    `${template.sovereignComputePct}% Sovereign Compute`,
    `< ${template.annualCarbonTargetTonnes} tonnes CO₂/year`
  ];
}

/**
 * Generate carbon target string
 */
function generateCarbonTarget(template: DCBlueprintTemplate): string {
  return `${template.renewableTargetPct}% renewable energy mix with target of < ${template.annualCarbonTargetTonnes} tonnes CO₂ annually`;
}

/**
 * Main function: Generate complete recommendation
 */
export function generateRecommendation(
  sessionId: string,
  signals: DCScanSignals,
  template: DCBlueprintTemplate
): DCRecommendation {
  const coreAgents = template.defaultAgents.map(
    slug => AGENT_DISPLAY_NAMES[slug] || slug
  );

  return {
    sessionId,
    url: signals.url,
    detectedIndustry: signals.industry,
    blueprintProfile: template.slug,
    blueprintName: template.name,
    summary: generateSummary(signals, template),
    suggestedCapacityKw: estimateCapacity(signals, template.defaultCapacityKw),
    suggestedTier: template.defaultTier,
    mainKPIs: generateMainKPIs(template),
    coreAgents,
    carbonTarget: generateCarbonTarget(template),
    costFocus: template.costFocus,
    complianceFocus: template.complianceFocus,
    sustainabilityFocus: template.sustainabilityFocus
  };
}
