import { describe, expect, it } from 'vitest';
import {
  LOVABLE_MODEL_IDS,
  ModelRouterError,
  NVIDIA_OPEN_MODEL_IDS,
  makeChatCompletion,
  normalizeProfile,
  providerReadiness,
  resolveModel,
} from './model-router';

const LOVABLE_ENV = { LOVABLE_API_KEY: 'test-lovable-key' };

describe('AURA model router', () => {
  it('keeps Lovable-managed inference as the backward-compatible default', () => {
    const resolved = resolveModel({ env: LOVABLE_ENV });
    expect(resolved.provider).toBe('lovable-managed');
    expect(resolved.profile).toBe('fast');
    expect(resolved.model).toBe(LOVABLE_MODEL_IDS.fast);
    expect(resolved.endpoint).toBe('https://ai.gateway.lovable.dev/v1/chat/completions');
  });

  it('maps known legacy model IDs to a profile rather than forwarding them blindly', () => {
    expect(normalizeProfile('gemini-1.5-pro')).toBe('reasoning');
    expect(normalizeProfile('google/gemini-2.5-flash')).toBe('fast');
    expect(normalizeProfile('nvidia/nemotron-3-super-120b-a12b')).toBe('supervisor');
  });

  it('rejects unknown marketplace/model IDs', () => {
    expect(() => normalizeProfile('vendor/unqualified-model')).toThrowError(ModelRouterError);
    try {
      normalizeProfile('vendor/unqualified-model');
    } catch (error) {
      expect(error).toMatchObject({ code: 'UNSUPPORTED_MODEL_ID', status: 400 });
    }
  });

  it('fails closed when NVIDIA is selected without credentials', () => {
    expect(() => resolveModel({ env: { AURA_AI_PROVIDER: 'nvidia' } })).toThrowError(
      /NVIDIA_API_KEY/,
    );
  });

  it('routes NVIDIA workhorse and supervisor profiles to the qualified open-model IDs', () => {
    const env = { AURA_AI_PROVIDER: 'nvidia', NVIDIA_API_KEY: 'test-nvidia-key' };
    expect(resolveModel({ profile: 'reasoning', env })).toMatchObject({
      provider: 'nvidia-build',
      model: NVIDIA_OPEN_MODEL_IDS.workhorse,
      endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    });
    expect(resolveModel({ profile: 'supervisor', env })).toMatchObject({
      provider: 'nvidia-build',
      model: NVIDIA_OPEN_MODEL_IDS.supervisor,
    });
  });

  it('does not accept arbitrary NVIDIA overrides', () => {
    expect(() => resolveModel({
      profile: 'reasoning',
      env: {
        AURA_AI_PROVIDER: 'nvidia',
        NVIDIA_API_KEY: 'test',
        AURA_MODEL_REASONING: 'nvidia/not-qualified',
      },
    })).toThrowError(/not in the qualified AURA allowlist/);
  });

  it('requires endpoint, key and explicit profile model for self-hosted OpenAI-compatible inference', () => {
    expect(() => resolveModel({ env: { AURA_AI_PROVIDER: 'openai-compatible' } })).toThrowError(
      /AURA_OPENAI_BASE_URL/,
    );
    const resolved = resolveModel({
      profile: 'reasoning',
      env: {
        AURA_AI_PROVIDER: 'openai-compatible',
        AURA_OPENAI_BASE_URL: 'http://inference.internal/v1/',
        AURA_OPENAI_API_KEY: 'local-key',
        AURA_MODEL_REASONING: 'self-hosted/reasoner',
      },
    });
    expect(resolved).toMatchObject({
      provider: 'openai-compatible',
      endpoint: 'http://inference.internal/v1/chat/completions',
      model: 'self-hosted/reasoner',
    });
  });

  it('returns provider/model evidence with the completion', async () => {
    let requestBody: unknown = null;
    const fetchImpl: typeof fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'grounded response' } }],
        usage: { total_tokens: 7 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const result = await makeChatCompletion(
      [{ role: 'user', content: 'hello' }],
      { env: LOVABLE_ENV, fetchImpl, profile: 'reasoning' },
    );

    expect(result).toMatchObject({
      text: 'grounded response',
      provider: 'lovable-managed',
      profile: 'reasoning',
      model: LOVABLE_MODEL_IDS.reasoning,
    });
    expect(requestBody).toMatchObject({ model: LOVABLE_MODEL_IDS.reasoning, stream: false });
  });

  it('reports NVIDIA readiness without claiming a deployed NVIDIA runtime', () => {
    const readiness = providerReadiness({ NVIDIA_API_KEY: 'configured' });
    expect(readiness.nvidia.configured).toBe(true);
    expect(readiness.nvidia.runtimeClaim).toMatch(/not proof/i);
  });
});
