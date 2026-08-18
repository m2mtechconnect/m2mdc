import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/**
 * An invite mints a role-bearing acceptance token, so it is an administrative
 * action: authority is verified server-side and the token never crosses the
 * Data API.
 */
describe('team invite authority', () => {
  const fn = read('supabase/functions/teams-invite/index.ts');

  it('verifies the caller holds admin or owner before minting an invite', () => {
    expect(fn).toContain("INVITER_ROLES = ['admin', 'owner']");
    expect(fn).toContain("from('user_roles')");
    expect(fn).toContain('status: 403');
  });

  it('restricts the conferrable role to a non-privileged allowlist', () => {
    expect(fn).toContain('INVITABLE_ROLES');
    for (const privileged of ['admin', 'owner', 'security_admin']) {
      expect(fn).not.toMatch(new RegExp(`INVITABLE_ROLES = new Set\\(\\[[^\\]]*'${privileged}'`, 's'));
    }
  });

  it('never returns the acceptance token to the caller', () => {
    expect(fn).not.toMatch(/\.select\(\)\s*\n?\s*\.single\(\)/);
    expect(fn).toContain(".select('id, email, role, status, invited_by, expires_at, created_at')");
  });

  it('reads invites with an explicit column list that omits the token', () => {
    const teams = read('src/pages/Teams.tsx');
    expect(teams).toContain('.select("id, email, role, status, invited_by, expires_at, created_at")');
    expect(teams).not.toMatch(/from\("team_invites"\)\s*\n\s*\.select\("\*"\)/);
  });
});
