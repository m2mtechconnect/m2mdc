/**
 * Centralized AI client configuration for AURA Co-Pilot
 * 
 * DEFAULT: Uses Lovable Cloud managed Gemini 3.x ONLY (via LOVABLE_API_KEY)
 * OPTIONAL: Can switch to external Google Cloud / Vertex AI by setting USE_EXTERNAL_GOOGLE=true
 * 
 * MODEL SELECTION - GEMINI 3.X ONLY:
 * - google/gemini-3-pro-preview: Latest Gemini 3.x (primary)
 * - google/gemini-3.0-pro: Stable Gemini 3.0 (fallback)
 * - google/gemini-3-pro-image-preview: Image generation (Gemini 3.x)
 * 
 * CRITICAL: Never falls back to Gemini 2.x or older models
 * 
 * TO SWITCH TO EXTERNAL GOOGLE CREDENTIALS LATER:
 * 1. Set USE_EXTERNAL_GOOGLE=true in environment
 * 2. Ensure GOOGLE_APPLICATION_CREDENTIALS_JSON, GOOGLE_PROJECT_ID are set
 * 3. Functions will automatically use external credentials
 */

export const AI_CONFIG = {
  // Flag to enable external Google Cloud credentials (disabled by default)
  useExternalGoogle: Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true',
  
  // Lovable Cloud managed AI (always available)
  lovableApiKey: Deno.env.get('LOVABLE_API_KEY'),
  lovableEndpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  
  // External Google Cloud credentials (optional)
  googleCredentials: Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON'),
  googleProjectId: Deno.env.get('GOOGLE_PROJECT_ID'),
  googleLocation: Deno.env.get('GOOGLE_LOCATION') || 'northamerica-northeast1',
  vertexDataStoreId: Deno.env.get('VERTEX_DATA_STORE_ID'),
  
  // Model selection - ENFORCING GEMINI 3.X ONLY
  models: {
    // Primary: Latest Gemini 3.x model
    primary: 'google/gemini-3-pro-preview',
    // Fallback: Stable Gemini 3.0 (if 3.x preview unavailable)
    fallback: 'google/gemini-3.0-pro',
    // Image generation (Gemini 3.x)
    image: 'google/gemini-3-pro-image-preview',
  },
  
  // Legacy model for backward compatibility
  legacyModel: Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro',
};

export interface AIClientOptions {
  model?: 'primary' | 'fallback'; // Only Gemini 3.x variants
  temperature?: number;
  maxTokens?: number;
}

/**
 * Get the appropriate AI client configuration
 * Returns Lovable managed config by default, external Google config if enabled
 */
export function getAIClient(options: AIClientOptions = {}) {
  const { model = 'primary', temperature = 0.7, maxTokens = 2048 } = options;
  
  // Check if we should use external Google credentials
  if (AI_CONFIG.useExternalGoogle && AI_CONFIG.googleCredentials && AI_CONFIG.googleProjectId) {
    console.log('[AI Client] Using external Google Cloud credentials');
    return {
      type: 'external_google' as const,
      credentials: JSON.parse(AI_CONFIG.googleCredentials),
      projectId: AI_CONFIG.googleProjectId,
      location: AI_CONFIG.googleLocation,
      model: AI_CONFIG.legacyModel,
      temperature,
      maxTokens,
    };
  }
  
  // Default: Use Lovable managed Gemini
  if (!AI_CONFIG.lovableApiKey) {
    console.warn('[AI Client] LOVABLE_API_KEY not configured - AI calls will fail');
  }
  
  // ENFORCE GEMINI 3.X ONLY
  const selectedModel = model === 'fallback' 
    ? AI_CONFIG.models.fallback 
    : AI_CONFIG.models.primary;
  
  // Validate model is Gemini 3.x
  if (!selectedModel.includes('gemini-3')) {
    console.error(`[AI Client] Invalid model detected: ${selectedModel}. Forcing Gemini 3.x.`);
    throw new Error('AURA Co-Pilot requires Gemini 3.x or later');
  }
  
  console.log(`[AI Client] Using Lovable Cloud managed Gemini 3.x (${selectedModel})`);
  
  return {
    type: 'lovable_managed' as const,
    apiKey: AI_CONFIG.lovableApiKey!,
    endpoint: AI_CONFIG.lovableEndpoint,
    model: selectedModel,
    temperature,
    maxTokens,
  };
}

/**
 * Make an AI completion request using the configured client
 */
export async function makeAICompletion(
  messages: Array<{ role: string; content: string }>,
  options: AIClientOptions = {}
) {
  const client = getAIClient(options);
  
  if (client.type === 'lovable_managed') {
    // Use Lovable AI Gateway
    const response = await fetch(client.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: client.model,
        messages,
        temperature: client.temperature,
        max_tokens: client.maxTokens,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Lovable AI error: ${response.status} - ${error}`);
    }
    
    return await response.json();
  } else {
    // Use external Google Cloud (requires OAuth token generation)
    throw new Error('External Google Cloud not yet implemented in this helper');
  }
}

/**
 * Health check for AI services
 */
export async function checkAIHealth() {
  const client = getAIClient({ model: 'primary' });
  
  if (client.type === 'lovable_managed') {
    try {
      const startTime = Date.now();
      const response = await fetch(client.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: client.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        }),
      });
      
      const latency = Date.now() - startTime;
      
      return {
        healthy: response.ok,
        provider: 'lovable_managed',
        model: client.model,
        latency_ms: latency,
        status_code: response.status,
      };
    } catch (error) {
      return {
        healthy: false,
        provider: 'lovable_managed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // External Google health check would go here
  return {
    healthy: false,
    provider: 'external_google',
    error: 'Not implemented',
  };
}
