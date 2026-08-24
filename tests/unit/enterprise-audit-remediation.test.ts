import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ORGANIZATION_ROLE_PERMISSIONS } from '../../src/auth/organizationAuthorization';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const remediation = read('supabase/migrations/20260824003000_enterprise_audit_remediation.sql');
const people = read('src/pages/people/TenantPeopleAccess.tsx');
const peopleLayout = read('src/pages/people/PeopleAccessLayout.tsx');
const customers = read('src/pages/admin/Customers.tsx');
const invite = read('supabase/functions/teams-invite/index.ts');

describe('enterprise audit remediation', () => {
  it('keeps read-oriented tenant roles out of core resource write policies', () => {
    const writerSet = "ARRAY['owner','admin','operator','engineer','manager']::text[]";
    expect(remediation.match(new RegExp(writerSet.replace(/[\[\]'()*+?.\\^$|]/g, '\\$&'), 'g'))?.length ?? 0).toBeGreaterThanOrEqual(9);

    for (const role of ['viewer', 'executive', 'security_admin', 'compliance', 'data_analyst', 'support']) {
      expect(ORGANIZATION_ROLE_PERMISSIONS[role as keyof typeof ORGANIZATION_ROLE_PERMISSIONS].includes('twin.edit')).toBe(false);
    }

    const policySection = remediation.slice(
      remediation.indexOf('DROP POLICY IF EXISTS "Users can create their own twins"'),
      remediation.indexOf('-- Tenant People & Access snapshot'),
    );
    expect(policySection).not.toContain("'executive']::text[]");
    expect(policySection).not.toContain("'viewer']::text[]");
  });

  it('uses one deterministic server active-organization fallback', () => {
    expect(remediation).toContain('CREATE OR REPLACE FUNCTION public.active_org_id()');
    expect(remediation).toContain('ORDER BY m.is_default DESC, m.created_at ASC, m.org_id ASC');
    expect(remediation).toContain('valid_profile_candidate');
    expect(remediation).toContain('fallback_membership');
  });

  it('routes organization membership through the tenant-aware People & Access surface', () => {
    expect(peopleLayout).toContain("location.pathname === '/teams' && !!activeOrganization");
    expect(peopleLayout).toContain("can('tenant.view_members')");
    expect(people).toContain("rpc('tenant_people_access_snapshot')");
    expect(people).toContain("rpc('set_active_org_member_role'");
    expect(people).toContain("rpc('remove_active_org_member'");
    expect(people).not.toContain('Recent Simulation Runs');
    expect(people).not.toContain('Full platform access');
    expect(people).not.toContain('marketing');
    expect(people).not.toContain('sales');
    expect(people).not.toContain('finance');
  });

  it('surfaces invitation delivery and expiry instead of unconditional success', () => {
    expect(people).toContain("delivery?.status");
    expect(people).toContain('Invitation created, but email delivery');
    expect(customers).toContain('Owner invite expired');
    expect(customers).toContain("mode: 'platform_resend_owner'");
    expect(customers).toContain('invitation email delivery is');
  });

  it('keeps platform provisioning and tenant invitations in one guarded Edge boundary', () => {
    expect(invite).toContain('requireCaller(req)');
    expect(invite).toContain("mode === 'platform_provision'");
    expect(invite).toContain("mode === 'platform_resend_owner'");
    expect(invite).toContain("authClient.rpc('active_org_id')");
    expect(invite).toContain("check_scope: 'global'");
  });
});
