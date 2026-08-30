import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Contract: /analytics (IntelligenceDashboard) must not surface unsupported
 * provider/vendor names or raw hardware/model identifiers in customer-facing
 * copy, and must keep its truthful unavailable/reference qualifiers.
 */
const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/pages/IntelligenceDashboard.tsx'),
  'utf8',
);

const FORBIDDEN_VENDOR_STRINGS = [
  'NVIDIA',
  'DGX',
  'SuperPOD',
  'SuperPod',
  'H100',
  'docs.nvidia.com',
  'OpenAI',
  'gemini-',
  'gpt-',
];

describe('analytics provider-neutrality contract', () => {
  it.each(FORBIDDEN_VENDOR_STRINGS)('does not render vendor string "%s"', (needle) => {
    expect(SOURCE.toLowerCase()).not.toContain(needle.toLowerCase());
  });

  it('uses neutral accelerated-compute vocabulary for zone labels', () => {
    expect(SOURCE).toContain('Accelerated Compute Pod A');
    expect(SOURCE).toContain('High-Density Compute Row 1');
  });

  it('preserves the truthful unavailable-state handling', () => {
    expect(SOURCE).toContain('unavailable: true');
    expect(SOURCE).toContain('const dataTrust: DataTrustState | null = null');
    expect(SOURCE).toContain('<DataTrustStrip state={dataTrust} />');
    expect(SOURCE).not.toContain("queryKey: ['ops-overview'");
  });

  it('keeps the reference band qualifier on accelerator utilisation', () => {
    expect(SOURCE).toContain('Target 70-90%');
    expect(SOURCE).toMatch(/reference architecture guidance/i);
  });
});
