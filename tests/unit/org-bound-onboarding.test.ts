import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
  .replace(/\r\n/g, '\n');

const migration = read('supabase/migrations/20260823222000_org_bound_onboarding.sql');
const actorMigration = read('supabase/migrations/20260901120000_bind_invitation_transactions_to_actor.sql');
const inviteFn = read('supabase/functions/teams-invite/index.ts');
const acceptFn = read('supabase/functions/teams-accept-invite/index.ts');
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

  it('binds ordinary invitations to the server-resolved active organization and org role', () => {
    const rolesStart = inviteFn.indexOf('const INVITABLE_ROLES');
    const rolesEnd = inviteFn.indexOf(']);', rolesStart);
    const roles = inviteFn.slice(rolesStart, rolesEnd);
    expect(roles).toContain("'admin'");
    expect(roles).not.toContain("'owner'");

    expect(inviteFn).toContain("authClient.rpc('active_org_id')");
    expect(inviteFn).toContain(".from('org_memberships')");
    expect(inviteFn).toContain("authClient.rpc('create_org_invite'");
    expect(actorMigration).toContain('v_org_id := public.active_org_id()');
    expect(actorMigration).toContain('v_email, _role, v_user_id, v_org_id');
    expect(inviteFn).not.toContain(".from('user_roles')");
    expect(inviteFn).toContain("const INVITER_ROLES = new Set(['admin', 'owner', 'security_admin'])");

    const profileCheck = inviteFn.indexOf('if (!profile?.is_approved)');
    const membershipCheck = inviteFn.indexOf('if (!membership || membership.status');
    const tenantTransaction = inviteFn.indexOf("authClient.rpc('create_org_invite'", membershipCheck);
    expect(profileCheck).toBeGreaterThan(-1);
    expect(membershipCheck).toBeGreaterThan(profileCheck);
    expect(tenantTransaction).toBeGreaterThan(membershipCheck);
  });

  it('accepts only organization-bound invites through the transactional membership RPC', () => {
    expect(acceptFn).toContain("authClient.rpc('accept_org_invite_token'");
    expect(acceptFn).not.toContain('createSupabaseServiceClient');
    expect(acceptFn).not.toContain(".from('user_roles')");
    expect(actorMigration).toContain("auth.jwt() ->> 'email'");
    expect(actorMigration).toContain('INSERT INTO public.org_memberships');
    expect(actorMigration).toContain('SET is_approved = true');
    expect(actorMigration).toContain("UPDATE public.team_invites SET status = 'accepted'");
  });

  it('restricts first-customer provisioning to an approved global platform owner before service role creation', () => {
    expect(inviteFn).toContain("mode === 'platform_provision'");
    expect(inviteFn).toContain(".select('is_approved')");
    expect(inviteFn).toContain("authClient.rpc('user_has_role'");
    expect(inviteFn).toContain("check_role: 'owner'");
    expect(inviteFn).toContain("check_scope: 'global'");
    expect(inviteFn).toContain("serviceClient.rpc('platform_provision_organization'");

    const ownerCheck = inviteFn.indexOf('if (isPlatformOwner !== true)');
    const platformServiceClient = inviteFn.indexOf('const serviceClient = createSupabaseServiceClient()', ownerCheck);
    expect(ownerCheck).toBeGreaterThan(-1);
    expect(platformServiceClient).toBeGreaterThan(ownerCheck);
  });

  it('pins both onboarding Edge Functions behind gateway JWT verification', () => {
    for (const name of ['teams-invite', 'teams-accept-invite']) {
      expect(config).toContain(`[functions.${name}]\nverify_jwt = true`);
    }
    expect(config).not.toContain('[functions.organization-provision]');
    expect(config).not.toContain('[functions.organization-list]');
  });
});
