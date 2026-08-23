/**
 * Centralized managed AI transport for AURA Edge Functions.
 *
 * Runtime callers select a server-owned profile, never a browser-supplied model
 * identifier. The compatibility profiles preserve the behavior of legacy
 * handlers while their transport, credentials and provider errors are
 * consolidated behind this module.
 */

export const AI_CONFIG = {
  managedApiKey: Deno.env.get('LOVABLE_API_KEY'),
  managedEndpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  externalGoogleRequested: Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true',
  models: {
    primary: 'google/gemini-3-pro-preview',
    fallback: 'google/gemini-3.0-pro',
    image: 'google/gemini-3-pro-image-preview',
    compatibilityFast: 'google/gemini-2.5-flash',
    compatibilitySummary: 'google/gemini-2.5-pro',
  },
} as const;

export type AITextProfile = 'primary' | 'fallback' | 'compatibilityFast' | 'compatibilitySummary';

export interface AIClientOptions {
  model?: AITextProfile;
  temperature?: number;
  maxTokens?: number;
}

export interface ManagedAIClient {
  type: 'lovable_managed';
  apiKey: string;
  endpoint: string;
  model: string;
  profile: AITextProfile;
  temperature: number;
  maxTokens: number;
}

export class AIProviderRequestError extends Error {
  constructor(
    public readonly status: number,
    message = `AURA AI request failed with status ${status}`,
  ) {
    super(message);
    this.name = 'AIProviderRequestError';
  }
}

/** Resolve one server-owned managed AI profile. */
export function getAIClient(options: AIClientOptions = {}): ManagedAIClient {
  const { model = 'primary', temperature = 0.7, maxTokens = 2048 } = options;

  if (AI_CONFIG.externalGoogleRequested) {
    console.warn('[AI Client] USE_EXTERNAL_GOOGLE is not supported by the current runtime; using the managed AURA provider instead.');
  }

  if (!AI_CONFIG.managedApiKey) {
    throw new Error('AURA managed AI is not configured');
  }

  return {
    type: 'lovable_managed',
    apiKey: AI_CONFIG.managedApiKey,
    endpoint: AI_CONFIG.managedEndpoint,
    model: AI_CONFIG.models[model],
    profile: model,
    temperature,
    maxTokens,
  };
}

/** Make an AI completion request using the selected server-owned profile. */
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
      profile: client.profile,
      status: response.status,
      detail: detail.slice(0, 500),
    });
    throw new AIProviderRequestError(response.status);
  }

  return await response.json();
}

/** Health check for a server-owned AI profile. */
export async function checkAIHealth(options: Pick<AIClientOptions, 'model'> = {}) {
  try {
    const client = getAIClient({ model: options.model ?? 'primary', maxTokens: 5 });
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
      profile: client.profile,
      model: client.model,
      latency_ms: Date.now() - startTime,
      status_code: response.status,
    };
  } catch (error) {
    return {
      healthy: false,
      provider: 'lovable_managed',
      profile: options.model ?? 'primary',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
