import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260824031500_tenant_aware_default_twin_provisioning.sql'),
  'utf8',
);

describe('tenant-aware default twin provisioning', () => {
  it('never creates an orphan privileged starter twin', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.provision_default_twin(_user_id uuid)');
    expect(sql).toContain('SET search_path = pg_catalog, public');
    expect(sql).toContain("m.status = 'active'");
    expect(sql).toContain('ORDER BY m.is_default DESC, m.created_at ASC, m.org_id ASC');
    expect(sql).toContain('IF v_org_id IS NULL THEN');
    expect(sql).toContain('RETURN NULL;');
    expect(sql).toContain('created_by_user,\n    org_id');
    expect(sql).toContain('_user_id,\n    v_org_id');
  });

  it('preserves the strict core tenant-stamping boundary', () => {
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION public.stamp_active_org_id');
    expect(sql).not.toContain('DROP TRIGGER');
    expect(sql).not.toContain('DISABLE ROW LEVEL SECURITY');
  });
});
