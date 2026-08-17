import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en';
import frCA from '@/i18n/locales/fr-CA';

/**
 * Phase 10 - marketing copy truth pass.
 *
 * Localized strings are a public claim surface. They may not assert
 * certification, carbon neutrality, live telemetry or autonomous control,
 * because none of those are established (see complianceClaims.ts,
 * agentPositioning.ts and dataModeContract.ts).
 */
const PROHIBITED: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /\bcarbon[- ]neutral\b/i, why: 'no carbon-neutrality evidence' },
  { pattern: /\bcarboneutre\b/i, why: 'no carbon-neutrality evidence' },
  { pattern: /\bcertified (?:compliance|by industry)/i, why: 'no certification on file' },
  { pattern: /certifi[ée]s? \(OSFI/i, why: 'no certification on file' },
  { pattern: /\bCertified Templates\b/i, why: 'templates are not certified' },
  { pattern: /\bautonomous agents?\b/i, why: 'agents are advisory, human-approved' },
  { pattern: /\bagents autonomes\b/i, why: 'agents are advisory, human-approved' },
  { pattern: /\breal-?time telemetry\b/i, why: 'no live telemetry source is connected' },
  { pattern: /\bCanada-compliant\b/i, why: 'no legal opinion on file' },
];

function flatten(value: unknown, path: string, out: Array<[string, string]>) {
  if (typeof value === 'string') {
    out.push([path, value]);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flatten(child, path ? `${path}.${key}` : key, out);
    }
  }
}

describe.each([
  ['en', en],
  ['fr-CA', frCA],
])('%s marketing claims', (_locale, bundle) => {
  const entries: Array<[string, string]> = [];
  flatten(bundle, '', entries);

  it('has strings to check', () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it.each(PROHIBITED)('does not use $pattern ($why)', ({ pattern }) => {
    const hits = entries.filter(([, text]) => pattern.test(text)).map(([key]) => key);
    expect(hits).toEqual([]);
  });
});
