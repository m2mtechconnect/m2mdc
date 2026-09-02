import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260902150000_restore_runtime_rpc_contracts.sql',
  'utf8',
);

describe('runtime RPC forward repair', () => {
  it.each([
    'create_facility_setup',
    'create_org_invite',
    'accept_org_invite_token',
  ])('reasserts %s and exposes it only to authenticated callers', (functionName) => {
    expect(migration).toContain(`CREATE OR REPLACE FUNCTION public.${functionName}`);
    expect(migration).toMatch(
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${functionName}\\([\\s\\S]*?FROM PUBLIC, anon;`),
    );
    expect(migration).toMatch(
      new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${functionName}\\([\\s\\S]*?TO authenticated;`),
    );
  });

  it('keeps facility writes bound to the authenticated actor and active organization', () => {
    expect(migration).toContain('v_user_id := auth.uid();');
    expect(migration).toContain('v_org_id := public.active_org_id();');
    expect(migration).toContain('public.org_has_role(');
    expect(migration).toContain("'facility write permission required'");
  });

  it('keeps invitation creation bound to active membership and elevated grants owner-only', () => {
    expect(migration).toContain('m.user_id = v_user_id');
    expect(migration).toContain("m.status = 'active'");
    expect(migration).toContain(
      "IF _role = ANY (ARRAY['admin','security_admin']::text[]) AND v_inviter_role <> 'owner'",
    );
  });

  it('keeps invite acceptance email-bound and fails if the profile is missing', () => {
    expect(migration).toContain('IF lower(v_invite.email) <> v_email THEN');
    expect(migration).toContain("RAISE EXCEPTION 'invite belongs to a different account'");
    expect(migration).toContain("RAISE EXCEPTION 'profile not found'");
  });

  it('is transactional and does not contain destructive schema operations', () => {
    expect(migration.trimStart()).toMatch(/^--[\s\S]*?BEGIN;/);
    expect(migration.trimEnd()).toMatch(/COMMIT;$/);
    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE)\b/i);
  });
});
