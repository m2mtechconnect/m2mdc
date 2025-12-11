/**
 * Enhanced Recommendation Types for Sovereign Green AI Data Centre Twins
 * 
 * Full-featured recommendation schema with:
 * - Company identity (always populated)
 * - Industry-specific objectives
 * - KPI insights with benchmarks
 * - Agent descriptions with rationale
 * - Visual scenarios with industry tags
 * - Executive narrative for carbon/cost
 */

import type { DCScanIndustry, DCBlueprintProfile, DCTier, DCScanSignals } from './dcScan';
import type { ScrapedSiteMeta, CompanyIdentity } from './scrapedSiteMeta';

// ============================================================================
// KPI INSIGHT (Enhanced KPI with benchmarks)
// ============================================================================

export interface KPIInsight {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  industryBenchmark: number;
  benchmarkLabel: string; // e.g., "CA-QC avg", "Tier III avg"
  interpretation: string; // Executive-grade insight
  status: 'excellent' | 'good' | 'warning' | 'critical';
  direction: 'lower_is_better' | 'higher_is_better';
  trend?: 'improving' | 'stable' | 'degrading';
}

// ============================================================================
// AGENT WITH RATIONALE
// ============================================================================

export interface AgentRecommendation {
  id: string;
  name: string;
  purpose: string; // One-sentence purpose
  rationale: string; // Why this company needs it (scan-derived)
  domain: string;
  icon?: string;
  priority: 'critical' | 'high' | 'recommended' | 'optional';
}

// ============================================================================
// SCENARIO WITH VISUAL METADATA
// ============================================================================

export interface ScenarioRecommendation {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string; // thermal, power, workload, financial, sovereignty, cooling
  domain: string;
  industryRelevance: string[]; // Which industries this is most relevant for
  duration: string;
  expectedImpact: string; // Brief impact description
}

// ============================================================================
// INDUSTRY OBJECTIVE
// ============================================================================

export interface IndustryObjective {
  text: string;
  category: 'operational' | 'sustainability' | 'compliance' | 'financial';
  priority: number; // 1-4, used for ordering
}

// ============================================================================
// FINANCIAL MODEL WITH EXECUTIVE NARRATIVE
// ============================================================================

export interface EnhancedFinancialModel {
  // Core metrics
  annualPowerCostUsd: number;
  annualCarbonTonnes: number;
  carbonIntensityGPerKwh: number;
  paybackYears: number;
  
  // Savings projections
  projectedOpexReductionPct: number;
  projectedCarbonReductionPct: number;
  projectedAnnualSavingsUsd: number;
  
  // Regional factors
  regionCode: string;
  gridCarbonIntensity: number; // Regional grid carbon intensity
  carbonPricePerTonne: number;
  
  // Executive narrative
  executiveNarrative: string; // Full paragraph for executives
  
  // Optional retail-specific
  coldChainEnergyCostUsd?: number;
  edgeComputeCostUsd?: number;
  carbonTaxRiskUsd?: number;
}

// ============================================================================
// ENHANCED DC RECOMMENDATION
// ============================================================================

export interface EnhancedDCRecommendation {
  // Session metadata
  sessionId: string;
  createdAt: string;
  
  // Source URL
  url: string;
  domain: string;
  
  // Company identity (ALWAYS populated)
  companyName: string; // Never "Organization", fallback to "This company"
  displayName: string;
  twinName: string;
  
  // Detection results
  detectedIndustry: DCScanIndustry;
  industryLabel: string;
  blueprintProfile: DCBlueprintProfile;
  blueprintName: string;
  
  // Capacity & tier
  suggestedCapacityKw: number;
  capacityLabel: string; // "Medium (1-5MW)"
  suggestedTier: DCTier;
  
  // Header metrics (compact display)
  headerMetrics: {
    roi: string;
    renewable: string;
    capacity: string;
    sovereignty: string;
  };
  
  // Industry-specific objectives (4 minimum)
  objectives: IndustryObjective[];
  
  // KPI insights with benchmarks
  kpiInsights: KPIInsight[];
  
  // Agents with rationale
  agents: AgentRecommendation[];
  
  // Visual scenarios
  scenarios: ScenarioRecommendation[];
  
  // Compliance & sustainability focus
  complianceFocus: string[];
  sustainabilityFocus: string[];
  
  // Carbon target
  carbonTarget: string;
  
  // Financial model with narrative
  financialModel: EnhancedFinancialModel;
  
  // Summary narrative
  summaryNarrative: string;
  
  // Site metadata reference
  siteMeta?: ScrapedSiteMeta;
  
  // Raw signals for debugging
  rawSignals?: DCScanSignals;
}

// ============================================================================
// INDUSTRY BENCHMARKS
// ============================================================================

export interface IndustryBenchmark {
  industry: DCScanIndustry;
  pue: { average: number; best: number; label: string };
  renewableShare: { average: number; best: number; label: string };
  carbonIntensity: { average: number; best: number; label: string };
  uptime: { average: number; best: number; label: string };
  sovereignty: { average: number; best: number; label: string };
}

// ============================================================================
// REGIONAL CARBON DATA
// ============================================================================

export interface RegionalCarbonData {
  regionCode: string;
  name: string;
  gridCarbonIntensityGPerKwh: number;
  renewableShare: number;
  carbonPricePerTonne: number;
  description: string;
}

export const REGIONAL_CARBON_DATA: Record<string, RegionalCarbonData> = {
  'ca-central-1': {
    regionCode: 'ca-central-1',
    name: 'Quebec (CA-QC)',
    gridCarbonIntensityGPerKwh: 1.2, // Hydro-powered
    renewableShare: 99.8,
    carbonPricePerTonne: 80,
    description: 'One of the cleanest grids globally due to 99% hydro generation.'
  },
  'ca-east-1': {
    regionCode: 'ca-east-1',
    name: 'Ontario (CA-ON)',
    gridCarbonIntensityGPerKwh: 35,
    renewableShare: 94,
    carbonPricePerTonne: 80,
    description: 'Nuclear + hydro base with minimal gas peakers.'
  },
  'ca-west-1': {
    regionCode: 'ca-west-1',
    name: 'British Columbia (CA-BC)',
    gridCarbonIntensityGPerKwh: 10,
    renewableShare: 98,
    carbonPricePerTonne: 80,
    description: 'Primarily hydro generation with clean grid profile.'
  },
  'ca-west-2': {
    regionCode: 'ca-west-2',
    name: 'Alberta (CA-AB)',
    gridCarbonIntensityGPerKwh: 540,
    renewableShare: 18,
    carbonPricePerTonne: 80,
    description: 'Natural gas and coal-heavy grid with growing renewables.'
  },
  'us-east-1': {
    regionCode: 'us-east-1',
    name: 'US East (Virginia)',
    gridCarbonIntensityGPerKwh: 320,
    renewableShare: 22,
    carbonPricePerTonne: 0,
    description: 'Mixed grid with growing renewable penetration.'
  },
  'us-west-2': {
    regionCode: 'us-west-2',
    name: 'US West (Oregon)',
    gridCarbonIntensityGPerKwh: 85,
    renewableShare: 65,
    carbonPricePerTonne: 0,
    description: 'Hydro-dominant with strong wind resources.'
  },
  'eu-west-1': {
    regionCode: 'eu-west-1',
    name: 'EU West (Ireland)',
    gridCarbonIntensityGPerKwh: 280,
    renewableShare: 42,
    carbonPricePerTonne: 90,
    description: 'Growing offshore wind with gas backup.'
  }
};
