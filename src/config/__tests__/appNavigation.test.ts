import { describe, expect, it } from 'vitest';
import { MANAGE_NAV, WORKSPACE_NAV, isNavItemActive, visibleManageNav } from '../appNavigation';

describe('canonical navigation', () => {
  it('exposes exactly five workspaces', () => {
    expect(WORKSPACE_NAV.map((i) => i.name)).toEqual([
      'Dashboard',
      'Blueprint',
      'Simulation',
      'Evidence',
      'Integrations',
    ]);
  });

  it('never lists the same destination twice', () => {
    const hrefs = [...WORKSPACE_NAV, ...MANAGE_NAV].map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('never lists the same label twice', () => {
    const names = [...WORKSPACE_NAV, ...MANAGE_NAV].map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks the dashboard active on both of its paths', () => {
    const dashboard = WORKSPACE_NAV[0];
    expect(isNavItemActive(dashboard, '/')).toBe(true);
    expect(isNavItemActive(dashboard, '/dashboard')).toBe(true);
    expect(isNavItemActive(dashboard, '/blueprint')).toBe(false);
  });

  it('matches nested workspace routes', () => {
    const blueprint = WORKSPACE_NAV[1];
    expect(isNavItemActive(blueprint, '/blueprint/abc')).toBe(true);
    const evidence = WORKSPACE_NAV[3];
    expect(isNavItemActive(evidence, '/dsx/evidence-beta/thermal')).toBe(true);
  });

  it('hides manage items the caller cannot use', () => {
    expect(visibleManageNav(() => false)).toHaveLength(0);
    expect(visibleManageNav((p) => p === 'twin.edit').map((i) => i.name)).toEqual(['Build']);
    expect(visibleManageNav(() => true)).toHaveLength(MANAGE_NAV.length);
  });
});
