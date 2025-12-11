/**
 * Recommendation Store - Dedicated Zustand store for URL scan recommendations
 * 
 * CRITICAL: This store holds sandbox/preview recommendation data that is SEPARATE
 * from the active twin selection. Recommendations should NEVER automatically
 * create twins or modify the global twin selection.
 * 
 * The active twin is controlled ONLY by the header dropdown selector via ActiveTwinContext.
 */

import { create } from 'zustand';
import type { GreenDcTwinRecommendation } from '@/types/greenDcTwin';

export interface RecommendationState {
  /** The current recommendation from URL scan (sandbox/preview only) */
  recommendation: GreenDcTwinRecommendation | null;
  
  /** The source URL that was scanned */
  sourceUrl: string | null;
  
  /** The dc_scan_sessions record ID if saved */
  scanSessionId: string | null;
  
  /** Loading state for async operations */
  isLoading: boolean;
  
  /** Error message if scan failed */
  error: string | null;
  
  /** Whether recommendation is being previewed (not yet a real twin) */
  isPreviewMode: boolean;
  
  // Actions
  setRecommendation: (payload: {
    recommendation: GreenDcTwinRecommendation;
    sourceUrl: string;
    scanSessionId?: string | null;
  }) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPreviewMode: (preview: boolean) => void;
  clearRecommendation: () => void;
}

export const useRecommendationStore = create<RecommendationState>((set) => ({
  recommendation: null,
  sourceUrl: null,
  scanSessionId: null,
  isLoading: false,
  error: null,
  isPreviewMode: false,

  setRecommendation: ({ recommendation, sourceUrl, scanSessionId }) => {
    console.log('[RecommendationStore] Setting recommendation (preview only, no twin created):', {
      industry: recommendation.industry,
      archetypeId: recommendation.archetypeId,
      sourceUrl,
    });
    set({
      recommendation,
      sourceUrl,
      scanSessionId: scanSessionId ?? null,
      isPreviewMode: true,
      error: null,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  setPreviewMode: (isPreviewMode) => set({ isPreviewMode }),

  clearRecommendation: () => {
    console.log('[RecommendationStore] Clearing recommendation');
    set({
      recommendation: null,
      sourceUrl: null,
      scanSessionId: null,
      isPreviewMode: false,
      error: null,
    });
  },
}));

/**
 * Hook to check if we're in recommendation preview mode
 * (viewing a recommendation but not yet created a twin from it)
 */
export function useIsRecommendationPreview(): boolean {
  return useRecommendationStore((s) => s.isPreviewMode && s.recommendation !== null);
}
