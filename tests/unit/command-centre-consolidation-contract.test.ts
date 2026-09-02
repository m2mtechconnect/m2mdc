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

  it('keeps one persona-prioritized primary action and progressively discloses the remainder', () => {
    expect(commandCentre).toContain('<PersonaPriorityPanel');
    expect(commandCentre).toContain('buildPersonaCommandActions');
    expect(highlights).toContain('data-testid="primary-persona-action"');
    expect(highlights).not.toContain('data-testid="command-create-facility"');
    expect(highlights).toContain('additionalActions.map');
    expect(highlights).not.toContain('<Link to="/manage/facilities?create=true">New facility</Link>');
  });

  it('preserves explicit simulation provenance after removing the duplicate hero', () => {
    expect(commandCentre).toContain('COMMAND_CENTRE_PROVENANCE');
    expect(commandCentre).toContain("provenance: 'simulated'");
    expect(commandCentre).toContain('Not measured telemetry.');
    expect(highlights).toContain('{provenance}');
  });
});
