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
  it('exposes the five persistent lifecycle workspaces', () => {
    expect(WORKSPACE_NAV.map((i) => i.fullName)).toEqual([
      'Command Center',
      'Design & Build',
      'Operations',
      'Simulation',
      'Evidence',
    ]);
  });

  it('maps every persistent workspace to its canonical route', () => {
    expect(WORKSPACE_NAV.map((i) => i.href)).toEqual([
      '/dashboard',
      '/builder',
      '/analytics',
      '/simulation',
      '/evidence/overview',
    ]);
    const workspace = Object.fromEntries(WORKSPACE_NAV.map((i) => [i.fullName, i.href]));
    expect(workspace['Design & Build']).toBe('/builder');
    expect(workspace['Operations']).toBe('/analytics');
    expect(workspace['Evidence']).toBe('/evidence/overview');

    const manage = Object.fromEntries(MANAGE_NAV.map((i) => [i.fullName, i.href]));
    expect(manage['Facility Blueprint']).toBe('/blueprint');
    expect(manage['Agents']).toBe('/app/agents');
    expect(manage['Deployments']).toBe('/deployments');
    expect(manage['AI Runtime & Policies']).toBe('/settings/ai');
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

  it('matches nested lifecycle workspace routes', () => {
    const build = WORKSPACE_NAV[1];
    expect(isNavItemActive(build, '/builder/session-abc')).toBe(true);
    expect(isNavItemActive(build, '/blueprint/abc')).toBe(true);
    expect(isNavItemActive(MANAGE_NAV.find((item) => item.href === '/blueprint')!, '/blueprint/abc')).toBe(true);

    const operate = WORKSPACE_NAV[2];
    expect(isNavItemActive(operate, '/analytics/system/abc')).toBe(true);
    expect(isNavItemActive(operate, '/deployments/abc')).toBe(true);
    expect(isNavItemActive(MANAGE_NAV.find((item) => item.href === '/deployments')!, '/deployments/abc')).toBe(true);

    const evidence = WORKSPACE_NAV[4];
    expect(isNavItemActive(evidence, '/evidence/thermal')).toBe(true);
  });

  it('hides manage items the caller cannot use', () => {
    expect(visibleManageNav(() => false)).toHaveLength(0);
    // Write-level callers see the write-oriented surfaces...
    expect(visibleManageNav((p) => p === 'twin.edit').map((i) => i.name)).toEqual([
      'Connections',
    ]);
    expect(MANAGE_NAV.map((i) => i.href)).not.toContain('/marketplace');
    expect(navGroups(() => true).flatMap((group) => group.items.map((i) => i.href))).not.toContain('/marketplace');
    // ...and read-only personas discover the surfaces they report on.
    expect(visibleManageNav((p) => p === 'twin.view').map((i) => i.name)).toEqual([
      'Facilities',
      'Blueprint',
    ]);
    const designOrOperate = MANAGE_NAV.filter((i) => i.group === 'operate' || i.group === 'design');
    expect(visibleManageNav(() => true)).toHaveLength(designOrOperate.length);
  });
});

describe('DSX lifecycle grouping', () => {
  it('orders the drawer around the current lifecycle', () => {
    expect(NAV_GROUP_ORDER).toEqual([
      'overview',
      'design',
      'operate',
      'simulate',
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

  it('drops restricted destinations while retaining governed evidence', () => {
    const viewer = navGroups((p) => p === 'twin.view');
    expect(viewer.map((g) => g.id)).toEqual([
      'overview',
      'design',
      'operate',
      'simulate',
      'govern',
      'support',
    ]);
    const hrefs = viewer.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain('/evidence/overview');
    expect(hrefs).toContain('/analytics');
    expect(hrefs).not.toContain('/settings/ai');
    expect(hrefs).not.toContain('/manage/integrations');
  });

  it('exposes the admin capability registry only under Govern > Platform Admin', () => {
    const admin = MANAGE_NAV.find((i) => i.fullName === 'Platform Administration')!;
    expect(admin.group).toBe('govern');
    expect(admin.children?.map((c) => c.href)).toContain('/admin/accelerated-ai-capabilities');
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
