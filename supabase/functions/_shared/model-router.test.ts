import { describe, expect, it } from 'vitest';
import {
  LOVABLE_MODEL_IDS,
  ModelRouterError,
  NVIDIA_OPEN_MODEL_IDS,
  makeChatCompletion,
  normalizeProfile,
  profileForAgent,
  providerReadiness,
  resolveModel,
} from './model-router';

const AURA_MANAGED_ENV = { LOVABLE_API_KEY: 'test-managed-key' };

describe('AURA model router', () => {
  it('keeps the managed inference implementation behind a white-label provider name', () => {
    const resolved = resolveModel({ env: AURA_MANAGED_ENV });
    expect(resolved.provider).toBe('aura-managed');
    expect(resolved.profile).toBe('fast');
    expect(resolved.model).toBe(LOVABLE_MODEL_IDS.fast);
    expect(resolved.endpoint).toBe('https://ai.gateway.lovable.dev/v1/chat/completions');
  });

  it('maps provider-neutral and known legacy IDs to compute profiles', () => {
    expect(normalizeProfile('profile:fast')).toBe('fast');
    expect(normalizeProfile('profile:reasoning')).toBe('reasoning');
    expect(normalizeProfile('profile:supervisor')).toBe('supervisor');
    expect(normalizeProfile('gemini-1.5-pro')).toBe('reasoning');
    expect(normalizeProfile('google/gemini-2.5-flash')).toBe('fast');
    expect(normalizeProfile('nvidia/nemotron-3-super-120b-a12b')).toBe('supervisor');
  });

  it('routes agent roles to compute profiles without granting authority', () => {
    expect(profileForAgent({ slug: 'thermal-guardian' })).toBe('fast');
    expect(profileForAgent({ slug: 'sovereignty-sentinel' })).toBe('reasoning');
    expect(profileForAgent({ slug: 'cybersecurity-identity' })).toBe('reasoning');
    expect(profileForAgent({ slug: 'twin-integrity-data-quality' })).toBe('reasoning');
    expect(profileForAgent({ slug: 'incident-response' })).toBe('supervisor');
    expect(profileForAgent({ slug: 'incident-response', config: { model_profile: 'fast' } })).toBe('fast');
  });

  it('rejects unknown marketplace/model IDs', () => {
    expect(() => normalizeProfile('vendor/unqualified-model')).toThrowError(ModelRouterError);
    try {
      normalizeProfile('vendor/unqualified-model');
    } catch (error) {
      expect(error).toMatchObject({ code: 'UNSUPPORTED_MODEL_ID', status: 400 });
    }
  });

  it('never substitutes the managed provider for an explicit NVIDIA model request', () => {
    try {
      resolveModel({ requestedModel: NVIDIA_OPEN_MODEL_IDS.workhorse, env: AURA_MANAGED_ENV });
      throw new Error('expected mismatch');
    } catch (error) {
      expect(error).toMatchObject({ code: 'MODEL_PROVIDER_MISMATCH', status: 409 });
    }
  });

  it('fails closed when NVIDIA is selected without credentials', () => {
    expect(() => resolveModel({ env: { AURA_AI_PROVIDER: 'nvidia' } })).toThrowError(/server credential/);
  });

  it('routes NVIDIA workhorse and supervisor profiles to qualified IDs', () => {
    const env = { AURA_AI_PROVIDER: 'nvidia', NVIDIA_API_KEY: 'test-nvidia-key' };
    expect(resolveModel({ requestedModel: NVIDIA_OPEN_MODEL_IDS.workhorse, env })).toMatchObject({
      provider: 'nvidia-hosted',
      model: NVIDIA_OPEN_MODEL_IDS.workhorse,
      endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    });
    expect(resolveModel({ requestedModel: NVIDIA_OPEN_MODEL_IDS.supervisor, env })).toMatchObject({
      provider: 'nvidia-hosted',
      model: NVIDIA_OPEN_MODEL_IDS.supervisor,
      profile: 'supervisor',
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
    })).toThrowError(/qualified AURA allowlist/);
  });

  it('requires endpoint, key and explicit profile model for private-compatible inference', () => {
    expect(() => resolveModel({ env: { AURA_AI_PROVIDER: 'openai-compatible' } })).toThrowError(/server-side endpoint/);
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
      provider: 'private-compatible',
      endpoint: 'http://inference.internal/v1/chat/completions',
      model: 'self-hosted/reasoner',
    });
  });

  it('requires explicit NVIDIA model requests to match private profile configuration', () => {
    expect(() => resolveModel({
      requestedModel: NVIDIA_OPEN_MODEL_IDS.workhorse,
      env: {
        AURA_AI_PROVIDER: 'openai-compatible',
        AURA_OPENAI_BASE_URL: 'http://inference.internal/v1',
        AURA_OPENAI_API_KEY: 'key',
        AURA_MODEL_REASONING: 'self-hosted/other-model',
      },
    })).toThrowError(/not the configured model/);
  });

  it('returns white-label-safe provider/model evidence with completions', async () => {
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
      { env: AURA_MANAGED_ENV, fetchImpl, profile: 'reasoning' },
    );
    expect(result).toMatchObject({
      text: 'grounded response',
      provider: 'aura-managed',
      profile: 'reasoning',
      model: LOVABLE_MODEL_IDS.reasoning,
    });
    expect(requestBody).toMatchObject({ model: LOVABLE_MODEL_IDS.reasoning, stream: false });
  });

  it('reports readiness without exposing implementation endpoints or Lovable branding', () => {
    const readiness = providerReadiness({ LOVABLE_API_KEY: 'managed', NVIDIA_API_KEY: 'configured' });
    expect(readiness.selectedProvider).toBe('aura-managed');
    expect(readiness.auraManaged.configured).toBe(true);
    expect(readiness.nvidia.configured).toBe(true);
    expect(readiness.nvidia.runtimeClaim).toMatch(/not proof/i);
    expect(readiness).not.toHaveProperty('lovable');
    expect(readiness.nvidia).not.toHaveProperty('endpoint');
    expect(readiness.privateCompatible).not.toHaveProperty('endpoint');
  });
});
