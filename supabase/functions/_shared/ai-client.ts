import {
  LOVABLE_MODEL_IDS,
  ModelRouterError,
  providerReadiness,
  requestChatCompletion,
  resolveModel,
  type AgentModelProfile,
  type ModelMessage,
} from './model-router.ts';

/**
 * Backward-compatible shared AI client.
 *
 * New code should use `model-router.ts` directly. This module preserves the
 * older Co-Pilot helper API while delegating all provider/model decisions to
 * the canonical router so agent and Co-Pilot paths cannot drift independently.
 */
export const AI_CONFIG = {
  models: {
    primary: LOVABLE_MODEL_IDS.reasoning,
    fallback: LOVABLE_MODEL_IDS.fast,
  },
  readiness: providerReadiness(),
};

export interface AIClientOptions {
  /** Legacy selector retained for callers that still pass primary/fallback. */
  model?: 'primary' | 'fallback';
  /** Preferred provider-neutral selector. */
  profile?: AgentModelProfile;
  requestedModel?: string | null;
  temperature?: number;
  maxTokens?: number;
}

function profileFor(options: AIClientOptions): AgentModelProfile {
  if (options.profile) return options.profile;
  return options.model === 'fallback' ? 'fast' : 'reasoning';
}

export function getAIClient(options: AIClientOptions = {}) {
  const resolved = resolveModel({
    requestedModel: options.requestedModel,
    profile: profileFor(options),
  });
  return {
    type:
      resolved.provider === 'lovable-managed'
        ? 'lovable_managed' as const
        : resolved.provider === 'nvidia-build'
          ? 'nvidia_openai_compatible' as const
          : 'openai_compatible' as const,
    provider: resolved.provider,
    apiKey: resolved.apiKey,
    endpoint: resolved.endpoint,
    model: resolved.model,
    profile: resolved.profile,
    temperature: options.temperature ?? 0.3,
    maxTokens: options.maxTokens ?? 2048,
  };
}

/**
 * Make a completion request while preserving the legacy raw OpenAI-compatible
 * payload shape expected by existing callers.
 */
export async function makeAICompletion(
  messages: Array<{ role: string; content: string }>,
  options: AIClientOptions = {},
) {
  const normalizedMessages: ModelMessage[] = messages.map((message) => {
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw new ModelRouterError('INVALID_MESSAGE_ROLE', `Unsupported message role '${message.role}'`, 400);
    }
    return {
      role: message.role as ModelMessage['role'],
      content: message.content,
    };
  });

  const { response, resolved } = await requestChatCompletion(normalizedMessages, {
    requestedModel: options.requestedModel,
    profile: profileFor(options),
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });

  if (!response.ok) {
    throw new ModelRouterError(
      'MODEL_PROVIDER_ERROR',
      `${resolved.provider} model request failed with HTTP ${response.status}`,
      response.status === 429 ? 429 : 502,
    );
  }
  return await response.json();
}

export async function checkAIHealth() {
  try {
    const startTime = Date.now();
    const { response, resolved } = await requestChatCompletion(
      [{ role: 'user', content: 'Respond with OK.' }],
      { profile: 'fast', maxTokens: 5, temperature: 0 },
    );
    return {
      healthy: response.ok,
      provider: resolved.provider,
      profile: resolved.profile,
      model: resolved.model,
      latency_ms: Date.now() - startTime,
      status_code: response.status,
    };
  } catch (error) {
    return {
      healthy: false,
      provider: providerReadiness().selectedProvider,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
