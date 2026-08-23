import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const migration = read('supabase/migrations/20260823222000_org_bound_onboarding.sql');
const inviteFn = read('supabase/functions/teams-invite/index.ts');
const acceptFn = read('supabase/functions/teams-accept-invite/index.ts');
const provisionFn = read('supabase/functions/organization-provision/index.ts');
const config = read('supabase/config.toml');

describe('organization-bound onboarding', () => {
  it('normalizes invitation roles and keeps privileged onboarding RPCs service-role only', () => {
    expect(migration).toContain('ALTER COLUMN role TYPE text USING role::text');
    expect(migration).toContain('CONSTRAINT team_invites_role_check CHECK');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.platform_provision_organization');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.accept_org_invite');
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.platform_provision_organization(text, text, text, text, uuid) TO service_role',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.accept_org_invite(uuid, uuid) TO service_role',
    );
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.(?:platform_provision_organization|accept_org_invite)[^;]+TO authenticated/i);
  });

  it('binds ordinary invitations to the caller active organization and org role', () => {
    const rolesStart = inviteFn.indexOf('const INVITABLE_ROLES');
    const rolesEnd = inviteFn.indexOf(']);', rolesStart);
    const roles = inviteFn.slice(rolesStart, rolesEnd);
    expect(roles).toContain("'admin'");
    expect(roles).not.toContain("'owner'");

    expect(inviteFn).toContain(".select('is_approved, last_active_org_id, org_id')");
    expect(inviteFn).toContain(".from('org_memberships')");
    expect(inviteFn).toContain("org_id: orgId");
    expect(inviteFn).not.toContain(".from('user_roles')");

    const profileCheck = inviteFn.indexOf('if (!profile?.is_approved)');
    const membershipCheck = inviteFn.indexOf('if (!membership || membership.status');
    const serviceKey = inviteFn.indexOf('SUPABASE_SERVICE_ROLE_KEY');
    expect(profileCheck).toBeGreaterThan(-1);
    expect(membershipCheck).toBeGreaterThan(profileCheck);
    expect(serviceKey).toBeGreaterThan(membershipCheck);
  });

  it('accepts only organization-bound invites through the transactional membership RPC', () => {
    expect(acceptFn).toContain(".select('id, email, role, status, invited_by, org_id, expires_at')");
    expect(acceptFn).toContain("if (!invite.org_id)");
    expect(acceptFn).toContain("serviceClient.rpc('accept_org_invite'");
    expect(acceptFn).not.toContain(".from('user_roles')");
    expect(migration).toContain("INSERT INTO public.org_memberships");
    expect(migration).toContain("SET is_approved = true");
    expect(migration).toContain("SET status = 'accepted'");
  });

  it('restricts first-customer provisioning to an approved global platform owner before service role creation', () => {
    expect(provisionFn).toContain(".select('is_approved')");
    expect(provisionFn).toContain("authClient.rpc('user_has_role'");
    expect(provisionFn).toContain("check_role: 'owner'");
    expect(provisionFn).toContain("check_scope: 'global'");
    expect(provisionFn).toContain("serviceClient.rpc('platform_provision_organization'");

    const approvalCheck = provisionFn.indexOf('if (!profile?.is_approved)');
    const ownerCheck = provisionFn.indexOf('if (isPlatformOwner !== true)');
    const serviceKey = provisionFn.indexOf('SUPABASE_SERVICE_ROLE_KEY');
    expect(approvalCheck).toBeGreaterThan(-1);
    expect(ownerCheck).toBeGreaterThan(approvalCheck);
    expect(serviceKey).toBeGreaterThan(ownerCheck);
  });

  it('pins all onboarding functions behind gateway JWT verification', () => {
    for (const name of ['organization-provision', 'teams-invite', 'teams-accept-invite']) {
      expect(config).toContain(`[functions.${name}]\nverify_jwt = true`);
    }
  });
});
