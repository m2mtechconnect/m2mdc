import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260823224500_core_resource_tenancy.sql'),
  'utf8',
);

describe('core resource organization tenancy', () => {
  it('adds tenant ownership to the three core parent resources and backfills from owners', () => {
    for (const table of ['data_centre_twins', 'digital_twins', 'sovereign_dc_facilities']) {
      expect(sql).toContain(`ALTER TABLE public.${table}`);
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT');
    }
    expect(sql).toContain('SET org_id = COALESCE(p.last_active_org_id, p.org_id)');
  });

  it('stamps inserts only into the active organization and prevents user reassignment', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.stamp_active_org_id()');
    expect(sql).toContain('v_org_id := public.active_org_id()');
    expect(sql).toContain('ELSIF NEW.org_id IS DISTINCT FROM v_org_id THEN');
    expect(sql).toContain("RAISE EXCEPTION 'resource organization must match the active organization'");
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.prevent_org_id_reassignment()');
    expect(sql).toContain('OLD.org_id IS DISTINCT FROM NEW.org_id');
  });

  it('moves Connections tenant resolution onto membership-backed active_org_id', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.current_tenant_id()');
    expect(sql).toContain('SELECT public.active_org_id()');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon');
  });

  it('removes the global admin cross-tenant twin bypass', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can view all twins" ON public.data_centre_twins');
    expect(sql).not.toMatch(/CREATE\s+POLICY\s+"Admins can view all twins"/i);
  });

  it('limits creator fallbacks to rows whose parent has no organization', () => {
    expect(sql).toContain('USING (org_id IS NULL AND auth.uid() = created_by_user)');
    expect(sql).toContain('USING (org_id IS NULL AND auth.uid() = user_id)');
    expect(sql).toContain('USING (org_id IS NULL AND auth.uid() = owner_id)');

    for (const child of [
      'digital_twin_runs.twin_id AND t.org_id IS NULL',
      'sovereign_dc_simulation_runs.facility_id AND f.org_id IS NULL',
      'twin_telemetry.twin_id AND t.org_id IS NULL',
      'twin_kpi_snapshots.twin_id AND t.org_id IS NULL',
      'twin_simulation_runs.twin_id AND t.org_id IS NULL',
      'twin_sovereignty_events.twin_id AND t.org_id IS NULL',
      'twin_carbon_emissions.twin_id AND t.org_id IS NULL',
      'twin_financial_records.twin_id AND t.org_id IS NULL',
    ]) {
      expect(sql).toContain(child);
    }
  });

  it('uses membership for reads and tenant roles for writes on organization-owned parents', () => {
    for (const table of ['data_centre_twins', 'digital_twins', 'sovereign_dc_facilities']) {
      expect(sql).toContain(`ON public.${table} FOR SELECT TO authenticated`);
    }
    expect(sql).toContain('public.is_org_member(org_id, auth.uid())');
    expect(sql).toContain("ARRAY['owner','admin','operator','engineer','manager','executive']::text[]");
    expect(sql).toContain("ARRAY['owner','admin']::text[]");
  });
});