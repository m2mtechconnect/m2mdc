import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const remediation = read('supabase/migrations/20260824003000_enterprise_audit_remediation.sql');
const inviteFunction = read('supabase/functions/teams-invite/index.ts');
const customers = read('src/pages/admin/Customers.tsx');
const config = read('supabase/config.toml');
const shell = read('src/AuthenticatedShell.tsx');
const router = read('src/ApprovedUserRouter.tsx');
const rbac = read('src/contexts/RBACContext.tsx');

describe('platform customer console boundary', () => {
  it('guards cross-tenant inventory inside the SECURITY DEFINER RPC', () => {
    expect(remediation).toContain('CREATE OR REPLACE FUNCTION public.platform_list_organizations');
    expect(remediation).toContain('SECURITY DEFINER');
    expect(remediation).toContain('p.is_approved = true');
    expect(remediation).toContain("public.user_has_role(v_user_id, 'owner', 'global')");
    expect(remediation).toContain('v_page_size := LEAST');
  });

  it('uses the existing guarded teams-invite boundary for platform provisioning', () => {
    expect(config).toContain('[functions.teams-invite]\nverify_jwt = true');
    expect(config).not.toContain('[functions.organization-list]');
    expect(config).not.toContain('[functions.organization-provision]');
    expect(inviteFunction).toContain("mode === 'platform_provision'");
    expect(inviteFunction).toContain("mode === 'platform_resend_owner'");
    expect(inviteFunction).toContain("check_scope: 'global'");
    expect(customers).toContain("mode: 'platform_provision'");
    expect(customers).toContain("mode: 'platform_resend_owner'");
  });

  it('keeps the customer route behind its dedicated platform permission', () => {
    expect(shell).toContain('permission="platform.manage_customers"');
  });

  it('admits tenant members to the normal shell without making them internal platform users', () => {
    expect(router).toContain("resolution.status === 'internal' || resolution.status === 'tenant'");
    expect(rbac).toContain("| { status: 'tenant'; role: OrganizationRole; orgId: string }");
    expect(rbac).toContain("const isInternal = resolution.status === 'internal'");
  });

  it('flushes tenant-scoped twin selection before an organization switch reload', () => {
    expect(rbac).toContain("localStorage.removeItem('dc_active_location_id')");
    expect(rbac).toContain("localStorage.removeItem('dc_active_twin_id')");
    expect(rbac).toContain("tenantDb.rpc('set_active_org', { _org_id: orgId })");
  });
});
