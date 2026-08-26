import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('post-release production smoke regressions', () => {
  it('does not render the placeholder epoch build date', () => {
    const buildVersion = read('src/components/BuildVersion.tsx');
    expect(buildVersion).not.toContain('1970-01-01');
    expect(buildVersion).not.toContain('new Date(BUILD_TIMESTAMP)');
  });

  it('gives the responsive Simulation inspector an accessible description', () => {
    const workspace = read('src/workspace/AuraWorkspace.tsx');
    expect(workspace).toContain('SheetDescription');
    expect(workspace).toContain('Inspect the selected facility asset');
  });

  it('routes the retired Infrastructure URL to canonical tenant-bound evidence', () => {
    const aliases = read('src/config/routeAliases.ts');
    expect(aliases).toContain("{ from: '/infrastructure', to: '/evidence/assets' }");
  });

  it('lets an unresolved member select an active organization without guessing', () => {
    const userMenu = read('src/components/layout/UserMenu.tsx');
    expect(userMenu).toContain('organizations.length > 1 || !activeOrganization');
    expect(userMenu).toContain("activeOrganization?.orgName ?? 'Select organization'");
    expect(userMenu).toContain("activeOrganization ? 'Switch organization' : 'Select active organization'");
    expect(userMenu).toContain('handleOrganizationSwitch(organization.orgId)');
  });
});
