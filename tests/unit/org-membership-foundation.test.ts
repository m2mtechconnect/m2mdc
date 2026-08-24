import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260823220500_org_membership_foundation.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('enterprise tenancy foundation migration', () => {
  it('keeps the legacy tenant bridge intact', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS last_active_org_id');
    expect(sql).toContain('UPDATE public.profiles\nSET last_active_org_id = org_id');
    expect(sql).not.toMatch(/DROP\s+COLUMN\s+(IF\s+EXISTS\s+)?org_id/i);
    expect(sql).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.current_tenant_id/i);
  });

  it('creates a unique organization membership boundary with RLS', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.org_memberships');
    expect(sql).toContain('UNIQUE (org_id, user_id)');
    expect(sql).toContain("status = ANY (ARRAY['pending','active','suspended']::text[])");
    expect(sql).toContain('ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY org_memberships_read');
    expect(sql).not.toMatch(/CREATE\s+POLICY\s+org_memberships_.*(?:insert|update|write|delete)/i);
  });

  it('requires active membership before changing active organization', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.set_active_org(_org_id uuid)');
    expect(sql).toContain('IF NOT public.is_org_member(_org_id, auth.uid()) THEN');
    expect(sql).toContain("RAISE EXCEPTION 'organization membership required'");
    expect(sql).toContain('UPDATE public.profiles');
    expect(sql).toContain('SET last_active_org_id = _org_id,\n      org_id = _org_id,');
  });

  it('uses hardened security-definer helpers', () => {
    for (const signature of [
      'public.is_org_member(_org_id uuid, _user_id uuid)',
      'public.org_has_role(_org_id uuid, _user_id uuid, _roles text[])',
      'public.active_org_id()',
      'public.set_active_org(_org_id uuid)',
    ]) {
      const start = sql.indexOf(`CREATE OR REPLACE FUNCTION ${signature}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const block = sql.slice(start, start + 700);
      expect(block).toContain('SECURITY DEFINER');
      expect(block).toContain('SET search_path = public');
    }

    expect(sql).toContain('REVOKE ALL ON FUNCTION public.active_org_id() FROM PUBLIC');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.set_active_org(uuid) FROM PUBLIC');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.set_active_org(uuid) TO authenticated');
  });

  it('backfills memberships from existing profile organization links', () => {
    expect(sql).toContain('INSERT INTO public.org_memberships (org_id, user_id, role, status, is_default)');
    expect(sql).toContain('FROM public.profiles p');
    expect(sql).toContain('WHERE p.org_id IS NOT NULL');
  });
});