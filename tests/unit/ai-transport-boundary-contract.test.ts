import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const adapter = read('supabase/functions/_shared/ai-client.ts');
const copilot = read('supabase/functions/copilot-stream/index.ts');
const langgraph = read('supabase/functions/langgraph-run/index.ts');
const aiConfig = read('supabase/functions/ai-config/index.ts');
const modelsTest = read('supabase/functions/models-test/index.ts');
const packageManifest = read('package.json');

const walkTypeScript = (directory: string): string[] => readdirSync(directory)
  .flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? walkTypeScript(path)
      : path.endsWith('.ts') ? [path] : [];
  });

const functionSources = walkTypeScript('supabase/functions')
  .map((path) => ({ path: relative('.', path).replaceAll('\\', '/'), source: read(path) }));

describe('AURA managed AI transport boundary', () => {
  it('keeps provider endpoint and credential ownership in the shared server adapter', () => {
    expect(adapter).toContain("Deno.env.get('LOVABLE_API_KEY')");
    expect(adapter).toContain('https://ai.gateway.lovable.dev/v1/chat/completions');
    expect(adapter).toContain('makeAIStreamingCompletion');

    const directEndpointOwners = functionSources
      .filter(({ source }) => source.includes('ai.gateway.lovable.dev'))
      .map(({ path }) => path);
    expect(directEndpointOwners).toEqual(['supabase/functions/_shared/ai-client.ts']);

    const allowedPlatformCredentialOwners = new Set([
      'supabase/functions/_shared/ai-client.ts',
      // Managed connector authorization is a separate platform credential
      // boundary; it does not invoke the AI completion endpoint.
      'supabase/functions/_shared/appUserConnector.ts',
      'supabase/functions/managed-connector-invoke/index.ts',
      'supabase/functions/managed-connector-verify/index.ts',
    ]);
    const directCredentialOwners = functionSources
      .filter(({ source }) => source.includes("Deno.env.get('LOVABLE_API_KEY')"))
      .map(({ path }) => path);
    expect(directCredentialOwners.every((path) => allowedPlatformCredentialOwners.has(path))).toBe(true);

    for (const caller of [copilot, langgraph]) {
      expect(caller).toContain('makeAIStreamingCompletion');
      expect(caller).not.toContain('ai.gateway.lovable.dev');
      expect(caller).not.toContain("Deno.env.get('LOVABLE_API_KEY')");
    }
  });

  it('allows callers to choose only a server-owned profile, not an endpoint, key or raw model id', () => {
    const callerOptions = adapter.match(/export interface ManagedAIResponseOptions \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(adapter).toContain("export type AICanonicalTextProfile = 'reasoning' | 'balanced' | 'fast' | 'fallback'");
    expect(adapter).toContain('export type AITextProfile = AICanonicalTextProfile | AICompatibilityTextProfile');
    expect(callerOptions).toContain('model?: AITextProfile');
    expect(callerOptions).not.toMatch(/endpoint\??:\s*string/);
    expect(callerOptions).not.toMatch(/apiKey\??:\s*string/);
    expect(copilot).toContain("model: 'primary'");
    expect(langgraph).toContain("model: 'compatibilityFast'");
  });

  it('keeps API capability labels aligned with canonical runtime profiles', () => {
    for (const profile of ['reasoning', 'balanced', 'fast']) {
      expect(aiConfig).toContain(`id: '${profile}'`);
      expect(modelsTest).toContain(`${profile}: '${profile}'`);
    }
    expect(aiConfig).not.toContain("id: 'advanced'");
  });

  it('preserves the deterministic truth path before the managed model path', () => {
    const truthIdx = copilot.indexOf('classifyTruthQuery(query');
    const modelIdx = copilot.indexOf('makeAIStreamingCompletion(');
    expect(truthIdx).toBeGreaterThan(-1);
    expect(modelIdx).toBeGreaterThan(truthIdx);
    expect(copilot).toContain("resolveModelPolicy('truth-grounding')");
    expect(copilot).toContain("resolveModelPolicy('general-assistant')");
  });

  it('does not add OpenRouter or FastAPI as runtime dependencies', () => {
    expect(packageManifest.toLowerCase()).not.toContain('openrouter');
    expect(packageManifest.toLowerCase()).not.toContain('fastapi');
  });
});

describe('AURA managed AI streaming adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.stubGlobal('Deno', {
      env: {
        get: vi.fn((name: string) => name === 'LOVABLE_API_KEY' ? 'server-secret' : undefined),
      },
    });
  });

  it('uses the server-owned profile, credential and streaming contract', async () => {
    const upstream = new Response('data: [DONE]\n\n', { status: 200 });
    const fetchMock = vi.fn(async () => upstream);
    vi.stubGlobal('fetch', fetchMock);

    const { makeAIStreamingCompletion } = await import('../../supabase/functions/_shared/ai-client');
    const response = await makeAIStreamingCompletion(
      [{ role: 'user', content: 'hello' }],
      { model: 'compatibilityFast', temperature: 0.2, maxTokens: 99 },
    );

    expect(response).toBe(upstream);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe('https://ai.gateway.lovable.dev/v1/chat/completions');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer server-secret');
    expect(new Headers(init.headers).get('X-AURA-AI-Request-ID')).toBeTruthy();
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'google/gemini-2.5-flash',
      temperature: 0.2,
      max_tokens: 99,
      stream: true,
    });
  });

  it('forwards governed tool options and records safe request evidence', async () => {
    const upstream = new Response(JSON.stringify({ choices: [] }), { status: 200 });
    const fetchMock = vi.fn(async () => upstream);
    vi.stubGlobal('fetch', fetchMock);
    const { getAIResponseEvidence, makeAIResponse } = await import('../../supabase/functions/_shared/ai-client');

    const response = await makeAIResponse({
      messages: [{ role: 'user', content: 'hello' }],
      responseFormat: { type: 'json_object' },
      tools: [{ type: 'function', function: { name: 'lookup' } }],
      toolChoice: 'auto',
    }, { model: 'balanced', operation: 'boundary-contract' });

    expect(response).toBe(upstream);
    expect(getAIResponseEvidence(response)).toMatchObject({
      operation: 'boundary-contract',
      profile: 'balanced',
      model: 'google/gemini-2.5-pro',
      statusCode: 200,
    });
    const requestBody = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(requestBody).toMatchObject({
      response_format: { type: 'json_object' },
      tools: [{ type: 'function', function: { name: 'lookup' } }],
      tool_choice: 'auto',
    });
    expect(requestBody).not.toHaveProperty('temperature');
    expect(requestBody).not.toHaveProperty('max_tokens');
  });

  it('sanitizes provider failure bodies at the low-level boundary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('sensitive upstream detail', { status: 503 })));
    const { makeAIResponse } = await import('../../supabase/functions/_shared/ai-client');

    const response = await makeAIResponse(
      { messages: [{ role: 'user', content: 'hello' }] },
      { operation: 'sanitized-failure' },
    );

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('sensitive upstream detail');
    expect(response.headers.get('X-AURA-AI-Request-ID')).toBeTruthy();
  });

  it('fails closed without exposing provider response details to the caller', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('sensitive upstream detail', { status: 429 })));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { AIProviderRequestError, makeAIStreamingCompletion } = await import('../../supabase/functions/_shared/ai-client');

    await expect(makeAIStreamingCompletion([{ role: 'user', content: 'hello' }]))
      .rejects.toMatchObject({ name: 'AIProviderRequestError', status: 429 });
    await expect(makeAIStreamingCompletion([{ role: 'user', content: 'hello' }]))
      .rejects.not.toThrow('sensitive upstream detail');

    expect(errorSpy).toHaveBeenCalled();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('sensitive upstream detail');
    expect(AIProviderRequestError.name).toBe('AIProviderRequestError');
    errorSpy.mockRestore();
  });
});
