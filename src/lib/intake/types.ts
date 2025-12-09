/**
 * Unified Intake Types
 * Shared types for all intake flows (URL, file, questionnaire, template)
 */

import { AgentBlueprint } from '@/types/agentBlueprint';

export type IntakeSource = 'url' | 'file' | 'questionnaire' | 'template' | 'manual';

/**
 * Unified payload that all intake flows must produce
 * This is the single source of truth for starting the builder
 */
export interface UnifiedIntakePayload {
  // Core identification
  source: IntakeSource;
  userId: string;
  
  // Source-specific data (only one should be populated based on source)
  templateId?: string;           // For template source
  urlInput?: string;             // For URL source
  fileJobId?: string;            // For file upload (document analysis job)
  questionnaireId?: string;      // For questionnaire source
  questionnaireAnswers?: Record<string, any>;  // Questionnaire form data
  
  // Session management
  existingSessionId?: string;    // Update existing builder session (e.g., uploading in Step 2)
  forceNew?: boolean;            // Force new session even if one exists
  
  // Optional metadata
  metadata?: Record<string, any>;
}

/**
 * Result returned after processing an intake
 */
export interface IntakeResult {
  success: boolean;
  sessionId: string;
  blueprint: AgentBlueprint;
  builderUrl: string;
  error?: string;
}

/**
 * Builder session stored in database or memory
 */
export interface BuilderSession {
  id: string;
  userId: string;
  blueprint: AgentBlueprint;
  wizardState?: Record<string, any>;  // 5-step wizard state
  source: IntakeSource;
  createdAt: string;
  updatedAt: string;
  lastStep?: number;
}
