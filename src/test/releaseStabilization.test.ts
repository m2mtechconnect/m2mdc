import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const builderModeToggle = readFileSync('src/components/builder/BuilderModeToggle.tsx', 'utf8');
const sovereigntyHook = readFileSync('src/sovereignty/useSovereignty.ts', 'utf8');

describe('release stabilization architecture guards', () => {
  it('keeps the phone Builder mode control compact', () => {
    expect(builderModeToggle).toContain('sm:hidden');
    expect(builderModeToggle).toContain('size="icon"');
    expect(builderModeToggle).toContain('hidden sm:flex');
    expect(builderModeToggle).toContain('aria-label=');
  });

  it('does not import the sovereignty hook dependencies through its own barrel', () => {
    expect(sovereigntyHook).not.toMatch(/from ['"]@\/sovereignty['"]/);
    expect(sovereigntyHook).toContain("from './SovereigntyEngine'");
    expect(sovereigntyHook).toContain("from './mockData'");
    expect(sovereigntyHook).toContain("from './types'");
  });
});
