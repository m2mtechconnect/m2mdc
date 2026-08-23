import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const listFunction = read('supabase/functions/organization-list/index.ts');
const config = read('supabase/config.toml');
const shell = read('src/AuthenticatedShell.tsx');
const router = read('src/ApprovedUserRouter.tsx');
const rbac = read('src/contexts/RBACContext.tsx');

describe('platform customer console boundary', () => {
  it('authorizes approved platform owner before constructing a service client', () => {
    const approvalCheck = listFunction.indexOf("if (!profile?.is_approved)");
    const ownerCheck = listFunction.indexOf("if (isPlatformOwner !== true)");
    const serviceClient = listFunction.indexOf("const serviceClient = createClient");

    expect(approvalCheck).toBeGreaterThanOrEqual(0);
    expect(ownerCheck).toBeGreaterThan(approvalCheck);
    expect(serviceClient).toBeGreaterThan(ownerCheck);
  });

  it('keeps the customer inventory behind JWT verification and a dedicated permission', () => {
    expect(config).toContain('[functions.organization-list]\nverify_jwt = true');
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
