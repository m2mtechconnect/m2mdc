/**
 * Canonical AURA model/provider router.
 * Agent roles select compute profiles; providers select executable models.
 */
export type AgentModelProfile = 'fast' | 'reasoning' | 'supervisor';
export type AgentModelProvider = 'lovable-managed' | 'nvidia-build' | 'openai-compatible';

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RouterEnvironment {
  AURA_AI_PROVIDER?: string;
  LOVABLE_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  NVIDIA_API_BASE_URL?: string;
  AURA_OPENAI_BASE_URL?: string;
  AURA_OPENAI_API_KEY?: string;
  AURA_MODEL_FAST?: string;
  AURA_MODEL_REASONING?: string;
  AURA_MODEL_SUPERVISOR?: string;
}

export interface ResolvedModel {
  provider: AgentModelProvider;
  profile: AgentModelProfile;
  model: string;
  endpoint: string;
  apiKey: string;
  configured: true;
}

export class ModelRouterError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = 'ModelRouterError';
  }
}

const PROFILE_ALIASES: Record<string, AgentModelProfile> = {
  'profile:fast': 'fast',
  'profile:reasoning': 'reasoning',
  'profile:supervisor': 'supervisor',
  'google/gemini-2.5-flash': 'fast',
  'google/gemini-2.5-flash-lite': 'fast',
  'google/gemini-2.5-pro': 'reasoning',
  'google/gemini-3-pro-preview': 'reasoning',
  'google/gemini-3.0-pro': 'reasoning',
  'gemini-1.5-pro': 'reasoning',
  'google/gemini-1.5-pro': 'reasoning',
  'gemini-1.5-flash': 'fast',
  'google/gemini-1.5-flash': 'fast',
  'nvidia/nemotron-3.5-lightning-30b-a3b': 'reasoning',
  'nvidia/nemotron-3.5-lightning-30b-a3b-nvfp4': 'reasoning',
  'nvidia/nemotron-3-super-120b-a12b': 'supervisor',
};

export const NVIDIA_OPEN_MODEL_IDS = {
  workhorse: 'nvidia/nemotron-3.5-lightning-30b-a3b',
  supervisor: 'nvidia/nemotron-3-super-120b-a12b',
} as const;

export const LOVABLE_MODEL_IDS = {
  fast: 'google/gemini-2.5-flash',
  reasoning: 'google/gemini-3-pro-preview',
  supervisor: 'google/gemini-3-pro-preview',
} as const;

function runtimeEnv(): RouterEnvironment {
  const deno = (globalThis as { Deno?: { env?: { get?: (key: string) => string | undefined } } }).Deno;
  const get = (key: keyof RouterEnvironment) => deno?.env?.get?.(key);
  return {
    AURA_AI_PROVIDER: get('AURA_AI_PROVIDER'),
    LOVABLE_API_KEY: get('LOVABLE_API_KEY'),
    NVIDIA_API_KEY: get('NVIDIA_API_KEY'),
    NVIDIA_API_BASE_URL: get('NVIDIA_API_BASE_URL'),
    AURA_OPENAI_BASE_URL: get('AURA_OPENAI_BASE_URL'),
    AURA_OPENAI_API_KEY: get('AURA_OPENAI_API_KEY'),
    AURA_MODEL_FAST: get('AURA_MODEL_FAST'),
    AURA_MODEL_REASONING: get('AURA_MODEL_REASONING'),
    AURA_MODEL_SUPERVISOR: get('AURA_MODEL_SUPERVISOR'),
  };
}

export function normalizeProfile(
  requestedModel?: string | null,
  requestedProfile?: AgentModelProfile | null,
): AgentModelProfile {
  if (requestedModel) {
    const normalized = requestedModel.trim().toLowerCase();
    const alias = PROFILE_ALIASES[normalized];
    if (!alias) {
      throw new ModelRouterError('UNSUPPORTED_MODEL_ID', `Model '${requestedModel}' is not in the AURA runtime allowlist`, 400);
    }
    return alias;
  }
  return requestedProfile ?? 'fast';
}

export function profileForAgent(agent: {
  slug?: string | null;
  name?: string | null;
  domain?: string | null;
  config?: Record<string, unknown> | null;
}): AgentModelProfile {
  const configured = agent.config?.model_profile;
  if (configured === 'fast' || configured === 'reasoning' || configured === 'supervisor') return configured;
  const identity = `${agent.slug ?? ''} ${agent.name ?? ''} ${agent.domain ?? ''}`.toLowerCase();
  if (/incident[-_ ]response|major[-_ ]incident|supervisor/.test(identity)) return 'supervisor';
  if (/sovereig|cyber|security|twin[-_ ]integrity|data[-_ ]quality|compliance/.test(identity)) return 'reasoning';
  return 'fast';
}

function requestedVendor(requestedId: string | null): 'portable' | 'google' | 'nvidia' | null {
  if (!requestedId) return null;
  if (requestedId.startsWith('profile:')) return 'portable';
  if (requestedId.startsWith('nvidia/')) return 'nvidia';
  if (requestedId.startsWith('google/') || requestedId.startsWith('gemini-')) return 'google';
  return null;
}

function chatEndpoint(base: string): string {
  const trimmed = base.replace(/\/+$/, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

function configuredModelForProfile(profile: AgentModelProfile, env: RouterEnvironment): string | undefined {
  if (profile === 'fast') return env.AURA_MODEL_FAST;
  if (profile === 'reasoning') return env.AURA_MODEL_REASONING;
  return env.AURA_MODEL_SUPERVISOR;
}

export function resolveModel(
  options: { requestedModel?: string | null; profile?: AgentModelProfile | null; env?: RouterEnvironment } = {},
): ResolvedModel {
  const env = options.env ?? runtimeEnv();
  const requestedId = options.requestedModel?.trim().toLowerCase() || null;
  const vendor = requestedVendor(requestedId);
  const profile = normalizeProfile(options.requestedModel, options.profile);
  const providerName = (env.AURA_AI_PROVIDER ?? 'lovable-managed').trim().toLowerCase();

  if (vendor === 'google' && providerName !== 'lovable-managed' && providerName !== 'lovable') {
    throw new ModelRouterError(
      'MODEL_PROVIDER_MISMATCH',
      `Google model '${options.requestedModel}' requires the Lovable-managed provider. Use 'profile:${profile}' for a provider-neutral selection.`,
      409,
    );
  }

  if (
    vendor === 'nvidia' &&
    providerName !== 'nvidia' &&
    providerName !== 'nvidia-build' &&
    providerName !== 'openai-compatible' &&
    providerName !== 'self-hosted'
  ) {
    throw new ModelRouterError(
      'MODEL_PROVIDER_MISMATCH',
      `NVIDIA model '${options.requestedModel}' requires NVIDIA or an explicitly configured OpenAI-compatible provider`,
      409,
    );
  }

  if (providerName === 'nvidia' || providerName === 'nvidia-build') {
    const apiKey = env.NVIDIA_API_KEY?.trim();
    if (!apiKey) {
      throw new ModelRouterError('NVIDIA_PROVIDER_NOT_CONFIGURED', 'NVIDIA provider was selected but NVIDIA_API_KEY is not configured');
    }
    const configured = configuredModelForProfile(profile, env);
    const model = configured ?? (profile === 'supervisor' ? NVIDIA_OPEN_MODEL_IDS.supervisor : NVIDIA_OPEN_MODEL_IDS.workhorse);
    if (!Object.values(NVIDIA_OPEN_MODEL_IDS).includes(model as typeof NVIDIA_OPEN_MODEL_IDS[keyof typeof NVIDIA_OPEN_MODEL_IDS])) {
      throw new ModelRouterError('UNSUPPORTED_NVIDIA_MODEL', `Configured NVIDIA model '${model}' is not in the qualified AURA allowlist`, 400);
    }
    if (vendor === 'nvidia' && requestedId !== model.toLowerCase()) {
      throw new ModelRouterError(
        'MODEL_NOT_CONFIGURED_ON_PROVIDER',
        `Requested NVIDIA model '${options.requestedModel}' is not the configured model for '${profile}'`,
        409,
      );
    }
    return {
      provider: 'nvidia-build',
      profile,
      model,
      endpoint: chatEndpoint(env.NVIDIA_API_BASE_URL?.trim() || 'https://integrate.api.nvidia.com/v1'),
      apiKey,
      configured: true,
    };
  }

  if (providerName === 'openai-compatible' || providerName === 'self-hosted') {
    const endpoint = env.AURA_OPENAI_BASE_URL?.trim();
    const apiKey = env.AURA_OPENAI_API_KEY?.trim();
    if (!endpoint || !apiKey) {
      throw new ModelRouterError(
        'OPENAI_COMPATIBLE_PROVIDER_NOT_CONFIGURED',
        'OpenAI-compatible provider requires AURA_OPENAI_BASE_URL and AURA_OPENAI_API_KEY',
      );
    }
    const model = configuredModelForProfile(profile, env);
    if (!model) {
      throw new ModelRouterError('OPENAI_COMPATIBLE_MODEL_REQUIRED', `A model must be configured for profile '${profile}'`);
    }
    if (vendor === 'nvidia' && requestedId !== model.toLowerCase()) {
      throw new ModelRouterError(
        'MODEL_NOT_CONFIGURED_ON_PROVIDER',
        `Requested NVIDIA model '${options.requestedModel}' is not the configured model for '${profile}'`,
        409,
      );
    }
    return {
      provider: 'openai-compatible',
      profile,
      model,
      endpoint: chatEndpoint(endpoint),
      apiKey,
      configured: true,
    };
  }

  if (providerName !== 'lovable-managed' && providerName !== 'lovable') {
    throw new ModelRouterError('UNSUPPORTED_AI_PROVIDER', `AI provider '${providerName}' is not supported`, 400);
  }
  const apiKey = env.LOVABLE_API_KEY?.trim();
  if (!apiKey) {
    throw new ModelRouterError('LOVABLE_PROVIDER_NOT_CONFIGURED', 'Lovable-managed provider is selected but LOVABLE_API_KEY is not configured');
  }
  const model = configuredModelForProfile(profile, env) ?? LOVABLE_MODEL_IDS[profile];
  if (!PROFILE_ALIASES[model.toLowerCase()] || model.toLowerCase().startsWith('nvidia/')) {
    throw new ModelRouterError('UNSUPPORTED_LOVABLE_MODEL', `Configured Lovable model '${model}' is not in the Lovable AURA allowlist`, 400);
  }
  return {
    provider: 'lovable-managed',
    profile,
    model,
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    apiKey,
    configured: true,
  };
}

export interface ChatCompletionOptions {
  requestedModel?: string | null;
  profile?: AgentModelProfile;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  env?: RouterEnvironment;
  fetchImpl?: typeof fetch;
}

export async function requestChatCompletion(
  messages: ModelMessage[],
  options: ChatCompletionOptions = {},
): Promise<{ response: Response; resolved: ResolvedModel }> {
  const resolved = resolveModel(options);
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(resolved.endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${resolved.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: resolved.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
      stream: options.stream ?? false,
    }),
  });
  return { response, resolved };
}

export interface ChatCompletionResult {
  text: string;
  provider: AgentModelProvider;
  profile: AgentModelProfile;
  model: string;
  usage: unknown;
}

export async function makeChatCompletion(
  messages: ModelMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult> {
  const { response, resolved } = await requestChatCompletion(messages, { ...options, stream: false });
  if (!response.ok) {
    throw new ModelRouterError(
      'MODEL_PROVIDER_ERROR',
      `${resolved.provider} model request failed with HTTP ${response.status}`,
      response.status === 429 ? 429 : 502,
    );
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: unknown };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new ModelRouterError('INVALID_MODEL_RESPONSE', 'Model provider returned no assistant content', 502);
  return { text, provider: resolved.provider, profile: resolved.profile, model: resolved.model, usage: payload.usage ?? null };
}

export function providerReadiness(env: RouterEnvironment = runtimeEnv()) {
  const selected = (env.AURA_AI_PROVIDER ?? 'lovable-managed').trim().toLowerCase();
  return {
    selectedProvider: selected,
    lovable: { configured: Boolean(env.LOVABLE_API_KEY?.trim()) },
    nvidia: {
      configured: Boolean(env.NVIDIA_API_KEY?.trim()),
      endpoint: env.NVIDIA_API_BASE_URL?.trim() || 'https://integrate.api.nvidia.com/v1',
      models: NVIDIA_OPEN_MODEL_IDS,
      runtimeClaim: 'Configured endpoint only; not proof of self-hosted NIM/NeMo/TensorRT-LLM execution',
    },
    openaiCompatible: {
      configured: Boolean(env.AURA_OPENAI_BASE_URL?.trim() && env.AURA_OPENAI_API_KEY?.trim()),
      endpoint: env.AURA_OPENAI_BASE_URL?.trim() || null,
    },
  };
}
