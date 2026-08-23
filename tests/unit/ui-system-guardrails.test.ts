import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('AURA UI system guardrails', () => {
  it('does not increase legacy UI debt and preserves the V2 contract', () => {
    const output = execFileSync(process.execPath, ['scripts/check-ui-system.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toContain('[AURA UI SYSTEM] PASS');
  });
});
