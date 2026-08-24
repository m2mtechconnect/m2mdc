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
};

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Managed AI (primary)',
  openai: 'Managed AI (alternate)',
  anthropic: 'Managed AI (alternate)',
};

export function modelDisplayLabel(value: string | null | undefined): string {
  if (!value) return 'Managed AI';
  return MODEL_LABELS[value] ?? 'Managed AI';
}

export function providerDisplayLabel(value: string | null | undefined): string {
  if (!value) return 'Managed AI';
  return PROVIDER_LABELS[value] ?? 'Managed AI';
}
