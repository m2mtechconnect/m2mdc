/**
 * DC Scan Module - URL scanning and recommendation generation
 * 
 * This module provides comprehensive website analysis for generating
 * industry-specific Data Centre Twin recommendations.
 * 
 * INDUSTRY SOURCES:
 * - Uptime Institute Tier Standards for data center classification
 * - The Green Grid PUE/DCiE benchmarks for efficiency metrics
 * - GHG Protocol ICT Sector Guidance for carbon accounting
 * - ASHRAE TC 9.9 for thermal guidelines
 * - ISO 50001 for energy management best practices
 */

// Core scanning and recommendation
export { buildScanSignals, selectBlueprintProfile, detectIndustry, calculateAIIntensity } from './selectBlueprintProfile';
export { generateRecommendation } from './generateRecommendation';

// Enhanced recommendation system
export { generateEnhancedRecommendation } from './generateEnhancedRecommendation';
export { generateIndustryObjectives } from './industryObjectives';
export { generateAllKPIInsights, INDUSTRY_BENCHMARKS } from './kpiBenchmarks';
export { generateAgentRecommendations } from './agentRecommendations';
export { generateScenarioRecommendations, getTopScenariosForIndustry } from './scenarioRecommendations';
export { generateFinancialModel } from './financialModel';

// Transformation utilities
export { 
  transformToEnhancedRecommendation, 
  isEnhancedRecommendation, 
  toLegacyRecommendation 
} from './transformToEnhanced';

// Company name extraction
export { 
  normalizeCompanyName, 
  extractFromDomain,
  extractFromTitle,
  extractCompanyIdentity,
  getDisplayCompanyName
} from './companyNameExtractor';

// Re-export types
export type { DCRecommendation, DCScanIndustry, DCBlueprintProfile } from '@/types/dcScan';
export type { 
  EnhancedDCRecommendation, 
  KPIInsight, 
  AgentRecommendation, 
  ScenarioRecommendation,
  IndustryObjective,
  EnhancedFinancialModel
} from '@/types/enhancedRecommendation';
