import { describe, expect, it } from 'vitest';
import {
  MANAGE_NAV,
  NAV_GROUP_ORDER,
  SUPPORT_NAV,
  WORKSPACE_NAV,
  isNavItemActive,
  navGroups,
  visibleManageNav,
} from '../appNavigation';
import { ROUTE_ALIASES } from '../routeAliases';
import { PAGE_POSITIONING, positioningFor } from '../pagePositioning';

describe('canonical navigation', () => {
  it('exposes exactly four always-visible workspaces with DSX labels', () => {
    expect(WORKSPACE_NAV.map((i) => i.fullName)).toEqual([
      'AI Factory Overview',
      'Facility Blueprint',
      'Simulation Studio',
      'Validation & Evidence',
    ]);
  });

  it('preserves every canonical route while renaming labels', () => {
    expect(WORKSPACE_NAV.map((i) => i.href)).toEqual([
      '/dashboard',
      '/blueprint',
      '/simulation',
      '/dsx/evidence-beta/overview',
    ]);
    const manage = Object.fromEntries(MANAGE_NAV.map((i) => [i.fullName, i.href]));
    expect(manage['OpenUSD Asset Pipeline']).toBe('/builder');
    expect(manage['Agents & Optimization']).toBe('/app/agents');
    expect(manage['Operations & Telemetry']).toBe('/analytics');
    expect(manage['Runtime Environments']).toBe('/deployments');
    expect(manage['Agent Configuration']).toBe('/settings/ai');
    expect(manage['Connections']).toBe('/manage/integrations');
    expect(manage['Facilities']).toBe('/manage/facilities');
  });

  it('keeps every legacy alias pointing at a live destination', () => {
    const aliases = Object.fromEntries(ROUTE_ALIASES.map((a) => [a.from, a.to]));
    expect(aliases['/build']).toBe('/builder');
    expect(aliases['/integrations']).toBe('/manage/integrations');
    expect(aliases['/intelligence']).toBe('/analytics');
    expect(aliases['/subsystem-agents']).toBe('/app/agents');
    expect(aliases['/command']).toBe('/dashboard');
  });

  it('never lists the same destination twice', () => {
    const hrefs = [...WORKSPACE_NAV, ...MANAGE_NAV, ...SUPPORT_NAV].map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('never lists the same label twice', () => {
    const names = [...WORKSPACE_NAV, ...MANAGE_NAV, ...SUPPORT_NAV].map((i) => i.name);
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
    expect(visibleManageNav((p) => p === 'twin.edit').map((i) => i.name)).toEqual([
      'Facilities',
      'Integrations',
      'Asset pipeline',
    ]);
    expect(visibleManageNav(() => true)).toHaveLength(MANAGE_NAV.length);
  });
});

describe('DSX lifecycle grouping', () => {
  it('orders the drawer around the AI-factory lifecycle', () => {
    expect(NAV_GROUP_ORDER).toEqual([
      'overview',
      'design',
      'simulate',
      'operate',
      'govern',
      'support',
    ]);
  });

  it('groups every destination exactly once', () => {
    const groups = navGroups(() => true);
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/simulation');
  });

  it('never promotes Compare or Review into permanent menu entries', () => {
    const labels = navGroups(() => true).flatMap((g) => g.items.map((i) => i.fullName));
    expect(labels).not.toContain('Compare');
    expect(labels).not.toContain('Review');
  });

  it('drops groups a role cannot see', () => {
    const viewer = navGroups((p) => p === 'twin.view');
    expect(viewer.map((g) => g.id)).toEqual(['overview', 'design', 'simulate', 'support']);
    expect(viewer.flatMap((g) => g.items.map((i) => i.href))).not.toContain('/settings/ai');
  });

  it('exposes the admin capability registry only under Govern > Admin Console', () => {
    const admin = MANAGE_NAV.find((i) => i.fullName === 'Admin Console')!;
    expect(admin.group).toBe('govern');
    expect(admin.children?.map((c) => c.href)).toContain('/admin/dsx-capabilities');
  });
});

describe('page positioning', () => {
  it('gives every positioned page a purpose and a breadcrumb', () => {
    for (const page of PAGE_POSITIONING) {
      expect(page.purpose.length).toBeGreaterThan(20);
      expect(page.breadcrumb.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('matches the drawer label for each canonical route', () => {
    expect(positioningFor('/dashboard')!.title).toBe('AI Factory Overview');
    expect(positioningFor('/simulation')!.title).toBe('Simulation Studio');
    expect(positioningFor('/builder')!.title).toBe('OpenUSD Asset Pipeline');
  });
});
