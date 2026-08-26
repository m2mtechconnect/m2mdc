import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const command = readFileSync(
  path.resolve(process.cwd(), 'scripts/bootstrap-platform-owner.ts'),
  'utf8',
);

describe('initial platform owner bootstrap', () => {
  it('requires explicit authorization and exactly one confirmed target user', () => {
    expect(command).toContain("AURA_ALLOW_OWNER_BOOTSTRAP === '1'");
    expect(command).toContain("AURA_ALLOW_MANAGED_OWNER_BOOTSTRAP === '1'");
    expect(command).toContain('matches.length !== 1');
    expect(command).toContain('user.email_confirmed_at');
    expect(command).toContain('!user.deleted_at');
  });

  it('does nothing when an active global owner exists', () => {
    expect(command).toContain(".eq('role', 'owner')");
    expect(command).toContain(".eq('scope', 'global')");
    expect(command).toContain("reason: 'active_global_owner_exists'");
  });

  it('creates and verifies an audited global owner grant', () => {
    expect(command).toContain("action: 'platform_owner_bootstrapped'");
    expect(command).toContain('Initial platform-owner bootstrap for controlled QA tenant provisioning');
    expect(command).toContain('Owner bootstrap read-back verification failed.');
    expect(command).toContain('owner-grant rollback also failed');
  });

  it('does not weaken authorization or RLS', () => {
    expect(command).not.toMatch(/alter\s+(table|policy)/i);
    expect(command).not.toMatch(/disable\s+row\s+level\s+security/i);
    expect(command).not.toMatch(/security\s+definer/i);
  });
});
