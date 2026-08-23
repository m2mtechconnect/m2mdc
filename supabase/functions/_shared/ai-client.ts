/**
 * Centralized AI client configuration for AURA Co-Pilot.
 *
 * Stabilization rule: only a fully implemented provider may be selected at
 * runtime. The managed AURA path remains the active implementation. Legacy
 * external-Google environment variables may still exist, but they no longer
 * switch execution into an unimplemented branch.
 */

export const AI_CONFIG = {
  managedApiKey: Deno.env.get('LOVABLE_API_KEY'),
  managedEndpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  externalGoogleRequested: Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true',
  models: {
    primary: 'google/gemini-3-pro-preview',
    fallback: 'google/gemini-3.0-pro',
    image: 'google/gemini-3-pro-image-preview',
  },
};

export interface AIClientOptions {
  model?: 'primary' | 'fallback';
  temperature?: number;
  maxTokens?: number;
}

export interface ManagedAIClient {
  type: 'lovable_managed';
  apiKey: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Resolve the single supported AI runtime.
 *
 * `USE_EXTERNAL_GOOGLE=true` previously selected an adapter that immediately
 * threw at request time. During stabilization we deliberately ignore that
 * switch and keep the known-working managed path until a complete provider
 * implementation is introduced behind the same contract.
 */
export function getAIClient(options: AIClientOptions = {}): ManagedAIClient {
  const { model = 'primary', temperature = 0.7, maxTokens = 2048 } = options;

  if (AI_CONFIG.externalGoogleRequested) {
    console.warn('[AI Client] USE_EXTERNAL_GOOGLE is not supported by the current runtime; using the managed AURA provider instead.');
  }

  if (!AI_CONFIG.managedApiKey) {
    throw new Error('AURA managed AI is not configured');
  }

  const selectedModel = model === 'fallback'
    ? AI_CONFIG.models.fallback
    : AI_CONFIG.models.primary;

  if (!selectedModel.includes('gemini-3')) {
    throw new Error('AURA Co-Pilot requires an approved Gemini 3.x model');
  }

  return {
    type: 'lovable_managed',
    apiKey: AI_CONFIG.managedApiKey,
    endpoint: AI_CONFIG.managedEndpoint,
    model: selectedModel,
    temperature,
    maxTokens,
  };
}

/** Make an AI completion request using the supported managed provider. */
export async function makeAICompletion(
  messages: Array<{ role: string; content: string }>,
  options: AIClientOptions = {},
) {
  const client = getAIClient(options);
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
    const detail = await response.text();
    console.error('[AI Client] Managed provider request failed', {
      status: response.status,
      detail: detail.slice(0, 500),
    });
    throw new Error(`AURA AI request failed with status ${response.status}`);
  }

  return await response.json();
}

/** Health check for the currently supported AI runtime. */
export async function checkAIHealth() {
  try {
    const client = getAIClient({ model: 'primary' });
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

    return {
      healthy: response.ok,
      provider: 'lovable_managed',
      model: client.model,
      latency_ms: Date.now() - startTime,
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
