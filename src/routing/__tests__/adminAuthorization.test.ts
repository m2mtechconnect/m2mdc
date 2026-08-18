/**
 * Phase 1 - one authorization decision for the administration console.
 *
 * These tests lock the consolidated rule: admission to /admin/* is decided by
 * the canonical permission `platform.view_admin_console` produced by
 * `resolveAuthorization`, and by nothing else. They fail if a second role list
 * is reintroduced anywhere in the routing or admin-page layer.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveAuthorization, type AnyRole } from '@/auth/permissions';
import { ADMIN_CONSOLE_PERMISSION } from '@/routing/AdminRouteGuard';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const admits = (roles: AnyRole[]) =>
  resolveAuthorization(roles.map((role) => ({ role, scope: 'global', expires_at: null })))
    .permissions.has(ADMIN_CONSOLE_PERMISSION);

describe('administration console authorization', () => {
  it('uses the canonical permission as the gate', () => {
    expect(ADMIN_CONSOLE_PERMISSION).toBe('platform.view_admin_console');
  });

  it.each<[AnyRole, boolean]>([
    ['admin', true],
    ['security_admin', true],
    ['owner', true],
    ['executive', false],
    ['manager', false],
    ['engineer', false],
    ['operator', false],
    ['viewer', false],
    ['compliance', false],
    ['finance', false],
  ])('role %s admitted=%s', (role, expected) => {
    expect(admits([role])).toBe(expected);
  });

  it('grants nothing without an active grant', () => {
    expect(admits([])).toBe(false);
  });

  it('ignores an expired admin grant', () => {
    const resolved = resolveAuthorization([
      { role: 'admin', scope: 'global', expires_at: '2000-01-01T00:00:00.000Z' },
    ]);
    expect(resolved.permissions.has(ADMIN_CONSOLE_PERMISSION)).toBe(false);
  });

  it('ignores a scope-qualified admin grant for the global console', () => {
    const resolved = resolveAuthorization([
      { role: 'admin', scope: 'agent:11111111-1111-1111-1111-111111111111', expires_at: null },
    ]);
    expect(resolved.permissions.has(ADMIN_CONSOLE_PERMISSION)).toBe(false);
  });

  it('the guard compares no role labels', () => {
    const src = read('src/routing/AdminRouteGuard.tsx');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/hasAccess/);
    expect(code).not.toMatch(/'(admin|security_admin|owner|executive|manager)'/);
    expect(code).toContain('can(permission)');
  });

  it('admin pages do not carry their own role lists', () => {
    for (const page of ['src/pages/AdminUserApproval.tsx', 'src/pages/AdminSignupsDashboard.tsx']) {
      const src = read(page);
      expect(src, page).not.toMatch(/allowedRoles/);
      expect(src, page).toContain("requiredPermissions={['platform.view_admin_console']}");
    }
  });

  it('every /admin/* route is wrapped by the guard', () => {
    const shell = read('src/AuthenticatedShell.tsx');
    const routes = shell.match(/<Route[\s\S]*?\/>/g) ?? [];
    const adminRoutes = routes.filter((r) => /path="\/admin\//.test(r));
    expect(adminRoutes.length).toBeGreaterThanOrEqual(10);
    for (const route of adminRoutes) {
      expect(route, route.slice(0, 80)).toContain('AdminRouteGuard');
    }
  });
});
