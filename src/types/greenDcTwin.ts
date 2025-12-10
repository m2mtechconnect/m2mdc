/**
 * Green Data Centre Twin Recommendation Types
 * Used for industry-specific DC twin recommendations from URL scanning
 */

export type DcIndustry =
  | "finance"
  | "government"
  | "retail"
  | "saas"
  | "healthcare"
  | "telecom"
  | "manufacturing"
  | "energy"
  | "education"
  | "generic";

export type DcCapacityTier = "small" | "medium" | "large" | "hyperscale";

export type DcTwinArchetypeId =
  | "finance_core_banking_green_twin"
  | "retail_ecommerce_green_twin"
  | "retail_hyperscale_green_twin"
  | "gov_sovereign_cloud_twin"
  | "saas_multitenant_ai_twin"
  | "healthcare_phi_twin"
  | "telco_edge_5g_twin"
  | "manufacturing_iiot_twin"
  | "energy_grid_ai_twin"
  | "education_research_ai_twin"
  | "generic_enterprise_green_twin";

export interface GreenDcTwinRecommendation {
  id: string;
  domain: string;
  companyName: string; // Clean company name (always populated)
  industryId: string; // Normalized industry ID (retail, financial_services, etc.)
  industry: DcIndustry;
  businessModel?: string;
  archetypeId: DcTwinArchetypeId;
  regions: string[]; // e.g. ["NA", "EU"]
  capacityTier: DcCapacityTier;
  objectives: string[];
  agents: string[]; // ids matching existing Blueprint agent types
  kpiTargets: {
    pueTarget: number;
    renewableShareTargetPct: number;
    sovereigntyScoreTargetPct: number;
    carbonIntensityTargetGPerKwh: number;
    uptimeTargetPct: number;
  };
  scenarios: string[]; // ids of simulation scenarios to enable
  financialModel: {
    baselineAnnualCostUsd: number;
    baselineAnnualCarbonTonnes: number;
    greenVariantSavingsCostPct: number;
    greenVariantSavingsCarbonPct: number;
    estimatedPaybackYears: number;
    // Retail-specific fields (optional)
    annualColdChainEnergyCostUsd?: number;
    annualEdgeComputeEnergyCostUsd?: number;
    fleetWideCarbonTaxRiskUsd?: number;
    aiWorkloadOptimizationSavingsUsd?: number;
    multiStoreAggregationCount?: number;
  };
  notes: string[];
  detectedConstraints?: string[]; // SOC2, GDPR, etc.
  isMegaRetailer?: boolean; // Fortune 50 retail detection flag
  scanSummary?: {
    pagesScanned: number;
    contentExtracted: string;
  };
}

export interface GreenDcRecommendRequest {
  url: string;
  forceRecrawl?: boolean;
  deepRecrawl?: boolean;
}

export interface GreenDcRecommendResponse {
  status: "ok" | "error";
  recommendation?: GreenDcTwinRecommendation;
  message?: string;
}
