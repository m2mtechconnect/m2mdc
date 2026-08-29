import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Command Center consolidation contract', () => {
  const commandCentre = read('src/workspace/CommandCentre.tsx');
  const highlights = read('src/workspace/dashboard/FacilityHighlights.tsx');

  it('renders one facility identity surface instead of stacked workspace and facility heroes', () => {
    expect(commandCentre).not.toContain('<WorkspaceHeader');
    expect(commandCentre).not.toContain('CapabilityChips');
    expect(commandCentre).toContain('provenance={<ProvenanceBadge');
    expect(highlights).toContain('<h1');
    expect(highlights).toContain('Command Center · Data centre facility');
  });

  it('keeps one primary action and moves secondary destinations behind progressive disclosure', () => {
    expect(highlights).toContain('data-testid="primary-action-simulate"');
    expect(highlights).not.toContain('data-testid="command-create-facility"');
    expect(highlights).toContain('<Link to={evidenceHref}>View Evidence</Link>');
    expect(highlights).toContain('<Link to="/manage/facilities?create=true">New facility</Link>');
  });

  it('preserves explicit simulation provenance after removing the duplicate hero', () => {
    expect(commandCentre).toContain('COMMAND_CENTRE_PROVENANCE');
    expect(commandCentre).toContain("provenance: 'simulated'");
    expect(commandCentre).toContain('Not measured telemetry.');
    expect(highlights).toContain('{provenance}');
  });
});
