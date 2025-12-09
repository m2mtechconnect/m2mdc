/**
 * Centralized Co-Pilot Configuration
 * 
 * Single source of truth for Co-Pilot model selection, parameters,
 * and orchestration settings across the entire AURA platform.
 */

export interface CoPilotModelConfig {
  primary: string;
  fallback: string;
  temperature: number;
  maxTokens: number;
  streamingEnabled: boolean;
}

export interface CoPilotOrchestrationConfig {
  enableMultiAgent: boolean;
  enableSupervisor: boolean;
  enableDomainAgent: boolean;
  enableActionAgent: boolean;
}

/**
 * Latest Gemini 3.x Model Configuration
 * 
 * CRITICAL: This is the single source of truth for model selection.
 * All Co-Pilot features MUST use these models.
 */
export const COPILOT_MODEL_CONFIG: CoPilotModelConfig = {
  // Primary model for reasoning and complex queries
  primary: 'google/gemini-3-pro-preview',
  
  // Fallback if primary fails
  fallback: 'google/gemini-3.0-pro',
  
  // Model parameters
  temperature: 0.7,
  maxTokens: 2048,
  streamingEnabled: true,
};

/**
 * Multi-Agent Orchestration Configuration
 * 
 * Controls internal agent routing and composition.
 * Hidden from UI - only final result is shown to user.
 */
export const COPILOT_ORCHESTRATION_CONFIG: CoPilotOrchestrationConfig = {
  enableMultiAgent: true,
  enableSupervisor: true,
  enableDomainAgent: true,
  enableActionAgent: true,
};

/**
 * Context Prefetch Configuration
 */
export const COPILOT_PREFETCH_CONFIG = {
  enabled: true,
  suggestionsCount: 3,
  cacheTimeMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Performance Targets
 */
export const COPILOT_PERFORMANCE_TARGETS = {
  firstTokenLatencyMs: 1500,
  totalResponseLatencyMs: 5000,
};

/**
 * Resolve the current model to use
 */
export function resolveCurrentModel(preferFallback: boolean = false): string {
  return preferFallback ? COPILOT_MODEL_CONFIG.fallback : COPILOT_MODEL_CONFIG.primary;
}

/**
 * Get display name for current model
 */
export function getModelDisplayName(): string {
  return 'Gemini 3.0 Pro';
}

/**
 * Get model version string
 */
export function getModelVersion(): string {
  return '3.0';
}
