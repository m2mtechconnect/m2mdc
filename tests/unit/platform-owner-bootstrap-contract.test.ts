import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20260826224000_bootstrap_initial_platform_owner.sql', import.meta.url),
  'utf8',
);

describe('initial platform owner bootstrap', () => {
  it('fails closed unless there is no owner and exactly one confirmed target user', () => {
    expect(migration).toContain("role = 'owner'::public.app_role");
    expect(migration).toContain("expires_at IS NULL OR expires_at > now()");
    expect(migration).toContain('IF target_count <> 1 THEN');
    expect(migration).toContain('email_confirmed_at IS NOT NULL');
    expect(migration).toContain('deleted_at IS NULL');
    expect(migration).toContain('INTO STRICT target_user_id');
  });

  it('creates a global owner grant and an audit record atomically', () => {
    expect(migration).toContain("'owner'::public.app_role");
    expect(migration).toContain("'global'");
    expect(migration).toContain("'platform_owner_bootstrapped'");
    expect(migration).toContain('Initial platform-owner bootstrap for controlled QA tenant provisioning');
  });

  it('does not alter the ordinary role grant surface or authorization policies', () => {
    expect(migration).not.toMatch(/alter\s+(table|policy)/i);
    expect(migration).not.toMatch(/disable\s+row\s+level\s+security/i);
    expect(migration).not.toMatch(/security\s+definer/i);
  });
});
