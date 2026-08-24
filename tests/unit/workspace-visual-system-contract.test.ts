/**
 * Visual-system contract.
 *
 * Guards the shared AURA workspace visual language so primary surfaces cannot
 * silently regress back to bespoke one-off page shells.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const PRIMARY_SURFACES = [
  'src/workspace/CommandCentre.tsx',
  'src/pages/Connections.tsx',
  'src/pages/dsx/EvidenceBetaShell.tsx',
];

describe('AURA shared workspace visual system', () => {
  it('exposes the shared components from one entry point', () => {
    const index = read('src/components/workspace-system/index.ts');
    for (const name of ['WorkspaceHeader', 'SectionCard', 'WorkspaceEmptyState', 'CapabilityChips']) {
      expect(index).toContain(name);
    }
  });

  it.each(PRIMARY_SURFACES)('%s uses the shared workspace header', (file) => {
    const source = read(file);
    expect(source).toContain('@/components/workspace-system');
    expect(source).toContain('<WorkspaceHeader');
  });

  it('drives workspace header copy from the stack manifest', () => {
    const header = read('src/components/workspace-system/WorkspaceHeader.tsx');
    expect(header).toContain("from '@/config/auraStackManifest'");
    expect(header).toContain('stackCopy');
  });

  it('renders the two-tier shell with a workspace bar', () => {
    const layout = read('src/components/Layout.tsx');
    expect(layout).toContain('aura-shellbar');
    expect(layout).toContain('data-testid="primary-navigation"');
    expect(layout).toContain('data-testid="manage-trigger"');
    expect(layout).toContain('data-testid="govern-trigger"');
  });

  it('defines the workspace visual tokens in the global stylesheet', () => {
    const css = read('src/index.css');
    for (const cls of ['.aura-ws-header', '.aura-ws-card', '.aura-ws-chip', '.aura-ws-empty', '.aura-shellbar-tab']) {
      expect(css).toContain(cls);
    }
  });

  it('keeps provider names out of the shared visual system', () => {
    for (const file of [
      'src/components/workspace-system/WorkspaceHeader.tsx',
      'src/components/workspace-system/CapabilityChips.tsx',
      'src/components/workspace-system/SectionCard.tsx',
    ]) {
      const source = read(file);
      for (const forbidden of ['NVIDIA', 'Supabase', 'Lovable', 'OpenAI', 'Gemini']) {
        expect(source).not.toContain(forbidden);
      }
    }
  });
});
