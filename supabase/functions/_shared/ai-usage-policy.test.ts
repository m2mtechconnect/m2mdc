import { describe, expect, it } from 'vitest';
import {
  AI_USAGE_OPERATIONS,
  classifyReservationFailure,
  normalizeTokenUsage,
  publicProviderClass,
} from './ai-usage-policy';

describe('AI usage policy helpers', () => {
  it('keeps every protected paid operation in the canonical vocabulary', () => {
    expect(AI_USAGE_OPERATIONS).toEqual([
      'agent_run',
      'agent_execute',
      'agent_stream',
      'agent_preview',
      'agent_suggestions',
      'model_test',
      'model_compare',
      'shadow_evaluation',
    ]);
  });

  it('normalizes OpenAI-compatible token usage without fabricating missing counts', () => {
    expect(normalizeTokenUsage({ prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 })).toMatchObject({
      inputTokens: 10,
      outputTokens: 4,
      totalTokens: 14,
    });
    expect(normalizeTokenUsage({ input_tokens: 3, output_tokens: 2 })).toMatchObject({
      inputTokens: 3,
      outputTokens: 2,
      totalTokens: 5,
    });
    expect(normalizeTokenUsage({})).toMatchObject({ inputTokens: null, outputTokens: null, totalTokens: null });
  });

  it('maps provider internals to white-label public classes', () => {
    expect(publicProviderClass('lovable-managed')).toBe('aura-managed');
    expect(publicProviderClass('nvidia-build')).toBe('nvidia-hosted');
    expect(publicProviderClass('openai-compatible')).toBe('private-compatible');
    expect(publicProviderClass('vendor-x')).toBe('unknown');
  });

  it('maps durable reservation failures to fail-closed public errors', () => {
    expect(classifyReservationFailure('AURA_AI_RATE_LIMIT_USER')).toMatchObject({ code: 'AI_RATE_LIMIT_USER', status: 429 });
    expect(classifyReservationFailure('AURA_AI_RATE_LIMIT_TENANT')).toMatchObject({ code: 'AI_RATE_LIMIT_TENANT', status: 429 });
    expect(classifyReservationFailure('AURA_AI_POLICY_MISSING')).toMatchObject({ code: 'AI_USAGE_POLICY_MISSING', status: 503 });
    expect(classifyReservationFailure('network error')).toMatchObject({ code: 'AI_USAGE_CONTROL_UNAVAILABLE', status: 503 });
  });
});
