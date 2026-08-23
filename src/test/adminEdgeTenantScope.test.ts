import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ADMIN_FUNCTIONS = [
  'analytics-overview',
  'analytics-export',
  'analytics-systems',
  'ai-systems',
  'ops-heartbeat',
  'ops-overview',
  'ops-systems',
] as const;

describe('administrative Edge Function tenant scope', () => {
  it('loads canonical organization membership and approval state together', () => {
    const source = readFileSync('supabase/functions/_shared/auth.ts', 'utf8');
    expect(source).toContain('.select("org_id, is_approved")');
    expect(source).toContain('.limit(2)');
  });

  it('keeps the affected caller inventory explicit and tenant-scoped', () => {
    for (const name of ADMIN_FUNCTIONS) {
      const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
      expect(source, name).toMatch(/authLevel:\s*["']admin["']/);
      expect(source, name).toContain('organizationId');
      expect(source, name).toMatch(/\.eq\(["']org_id["'], organizationId\)/);
    }
  });

  it('rejects cross-tenant system filters in every analytics caller', () => {
    for (const name of ['analytics-overview', 'analytics-export', 'analytics-systems']) {
      const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
      expect(source, name).toContain('TENANT_SCOPE_VIOLATION');
    }
  });

  it('keeps gateway JWT verification explicit for every administrative caller', () => {
    const config = readFileSync('supabase/config.toml', 'utf8');
    for (const name of ADMIN_FUNCTIONS) {
      expect(config, name).toMatch(
        new RegExp(`\\[functions\\.${name}\\]\\s+verify_jwt\\s*=\\s*true`),
      );
    }
  });
});
