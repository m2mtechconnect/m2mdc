import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260823230000_storage_audit_tenancy.sql'),
  'utf8',
);

describe('tenant storage and audit isolation', () => {
  it('creates a private organization-prefixed asset bucket', () => {
    expect(sql).toContain("VALUES ('aura-tenant-assets', 'aura-tenant-assets', false)");
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.storage_object_org_id(_name text)');
    expect(sql).toContain("bucket_id = 'aura-tenant-assets'");
    expect(sql).toContain('public.storage_object_org_id(name) = public.active_org_id()');
    expect(sql).toContain('public.is_org_member(public.storage_object_org_id(name), auth.uid())');
  });

  it('keeps tenant asset writes role-scoped and deletes owner/admin only', () => {
    expect(sql).toContain("ARRAY['owner','admin','operator','engineer','manager']::text[]");
    expect(sql).toContain("ARRAY['owner','admin']::text[]");
    expect(sql).toContain('CREATE POLICY aura_tenant_assets_delete');
  });

  it('stamps user audit events to the active organization', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.stamp_audit_org_id()');
    expect(sql).toContain("RAISE EXCEPTION 'active organization is required for user audit events'");
    expect(sql).toContain('NEW.org_id := v_org_id');
    expect(sql).toContain('CREATE TRIGGER audit_logs_stamp_org');
  });

  it('removes global role audit visibility and replaces it with organization roles', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs');
    expect(sql).toContain('DROP POLICY IF EXISTS "Security admins can view audit logs" ON public.audit_logs');
    expect(sql).toContain('CREATE POLICY audit_logs_org_read');
    expect(sql).toContain("ARRAY['owner','admin','security_admin','executive']::text[]");
    expect(sql).not.toMatch(/CREATE\s+POLICY\s+"Admins can view audit logs"/i);
    expect(sql).not.toMatch(/CREATE\s+POLICY\s+"Security admins can view audit logs"/i);
  });

  it('allows platform-scoped service audit rows to remain tenantless but never customer-readable', () => {
    expect(sql).toContain('retain NULL as a platform');
    expect(sql).toContain('org_id IS NOT NULL');
  });
});