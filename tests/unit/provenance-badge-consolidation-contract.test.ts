/**
 * Provenance badge consolidation contract.
 *
 * Truth-state badges are a single shared visual layer. Both badge
 * implementations must live under src/components/provenance/, and other
 * modules must consume them rather than defining bespoke variants.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe('provenance badge consolidation', () => {
  it('keeps both badge implementations in the shared provenance module', () => {
    expect(existsSync(resolve(root, 'src/components/provenance/ProvenanceBadge.tsx'))).toBe(true);
    expect(existsSync(resolve(root, 'src/components/provenance/ProvenanceBadgeV2.tsx'))).toBe(true);
    expect(existsSync(resolve(root, 'src/components/v2/ProvenanceBadgeV2.tsx'))).toBe(false);
  });

  it('re-exports the V2 badge from the visual-system barrel without duplicating it', () => {
    const barrel = readFileSync(resolve(root, 'src/components/v2/index.ts'), 'utf8');
    expect(barrel).toContain('@/components/provenance/ProvenanceBadgeV2');
  });

  it('declares no bespoke provenance badge components outside the shared module', () => {
    const offenders = walk(resolve(root, 'src'))
      .filter((f) => !f.includes(join('components', 'provenance')))
      .filter((f) => !f.includes('__tests__'))
      .filter((f) => /(export\s+)?(function|const)\s+\w*ProvenanceBadge\w*\s*[=(]/.test(readFileSync(f, 'utf8')))
      // RunProvenanceBadge states run persistence, not data provenance, and is
      // a thin wrapper over the shared Badge primitive.
      .filter((f) => !f.endsWith(join('workspace', 'RunProvenanceBadge.tsx')))
      // AssetProvenanceBadge reports 3D geometry mount provenance for the twin
      // scene, a separate domain from data-provenance truth states.
      .filter((f) => !f.endsWith(join('twin-visualization', 'AssetProvenancePanel.tsx')));
    expect(offenders).toEqual([]);
  });
});
