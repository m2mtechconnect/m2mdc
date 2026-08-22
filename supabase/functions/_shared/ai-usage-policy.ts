export const AI_USAGE_OPERATIONS = [
  'agent_run',
  'agent_execute',
  'agent_stream',
  'agent_preview',
  'agent_suggestions',
  'model_test',
  'model_compare',
  'shadow_evaluation',
] as const;

export type AiUsageOperation = (typeof AI_USAGE_OPERATIONS)[number];
export type AiPublicProviderClass = 'aura-managed' | 'nvidia-hosted' | 'private-compatible' | 'unknown';
export type AiUsageStatus = 'completed' | 'failed' | 'quota-blocked';

export interface NormalizedTokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  raw: Record<string, unknown>;
}

function nonNegativeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

/**
 * Normalize common OpenAI-compatible usage envelopes without inventing token
 * counts when a provider omits them.
 */
export function normalizeTokenUsage(value: unknown): NormalizedTokenUsage {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};

  const inputTokens = nonNegativeInteger(raw.prompt_tokens ?? raw.input_tokens);
  const outputTokens = nonNegativeInteger(raw.completion_tokens ?? raw.output_tokens);
  const explicitTotal = nonNegativeInteger(raw.total_tokens);
  const derivedTotal = inputTokens !== null && outputTokens !== null
    ? inputTokens + outputTokens
    : null;

  return {
    inputTokens,
    outputTokens,
    totalTokens: explicitTotal ?? derivedTotal,
    raw,
  };
}

export interface AiReservationFailure {
  code: 'AI_RATE_LIMIT_USER' | 'AI_RATE_LIMIT_TENANT' | 'AI_USAGE_POLICY_MISSING' | 'AI_USAGE_CONTROL_UNAVAILABLE';
  status: number;
  message: string;
}

export function classifyReservationFailure(message: string): AiReservationFailure {
  if (message.includes('AURA_AI_RATE_LIMIT_USER')) {
    return { code: 'AI_RATE_LIMIT_USER', status: 429, message: 'Your AURA AI request limit has been reached for this hour.' };
  }
  if (message.includes('AURA_AI_RATE_LIMIT_TENANT')) {
    return { code: 'AI_RATE_LIMIT_TENANT', status: 429, message: 'The tenant AURA AI request limit has been reached for this hour.' };
  }
  if (message.includes('AURA_AI_POLICY_MISSING')) {
    return { code: 'AI_USAGE_POLICY_MISSING', status: 503, message: 'No durable AI usage policy is configured for this operation.' };
  }
  return { code: 'AI_USAGE_CONTROL_UNAVAILABLE', status: 503, message: 'AURA could not reserve durable AI usage capacity.' };
}

export function publicProviderClass(provider: string | null | undefined): AiPublicProviderClass {
  const normalized = (provider ?? '').trim().toLowerCase();
  if (normalized === 'lovable-managed' || normalized === 'lovable' || normalized === 'aura-managed') return 'aura-managed';
  if (normalized === 'nvidia' || normalized === 'nvidia-build' || normalized === 'nvidia-hosted') return 'nvidia-hosted';
  if (normalized === 'openai-compatible' || normalized === 'self-hosted' || normalized === 'private-compatible') return 'private-compatible';
  return 'unknown';
}
