import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');
const visual = readFileSync('tests/visual/snapshots.spec.ts', 'utf8');
const workflow = readFileSync('.github/workflows/visual-regression.yml', 'utf8');
const manifest = JSON.parse(readFileSync('tests/visual/approved-linux-visuals.json', 'utf8')) as {
  contract: string;
  screenshots: Array<{ file: string; mode: string }>;
};

describe('visual theme and regression contract', () => {
  it('keeps the supported global-light / scoped-NOC-dark product boundary explicit', () => {
    expect(css).toContain('Light theme global + NOC dark theme');
    expect(css).toContain('.noc-theme');
    expect(visual).not.toContain('Visual Regression - Dark Theme');
    expect(visual).not.toMatch(/-dark\.png/);
  });

  it('does not silently skip expected component coverage', () => {
    expect(visual).not.toMatch(/if\s*\(\s*await\s+[^\n]*\.isVisible\(\)\s*\)/);
  });

  it('uses fresh screenshots plus an immutable text fingerprint manifest', () => {
    expect(manifest.contract).toBe('global-light-supported-surfaces');
    expect(manifest.screenshots.length).toBeGreaterThanOrEqual(10);
    expect(manifest.screenshots.some((entry) => entry.file === 'builder-mobile-chromium-linux.png' && entry.mode === 'responsive')).toBe(true);
    expect(workflow).toContain('verify-visual-fingerprints.mjs');
    expect(workflow).toContain("AURA_CAPTURE_CURRENT_HEAD: '1'");
    expect(workflow).not.toContain('git commit');
    expect(workflow).not.toContain('git push');
  });
});
