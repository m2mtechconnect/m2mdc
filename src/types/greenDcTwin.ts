/**
 * Green Data Centre Twin Recommendation Types
 * Used for industry-specific DC twin recommendations from URL scanning
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * GREEN DATA CENTER CERTIFICATIONS:
 * - LEED v4 Data Center Certification (U.S. Green Building Council)
 *   https://www.usgbc.org/leed
 * - EPA ENERGY STAR Data Center Rating
 *   https://www.energystar.gov/buildings/benchmark/understand_metrics/data_center
 * - BREEAM Data Centre Assessment
 *   https://www.breeam.com/
 * 
 * SUSTAINABILITY FRAMEWORKS:
 * - GHG Protocol ICT Sector Guidance (Scope 1, 2, 3)
 *   https://ghgprotocol.org/sites/default/files/ghgp/standards/ict-sector-guidance.pdf
 * - SBTi ICT Sector Guidance
 *   https://sciencebasedtargets.org/sectors/ict
 * - RE100 Renewable Electricity Initiative
 *   https://www.there100.org/
 * 
 * DATA CENTER EFFICIENCY METRICS:
 * - The Green Grid PUE/DCiE/WUE/CUE Definitions
 *   https://www.thegreengrid.org/en/resources/library-and-tools
 * - Uptime Institute Global Data Center Survey (PUE benchmarks)
 *   https://uptimeinstitute.com/annual-global-data-center-survey
 * 
 * INDUSTRY CLASSIFICATION:
 * - NAICS (North American Industry Classification System)
 *   https://www.census.gov/naics/
 * - GICS (Global Industry Classification Standard)
 *   https://www.msci.com/our-solutions/indexes/gics
 * 
 * CANADIAN CARBON PRICING:
 * - Federal Carbon Pricing Trajectory ($80/tonne 2024 → $170/tonne 2030)
 *   https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html
 * - Quebec Carbon Market (Western Climate Initiative)
 *   https://www.environnement.gouv.qc.ca/changements/carbone/
 * 
 * REGIONAL CARBON INTENSITY:
 * - NRCan Provincial Electricity Generation Emissions
 *   Quebec: ~1.2 gCO2/kWh (hydro), Alberta: ~540 gCO2/kWh (coal/gas)
 *   https://www.cer-rec.gc.ca/en/data-analysis/energy-commodities/electricity/
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
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
