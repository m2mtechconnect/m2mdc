/**
 * Hook for fetching Green DC Twin recommendations
 */

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GreenDcTwinRecommendation, GreenDcRecommendResponse } from "@/types/greenDcTwin";

export function useGreenDcRecommendation() {
  const [recommendation, setRecommendation] = useState<GreenDcTwinRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const fetchRecommendation = useCallback(async (url: string, forceRecrawl = false, deepRecrawl = false) => {
    setIsLoading(true);
    setError(null);
    setRecommendation(null);

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
  }, [queryClient]);

  const reset = useCallback(() => {
    setRecommendation(null);
    setError(null);
  }, []);

  return {
    recommendation,
    isLoading,
    error,
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

    // Map industry to blueprint profile
    const blueprintProfileMap: Record<string, string> = {
      finance: "finance_green_dc",
      government: "gov_sovereign_dc",
      retail: "retail_edge_dc",
      saas: "saas_ai_dc",
      healthcare: "healthcare_phi_dc",
      telecom: "telco_edge_dc",
      manufacturing: "manufacturing_iiot_dc",
      energy: "energy_grid_dc",
      education: "education_research_dc",
      generic: "generic_enterprise_dc"
    };

    const { error } = await supabase
      .from("dc_scan_sessions")
      .insert({
        user_id: user.id,
        url,
        detected_industry: recommendation.industry,
        blueprint_profile: blueprintProfileMap[recommendation.industry] || "generic_enterprise_dc",
        sustainability_priority: "balanced",
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
