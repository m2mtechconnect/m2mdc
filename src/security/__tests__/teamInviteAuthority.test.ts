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
  const acceptFn = read('supabase/functions/teams-accept-invite/index.ts');
  const boundary = read('supabase/migrations/20260901113000_reassert_invitation_write_boundary.sql');
  const transaction = read('supabase/migrations/20260901120000_bind_invitation_transactions_to_actor.sql');
  const profileAuthority = read('supabase/migrations/20260901121000_recognize_trusted_profile_authority.sql');
  const credential = read('supabase/functions/_shared/serviceCredential.ts');

  it('verifies approval and active org member-management authority before the actor-bound transaction', () => {
    const profileCheck = fn.indexOf("from('profiles')");
    const activeOrgCheck = fn.indexOf("authClient.rpc('active_org_id')");
    const membershipCheck = fn.indexOf("from('org_memberships')", activeOrgCheck);
    const roleCheck = fn.indexOf('INVITER_ROLES.has', membershipCheck);
    const actorTransaction = fn.indexOf("authClient.rpc('create_org_invite'", membershipCheck);

    expect(fn).toContain("const INVITER_ROLES = new Set(['admin', 'owner', 'security_admin'])");
    expect(profileCheck).toBeGreaterThanOrEqual(0);
    expect(activeOrgCheck).toBeGreaterThan(profileCheck);
    expect(membershipCheck).toBeGreaterThan(activeOrgCheck);
    expect(roleCheck).toBeGreaterThan(membershipCheck);
    expect(actorTransaction).toBeGreaterThan(roleCheck);
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
    expect(fn).toContain("authClient.rpc('create_org_invite'");
    expect(transaction).toContain('v_org_id := public.active_org_id()');
    expect(transaction).toContain("v_email, _role, v_user_id, v_org_id, trim(_token), _expires_at, 'pending'");
    const returnShape = transaction.slice(transaction.indexOf('RETURNS TABLE ('), transaction.indexOf('LANGUAGE plpgsql'));
    expect(returnShape).not.toMatch(/\btoken\b/);
  });

  it('accepts invitations atomically only for the authenticated JWT email', () => {
    expect(acceptFn).toContain("authClient.rpc('accept_org_invite_token'");
    expect(acceptFn).not.toContain('createSupabaseServiceClient');
    expect(transaction).toContain("v_email text := lower(trim(COALESCE(auth.jwt() ->> 'email', '')))");
    expect(transaction).toContain('IF lower(v_invite.email) <> v_email THEN');
    expect(transaction).toContain("UPDATE public.team_invites SET status = 'accepted'");
    expect(profileAuthority).toContain("current_user IN ('postgres', 'service_role', 'supabase_admin')");
    expect(profileAuthority).toContain('non-admin caller cannot modify security-sensitive columns');
  });

  it('keeps invitation tokens and writes behind the service boundary', () => {
    expect(boundary).toContain('REVOKE ALL ON public.team_invites FROM PUBLIC, anon, authenticated');
    expect(boundary).toContain('GRANT SELECT (id, email, role, status, invited_by, org_id, expires_at, created_at)');
    expect(boundary).toContain('GRANT ALL ON public.team_invites TO service_role');
    expect(boundary).not.toMatch(/GRANT SELECT \([^)]*token/);
    expect(boundary).not.toMatch(/GRANT (?:INSERT|UPDATE|DELETE) .* TO authenticated/);
  });

  it('reports a bounded failure stage without returning privileged database details', () => {
    expect(fn).toContain("let failureStage = 'authentication'");
    expect(fn).toContain("failureStage = 'invite-write'");
    expect(fn).toContain('stage: failureStage');
    expect(fn).toContain('diagnosticCode');
    expect(fn).not.toContain('details: error');
  });

  it('uses a validated dedicated secret key with a legacy service-role fallback', () => {
    expect(credential).toContain("Deno.env.get('AURA_SUPABASE_SERVICE_KEY')");
    expect(credential).toContain("Deno.env.get('AURA_SUPABASE_SECRET_KEY')");
    expect(credential).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
    expect(credential).toContain('credential === anonKey');
    expect(credential).toContain('persistSession: false');
    expect(credential).toContain('autoRefreshToken: false');
    expect(credential).toContain('detectSessionInUrl: false');
    expect(credential).toContain('input instanceof Request ? input.headers : undefined');
    expect(credential).toContain('new Request(input, { ...init, headers })');
    expect(credential).toContain("headers.delete('Authorization')");
    expect(credential).toContain('global: { fetch: serviceFetch }');
    expect(fn).toContain('createSupabaseServiceClient()');
  });

  it('keeps the legacy platform Teams read explicit while tenant People & Access uses its guarded snapshot RPC', () => {
    const teams = read('src/pages/Teams.tsx');
    const tenantPeople = read('src/pages/people/TenantPeopleAccess.tsx');
    expect(teams).toContain('.select("id, email, role, status, invited_by, expires_at, created_at")');
    expect(teams).not.toMatch(/from\("team_invites"\)\s*\n\s*\.select\("\*"\)/);
    expect(tenantPeople).toContain("rpc('tenant_people_access_snapshot')");
  });
});
