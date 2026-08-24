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
  // Final visual parity pass: designer, simulation, runtime and learning.
  'src/pages/Blueprint.tsx',
  'src/workspace/AuraWorkspace.tsx',
  'src/pages/Deploy.tsx',
  'src/pages/DeploymentHistory.tsx',
  'src/pages/Help.tsx',
];

/** Surfaces that must render a manifest-backed capability, not local copy. */
const MANIFEST_BACKED: Array<[string, string]> = [
  ['src/workspace/CommandCentre.tsx', 'platform.command'],
  ['src/pages/Blueprint.tsx', 'twin.openusd'],
  ['src/workspace/AuraWorkspace.tsx', 'simulation.engine'],
  ['src/pages/Deploy.tsx', 'governance.controls'],
  ['src/pages/DeploymentHistory.tsx', 'governance.controls'],
  ['src/pages/dsx/EvidenceBetaShell.tsx', 'evidence.workspace'],
  ['src/pages/Connections.tsx', 'connections.enterprise'],
];

/** Runtime/deploy surfaces must keep neutral model labelling. */
const NEUTRAL_MODEL_SURFACES = ['src/pages/Deploy.tsx'];

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

  it.each(MANIFEST_BACKED)('%s renders the manifest capability %s', (file, capabilityId) => {
    expect(read(file)).toContain(capabilityId);
  });

  it('keeps Help driven by the manifest stack summary and shared cards', () => {
    const help = read('src/pages/Help.tsx');
    expect(help).toContain('AURAStackSummary');
    expect(help).toContain('<SectionCard');
    expect(help).not.toContain('DCCard');
  });

  it('keeps raw model identifiers out of the runtime/deploy surfaces', () => {
    for (const file of NEUTRAL_MODEL_SURFACES) {
      const source = read(file);
      expect(source).toContain('modelDisplayLabel');
      for (const forbidden of ['gpt-', 'gemini-', 'claude-']) {
        expect(source).not.toContain(forbidden);
      }
    }
  });

  it('supports a compact density for full-height canvas workspaces', () => {
    expect(read('src/components/workspace-system/WorkspaceHeader.tsx')).toContain('data-density');
    expect(read('src/index.css')).toContain("[data-density='compact']");
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
