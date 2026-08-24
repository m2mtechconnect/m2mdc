/**
 * P0 contract — /compliance route guard + audit-timeline truth qualifier.
 *
 * Two regressions this locks out:
 *   1. /compliance was mounted with no permission guard, so any authenticated
 *      caller reached a sovereignty/compliance surface by typing the URL.
 *   2. `auditTimeline` in Compliance.tsx is a hardcoded fixture. It must never
 *      render without an explicit demo/reference provenance qualifier.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const shell = read('src/AuthenticatedShell.tsx');
const compliance = read('src/pages/Compliance.tsx');
const guard = read('src/routing/PermissionRouteGuard.tsx');

describe('/compliance route guard', () => {
  it('is wrapped in PermissionRouteGuard with analytics.view', () => {
    const route = shell
      .split('\n')
      .find((line) => line.includes('path="/compliance"'));
    expect(route).toBeDefined();
    expect(route).toContain('PermissionRouteGuard');
    expect(route).toContain('permission="analytics.view"');
  });

  it('is never mounted bare', () => {
    expect(shell).not.toMatch(/path="\/compliance"\s+element=\{<Compliance\s*\/>\}/);
  });

  it('fails closed on loading, pilot plane and missing permission', () => {
    expect(guard).toContain("resolution.status === 'loading'");
    expect(guard).toContain("resolution.status === 'pilot' || !can(permission)");
    expect(guard).toContain('<Navigate to="/dashboard" replace />');
  });
});

describe('Compliance audit timeline truth qualifier', () => {
  it('declares a demo provenance meta for the hardcoded fixture', () => {
    expect(compliance).toContain('AUDIT_TIMELINE_PROVENANCE');
    expect(compliance).toMatch(/provenance:\s*'demo'/);
  });

  it('renders a ProvenanceBadge for the timeline section and each entry', () => {
    const badgeUses = compliance.match(
      /<ProvenanceBadge meta=\{AUDIT_TIMELINE_PROVENANCE\}/g,
    );
    expect(badgeUses?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('states in visible copy that the entries are not production audit records', () => {
    expect(compliance).toMatch(/not\s+\n?\s*production audit records/);
  });

  it('introduces no provider or internal implementation names', () => {
    const forbidden = [
      'Supabase',
      'Gemini',
      'OpenAI',
      'Anthropic',
      'NVIDIA',
      'Omniverse',
      'DSX',
      'gemini-',
      'gpt-',
    ];
    for (const term of forbidden) {
      expect(compliance.includes(term), `Compliance.tsx must not mention ${term}`).toBe(false);
    }
  });
});
