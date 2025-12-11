/**
 * Hooks for DC Scan Sessions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { 
  DCScanSession, 
  DCBlueprintTemplate, 
  DCRecommendation,
  LastScanSummary,
  DCScanIndustry,
  DCBlueprintProfile,
  DCTrafficScale,
  DCSustainabilityPriority
} from "@/types/dcScan";
import { BLUEPRINT_PROFILE_NAMES } from "@/types/dcScan";

// Transform database row to DCScanSession
function transformSession(row: any): DCScanSession {
  return {
    id: row.id,
    userId: row.user_id,
    url: row.url,
    createdAt: row.created_at,
    detectedIndustry: row.detected_industry as DCScanIndustry,
    trafficScale: row.traffic_scale as DCTrafficScale,
    sustainabilityPriority: row.sustainability_priority as DCSustainabilityPriority,
    blueprintProfile: row.blueprint_profile as DCBlueprintProfile,
    blueprintId: row.blueprint_id,
    recommendationJson: row.recommendation_json as DCRecommendation | null,
    rawSignals: row.raw_signals
  };
}

// Transform database row to DCBlueprintTemplate
function transformTemplate(row: any): DCBlueprintTemplate {
  return {
    id: row.id,
    slug: row.slug as DCBlueprintProfile,
    name: row.name,
    description: row.description || "",
    defaultCapacityKw: row.default_capacity_kw,
    defaultTier: row.default_tier,
    defaultAgents: row.default_agents || [],
    sustainabilityFocus: row.sustainability_focus || [],
    complianceFocus: row.compliance_focus || [],
    targetPue: Number(row.target_pue),
    renewableTargetPct: row.renewable_target_pct,
    sovereignComputePct: row.sovereign_compute_pct,
    annualCarbonTargetTonnes: row.annual_carbon_target_tonnes,
    costFocus: row.cost_focus || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Fetch the last scan session for the current user
 */
export function useLastScanSession() {
  return useQuery({
    queryKey: ["dc-scan-sessions", "last"],
    queryFn: async (): Promise<LastScanSummary> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { exists: false };
      }

      const { data, error } = await supabase
        .from("dc_scan_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching last scan session:", error);
        return { exists: false };
      }

      if (!data) {
        return { exists: false };
      }

      const session = transformSession(data);
      const blueprintName = BLUEPRINT_PROFILE_NAMES[session.blueprintProfile] || session.blueprintProfile;

      return {
        exists: true,
        sessionId: session.id,
        url: session.url,
        createdAt: session.createdAt,
        detectedIndustry: session.detectedIndustry,
        blueprintProfile: session.blueprintProfile,
        blueprintName,
        blueprintId: session.blueprintId,
        recommendation: session.recommendationJson
      };
    },
    staleTime: 0, // Always refetch when invalidated
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch all scan sessions for the current user
 */
export function useScanSessions() {
  return useQuery({
    queryKey: ["dc-scan-sessions"],
    queryFn: async (): Promise<DCScanSession[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("dc_scan_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching scan sessions:", error);
        return [];
      }

      return (data || []).map(transformSession);
    }
  });
}

/**
 * Fetch a specific scan session by ID
 */
export function useScanSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["dc-scan-sessions", sessionId],
    queryFn: async (): Promise<DCScanSession | null> => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from("dc_scan_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching scan session:", error);
        return null;
      }

      return data ? transformSession(data) : null;
    },
    enabled: !!sessionId
  });
}

/**
 * Fetch all blueprint templates
 */
export function useBlueprintTemplates() {
  return useQuery({
    queryKey: ["dc-blueprint-templates"],
    queryFn: async (): Promise<DCBlueprintTemplate[]> => {
      const { data, error } = await supabase
        .from("dc_blueprint_templates")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching blueprint templates:", error);
        return [];
      }

      return (data || []).map(transformTemplate);
    }
  });
}

/**
 * Fetch a specific blueprint template by slug
 */
export function useBlueprintTemplate(slug: DCBlueprintProfile | null) {
  return useQuery({
    queryKey: ["dc-blueprint-templates", slug],
    queryFn: async (): Promise<DCBlueprintTemplate | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("dc_blueprint_templates")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error("Error fetching blueprint template:", error);
        return null;
      }

      return data ? transformTemplate(data) : null;
    },
    enabled: !!slug
  });
}

/**
 * Create a new scan session
 */
export function useCreateScanSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      url: string;
      detectedIndustry: DCScanIndustry;
      trafficScale: DCTrafficScale;
      sustainabilityPriority: DCSustainabilityPriority;
      blueprintProfile: DCBlueprintProfile;
      recommendationJson?: DCRecommendation;
      rawSignals?: any;
    }): Promise<DCScanSession> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("dc_scan_sessions")
        .insert({
          user_id: user.id,
          url: params.url,
          detected_industry: params.detectedIndustry,
          traffic_scale: params.trafficScale,
          sustainability_priority: params.sustainabilityPriority,
          blueprint_profile: params.blueprintProfile,
          recommendation_json: params.recommendationJson as any,
          raw_signals: params.rawSignals
        })
        .select()
        .single();

      if (error) throw error;
      return transformSession(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dc-scan-sessions"] });
    }
  });
}

/**
 * Update a scan session with blueprint ID
 */
export function useUpdateScanSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      blueprintId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from("dc_scan_sessions")
        .update({ blueprint_id: params.blueprintId })
        .eq("id", params.sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dc-scan-sessions"] });
    }
  });
}
