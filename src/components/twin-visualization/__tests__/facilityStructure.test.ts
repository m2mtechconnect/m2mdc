import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const hall = read('src/components/twin-visualization/DataHall.tsx');
const lighting = read('src/components/twin-visualization/FacilityLighting.tsx');

describe('facility overhead structure', () => {
  it('contains no structural beam, roof beam, cross-member or joist groups', () => {
    for (const banned of ['StructuralBeams', 'RoofBeams', 'CrossMembers', 'DecorativeJoists', 'FacilityShell:Ceiling']) {
      expect(hall).not.toContain(`name="${banned}"`);
    }
  });

  it('does not reintroduce beams in any shell mode', () => {
    expect(hall.toLowerCase()).not.toMatch(/<mesh key=\{`beam-/);
  });

  it('keeps operational overhead assets', () => {
    expect(hall).toContain("surfaceMaterial('galvanizedTray')");
    expect(hall).toContain("surfaceMaterial('copperBus')");
    expect(hall).toContain("surfaceMaterial('chilledPipe')");
  });

  it('keeps FacilityLighting mounted with fixtures and lights independent of the shell', () => {
    expect(lighting).toContain('name="FacilityLighting"');
    expect(lighting).toContain('name="FacilityLighting:LightFixture"');
    expect(lighting).toContain('<ambientLight');
    expect(lighting).toContain('<hemisphereLight');
    expect(lighting).toContain('<pointLight');
    expect(lighting.match(/<directionalLight/g) ?? []).toHaveLength(2);
    expect(lighting).toContain('LocalEnvironment');
  });

  it('does not parent lighting inside facility shell geometry', () => {
    expect(hall).not.toContain('pointLight');
    expect(hall).not.toContain('name="FacilityLighting"');
  });
});
