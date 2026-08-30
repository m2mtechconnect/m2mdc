import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test.describe('recommendation navigation retirement contract', () => {
  test('does not claim persistence fields that the preview-only store does not implement', () => {
    const store = read('src/stores/recommendationStore.ts');

    expect(store).toContain('sandbox/preview recommendation data');
    expect(store).not.toMatch(/\bpersist\s*\(/);
    expect(store).not.toContain('activeFilter');
    expect(store).not.toContain('scrollPosition');
    expect(store).not.toContain('generatedItems');
    expect(store).not.toContain('lastGenerated');
  });

  test('keeps Playbook as a compatibility redirect to Learning Hub', () => {
    const aliases = read('src/config/routeAliases.ts');
    const shell = read('src/AuthenticatedShell.tsx');

    expect(aliases).toContain("{ from: '/playbook', to: '/help' }");
    expect(shell).not.toMatch(/<Route\s+path="\/playbook"\s+element=\{<(?!PreserveNavigate)/);
  });

  test('clears preview recommendations when the active facility changes', () => {
    const context = read('src/context/ActiveTwinContext.tsx');

    expect(context).toMatch(
      /const \{ clearRecommendation \} = useRecommendationStore\.getState\(\);[\s\S]{0,120}clearRecommendation\(\)/,
    );
  });

  test('contains no always-pass assertion escape hatch', () => {
    const source = read('tests/e2e/recommendations-navigation.spec.ts');
    expect(source).not.toMatch(/\|\|\s*true/);
  });
});
