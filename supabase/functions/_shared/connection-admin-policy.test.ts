import { describe, expect, it } from 'vitest';
import { hasConnectionAdminAuthority } from './connection-admin-policy';

const NOW = new Date('2026-08-22T18:00:00Z');

describe('Connections administrator policy', () => {
  it.each(['security_admin', 'admin', 'owner'])('accepts active global %s authority', (role) => {
    expect(hasConnectionAdminAuthority([{ role, scope: 'global', expires_at: null }], NOW)).toBe(true);
  });

  it('rejects non-administrative roles', () => {
    expect(hasConnectionAdminAuthority([{ role: 'engineer', scope: 'global', expires_at: null }], NOW)).toBe(false);
  });

  it('rejects resource-scoped administrative grants', () => {
    expect(hasConnectionAdminAuthority([{ role: 'admin', scope: 'agent:123', expires_at: null }], NOW)).toBe(false);
  });

  it('rejects expired administrative grants', () => {
    expect(hasConnectionAdminAuthority([{ role: 'owner', scope: 'global', expires_at: '2026-08-22T17:59:59Z' }], NOW)).toBe(false);
  });

  it('accepts an unexpired grant among unrelated grants', () => {
    expect(hasConnectionAdminAuthority([
      { role: 'viewer', scope: 'global', expires_at: null },
      { role: 'security_admin', scope: null, expires_at: '2026-08-23T00:00:00Z' },
    ], NOW)).toBe(true);
  });
});
