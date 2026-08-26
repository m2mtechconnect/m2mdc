/**
 * Managed AI response profiles.
 *
 * The browser contract exposes ONLY these stable, provider-neutral profiles.
 * Raw provider IDs, raw model IDs, cloud projects, regions, and credentials
 * are resolved server-side and must never be exposed to or persisted from
 * the browser on new writes.
 */

export const RESPONSE_PROFILES = ['balanced', 'fast', 'reasoning'] as const;

export type ResponseProfile = (typeof RESPONSE_PROFILES)[number];

/** New Builder drafts default to the balanced profile. */
export const DEFAULT_RESPONSE_PROFILE: ResponseProfile = 'balanced';

export const RESPONSE_PROFILE_LABELS: Record<ResponseProfile, string> = {
  balanced: 'Balanced (default)',
  fast: 'Fast (lower latency)',
  reasoning: 'Reasoning (deeper analysis)',
};

export const RESPONSE_PROFILE_DESCRIPTIONS: Record<ResponseProfile, string> = {
  balanced: 'General-purpose quality and latency for everyday operations.',
  fast: 'Optimized for low-latency answers and high-frequency checks.',
  reasoning: 'Optimized for deeper multi-step analysis and planning.',
};

export function isResponseProfile(value: unknown): value is ResponseProfile {
  return typeof value === 'string' && (RESPONSE_PROFILES as readonly string[]).includes(value);
}

export function responseProfileLabel(value: unknown): string {
  return isResponseProfile(value) ? RESPONSE_PROFILE_LABELS[value] : RESPONSE_PROFILE_LABELS[DEFAULT_RESPONSE_PROFILE];
}
