/**
 * Batch 1 + 2 - persona allow/deny coverage for the global authorization plane.
 *
 * Two rules are locked here:
 *
 * 1. A grant in public.user_roles with scope 'global' and a tenant-only role
 *    label (operator, viewer) confers NO product permission. Tenant authority
 *    comes from authoritative organization membership, never from a global
 *    grant. Platform authority stays with the platform-plane labels.
 * 2. Every persona has at least one explicit allow and one explicit deny for
 *    the permissions that gate real destinations, so a widened role table
 *    fails a test instead of silently widening a route.
 */

import { describe, expect, it } from 'vitest';
import {
  GLOBAL_ROLE_PERMISSIONS,
  ROLE_PERMISSIONS,
  TENANT_ONLY_ROLES,
  resolveAuthorization,
  type AnyRole,
  type Permission,
} from '@/auth/permissions';
import { organizationPermissions } from '@/auth/organizationAuthorization';

const globalPermissions = (role: AnyRole): Set<Permission> =>
  resolveAuthorization([{ role, scope: 'global', expires_at: null }]).permissions;

describe('tenant-only roles never carry platform authority', () => {
  it.each(TENANT_ONLY_ROLES)('a global %s grant confers no product permission', (role) => {
    const permissions = globalPermissions(role);
    expect(permissions.has('twin.view')).toBe(false);
    expect(permissions.has('twin.edit')).toBe(false);
    expect(permissions.has('deployment.execute')).toBe(false);
    expect(permissions.has('platform.view_admin_console')).toBe(false);
    // Shell admission remains, so the account is not stranded; every actual
    // capability has to arrive through organization membership.
    expect(permissions.has('platform.access_internal_shell')).toBe(true);
  });

  it('still describes the tenant capability of those roles for membership resolution', () => {
    expect(organizationPermissions('operator').has('twin.edit')).toBe(true);
    expect(organizationPermissions('viewer').has('twin.view')).toBe(true);
  });

  it('changes nothing for platform-plane roles', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as AnyRole[]) {
      if ((TENANT_ONLY_ROLES as readonly string[]).includes(role)) continue;
      expect([...GLOBAL_ROLE_PERMISSIONS[role]]).toEqual([...ROLE_PERMISSIONS[role]]);
    }
  });
});

describe('persona allow and deny per gated destination', () => {
  const cases: Array<[AnyRole, Permission, boolean]> = [
    // /admin/*
    ['admin', 'platform.view_admin_console', true],
    ['data_analyst', 'platform.view_admin_console', false],
    ['compliance', 'platform.view_admin_console', false],
    // /admin/customers
    ['owner', 'platform.manage_customers', true],
    ['admin', 'platform.manage_customers', false],
    // /deploy
    ['engineer', 'deployment.execute', true],
    ['manager', 'deployment.execute', true],
    ['viewer', 'deployment.execute', false],
    ['executive', 'deployment.execute', false],
    ['compliance', 'deployment.execute', false],
    // /simulation and other twin surfaces
    ['engineer', 'twin.view', true],
    ['executive', 'twin.view', true],
    ['operator', 'twin.view', false],
    // /teams/access-control
    ['admin', 'authz.view_assignments', true],
    ['compliance', 'authz.view_assignments', true],
    ['engineer', 'authz.view_assignments', false],
    // /analytics
    ['data_analyst', 'analytics.view', true],
    ['support', 'analytics.export', false],
  ];

  it.each(cases)('global %s -> %s allowed=%s', (role, permission, allowed) => {
    expect(globalPermissions(role).has(permission)).toBe(allowed);
  });
});
