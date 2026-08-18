import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/**
 * Only one scene may own the runtime coverage session. The dashboard viewport
 * is itself `compact`, so compactness must never decide authority: a thumbnail
 * that shares the page declares `coveragePriority="secondary"` instead.
 */
describe('coverage session authority', () => {
  it('does not derive coverage priority from the compact layout flag', () => {
    const scene = read('src/components/twin-visualization/DataCenter3DScene.tsx');
    expect(scene).toContain("priority: coveragePriority ?? 'primary'");
    expect(scene).not.toMatch(/priority:\s*compact\s*\?/);
  });

  it('marks the dashboard thumbnail preview as a secondary reporter', () => {
    const mini = read('src/components/data-centre-twin/overview/MiniTwinPreview.tsx');
    expect(mini).toContain('coveragePriority="secondary"');
  });
});
