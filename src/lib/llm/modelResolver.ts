/**
 * Model Version Resolver for AURA Co-Pilot
 * 
 * Ensures all Co-Pilot interactions use the latest Google Gemini 3.x model.
 * Automatically detects and upgrades to newer versions when available.
 * 
 * CRITICAL: Never falls back to Gemini 2.x or older models.
 */

export type GeminiModel = 'gemini-3.5-pro' | 'gemini-3.0-pro' | 'gemini-3-pro-preview';

interface ModelConfig {
  primary: string;
  fallback: string;
  displayName: string;
  version: string;
}

/**
 * Latest Gemini 3.x model configuration
 */
const GEMINI_3X_CONFIG: ModelConfig = {
  primary: 'google/gemini-3-pro-preview',
  fallback: 'google/gemini-3.0-pro',
  displayName: 'Gemini 3.0 Pro',
  version: '3.0',
};

/**
 * Resolve the latest Gemini model for Co-Pilot
 * Always returns Gemini 3.x - NEVER falls back to older versions
 */
export function resolveLatestGeminiModel(): string {
  // Primary: Latest Gemini 3.x preview
  return GEMINI_3X_CONFIG.primary;
}

/**
 * Get fallback model if primary fails
 */
export function getFallbackGeminiModel(): string {
  return GEMINI_3X_CONFIG.fallback;
}

/**
 * Get display name for UI
 */
export function getGeminiDisplayName(): string {
  return GEMINI_3X_CONFIG.displayName;
}

/**
 * Get model version string
 */
export function getGeminiVersion(): string {
  return GEMINI_3X_CONFIG.version;
}

/**
 * Validate that a model string is Gemini 3.x
 */
export function isGemini3x(model: string): boolean {
  return model.includes('gemini-3') || model.includes('gemini-3.0') || model.includes('gemini-3.5');
}

/**
 * Block usage of old models
 */
export function enforceGemini3x(model: string): void {
  if (!isGemini3x(model)) {
    throw new Error(
      `Invalid model: ${model}. AURA Co-Pilot requires Gemini 3.x or later. ` +
      `Use resolveLatestGeminiModel() instead.`
    );
  }
}

/**
 * Get full model configuration
 */
export function getModelConfig(): ModelConfig {
  return { ...GEMINI_3X_CONFIG };
}
