/**
 * Recommendation Components Index
 * Exports the unified recommendation panel and utilities
 */

export { 
  UnifiedRecommendationPanel, 
  normalizeFromBuilderStore 
} from './UnifiedRecommendationPanel';

export type { NormalizedRecommendation } from './UnifiedRecommendationPanel';

// Re-export for backward compatibility
export { UnifiedRecommendationPanel as RecommendationPanel } from './UnifiedRecommendationPanel';
