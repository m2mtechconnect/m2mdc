import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CUSTOMER_SURFACES = [
  'src/components/builder/steps/Step2Intelligence.tsx',
  'src/components/builder/steps/Step3Tools.tsx',
  'src/components/connections/CatalogueTab.tsx',
  'src/components/connections/DemoIntegrationsTab.tsx',
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
      const source = readFileSync(resolve(process.cwd(), surface), 'utf8');
      for (const forbidden of FORBIDDEN_CUSTOMER_TERMS) {
        expect(source, `${surface} contains ${forbidden}`).not.toMatch(forbidden);
      }
    }
  });
});
