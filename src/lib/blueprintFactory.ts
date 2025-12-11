/**
 * Blueprint Factory
 * Creates and initializes blueprints from various sources
 * 
 * INDUSTRY SOURCES:
 * - Digital Twin Factory Patterns: https://www.digitaltwinconsortium.org/initiatives/capabilities-periodic-table/
 * - ISO 23247 Digital Twin Framework: https://www.iso.org/standard/75066.html
 * - Data Center Sustainability Standards: https://www.thegreengrid.org/
 * - Green Data Center Metrics: https://www.uptimeinstitute.com/resources/asset/annual-data-center-survey
 * - Sovereign Cloud Standards: https://gaia-x.eu/what-is-gaia-x/core-components/
 * - Canadian Digital Infrastructure: https://ised-isde.canada.ca/site/digital-charter/en
 * - Sustainability Frameworks: https://www.cdp.net/en, https://ghgprotocol.org/
 * - Industry Vertical Standards: ISO 27001, SOC 2, HIPAA, PCI-DSS
 */

import type { TwinBlueprintBaseSchema } from '@/types/twinBlueprintSchema';
import type { GreenDcTwinRecommendation } from '@/types/greenDcTwin';
import { 
  detectIndustry, 
  generateIndustryBlueprint, 
  getRecommendedRegions,
  getComplianceFrameworks,
  type SupportedIndustry 
} from './industryAdapter';
import { normalizeCompanyName, generateTwinName } from './utils/normalizeCompanyName';

/**
 * Create a blueprint from a URL scan recommendation
 */
export function createBlueprintFromRecommendation(
  recommendation: GreenDcTwinRecommendation,
  url: string
): TwinBlueprintBaseSchema {
  // Map recommendation industry to supported industry
  const industryMap: Record<string, SupportedIndustry> = {
    'finance': 'finance',
    'government': 'government',
    'retail': 'retail',
    'healthcare': 'healthcare',
    'telecom': 'telecom',
    'manufacturing': 'manufacturing',
    'energy': 'energy',
    'education': 'education',
    'saas': 'data_centre',
    'ai_compute': 'data_centre',
    'generic': 'generic',
  };

  const industry = industryMap[recommendation.industry] || 'data_centre';
  
  // Normalize company name and generate twin name
  const normalizedCompanyName = normalizeCompanyName(recommendation.companyName);
  const twinName = generateTwinName(normalizedCompanyName);
  
  // Map capacity tier to kW
  const capacityMap: Record<string, number> = {
    'small': 500,
    'medium': 2000,
    'large': 5000,
    'hyperscale': 15000,
  };
  const capacityKw = capacityMap[recommendation.capacityTier] || 2000;
  
  // Get deployment region from regions array
  const deploymentRegion = recommendation.regions?.[0] === 'NA' ? 'ca-central-1' : 
                           recommendation.regions?.[0] === 'EU' ? 'eu-west-1' : 'ca-central-1';
  
  // Generate base blueprint
  const blueprint = generateIndustryBlueprint(industry, {
    name: twinName,
    region: deploymentRegion,
    city: 'Montreal',
    country: 'Canada',
    capacity: capacityKw,
  });

  // Enhance with recommendation-specific data
  blueprint.metadata.description = recommendation.objectives?.join('. ') || `${industry} digital twin`;
  blueprint.metadata.sovereigntyLevel = recommendation.kpiTargets?.sovereigntyScoreTargetPct >= 100 ? 'national' : 'regional';
  blueprint.metadata.complianceFrameworks = getComplianceFrameworks(industry);
  blueprint.metadata.sustainabilityTargets = {
    renewablePercent: recommendation.kpiTargets?.renewableShareTargetPct || 80,
    carbonReductionPercent: 30,
    efficiencyTarget: recommendation.kpiTargets?.pueTarget || 1.3,
  };

  // Add recommendation agents if available
  if (recommendation.agents && recommendation.agents.length > 0) {
    blueprint.agents = recommendation.agents.map((agentId) => ({
      id: agentId,
      slug: agentId,
      name: formatAgentName(agentId),
      description: `${formatAgentName(agentId)} for ${twinName}`,
      domain: inferDomainFromAgent(agentId),
      type: inferTypeFromAgent(agentId),
      status: 'active' as const,
      healthScore: 95,
      inputs: [],
      outputs: [],
      tools: [],
      kpiBindings: [],
    }));
  }

  return blueprint;
}

/**
 * Create a blank blueprint for a new twin
 */
export function createBlankBlueprint(
  name: string,
  industry: SupportedIndustry = 'data_centre'
): TwinBlueprintBaseSchema {
  return generateIndustryBlueprint(industry, {
    name,
    region: 'ca-central-1',
    country: 'Canada',
  });
}

/**
 * Merge partial updates into existing blueprint
 */
export function mergeBlueprint(
  existing: TwinBlueprintBaseSchema,
  updates: Partial<TwinBlueprintBaseSchema>
): TwinBlueprintBaseSchema {
  return {
    ...existing,
    ...updates,
    metadata: {
      ...existing.metadata,
      ...updates.metadata,
      updatedAt: new Date(),
    },
    domains: updates.domains || existing.domains,
    agents: updates.agents || existing.agents,
    dataSources: updates.dataSources || existing.dataSources,
    kpis: updates.kpis || existing.kpis,
    workflows: updates.workflows || existing.workflows,
    roles: updates.roles || existing.roles,
    scenarios: updates.scenarios || existing.scenarios,
    simulationModels: updates.simulationModels || existing.simulationModels,
    industryExtensions: {
      ...existing.industryExtensions,
      ...updates.industryExtensions,
    },
  };
}

/**
 * Export blueprint to JSON for download
 */
export function exportBlueprintToJSON(blueprint: TwinBlueprintBaseSchema): string {
  return JSON.stringify(blueprint, null, 2);
}

/**
 * Import blueprint from JSON
 */
export function importBlueprintFromJSON(json: string): TwinBlueprintBaseSchema | null {
  try {
    const parsed = JSON.parse(json);
    // Basic validation
    if (!parsed.metadata || !parsed.domains) {
      console.error('Invalid blueprint structure');
      return null;
    }
    return parsed as TwinBlueprintBaseSchema;
  } catch (e) {
    console.error('Failed to parse blueprint JSON:', e);
    return null;
  }
}

// Helper functions
function formatAgentName(agentId: string): string {
  return agentId
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function inferDomainFromAgent(agentId: string): string {
  const lowerAgentId = agentId.toLowerCase();
  if (lowerAgentId.includes('thermal')) return 'thermal';
  if (lowerAgentId.includes('power') || lowerAgentId.includes('ups')) return 'power';
  if (lowerAgentId.includes('cooling')) return 'cooling';
  if (lowerAgentId.includes('network')) return 'network';
  if (lowerAgentId.includes('workload') || lowerAgentId.includes('gpu')) return 'workload';
  if (lowerAgentId.includes('carbon') || lowerAgentId.includes('financial')) return 'financial';
  if (lowerAgentId.includes('sovereignty') || lowerAgentId.includes('compliance')) return 'sovereignty';
  if (lowerAgentId.includes('incident')) return 'operations';
  return 'operations';
}

function inferTypeFromAgent(agentId: string): 'monitoring' | 'control' | 'optimizer' | 'scheduler' | 'responder' {
  const lowerAgentId = agentId.toLowerCase();
  if (lowerAgentId.includes('optimizer') || lowerAgentId.includes('efficiency')) return 'optimizer';
  if (lowerAgentId.includes('scheduler') || lowerAgentId.includes('orchestrator')) return 'scheduler';
  if (lowerAgentId.includes('controller') || lowerAgentId.includes('control')) return 'control';
  if (lowerAgentId.includes('responder') || lowerAgentId.includes('incident')) return 'responder';
  return 'monitoring';
}
