/**
 * Customer-facing capability labels for managed AI models.
 *
 * Stored values stay untouched (backend compatibility); only the wording shown
 * in the UI is provider neutral. Unknown values fall back to a generic label so
 * a raw provider/model identifier can never leak into reachable copy.
 */

const MODEL_LABELS: Record<string, string> = {
  'google/gemini-3-pro-preview': 'Advanced (preview)',
  'google/gemini-2.5-pro': 'Balanced',
  'google/gemini-2.5-flash': 'Fast',
  'google/gemini-2.5-flash-lite': 'Fast (lightweight)',
  'gemini-1.5-pro': 'Balanced',
  'gemini-1.5-flash': 'Fast',
  'openai/gpt-5': 'Advanced',
  'openai/gpt-5-mini': 'Fast (alternate)',
  'openai/gpt-5-nano': 'Fast (lightweight, alternate)',
  'anthropic/claude-sonnet-4-5': 'Advanced (alternate)',
  'anthropic/claude-opus-4': 'Advanced (research, alternate)',
  'anthropic/claude-haiku-3-5': 'Fast (alternate)',
  'deepseek/deepseek-v3': 'Balanced (alternate)',
  'deepseek/deepseek-coder': 'Code specialist',
  'cohere/command-r-plus': 'Retrieval optimised',
  'cohere/command-r': 'Retrieval optimised (compact)',
  'mistral/mistral-large-2': 'Advanced (alternate)',
  'mistral/mistral-small': 'Fast (alternate)',
  'mistral/codestral': 'Code specialist',
  'huggingface/llama-3.3-70b': 'Balanced (open weights)',
  'huggingface/mixtral-8x7b': 'Fast (open weights)',
};

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Managed AI (primary)',
  openai: 'Managed AI (alternate)',
  anthropic: 'Managed AI (alternate)',
  deepseek: 'Managed AI (alternate)',
  cohere: 'Managed AI (alternate)',
  mistral: 'Managed AI (alternate)',
  'hugging face': 'Managed AI (open weights)',
  huggingface: 'Managed AI (open weights)',
};

export function modelDisplayLabel(value: string | null | undefined): string {
  if (!value) return 'Managed AI';
  return MODEL_LABELS[value] ?? 'Managed AI';
}

export function providerDisplayLabel(value: string | null | undefined): string {
  if (!value) return 'Managed AI';
  return PROVIDER_LABELS[value.trim().toLowerCase()] ?? 'Managed AI';
}

/**
 * Neutral, capability-oriented description built from catalogue metadata so no
 * vendor marketing copy or product name is rendered to customers.
 */
export function modelCapabilityDescription(input: {
  speed?: string | null;
  capabilities?: string[] | null;
} | null | undefined): string {
  const speed = input?.speed;
  const tempo =
    speed === 'fast' ? 'Low-latency' : speed === 'slow' ? 'Deep-reasoning' : 'Balanced';
  const capabilities = (input?.capabilities ?? []).slice(0, 3);
  if (capabilities.length === 0) {
    return `${tempo} managed AI capability.`;
  }
  return `${tempo} managed AI capability for ${capabilities.join(', ').toLowerCase()}.`;
}
