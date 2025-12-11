/**
 * Enhanced Recommendation Generator
 * 
 * Generates complete EnhancedDCRecommendation from scan signals
 */

import type { DCScanSignals, DCBlueprintTemplate } from '@/types/dcScan';
import type { EnhancedDCRecommendation } from '@/types/enhancedRecommendation';
import { INDUSTRY_LABELS } from '@/types/dcScan';
import { resolveCompanyIdentity, generateCanonicalTwinName } from '@/lib/utils/extractCompanyIdentity';
import { generateIndustryObjectives } from './industryObjectives';
import { generateAllKPIInsights } from './kpiBenchmarks';
import { generateAgentRecommendations } from './agentRecommendations';
import { generateScenarioRecommendations } from './scenarioRecommendations';
import { generateFinancialModel } from './financialModel';
import type { ScrapedSiteMeta } from '@/types/scrapedSiteMeta';

const CAPACITY_LABELS: Record<string, string> = {
  small: 'Small (<1MW)',
  medium: 'Medium (1-5MW)',
  large: 'Large (5-20MW)',
  hyperscale: 'Hyperscale (20MW+)',
};

function getCapacityLabel(capacityKw: number): string {
  if (capacityKw < 1000) return CAPACITY_LABELS.small;
  if (capacityKw < 5000) return CAPACITY_LABELS.medium;
  if (capacityKw < 20000) return CAPACITY_LABELS.large;
  return CAPACITY_LABELS.hyperscale;
}

export function generateEnhancedRecommendation(
  sessionId: string,
  signals: DCScanSignals,
  template: DCBlueprintTemplate
): EnhancedDCRecommendation {
  // Resolve company identity - NEVER use "Organization"
  const siteMeta: ScrapedSiteMeta = signals.siteMeta || {
    url: signals.url,
    domain: extractDomain(signals.url),
  };
  const identity = signals.companyIdentity || resolveCompanyIdentity(siteMeta);
  const companyName = identity.companyName === 'Organization' ? 'This company' : identity.companyName;
  const twinName = generateCanonicalTwinName({ ...identity, companyName });
  
  const industry = signals.industry;
  const capacityKw = estimateCapacity(signals, template.defaultCapacityKw);
  const regionCode = 'ca-central-1'; // Default to Quebec
  
  // Generate all components
  const objectives = generateIndustryObjectives(industry, companyName, signals);
  const kpiInsights = generateAllKPIInsights(template, industry, regionCode);
  const agents = generateAgentRecommendations(template.defaultAgents, industry, companyName, signals);
  const scenarios = generateScenarioRecommendations(
    ['gpu-spike', 'cooling-failure', 'carbon-price-shock', 'grid-instability', 'sovereignty-breach', 'thermal-runaway'],
    industry
  );
  const financialModel = generateFinancialModel(template, industry, companyName, capacityKw, regionCode);
  
  // Generate summary narrative
  const summaryNarrative = `Sovereign Green AI Data Centre Twin for ${companyName}. Simulate energy, emissions, sovereignty, and GPU-capacity outcomes. Use prebuilt scenarios to quantify operational, financial, and sustainability impact for your ${INDUSTRY_LABELS[industry]} operations.`;

  return {
    sessionId,
    createdAt: new Date().toISOString(),
    url: signals.url,
    domain: siteMeta.domain || extractDomain(signals.url),
    companyName,
    displayName: identity.displayName,
    twinName,
    detectedIndustry: industry,
    industryLabel: INDUSTRY_LABELS[industry],
    blueprintProfile: template.slug,
    blueprintName: template.name,
    suggestedCapacityKw: capacityKw,
    capacityLabel: getCapacityLabel(capacityKw),
    suggestedTier: template.defaultTier,
    headerMetrics: {
      roi: `${financialModel.projectedOpexReductionPct}% OPEX`,
      renewable: `${template.renewableTargetPct}%`,
      capacity: `${capacityKw.toLocaleString()} kW`,
      sovereignty: `${template.sovereignComputePct}%`,
    },
    objectives,
    kpiInsights,
    agents,
    scenarios,
    complianceFocus: template.complianceFocus,
    sustainabilityFocus: template.sustainabilityFocus,
    carbonTarget: `${template.renewableTargetPct}% renewable with <${template.annualCarbonTargetTonnes} tonnes CO₂/year`,
    financialModel,
    summaryNarrative,
    siteMeta,
    rawSignals: signals,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function estimateCapacity(signals: DCScanSignals, defaultCapacity: number): number {
  const scaleMultipliers: Record<string, number> = { small: 0.5, medium: 1.0, large: 1.5, hyperscale: 3.0 };
  const multiplier = scaleMultipliers[signals.scaleSignals.careersPageHints] || 1.0;
  const aiBoost = signals.aiIntensityScore >= 60 ? 1.5 : signals.aiIntensityScore >= 40 ? 1.2 : 1.0;
  return Math.round(defaultCapacity * multiplier * aiBoost);
}
