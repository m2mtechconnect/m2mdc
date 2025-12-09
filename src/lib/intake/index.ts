/**
 * Unified Intake System - Exports
 * Single entry point for all intake-related functionality
 */

// Main service
export {
  startBuilderFromIntake,
  startBuilderFromTemplate,
  startBuilderFromFile,
  startBuilderFromQuestionnaire,
  startBuilderFromUrl,
} from './unifiedIntakeService';

// Session management
export {
  createBuilderSession,
  updateBuilderSession,
  getBuilderSession,
  deleteBuilderSession,
} from './sessionManager';

// Template recommendations
export {
  recommendTemplatesFromContent,
  recommendTemplatesFromDocument,
  recommendTemplatesFromQuestionnaire,
  getDefaultRecommendation,
} from './templateRecommendations';

// Types
export type {
  IntakeSource,
  UnifiedIntakePayload,
  IntakeResult,
  BuilderSession,
} from './types';
