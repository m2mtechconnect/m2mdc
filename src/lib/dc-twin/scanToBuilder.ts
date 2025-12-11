/**
 * Scan → Builder Integration
 * Wires the URL scanner recommendation to the DC Twin Builder
 */

import type { DCRecommendation, DCScanSignals, DCBlueprintTemplate } from '@/types/dcScan';
import type { DCTwinBuilderState, DCTwinOverview } from '@/types/dcTwinBuilder';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { INDUSTRY_LABELS } from '@/types/dcScan';

/**
 * Map a scan recommendation to a complete DC Twin Builder state
 * Uses the canonical twinName and companyName from the recommendation
 */
export function recommendationToBuilderState(
  recommendation: DCRecommendation,
  sessionId: string
): Partial<DCTwinBuilderState> {
  // Use the canonical company identity from the recommendation
  const companyName = recommendation.companyName || recommendation.displayName || 'Organization';
  const twinName = recommendation.twinName || `${companyName} Sovereign Green AI Data Centre Twin`;
  const domain = recommendation.domain || getDomainFromUrl(recommendation.url);
  
  // Build overview from recommendation
  const overview: Partial<DCTwinOverview> = {
    twinName,
    customerName: companyName,
    twinSlug: `dc-twin-${domain.replace(/\./g, '-')}`,
    twinSummary: recommendation.summary,
    description: recommendation.summary,
    industries: mapIndustryToArray(recommendation.detectedIndustry),
    primaryUseCases: recommendation.coreAgents.slice(0, 4),
    keyCapabilities: recommendation.coreAgents,
    kpisImproved: recommendation.mainKPIs,
    capacityKw: recommendation.suggestedCapacityKw,
    tier: recommendation.suggestedTier,
    sovereignCompliance: recommendation.complianceFocus.some(
      (c) => c.toLowerCase().includes('pipeda') || c.toLowerCase().includes('sovereign')
    ),
  };

  return {
    sessionId,
    overview: overview as DCTwinOverview,
    sourceRecommendation: {
      url: recommendation.url,
      detectedIndustry: recommendation.detectedIndustry,
      blueprintProfile: recommendation.blueprintProfile,
    },
  };
}

/**
 * Initialize the DC Twin Builder from a URL scan recommendation
 * 
 * @deprecated DO NOT call this automatically from scanner hooks!
 * This should ONLY be called from explicit user actions like "Create Twin from Recommendation".
 * The scanner should populate useRecommendationStore for sandbox/preview mode instead.
 */
export function initializeBuilderFromScan(
  recommendation: DCRecommendation,
  sessionId: string
): void {
  console.warn('[scanToBuilder] initializeBuilderFromScan called - ensure this is from explicit user action');
  const store = useDCTwinBuilderStore.getState();
  store.initializeFromRecommendation(recommendation, sessionId);
}

/**
 * Generate the builder URL for navigation after scan
 */
export function getBuilderUrlFromScan(sessionId: string): string {
  return `/builder?mode=dc-twin&session=${sessionId}`;
}

/**
 * Map industry enum to display array
 */
function mapIndustryToArray(industry: string): string[] {
  const industryLabel = INDUSTRY_LABELS[industry as keyof typeof INDUSTRY_LABELS] || 'Enterprise';
  
  const baseIndustries = [industryLabel, 'Technology', 'IT Operations', 'Sustainability'];
  
  // Add compliance-related industries based on type
  switch (industry) {
    case 'government':
      return [industryLabel, 'Compliance', 'Sustainability', 'IT Operations'];
    case 'finance':
      return [industryLabel, 'Financial Services', 'Compliance', 'IT Operations'];
    case 'healthcare':
      return [industryLabel, 'Healthcare', 'Compliance', 'IT Operations'];
    default:
      return baseIndustries;
  }
}

/**
 * Extract domain from URL
 */
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Map scan signals to enhanced builder context
 */
export function enhanceBuilderFromSignals(
  signals: DCScanSignals,
  template: DCBlueprintTemplate
): { overview: Partial<DCTwinOverview> } {
  let overviewEnhancements: Partial<DCTwinOverview> = {};
  
  // AI intensity affects GPU fleet recommendations
  if (signals.aiIntensityScore >= 60) {
    overviewEnhancements.gpuFleet = 'NVIDIA H100 x 512, A100 x 256';
  } else if (signals.aiIntensityScore >= 40) {
    overviewEnhancements.gpuFleet = 'NVIDIA H100 x 256, A100 x 128';
  }
  
  // Sustainability keywords affect renewable targets
  if (signals.sustainabilityKeywords.length >= 3) {
    overviewEnhancements.renewablePercent = 100;
  }
  
  // Compliance keywords affect sovereignty settings
  const hasCanadianCompliance = signals.complianceKeywords.some(
    (k) => k.toLowerCase().includes('pipeda') || k.toLowerCase().includes('canadian')
  );
  if (hasCanadianCompliance) {
    overviewEnhancements.sovereignCompliance = true;
    overviewEnhancements.regionCode = 'CA-ON';
  }
  
  return { overview: overviewEnhancements };
}

/**
 * Validate that all required fields are present in builder state
 */
export function validateBuilderState(state: DCTwinBuilderState): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  
  // Required overview fields
  if (!state.overview.twinName) missingFields.push('Twin Name');
  if (!state.overview.description && !state.overview.twinSummary) missingFields.push('Description');
  if (state.overview.capacityKw <= 0) missingFields.push('Capacity (kW)');
  
  // Check agents
  const enabledAgents = state.agents.filter((a) => a.enabled);
  if (enabledAgents.length === 0) {
    missingFields.push('At least one agent must be enabled');
  }
  
  // Check data sources
  const enabledDataSources = state.dataSources.filter((ds) => ds.enabled);
  if (enabledDataSources.length === 0) {
    missingFields.push('At least one data source must be enabled');
  }
  
  // Check KPIs
  const enabledKPIs = state.kpis.filter((k) => k.enabled);
  if (enabledKPIs.length === 0) {
    missingFields.push('At least one KPI must be enabled');
  }
  
  // Check deployment region
  if (!state.deployment.targetDeploymentRegion) {
    warnings.push('No deployment region selected');
  }
  
  // Check sovereignty
  if (!state.overview.sovereignCompliance) {
    warnings.push('Sovereignty compliance not confirmed');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Generate a slug from twin name
 */
export function generateTwinSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
