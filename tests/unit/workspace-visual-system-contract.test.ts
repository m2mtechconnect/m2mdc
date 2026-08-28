/**
 * Visual-system contract.
 *
 * Guards the shared AURA workspace visual language so primary surfaces cannot
 * silently regress back to bespoke one-off page shells.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
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
      // The raw model identifier may exist as stored configuration, but it must
      // never be rendered directly: every display path goes through the label.
      expect(source).not.toContain('value={summary?.model}');
      expect(source).not.toContain('>{summary?.model}<');
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
    expect(layout).toContain('primaryNavigation(can)');
    expect(layout).toContain('visibleNavChildren(item, can)');
    expect(layout).toContain('data-nav-item={item.name}');
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

/**
 * Backend-to-UI parity. Every high-value backend capability must have at least
 * one customer-visible surface, and evidence must stay canonical.
 */
describe('backend-to-UI capability parity', () => {
  const HIGH_VALUE_CAPABILITIES = [
    'twin.openusd',
    'simulation.engine',
    'evidence.workspace',
    'connections.enterprise',
    'data.storage',
    'ai.managed',
    'governance.controls',
    'platform.command',
  ];

  const srcFiles = (): string[] => {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(resolve(process.cwd(), dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (/\.(tsx?|ts)$/.test(entry.name)) out.push(path);
      }
    };
    walk('src');
    return out;
  };

  it.each(HIGH_VALUE_CAPABILITIES)('capability %s is rendered by at least one surface', (id) => {
    const consumers = srcFiles().filter((file) => {
      if (file.startsWith('src/config/')) return false;
      const source = read(file);
      return source.includes(`'${id}'`) || source.includes(`"${id}"`);
    });

    expect(consumers.length).toBeGreaterThan(0);
  });

  it('exposes Data & Storage inside Connections without a new top-level route', () => {
    const connections = read('src/pages/Connections.tsx');
    expect(connections).toContain('data-storage');
    expect(connections).toContain('Data & Storage');
    expect(connections).toContain('DataStorageTab');

    const tab = read('src/components/connections/DataStorageTab.tsx');
    expect(tab).toContain("stackCopy('data.storage')");
    expect(tab).toContain('WorkspaceEmptyState');
    expect(tab).toContain('SectionCard');
  });

  it('keeps Connections & APIs distinct from Data & Storage', () => {
    const connections = read('src/pages/Connections.tsx');
    expect(connections).toContain('Connections & APIs');
    const apisIndex = connections.indexOf('Connections & APIs');
    const storageIndex = connections.indexOf('Data & Storage');
    expect(apisIndex).toBeGreaterThan(-1);
    expect(storageIndex).toBeGreaterThan(-1);
    expect(apisIndex).not.toBe(storageIndex);
  });

  it('renders no raw provider or implementation names in the Data & Storage surface', () => {
    const tab = read('src/components/connections/DataStorageTab.tsx');
    for (const forbidden of ['Supabase', 'supabase', 'S3', 'Snowflake', 'Databricks', 'BigQuery', 'ClickHouse', 'Redshift', 'gemini', 'openai']) {
      expect(tab).not.toContain(forbidden);
    }
  });

  it('surfaces activation evidence on /deploy and deep-links to Activation History', () => {
    const deploy = read('src/pages/Deploy.tsx');
    expect(deploy).toContain('DeploymentEvidenceCard');

    const card = read('src/components/deploy/DeploymentEvidenceCard.tsx');
    expect(card).toContain('Activation evidence');
    expect(card).toContain('to="/deployments"');
    // Summary only: the card must never write deployment records.
    expect(card).not.toContain('.insert(');
    expect(card).not.toContain('.update(');
  });

  it('keeps Activation History as the canonical activation and runtime evidence surface', () => {
    const history = read('src/pages/DeploymentHistory.tsx');
    expect(history).toContain('<WorkspaceHeader');
    expect(history).toContain('Activation & Runtime Evidence');
    expect(history).toContain('classifyDeploymentTruth');
  });

  it('renders lifecycle order Readiness -> Activation -> Evidence on /deploy', () => {
    const deploy = read('src/pages/Deploy.tsx');
    const readiness = deploy.indexOf('Activation readiness');
    const execution = deploy.indexOf('<DCCard title="Configuration activation"');
    const evidence = deploy.indexOf('DeploymentEvidenceCard systemId');
    expect(readiness).toBeGreaterThan(-1);
    expect(execution).toBeGreaterThan(readiness);
    expect(evidence).toBeGreaterThan(execution);
  });

  it('keeps raw provider/model identifiers out of the new parity surfaces', () => {
    for (const file of [
      'src/components/connections/DataStorageTab.tsx',
      'src/components/deploy/DeploymentEvidenceCard.tsx',
    ]) {
      const source = read(file);
      for (const forbidden of ['NVIDIA', 'gemini-', 'gpt-', 'claude-', 'OpenAI']) {
        expect(source).not.toContain(forbidden);
      }
    }
  });

  it('keeps truth qualifiers intact on the new surfaces', () => {
    expect(read('src/components/connections/DataStorageTab.tsx')).toContain('NOT MEASURED');
    expect(read('src/components/deploy/DeploymentEvidenceCard.tsx')).toContain('NOT YET RECORDED');
  });
});
