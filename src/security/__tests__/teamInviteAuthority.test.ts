import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/**
 * Organization invitations are tenant-administration actions. Authority must
 * come from an approved active organization membership, not from a platform-
 * global role label, and ordinary invitations may never mint org ownership.
 */
describe('team invite authority', () => {
  const fn = read('supabase/functions/teams-invite/index.ts');

  it('verifies approval and active org member-management authority before tenant service-role work', () => {
    const profileCheck = fn.indexOf("from('profiles')");
    const activeOrgCheck = fn.indexOf("authClient.rpc('active_org_id')");
    const membershipCheck = fn.indexOf("from('org_memberships')", activeOrgCheck);
    const roleCheck = fn.indexOf('INVITER_ROLES.has', membershipCheck);
    const serviceClient = fn.indexOf('const serviceClient = createClient', membershipCheck);

    expect(fn).toContain("const INVITER_ROLES = new Set(['admin', 'owner', 'security_admin'])");
    expect(profileCheck).toBeGreaterThanOrEqual(0);
    expect(activeOrgCheck).toBeGreaterThan(profileCheck);
    expect(membershipCheck).toBeGreaterThan(activeOrgCheck);
    expect(roleCheck).toBeGreaterThan(membershipCheck);
    expect(serviceClient).toBeGreaterThan(roleCheck);
    expect(fn).toContain("membership.status !== 'active'");
    expect(fn).toContain("stage: 'authorization'");
  });

  it('allows tenant administration roles but never mints owner through the ordinary invite flow', () => {
    expect(fn).toContain("'admin',");
    expect(fn).toContain("'security_admin',");
    const allowlist = fn.slice(fn.indexOf('const INVITABLE_ROLES'), fn.indexOf('const INVITER_ROLES'));
    expect(allowlist).not.toContain("'owner'");
    expect(fn).toContain("const ELEVATED_INVITE_ROLES = new Set(['admin', 'security_admin'])");
    expect(fn).toContain("ELEVATED_INVITE_ROLES.has(role) && membership.role !== 'owner'");
  });

  it('binds every tenant invitation to the active organization and never returns the acceptance token', () => {
    expect(fn).toContain('org_id: orgId');
    expect(fn).not.toMatch(/\.select\(\)\s*\n?\s*\.single\(\)/);
    expect(fn).toContain(".select('id, email, role, status, invited_by, org_id, expires_at, created_at')");
  });

  it('keeps the legacy platform Teams read explicit while tenant People & Access uses its guarded snapshot RPC', () => {
    const teams = read('src/pages/Teams.tsx');
    const tenantPeople = read('src/pages/people/TenantPeopleAccess.tsx');
    expect(teams).toContain('.select("id, email, role, status, invited_by, expires_at, created_at")');
    expect(teams).not.toMatch(/from\("team_invites"\)\s*\n\s*\.select\("\*"\)/);
    expect(tenantPeople).toContain("rpc('tenant_people_access_snapshot')");
  });
});
