/**
 * useGreenDcRecommendation - Hook for Fetching Green DC Twin Recommendations
 * Initializes DC Twin Builder store from URL scanner recommendations
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * GREEN DATA CENTER STANDARDS:
 * - The Green Grid Data Center Efficiency Metrics (PUE, DCiE, WUE, CUE)
 *   https://www.thegreengrid.org/en/resources/library-and-tools
 * - LEED v4 Data Center Certification
 *   https://www.usgbc.org/leed
 * - EPA ENERGY STAR Data Center Certification
 *   https://www.energystar.gov/buildings/benchmark/understand_metrics/data_center
 * 
 * SUSTAINABILITY FRAMEWORKS:
 * - GHG Protocol Corporate Standard (Scope 1, 2, 3)
 *   https://ghgprotocol.org/corporate-standard
 * - SBTi (Science Based Targets initiative) for ICT Sector
 *   https://sciencebasedtargets.org/sectors/ict
 * - RE100 Renewable Electricity Initiative
 *   https://www.there100.org/
 * 
 * INDUSTRY CLASSIFICATION:
 * - NAICS (North American Industry Classification System)
 *   https://www.census.gov/naics/
 * - GICS (Global Industry Classification Standard)
 *   https://www.msci.com/our-solutions/indexes/gics
 * 
 * CANADIAN DATA SOVEREIGNTY:
 * - Treasury Board of Canada - Direction on Electronic Data Residency
 *   https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/cloud-services/direction-electronic-data-residency.html
 * - PIPEDA Compliance Requirements
 *   https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/
 * 
 * REACT PATTERNS:
 * - React Query for Server State Management
 *   https://tanstack.com/query/latest
 * - React useCallback for Stable Function References
 *   https://react.dev/reference/react/useCallback
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GreenDcTwinRecommendation, GreenDcRecommendResponse } from "@/types/greenDcTwin";
import { useDCTwinBuilderStore } from "@/stores/dcTwinBuilderStore";

export function useGreenDcRecommendation() {
  const [recommendation, setRecommendation] = useState<GreenDcTwinRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();
  
  // Get the store initialization method
  const initializeFromGreenDcRecommendation = useDCTwinBuilderStore(
    (s) => s.initializeFromGreenDcRecommendation
  );

  const fetchRecommendation = useCallback(async (url: string, forceRecrawl = false, deepRecrawl = false) => {
    setIsLoading(true);
    setError(null);
    setRecommendation(null);
    setIsInitialized(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<GreenDcRecommendResponse>("green-dc-recommend", {
        body: { url, forceRecrawl, deepRecrawl }
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to fetch recommendation");
      }

      if (data?.status === "error") {
        throw new Error(data.message || "Failed to generate recommendation");
      }

      if (data?.recommendation) {
        setRecommendation(data.recommendation);
        
        // Initialize the builder store from the recommendation
        const sessionId = crypto.randomUUID();
        initializeFromGreenDcRecommendation(data.recommendation, sessionId);
        setIsInitialized(true);
        
        // Save scan session to database
        await saveScanSession(url, data.recommendation);
        
        // Invalidate the last scan query to refresh the banner
        queryClient.invalidateQueries({ queryKey: ["dc-scan-sessions", "last"] });
      }
    } catch (err) {
      console.error("[useGreenDcRecommendation] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, initializeFromGreenDcRecommendation]);

  const reset = useCallback(() => {
    setRecommendation(null);
    setError(null);
    setIsInitialized(false);
  }, []);

  return {
    recommendation,
    isLoading,
    error,
    isInitialized,
    fetchRecommendation,
    reset
  };
}

/**
 * Save scan session to dc_scan_sessions table
 */
async function saveScanSession(url: string, recommendation: GreenDcTwinRecommendation) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[saveScanSession] No authenticated user, skipping save");
      return;
    }

    // Map industry from edge function to database enum values
    // Database constraint: finance, government, retail, telecom, cloud_saas, manufacturing, healthcare, energy, ai_compute, other
    const industryToDbMap: Record<string, string> = {
      finance: "finance",
      government: "government",
      retail: "retail",
      saas: "cloud_saas", // Edge function returns 'saas', DB expects 'cloud_saas'
      healthcare: "healthcare",
      telecom: "telecom",
      manufacturing: "manufacturing",
      energy: "energy",
      education: "other", // Map education to 'other' as it's not in DB enum
      generic: "other"
    };
    
    // Map industry to blueprint profile
    const blueprintProfileMap: Record<string, string> = {
      finance: "finance_green_dc",
      government: "gov_sovereign_dc",
      retail: "retail_edge_dc",
      saas: "saas_ai_dc",
      cloud_saas: "saas_ai_dc",
      healthcare: "healthcare_phi_dc",
      telecom: "telco_edge_dc",
      manufacturing: "manufacturing_iiot_dc",
      energy: "energy_grid_dc",
      education: "education_research_dc",
      generic: "generic_enterprise_dc",
      other: "generic_enterprise_dc"
    };
    
    const dbIndustry = industryToDbMap[recommendation.industry] || "other";

    const { error } = await supabase
      .from("dc_scan_sessions")
      .insert({
        user_id: user.id,
        url,
        detected_industry: dbIndustry,
        blueprint_profile: blueprintProfileMap[recommendation.industry] || "generic_enterprise_dc",
        sustainability_priority: "medium",
        traffic_scale: recommendation.capacityTier,
        recommendation_json: recommendation as any,
        raw_signals: {
          archetypeId: recommendation.archetypeId,
          agents: recommendation.agents,
          kpiTargets: recommendation.kpiTargets
        }
      });

    if (error) {
      console.error("[saveScanSession] Error saving scan session:", error);
    } else {
      console.log("[saveScanSession] Scan session saved successfully");
    }
  } catch (err) {
    console.error("[saveScanSession] Unexpected error:", err);
  }
}
