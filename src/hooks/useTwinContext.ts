/**
 * useTwinContext - Helper hook for pages to determine their operating context
 * 
 * This hook enforces the architectural pattern where:
 * - ActiveTwinContext (dropdown selection) is the ONLY source of truth for active twin
 * - Recommendations are preview-only and do NOT affect the active twin
 * 
 * Pages should use this hook to determine:
 * 1. Whether a twin is selected (for rendering twin-scoped content)
 * 2. Whether we're in preview mode (viewing a recommendation)
 * 3. Whether to show an empty state (no twin and not in preview)
 */

import { useMemo } from 'react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useRecommendationStore, useIsRecommendationPreview } from '@/stores/recommendationStore';
import type { GreenDcTwinRecommendation } from '@/types/greenDcTwin';

export interface TwinContextResult {
  // Active twin from dropdown (the ONLY source of truth for real twins)
  activeTwinId: string | null;
  activeTwin: ReturnType<typeof useActiveTwin>['twin'];
  
  // Whether user is viewing a recommendation preview (not a saved twin)
  isPreviewMode: boolean;
  
  // Whether we have something to display (either twin or preview)
  hasContext: boolean;
  
  // Whether to show empty state (no twin selected AND not in preview)
  showEmptyState: boolean;
  
  // Loading state
  isLoading: boolean;
  
  // Recommendation data (only populated in preview mode)
  recommendation: GreenDcTwinRecommendation | null;
  
  // All twin context methods
  twinContext: ReturnType<typeof useActiveTwin>;
}

export function useTwinContext(): TwinContextResult {
  const twinContext = useActiveTwin();
  const isPreviewMode = useIsRecommendationPreview();
  const recommendation = useRecommendationStore((s) => s.recommendation);
  
  const result = useMemo((): TwinContextResult => {
    const hasActiveTwin = !!twinContext.activeTwinId && !!twinContext.twin;
    const hasContext = hasActiveTwin || isPreviewMode;
    const showEmptyState = !hasContext && !twinContext.isLoading;
    
    return {
      activeTwinId: twinContext.activeTwinId,
      activeTwin: twinContext.twin,
      isPreviewMode,
      hasContext,
      showEmptyState,
      isLoading: twinContext.isLoading,
      recommendation: isPreviewMode ? recommendation : null,
      twinContext,
    };
  }, [
    twinContext.activeTwinId,
    twinContext.twin,
    twinContext.isLoading,
    isPreviewMode,
    recommendation,
  ]);
  
  return result;
}

/**
 * Helper to log twin context state for debugging
 * Call this in development to trace context issues
 */
export function logTwinContext(context: TwinContextResult, location: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TwinContext:${location}]`, {
      activeTwinId: context.activeTwinId,
      activeTwinName: context.activeTwin?.name,
      isPreviewMode: context.isPreviewMode,
      hasContext: context.hasContext,
      showEmptyState: context.showEmptyState,
      recommendationName: context.recommendation?.companyName,
    });
  }
}
