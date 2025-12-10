/**
 * Hook for fetching Green DC Twin recommendations
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GreenDcTwinRecommendation, GreenDcRecommendResponse } from "@/types/greenDcTwin";

export function useGreenDcRecommendation() {
  const [recommendation, setRecommendation] = useState<GreenDcTwinRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }
    } catch (err) {
      console.error("[useGreenDcRecommendation] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
