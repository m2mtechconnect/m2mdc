/**
 * Data Centre Scan Session Types
 * Used for URL scanning and Green DC Twin recommendations
 */

import type { ScrapedSiteMeta, CompanyIdentity } from './scrapedSiteMeta';

export type DCScanIndustry =
  | "finance"
  | "government"
  | "retail"
  | "telecom"
  | "cloud_saas"
  | "manufacturing"
  | "healthcare"
  | "energy"
  | "ai_compute"
  | "other";

export type DCBlueprintProfile =
  | "finance_green_dc"
  | "gov_sovereign_dc"
  | "retail_edge_dc"
  | "telco_regional_dc"
  | "saas_multi_tenant_dc"
  | "industrial_ai_dc"
  | "healthcare_compliant_dc"
  | "energy_low_carbon_dc"
  | "sovereign_ai_factory_dc";

export type DCTrafficScale = "small" | "medium" | "large" | "hyperscale";
export type DCSustainabilityPriority = "low" | "medium" | "high";
export type DCTier = "Tier II" | "Tier III" | "Tier IV";

export interface DCScanSignals {
  url: string;
  industry: DCScanIndustry;
  aiIntensityScore: number; // 0-100
  complianceKeywords: string[];
  scaleSignals: {
    careersPageHints: DCTrafficScale;
    cloudProviderMentions: string[];
    employeeEstimate?: number;
    globalPresence?: boolean;
  };
  sustainabilityKeywords: string[];
  contentSummary?: string;
  // Enhanced metadata
  siteMeta?: ScrapedSiteMeta;
  companyIdentity?: CompanyIdentity;
}

export interface DCScanSession {
  id: string;
  userId: string;
  url: string;
  createdAt: string;
  detectedIndustry: DCScanIndustry;
  trafficScale: DCTrafficScale;
  sustainabilityPriority: DCSustainabilityPriority;
  blueprintProfile: DCBlueprintProfile;
  blueprintId?: string | null;
  recommendationJson?: DCRecommendation | null;
  rawSignals?: DCScanSignals | null;
}

export interface DCBlueprintTemplate {
  id: string;
  slug: DCBlueprintProfile;
  name: string;
  description: string;
  defaultCapacityKw: number;
  defaultTier: DCTier;
  defaultAgents: string[];
  sustainabilityFocus: string[];
  complianceFocus: string[];
  targetPue: number;
  renewableTargetPct: number;
  sovereignComputePct: number;
  annualCarbonTargetTonnes: number;
  costFocus: string;
  createdAt: string;
  updatedAt: string;
}

export interface DCRecommendation {
  sessionId: string;
  url: string;
  domain: string;
  // Company identity fields
  companyName: string;
  displayName: string;
  twinName: string;
  // Detection results
  detectedIndustry: DCScanIndustry;
  blueprintProfile: DCBlueprintProfile;
  blueprintName: string;
  summary: string;
  suggestedCapacityKw: number;
  suggestedTier: DCTier;
  mainKPIs: string[];
  coreAgents: string[];
  carbonTarget: string;
  costFocus: string;
  complianceFocus: string[];
  sustainabilityFocus: string[];
  // Metadata reference
  siteMeta?: ScrapedSiteMeta;
}

export interface LastScanSummary {
  exists: boolean;
  sessionId?: string;
  url?: string;
  createdAt?: string;
  detectedIndustry?: DCScanIndustry;
  blueprintProfile?: DCBlueprintProfile;
  blueprintName?: string;
  blueprintId?: string | null;
  recommendation?: DCRecommendation | null;
  companyName?: string;
  twinName?: string;
}

// Industry display labels
export const INDUSTRY_LABELS: Record<DCScanIndustry, string> = {
  finance: "Financial Services",
  government: "Government & Public Sector",
  retail: "Retail & E-commerce",
  telecom: "Telecommunications",
  cloud_saas: "Cloud & SaaS",
  manufacturing: "Manufacturing & Industrial",
  healthcare: "Healthcare & Life Sciences",
  energy: "Energy & Utilities",
  ai_compute: "AI & High-Performance Computing",
  other: "General Enterprise",
};

// Blueprint profile to template name mapping
export const BLUEPRINT_PROFILE_NAMES: Record<DCBlueprintProfile, string> = {
  finance_green_dc: "Finance Green Data Centre Twin",
  gov_sovereign_dc: "Government Sovereign Data Centre Twin",
  retail_edge_dc: "Retail Edge Data Centre Twin",
  telco_regional_dc: "Telecom Regional Data Centre Twin",
  saas_multi_tenant_dc: "SaaS Multi-Tenant Data Centre Twin",
  industrial_ai_dc: "Industrial AI Data Centre Twin",
  healthcare_compliant_dc: "Healthcare Compliant Data Centre Twin",
  energy_low_carbon_dc: "Energy Low-Carbon Data Centre Twin",
  sovereign_ai_factory_dc: "Sovereign AI Factory Data Centre Twin",
};
