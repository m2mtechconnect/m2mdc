import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const E2E_EVIDENCE_FILES = [
  'tests/e2e/account-teams-integration.spec.ts',
  'tests/e2e/acceptance-final.spec.ts',
  'tests/e2e/persona-journeys.spec.ts',
];

const FORBIDDEN_FALSE_GREEN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'unconditional true assertion', pattern: /expect\(true\)\.toBe\(true\)/ },
  { label: 'non-negative count presented as feature evidence', pattern: /count\(\)\s*>?=\s*0/ },
  { label: 'meta-test claiming all tests are green', pattern: /All tests green/i },
  { label: 'presence-only deployment claim', pattern: /Deploy writes to DB and emits analytics/i },
  { label: 'explicit pass-on-page-load comment', pattern: /passes if pages load/i },
];

describe('E2E release evidence quality', () => {
  for (const path of E2E_EVIDENCE_FILES) {
    it(`${path} contains no known false-green evidence patterns`, () => {
      const source = readFileSync(path, 'utf8');
      for (const { label, pattern } of FORBIDDEN_FALSE_GREEN_PATTERNS) {
        expect(source, `${path} contains ${label}`).not.toMatch(pattern);
      }
    });
  }
});
