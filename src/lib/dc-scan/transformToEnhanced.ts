/**
 * Transform legacy DCRecommendation to EnhancedDCRecommendation
 * Bridges the gap between old and new recommendation systems
 */

import type { DCRecommendation, DCBlueprintTemplate } from '@/types/dcScan';
import type { EnhancedDCRecommendation, AgentRecommendation, ScenarioRecommendation, IndustryObjective, KPIInsight, EnhancedFinancialModel } from '@/types/enhancedRecommendation';
import { generateIndustryObjectives } from './industryObjectives';
import { generateAllKPIInsights, INDUSTRY_BENCHMARKS } from './kpiBenchmarks';
import { generateFinancialModel } from './financialModel';
import { getDisplayCompanyName } from './companyNameExtractor';
import { INDUSTRY_LABELS } from '@/types/dcScan';

/**
 * Create a mock template from legacy recommendation for KPI generation
 */
function createMockTemplate(legacy: DCRecommendation): DCBlueprintTemplate {
  return {
    id: legacy.sessionId,
    slug: legacy.blueprintProfile,
    name: legacy.blueprintName,
    description: legacy.summary || '',
    defaultCapacityKw: legacy.suggestedCapacityKw || 5000,
    defaultTier: legacy.suggestedTier || 'Tier III',
    defaultAgents: legacy.coreAgents || [],
    sustainabilityFocus: legacy.sustainabilityFocus || [],
    complianceFocus: legacy.complianceFocus || [],
    targetPue: 1.3,
    renewableTargetPct: 85,
    sovereignComputePct: 95,
    annualCarbonTargetTonnes: 500,
    costFocus: legacy.costFocus || 'Optimize energy efficiency',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generate default agents based on industry
 */
function generateDefaultAgents(industry: string, companyName: string): AgentRecommendation[] {
  const baseAgents: AgentRecommendation[] = [
    { id: 'thermal-guardian', name: 'Thermal Guardian', purpose: 'Predicts thermal spikes and adjusts cooling preemptively.', rationale: `Critical for ${companyName}'s high-density compute workloads.`, domain: 'thermal', priority: 'critical' },
    { id: 'power-monitor', name: 'Power & UPS Monitor', purpose: 'Tracks power distribution and manages failover.', rationale: 'Essential for ensuring uninterrupted operations.', domain: 'power', priority: 'critical' },
    { id: 'cooling-optimizer', name: 'Cooling Optimizer', purpose: 'Optimizes chiller and airflow efficiency.', rationale: 'Reduces PUE and prevents cooling failures.', domain: 'cooling', priority: 'high' },
    { id: 'sovereignty-sentinel', name: 'Sovereignty Sentinel', purpose: 'Enforces data residency constraints.', rationale: 'Required for Canadian data sovereignty compliance.', domain: 'sovereignty', priority: 'high' },
    { id: 'carbon-optimizer', name: 'Carbon & Cost Optimizer', purpose: 'Forecasts emissions and cost exposure.', rationale: 'Supports sustainability and ESG targets.', domain: 'financial', priority: 'high' },
    { id: 'workload-orchestrator', name: 'Workload Orchestrator', purpose: 'Balances GPU workloads across racks.', rationale: 'Optimizes resource utilization and queue times.', domain: 'workload', priority: 'recommended' },
  ];
  return baseAgents;
}

/**
 * Generate default scenarios based on industry
 */
function generateDefaultScenarios(industry: string): ScenarioRecommendation[] {
  return [
    { id: 'gpu-spike', name: 'GPU Load Spike', description: 'Simulate rapid GPU load surges.', severity: 'high', category: 'workload', domain: 'workload', industryRelevance: ['AI/ML', 'Cloud'], duration: '30 min', expectedImpact: 'Thermal drift, throttling risk' },
    { id: 'cooling-failure', name: 'Cooling Failure', description: 'Model sudden cooling loss.', severity: 'critical', category: 'cooling', domain: 'cooling', industryRelevance: ['All'], duration: '15 min', expectedImpact: 'Equipment damage risk' },
    { id: 'carbon-price-shock', name: 'Carbon Price Shock', description: 'Quantify cost exposure from carbon price increases.', severity: 'medium', category: 'financial', domain: 'financial', industryRelevance: ['Sustainability'], duration: '24 hr', expectedImpact: 'OPEX increase' },
    { id: 'grid-instability', name: 'Grid Instability', description: 'Evaluate resilience during brownouts.', severity: 'high', category: 'power', domain: 'power', industryRelevance: ['Energy', 'Critical Infrastructure'], duration: '60 min', expectedImpact: 'Failover activation' },
  ];
}

/**
 * Transform a legacy DCRecommendation into an EnhancedDCRecommendation
 */
export function transformToEnhancedRecommendation(
  legacy: DCRecommendation
): EnhancedDCRecommendation {
  const industry = legacy.detectedIndustry;
  const companyName = getDisplayCompanyName(legacy.companyName, legacy.url);
  const capacityKw = legacy.suggestedCapacityKw || 5000;
  const regionCode = 'ca-central-1';
  
  // Create mock template for KPI generation
  const mockTemplate = createMockTemplate(legacy);
  
  // Generate enhanced components
  const objectives = generateIndustryObjectives(industry, companyName);
  const kpiInsights = generateAllKPIInsights(mockTemplate, industry, regionCode);
  const agents = generateDefaultAgents(industry, companyName);
  const scenarios = generateDefaultScenarios(industry);
  const financialModel = generateFinancialModel(mockTemplate, industry, companyName, capacityKw, regionCode);
  
  return {
    sessionId: legacy.sessionId,
    createdAt: new Date().toISOString(),
    url: legacy.url,
    domain: legacy.domain,
    companyName,
    displayName: companyName,
    twinName: `${companyName} Sovereign Green AI Data Centre Twin`,
    detectedIndustry: industry,
    industryLabel: INDUSTRY_LABELS[industry],
    blueprintProfile: legacy.blueprintProfile,
    blueprintName: legacy.blueprintName,
    suggestedCapacityKw: capacityKw,
    capacityLabel: capacityKw >= 10000 ? 'Hyperscale (10MW+)' : capacityKw >= 5000 ? 'Large (5-10MW)' : 'Medium (1-5MW)',
    suggestedTier: legacy.suggestedTier,
    headerMetrics: {
      roi: `${Math.round(financialModel.projectedOpexReductionPct)}%`,
      renewable: `${Math.round(100 - financialModel.gridCarbonIntensity / 5)}%`,
      capacity: `${(capacityKw / 1000).toFixed(1)} MW`,
      sovereignty: 'CA-Central',
    },
    objectives,
    kpiInsights,
    agents,
    scenarios,
    complianceFocus: legacy.complianceFocus || [],
    sustainabilityFocus: legacy.sustainabilityFocus || [],
    carbonTarget: legacy.carbonTarget || 'Net-zero by 2030',
    financialModel,
    summaryNarrative: legacy.summary || `${companyName} Sovereign Green AI Data Centre Twin optimized for ${INDUSTRY_LABELS[industry]} workloads.`,
    siteMeta: legacy.siteMeta,
  };
}

/**
 * Check if a recommendation is already enhanced
 */
export function isEnhancedRecommendation(
  rec: DCRecommendation | EnhancedDCRecommendation
): rec is EnhancedDCRecommendation {
  return 'objectives' in rec && 'kpiInsights' in rec && 'financialModel' in rec;
}

/**
 * Convert enhanced recommendation back to legacy format for store compatibility
 */
export function toLegacyRecommendation(enhanced: EnhancedDCRecommendation): DCRecommendation {
  return {
    sessionId: enhanced.sessionId,
    url: enhanced.url,
    domain: enhanced.domain,
    companyName: enhanced.companyName,
    displayName: enhanced.displayName,
    twinName: enhanced.twinName,
    detectedIndustry: enhanced.detectedIndustry,
    blueprintProfile: enhanced.blueprintProfile,
    blueprintName: enhanced.blueprintName,
    summary: enhanced.summaryNarrative,
    suggestedCapacityKw: enhanced.suggestedCapacityKw,
    suggestedTier: enhanced.suggestedTier,
    mainKPIs: enhanced.kpiInsights.map(k => k.name),
    coreAgents: enhanced.agents.map(a => a.name),
    carbonTarget: enhanced.carbonTarget,
    costFocus: 'Optimize energy efficiency and reduce carbon footprint',
    complianceFocus: enhanced.complianceFocus,
    sustainabilityFocus: enhanced.sustainabilityFocus,
    siteMeta: enhanced.siteMeta,
  };
}
