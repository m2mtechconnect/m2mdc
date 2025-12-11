/**
 * Financial model estimator for Green DC Twin recommendations
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * DATA CENTER COST BENCHMARKS:
 * - JLL Data Center Outlook 2024 (Construction & operational costs)
 *   https://www.us.jll.com/en/trends-and-insights/research/data-center-outlook
 * - Cushman & Wakefield Global Data Center Market Comparison
 *   https://www.cushmanwakefield.com/en/insights
 * - Uptime Institute Annual Data Center Survey (OpEx benchmarks)
 *   https://uptimeinstitute.com/resources/research-and-reports
 * 
 * CAPACITY TIER CLASSIFICATIONS:
 * - Uptime Institute Tier Certification Standards
 *   https://uptimeinstitute.com/tier-certification/tier-requirements
 *   Small: <1MW, Medium: 1-5MW, Large: 5-20MW, Hyperscale: 20MW+
 * - TIA-942-B Data Center Infrastructure Standard
 *   https://tiaonline.org/what-we-do/standards/
 * 
 * INDUSTRY-SPECIFIC MULTIPLIERS:
 * - Gartner Industry TCO Models
 *   https://www.gartner.com/en/information-technology
 * - Financial Services: 40% premium for compliance/security
 * - Healthcare: 20% premium for HIPAA/PHIPA compliance
 * - Government: 30% premium for sovereignty requirements
 * 
 * CARBON ACCOUNTING:
 * - GHG Protocol Corporate Standard (Scope 1, 2, 3)
 *   https://ghgprotocol.org/corporate-standard
 * - Science Based Targets Initiative (SBTi)
 *   https://sciencebasedtargets.org/
 * - CDP Climate Disclosure Standards
 *   https://www.cdp.net/en
 * 
 * REGIONAL COST FACTORS:
 * - NRCan Canadian Energy Statistics
 *   https://www.nrcan.gc.ca/energy/energy-sources-distribution/
 * - EIA US Regional Electricity Prices
 *   https://www.eia.gov/electricity/state/
 * - Eurostat EU Energy Statistics
 *   https://ec.europa.eu/eurostat/web/energy
 * 
 * ROI & PAYBACK CALCULATIONS:
 * - EPA ENERGY STAR Data Center Calculator
 *   https://www.energystar.gov/buildings/tools-and-resources
 * - The Green Grid ROI Calculator
 *   https://www.thegreengrid.org/en/resources/library-and-tools
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { DcCapacityTier, DcTwinArchetypeId, GreenDcTwinRecommendation } from "@/types/greenDcTwin";

interface FinancialEstimate {
  baselineAnnualCostUsd: number;
  baselineAnnualCarbonTonnes: number;
  greenVariantSavingsCostPct: number;
  greenVariantSavingsCarbonPct: number;
  estimatedPaybackYears: number;
}

/**
 * Base cost and carbon estimates by capacity tier
 */
const CAPACITY_BASELINES: Record<DcCapacityTier, { costUsd: number; carbonTonnes: number }> = {
  small: { costUsd: 500_000, carbonTonnes: 150 },
  medium: { costUsd: 2_500_000, carbonTonnes: 800 },
  large: { costUsd: 12_000_000, carbonTonnes: 4_000 },
  hyperscale: { costUsd: 75_000_000, carbonTonnes: 25_000 }
};

/**
 * Industry-specific multipliers for cost/carbon
 */
const INDUSTRY_MULTIPLIERS: Record<DcTwinArchetypeId, { cost: number; carbon: number; savings: number }> = {
  finance_core_banking_green_twin: { cost: 1.4, carbon: 1.2, savings: 0.18 },
  retail_ecommerce_green_twin: { cost: 1.1, carbon: 1.3, savings: 0.22 },
  retail_hyperscale_green_twin: { cost: 2.5, carbon: 2.2, savings: 0.28 }, // Mega-retail hyperscale
  gov_sovereign_cloud_twin: { cost: 1.3, carbon: 0.9, savings: 0.15 },
  saas_multitenant_ai_twin: { cost: 1.5, carbon: 1.6, savings: 0.25 },
  healthcare_phi_twin: { cost: 1.2, carbon: 1.0, savings: 0.16 },
  telco_edge_5g_twin: { cost: 1.3, carbon: 1.4, savings: 0.20 },
  manufacturing_iiot_twin: { cost: 1.1, carbon: 1.5, savings: 0.23 },
  energy_grid_ai_twin: { cost: 0.9, carbon: 0.6, savings: 0.35 },
  education_research_ai_twin: { cost: 0.8, carbon: 1.1, savings: 0.20 },
  generic_enterprise_green_twin: { cost: 1.0, carbon: 1.0, savings: 0.18 }
};

/**
 * Region multipliers for cost
 */
const REGION_COST_MULTIPLIERS: Record<string, number> = {
  NA: 1.0,
  EU: 1.15,
  APAC: 0.9,
  LATAM: 0.75
};

/**
 * Estimate financial model for a Green DC Twin recommendation
 */
export function estimateFinancials(
  archetypeId: DcTwinArchetypeId,
  capacityTier: DcCapacityTier,
  regions: string[]
): FinancialEstimate {
  const baseline = CAPACITY_BASELINES[capacityTier];
  const multiplier = INDUSTRY_MULTIPLIERS[archetypeId];
  
  // Average region multiplier
  const avgRegionMultiplier = regions.length > 0
    ? regions.reduce((sum, r) => sum + (REGION_COST_MULTIPLIERS[r] || 1.0), 0) / regions.length
    : 1.0;

  const baselineAnnualCostUsd = Math.round(baseline.costUsd * multiplier.cost * avgRegionMultiplier);
  const baselineAnnualCarbonTonnes = Math.round(baseline.carbonTonnes * multiplier.carbon);
  
  // Green variant savings percentages
  const greenVariantSavingsCostPct = Math.round(multiplier.savings * 100);
  const greenVariantSavingsCarbonPct = Math.round(multiplier.savings * 1.5 * 100); // Carbon savings typically higher

  // Payback period estimate (investment cost / annual savings)
  // Assume green upgrade costs ~2x annual savings initially
  const estimatedPaybackYears = Math.round((2 / multiplier.savings) * 10) / 10;

  return {
    baselineAnnualCostUsd,
    baselineAnnualCarbonTonnes,
    greenVariantSavingsCostPct,
    greenVariantSavingsCarbonPct,
    estimatedPaybackYears: Math.min(estimatedPaybackYears, 5) // Cap at 5 years
  };
}

/**
 * Generate explanatory notes for the recommendation
 */
export function buildNotes(
  industry: string,
  regions: string[],
  constraints: string[],
  capacityTier: DcCapacityTier
): string[] {
  const notes: string[] = [];

  // Industry-specific note
  const industryNotes: Record<string, string> = {
    finance: "Financial services require highest availability (99.99%+) with strict data sovereignty for regulatory compliance.",
    government: "Government workloads mandate 100% data residency and enhanced physical security controls.",
    healthcare: "PHI handling requires HIPAA/PHIPA compliance with encrypted data-at-rest and audit logging.",
    retail: "Your organization operates one of the world's largest distributed retail infrastructures. This Twin optimizes both hyperscale data centres and retail edge workloads across thousands of sites.",
    telecom: "Edge computing architecture optimizes latency for 5G services with distributed cooling management.",
    manufacturing: "IIoT integration requires OT/IT convergence with real-time analytics at the edge.",
    energy: "Grid AI operations prioritize renewable utilization and demand response capabilities.",
    education: "Research computing needs burst capacity with fair resource allocation across groups.",
    saas: "Multi-tenant AI workloads benefit from GPU scheduling optimization and tenant isolation.",
    generic: "Enterprise DC operations focus on balanced PUE optimization and carbon reduction."
  };
  
  notes.push(industryNotes[industry] || industryNotes.generic);

  // Region-specific notes
  if (regions.includes("EU")) {
    notes.push("EU presence requires GDPR compliance with data processing impact assessments.");
  }
  if (regions.includes("NA") && regions.length > 1) {
    notes.push("Multi-region deployment enables carbon-aware workload routing to lowest-intensity grids.");
  }

  // Constraint-specific notes
  if (constraints.includes("Net Zero Pledge") || constraints.includes("Carbon Neutral")) {
    notes.push("Net zero commitment accelerates renewable energy targets and carbon credit strategies.");
  }
  if (constraints.includes("SOC 2") || constraints.includes("ISO 27001")) {
    notes.push("Security certifications require comprehensive audit logging and access controls.");
  }

  // Capacity tier notes
  if (capacityTier === "hyperscale") {
    notes.push("Hyperscale operations benefit from advanced cooling technologies (liquid cooling, free cooling).");
  }

  return notes;
}
