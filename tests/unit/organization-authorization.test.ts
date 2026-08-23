import { describe, expect, it } from 'vitest';
import { resolveAuthorization } from '@/auth/permissions';
import { organizationPermissions } from '@/auth/organizationAuthorization';

describe('organization authorization model', () => {
  it('never gives a tenant owner platform customer-management authority', () => {
    const permissions = organizationPermissions('owner');
    expect(permissions.has('tenant.manage_members')).toBe(true);
    expect(permissions.has('twin.delete')).toBe(true);
    expect(permissions.has('platform.view_admin_console')).toBe(false);
    expect(permissions.has('platform.manage_customers')).toBe(false);
  });

  it('never gives a tenant admin platform administration', () => {
    const permissions = organizationPermissions('admin');
    expect(permissions.has('tenant.manage_members')).toBe(true);
    expect(permissions.has('platform.view_admin_console')).toBe(false);
    expect(permissions.has('platform.manage_customers')).toBe(false);
  });

  it('reserves customer provisioning for a global owner grant', () => {
    const owner = resolveAuthorization([{ role: 'owner', scope: 'global', expires_at: null }]);
    const admin = resolveAuthorization([{ role: 'admin', scope: 'global', expires_at: null }]);

    expect(owner.permissions.has('platform.manage_customers')).toBe(true);
    expect(admin.permissions.has('platform.manage_customers')).toBe(false);
  });
});
