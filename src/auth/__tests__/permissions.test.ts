import { describe, it, expect } from 'vitest';
import {
  resolveAuthorization,
  isGrantActive,
  ROLE_PERMISSIONS,
  PLATFORM_ROLES,
  TENANT_ROLES,
} from '../permissions';

const NOW = new Date('2026-08-07T00:00:00Z');
const past = '2026-01-01T00:00:00Z';
const future = '2027-01-01T00:00:00Z';

describe('canonical authorization model (B-01)', () => {
  it('maps every role label in the enum explicitly', () => {
    for (const role of [...PLATFORM_ROLES, ...TENANT_ROLES]) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it('preserves the legacy admin assignment', () => {
    const r = resolveAuthorization([{ role: 'admin', scope: 'global', expires_at: null }], NOW);
    expect(r.primaryRole).toBe('admin');
    expect(r.permissions.has('authz.manage_assignments')).toBe(true);
    expect(r.permissions.has('platform.access_internal_shell')).toBe(true);
  });

  it('preserves the legacy engineer assignment without granting admin authority', () => {
    const r = resolveAuthorization([{ role: 'engineer', scope: 'global', expires_at: null }], NOW);
    expect(r.primaryRole).toBe('engineer');
    expect(r.permissions.has('agent.operate')).toBe(true);
    expect(r.permissions.has('authz.manage_assignments')).toBe(false);
    expect(r.permissions.has('twin.delete')).toBe(false);
  });

  it('grants nothing for an expired assignment', () => {
    const r = resolveAuthorization([{ role: 'admin', scope: 'global', expires_at: past }], NOW);
    expect(r.primaryRole).toBeNull();
    expect(r.permissions.size).toBe(0);
    expect(isGrantActive({ role: 'admin', scope: 'global', expiresAt: past }, NOW)).toBe(false);
    expect(isGrantActive({ role: 'admin', scope: 'global', expiresAt: future }, NOW)).toBe(true);
  });

  it('reports unmapped labels instead of guessing', () => {
    const r = resolveAuthorization([{ role: 'superuser', scope: 'global', expires_at: null }], NOW);
    expect(r.unmapped).toEqual(['superuser']);
    expect(r.permissions.size).toBe(0);
    expect(r.primaryRole).toBeNull();
  });

  it('keeps a resource-scoped grant visible only as a resource grant', () => {
    const r = resolveAuthorization(
      [{ role: 'admin', scope: 'agent:11111111-1111-1111-1111-111111111111', expires_at: null }],
      NOW,
    );
    expect(r.grants).toEqual([
      {
        role: 'admin',
        scope: 'agent:11111111-1111-1111-1111-111111111111',
        expiresAt: null,
      },
    ]);
    expect(r.roles).toEqual([]);
    expect(r.primaryRole).toBeNull();
    expect(r.permissions.has('authz.manage_assignments')).toBe(false);
    expect(r.permissions.has('platform.access_internal_shell')).toBe(false);
  });

  it('unions permissions across multiple active global grants', () => {
    const r = resolveAuthorization(
      [
        { role: 'viewer', scope: 'global', expires_at: null },
        { role: 'engineer', scope: 'global', expires_at: future },
      ],
      NOW,
    );
    expect(r.roles.sort()).toEqual(['engineer', 'viewer']);
    expect(r.primaryRole).toBe('engineer');
    expect(r.permissions.has('agent.operate')).toBe(true);
  });

  it('defaults to no authority for an empty grant set', () => {
    const r = resolveAuthorization([], NOW);
    expect(r.primaryRole).toBeNull();
    expect(r.permissions.size).toBe(0);
  });
});
