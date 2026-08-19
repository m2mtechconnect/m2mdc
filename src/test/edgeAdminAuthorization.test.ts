import { describe, expect, it, vi } from 'vitest';
import {
  authorizeAdminRequest,
  type AdminAuthorizationDependencies,
} from '../../supabase/functions/_shared/adminAuthorization';

type ServiceClient = { serviceRole: true };

function dependencies(
  overrides: Partial<AdminAuthorizationDependencies<ServiceClient>> = {},
) {
  const createServiceClient = vi.fn(() => ({ serviceRole: true as const }));
  const audit = vi.fn();
  const base: AdminAuthorizationDependencies<ServiceClient> = {
    authenticate: vi.fn(async () => ({ data: { id: 'user-1', email: 'admin@example.test' } })),
    listRoleGrants: vi.fn(async () => ({
      data: [{ role: 'admin', scope: 'global', expires_at: null }],
    })),
    listMemberships: vi.fn(async () => ({ data: [{ org_id: 'tenant-a' }] })),
    listOrganizations: vi.fn(async () => ({ data: [{ id: 'tenant-a' }] })),
    createServiceClient,
    audit,
    now: () => new Date('2026-08-19T00:00:00.000Z'),
    ...overrides,
  };
  return { base, createServiceClient, audit };
}

async function expectFailure(
  promise: Promise<unknown>,
  status: number,
  code: string,
) {
  await expect(promise).rejects.toMatchObject({ status, code });
}

describe('administrative Edge Function authorization', () => {
  it('returns 401 when the Authorization header is missing', async () => {
    const { base, createServiceClient } = dependencies();
    await expectFailure(authorizeAdminRequest(null, null, base), 401, 'UNAUTHORIZED');
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', async () => {
    const { base, createServiceClient } = dependencies({
      authenticate: vi.fn(async () => ({ data: null, error: new Error('invalid') })),
    });
    await expectFailure(
      authorizeAdminRequest('Bearer invalid-token', null, base),
      401,
      'UNAUTHORIZED',
    );
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', async () => {
    const { base, createServiceClient } = dependencies({
      authenticate: vi.fn(async () => ({ data: null, error: new Error('expired') })),
    });
    await expectFailure(
      authorizeAdminRequest('Bearer expired-token', null, base),
      401,
      'UNAUTHORIZED',
    );
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('returns 403 for an authenticated non-admin user', async () => {
    const { base, createServiceClient } = dependencies({
      listRoleGrants: vi.fn(async () => ({
        data: [{ role: 'engineer', scope: 'global', expires_at: null }],
      })),
    });
    await expectFailure(
      authorizeAdminRequest('Bearer valid-user-token', null, base),
      403,
      'FORBIDDEN',
    );
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('returns 403 when an administrator requests another tenant', async () => {
    const { base, createServiceClient } = dependencies();
    await expectFailure(
      authorizeAdminRequest('Bearer valid-admin-token', 'tenant-b', base),
      403,
      'TENANT_SCOPE_VIOLATION',
    );
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('authorizes canonical administrative roles in a valid tenant', async () => {
    for (const role of ['security_admin', 'admin', 'owner']) {
      const { base, createServiceClient } = dependencies({
        listRoleGrants: vi.fn(async () => ({
          data: [{ role, scope: 'global', expires_at: null }],
        })),
      });
      const result = await authorizeAdminRequest(
        'Bearer valid-admin-token',
        'tenant-a',
        base,
      );
      expect(result).toMatchObject({
        userId: 'user-1',
        organizationId: 'tenant-a',
        roles: [role],
        serviceClient: { serviceRole: true },
      });
      expect(createServiceClient).toHaveBeenCalledOnce();
    }
  });

  it('returns 403 when role data is missing', async () => {
    const { base, createServiceClient } = dependencies({
      listRoleGrants: vi.fn(async () => ({ data: [] })),
    });
    await expectFailure(
      authorizeAdminRequest('Bearer valid-user-token', null, base),
      403,
      'FORBIDDEN',
    );
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('fails closed when a backend authorization lookup fails', async () => {
    const { base, createServiceClient } = dependencies({
      listRoleGrants: vi.fn(async () => ({ data: null, error: new Error('database unavailable') })),
    });
    await expectFailure(
      authorizeAdminRequest('Bearer valid-admin-token', null, base),
      500,
      'AUTHORIZATION_LOOKUP_FAILED',
    );
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('denies missing or ambiguous organization membership', async () => {
    for (const memberships of [
      [],
      [{ org_id: null }],
      [{ org_id: 'tenant-a' }, { org_id: 'tenant-b' }],
    ]) {
      const { base, createServiceClient } = dependencies({
        listMemberships: vi.fn(async () => ({ data: memberships })),
      });
      await expectFailure(
        authorizeAdminRequest('Bearer valid-admin-token', null, base),
        403,
        'TENANT_CONTEXT_REQUIRED',
      );
      expect(createServiceClient).not.toHaveBeenCalled();
    }
  });

  it('never creates the service client before every authorization check passes', async () => {
    const order: string[] = [];
    const { base } = dependencies({
      authenticate: vi.fn(async () => {
        order.push('authenticate');
        return { data: { id: 'user-1' } };
      }),
      listRoleGrants: vi.fn(async () => {
        order.push('roles');
        return { data: [{ role: 'admin', scope: 'global', expires_at: null }] };
      }),
      listMemberships: vi.fn(async () => {
        order.push('membership');
        return { data: [{ org_id: 'tenant-a' }] };
      }),
      listOrganizations: vi.fn(async () => {
        order.push('organization');
        return { data: [{ id: 'tenant-a' }] };
      }),
      createServiceClient: vi.fn(() => {
        order.push('service');
        return { serviceRole: true as const };
      }),
    });

    await authorizeAdminRequest('Bearer do-not-log-this-token', 'tenant-a', base);
    expect(order).toEqual(['authenticate', 'roles', 'membership', 'organization', 'service']);
  });

  it('emits structured audit evidence without the bearer token', async () => {
    const { base, audit } = dependencies();
    await authorizeAdminRequest('Bearer highly-sensitive-token', 'tenant-a', base);
    const serialized = JSON.stringify(audit.mock.calls);
    expect(serialized).not.toContain('highly-sensitive-token');
    expect(audit).toHaveBeenLastCalledWith({
      outcome: 'allowed',
      code: 'ADMIN_AUTHORIZED',
      userId: 'user-1',
      organizationId: 'tenant-a',
      role: 'admin',
    });
  });
});
