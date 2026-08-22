import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CUSTOMER_SURFACES = [
  new URL('../../components/builder/steps/Step2Intelligence.tsx', import.meta.url),
  new URL('../../components/builder/steps/Step3Tools.tsx', import.meta.url),
  new URL('../../components/connections/CatalogueTab.tsx', import.meta.url),
  new URL('../../components/connections/DemoIntegrationsTab.tsx', import.meta.url),
] as const;

const FORBIDDEN_CUSTOMER_TERMS = [
  /\blovable\b/i,
  /\bzapier\b/i,
  /\bmcp\b/i,
  /\bsupabase\b/i,
  /\bopenai\b/i,
  /\bgemini\b/i,
  /\bgpt(?:-?\d+)?\b/i,
] as const;

describe('AURA customer-facing white-label surfaces', () => {
  it('do not expose implementation vendors or protocol plumbing in Builder or Connections source', () => {
    for (const surface of CUSTOMER_SURFACES) {
      const source = readFileSync(fileURLToPath(surface), 'utf8');
      for (const forbidden of FORBIDDEN_CUSTOMER_TERMS) {
        expect(source, `${surface.pathname} contains ${forbidden}`).not.toMatch(forbidden);
      }
    }
  });
});
