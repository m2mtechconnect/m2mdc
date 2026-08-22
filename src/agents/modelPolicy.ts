export type ModelRuntimeStatus = 'runtime-supported' | 'requires-provider' | 'catalog-only';

export interface AiProviderReadiness {
  selectedProvider?: string | null;
  nvidia?: { configured?: boolean } | null;
  lovable?: { configured?: boolean } | null;
  openaiCompatible?: { configured?: boolean } | null;
}

export const AURA_MODEL_PROFILES = [
  {
    id: 'profile:fast',
    name: 'AURA Fast',
    provider: 'AURA',
    description: 'Provider-neutral profile for routine classification, summarization and subsystem explanations.',
    capabilities: ['Text', 'Fast responses', 'Agent advisory'],
  },
  {
    id: 'profile:reasoning',
    name: 'AURA Reasoning',
    provider: 'AURA',
    description: 'Provider-neutral profile for evidence-heavy analysis, compliance and multi-step reasoning.',
    capabilities: ['Text', 'Reasoning', 'RAG', 'Agent advisory'],
  },
  {
    id: 'profile:supervisor',
    name: 'AURA Supervisor',
    provider: 'AURA',
    description: 'Provider-neutral escalation profile for cross-domain incident coordination and complex planning.',
    capabilities: ['Text', 'Advanced reasoning', 'Cross-domain planning'],
  },
] as const;

export const NVIDIA_AGENT_MODELS = [
  {
    id: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    name: 'Nemotron 3.5 Lightning 30B-A3B',
    provider: 'NVIDIA',
    description: 'Open NVIDIA reasoning model profile for long-running agents and sub-agent workloads.',
    capabilities: ['Text', 'Reasoning', 'Tool use', 'Open weights'],
    profile: 'reasoning',
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b',
    name: 'Nemotron 3 Super 120B-A12B',
    provider: 'NVIDIA',
    description: 'Higher-capacity NVIDIA supervisor profile for complex cross-domain reasoning and escalation.',
    capabilities: ['Text', 'Advanced reasoning', 'Tool use', 'Planning'],
    profile: 'supervisor',
  },
] as const;

const LEGACY_RUNTIME_IDS = new Set([
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-pro',
  'google/gemini-3-pro-preview',
  'google/gemini-3.0-pro',
  'gemini-1.5-pro',
  'google/gemini-1.5-pro',
  'gemini-1.5-flash',
  'google/gemini-1.5-flash',
]);

export function runtimeStatusForModel(
  modelId: string,
  readiness?: AiProviderReadiness | null,
): ModelRuntimeStatus {
  const id = modelId.trim().toLowerCase();
  if (id.startsWith('profile:')) return 'runtime-supported';
  if (LEGACY_RUNTIME_IDS.has(id)) return 'runtime-supported';

  if (id.startsWith('nvidia/')) {
    const provider = readiness?.selectedProvider?.trim().toLowerCase();
    if ((provider === 'nvidia' || provider === 'nvidia-build') && readiness?.nvidia?.configured) {
      return 'runtime-supported';
    }
    if ((provider === 'openai-compatible' || provider === 'self-hosted') && readiness?.openaiCompatible?.configured) {
      // The backend router remains authoritative and will still require the
      // selected NVIDIA ID to equal the configured model for that profile.
      return 'runtime-supported';
    }
    return 'requires-provider';
  }

  return 'catalog-only';
}

export function modelCanBeSelected(
  modelId: string,
  readiness?: AiProviderReadiness | null,
): boolean {
  return runtimeStatusForModel(modelId, readiness) === 'runtime-supported';
}

/**
 * Preserve unrelated agent configuration when a model/profile is selected.
 * This closes the previous bug where changing a model replaced the whole JSON
 * config and could erase system prompts, runtime limits and tool settings.
 */
export function mergeAgentModelConfig(
  existing: unknown,
  selection: { model: string; ragSettings?: unknown },
): Record<string, unknown> {
  const base = existing && typeof existing === 'object' && !Array.isArray(existing)
    ? { ...(existing as Record<string, unknown>) }
    : {};
  return {
    ...base,
    model: selection.model,
    ...(selection.ragSettings === undefined ? {} : { ragSettings: selection.ragSettings }),
  };
}
