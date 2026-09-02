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
    reasoning: 'google/gemini-3-pro-preview',
    balanced: 'google/gemini-2.5-pro',
    fast: 'google/gemini-2.5-flash',
    fallback: 'google/gemini-3.0-pro',
    image: 'google/gemini-3-pro-image-preview',
    // Compatibility aliases remain server-owned while legacy callers move to
    // the provider-neutral profile names above.
    advanced: 'google/gemini-3-pro-preview',
    primary: 'google/gemini-3-pro-preview',
    compatibilityFast: 'google/gemini-2.5-flash',
    compatibilitySummary: 'google/gemini-2.5-pro',
  },
} as const;

export type AICanonicalTextProfile = 'reasoning' | 'balanced' | 'fast' | 'fallback';
export type AICompatibilityTextProfile = 'advanced' | 'primary' | 'compatibilityFast' | 'compatibilitySummary';
export type AITextProfile = AICanonicalTextProfile | AICompatibilityTextProfile;

export interface AIClientOptions {
  model?: AITextProfile;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: string;
  content: unknown;
}

export interface ManagedAIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: unknown;
  tools?: unknown[];
  toolChoice?: unknown;
}

export interface ManagedAIResponseOptions {
  model?: AITextProfile;
  operation: string;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface AIRequestEvidence {
  requestId: string;
  operation: string;
  provider: 'lovable_managed';
  profile: AITextProfile;
  model: string;
  statusCode: number;
  latencyMs: number;
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

const responseEvidence = new WeakMap<Response, AIRequestEvidence>();

/**
 * Invoke the server-owned AI runtime without exposing an endpoint, credential,
 * or arbitrary provider model to feature handlers.
 *
 * This low-level response form intentionally preserves the existing HTTP error
 * handling of callers as they migrate. Higher-level helpers below fail closed.
 */
export async function makeAIResponse(
  request: ManagedAIRequest,
  options: ManagedAIResponseOptions,
): Promise<Response> {
  const client = getAIClient({
    model: options.model,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
  });
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  try {
    const upstream = await fetch(client.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json',
        'X-AURA-AI-Request-ID': requestId,
      },
      body: JSON.stringify({
        model: client.model,
        messages: request.messages,
        ...(request.temperature === undefined ? {} : { temperature: client.temperature }),
        ...(request.maxTokens === undefined ? {} : { max_tokens: client.maxTokens }),
        ...(request.responseFormat === undefined ? {} : { response_format: request.responseFormat }),
        ...(request.tools === undefined ? {} : { tools: request.tools }),
        ...(request.toolChoice === undefined ? {} : { tool_choice: request.toolChoice }),
        ...(options.stream ? { stream: true } : {}),
      }),
      signal: options.signal,
    });

    const evidence: AIRequestEvidence = {
      requestId,
      operation: options.operation,
      provider: client.type,
      profile: client.profile,
      model: client.model,
      statusCode: upstream.status,
      latencyMs: Math.round(performance.now() - startedAt),
    };

    // Provider bodies and headers can contain internal or sensitive detail.
    // Preserve only the status and AURA correlation id on failures.
    const response = upstream.ok
      ? upstream
      : new Response(JSON.stringify({
          error: 'managed_ai_request_failed',
          request_id: requestId,
        }), {
          status: upstream.status,
          headers: {
            'Content-Type': 'application/json',
            'X-AURA-AI-Request-ID': requestId,
          },
        });

    responseEvidence.set(response, evidence);
    console.info('[AI Client] Managed request completed', evidence);
    return response;
  } catch (error) {
    console.error('[AI Client] Managed request failed before a response', {
      requestId,
      operation: options.operation,
      provider: client.type,
      profile: client.profile,
      latencyMs: Math.round(performance.now() - startedAt),
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }
}

export function getAIResponseEvidence(response: Response): AIRequestEvidence | undefined {
  return responseEvidence.get(response);
}

/** Expose configuration state without exposing the server-owned credential. */
export function isManagedAIConfigured(): boolean {
  return Boolean(AI_CONFIG.managedApiKey);
}

/** Resolve one server-owned managed AI profile. */
export function getAIClient(options: AIClientOptions = {}): ManagedAIClient {
  const { model = 'reasoning', temperature = 0.7, maxTokens = 2048 } = options;

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
  messages: AIMessage[],
  options: AIClientOptions = {},
) {
  const response = await makeAIResponse(
    {
      messages,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 2048,
    },
    { model: options.model, operation: 'completion' },
  );
  if (!response.ok) {
    console.error('[AI Client] Managed provider request failed', {
      operation: 'completion',
      profile: options.model ?? 'reasoning',
      status: response.status,
    });
    throw new AIProviderRequestError(response.status);
  }
  return await response.json();
}

/**
 * Start a streaming AI completion through the same server-owned transport.
 * Callers receive the upstream response stream but cannot provide an endpoint,
 * credential or arbitrary model id.
 */
export function makeAIStreamingCompletion(
  messages: AIMessage[],
  options: AIClientOptions = {},
): Promise<Response> {
  return makeAIResponse(
    {
      messages,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 2048,
    },
    { model: options.model, operation: 'streaming-completion', stream: true },
  ).then((response) => {
    if (!response.ok) {
      console.error('[AI Client] Managed provider request failed', {
        operation: 'streaming-completion',
        profile: options.model ?? 'reasoning',
        status: response.status,
      });
      throw new AIProviderRequestError(response.status);
    }
    return response;
  });
}

/** Health check for a server-owned AI profile. */
export async function checkAIHealth(options: Pick<AIClientOptions, 'model'> = {}) {
  try {
    const client = getAIClient({ model: options.model ?? 'reasoning', maxTokens: 5 });
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
      profile: options.model ?? 'reasoning',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
