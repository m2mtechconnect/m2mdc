/**
 * Batch 4 - every persona can discover the capabilities its permissions imply.
 *
 * Navigation gates used to be stricter than the pages behind them: Facilities
 * and Blueprint were gated on `twin.edit`, so read-only personas could hold
 * `twin.view` and `analytics.export` and still never see the facility they are
 * meant to report on. Discovery is now read-level; write authority is still
 * decided inside each page.
 */

import { describe, expect, it } from 'vitest';
import { MANAGE_NAV } from '@/config/appNavigation';
import { resolveAuthorization, type AnyRole, type Permission } from '@/auth/permissions';

const item = (name: string) => {
  const found = MANAGE_NAV.find((entry) => entry.name === name);
  if (!found) throw new Error(`navigation item ${name} is missing`);
  return found;
};

const permissionsFor = (role: AnyRole): Set<Permission> =>
  resolveAuthorization([{ role, scope: 'global', expires_at: null }]).permissions;

const READ_ONLY_PERSONAS: AnyRole[] = ['executive', 'compliance', 'data_analyst'];

describe('navigation discovery matches persona permissions', () => {
  it('gates Facilities and Blueprint at read level', () => {
    expect(item('Facilities').permission).toBe('twin.view');
    expect(item('Blueprint').permission).toBe('twin.view');
  });

  it.each(READ_ONLY_PERSONAS)('%s can discover Facilities and Blueprint', (role) => {
    const permissions = permissionsFor(role);
    expect(permissions.has(item('Facilities').permission as Permission)).toBe(true);
    expect(permissions.has(item('Blueprint').permission as Permission)).toBe(true);
  });

  it.each(READ_ONLY_PERSONAS)('%s still cannot edit twins or run deployments', (role) => {
    const permissions = permissionsFor(role);
    expect(permissions.has('twin.edit')).toBe(false);
    expect(permissions.has('deployment.execute')).toBe(false);
  });

  it('keeps write-oriented Connections at edit level', () => {
    expect(item('Connections').permission).toBe('twin.edit');
  });
});
