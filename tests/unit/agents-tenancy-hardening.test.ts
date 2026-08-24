import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260824173000_agents_membership_rls_hardening.sql'),
  'utf8',
);
const builderGet = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/builders-get/index.ts'),
  'utf8',
);

const writerRoles = "ARRAY['owner','admin','operator','engineer','manager']::text[]";

describe('agents membership-backed tenancy hardening', () => {
  it('server-stamps the active org for older clients without breaking platform-only legacy inserts', () => {
    const stampFunction = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.stamp_agent_active_org_id()'),
      migration.indexOf('REVOKE ALL ON FUNCTION public.stamp_agent_active_org_id()'),
    );
    expect(stampFunction).toContain('v_org_id := public.active_org_id()');
    expect(stampFunction).toContain('IF v_org_id IS NULL THEN');
    expect(stampFunction).toContain('IF NEW.org_id IS NOT NULL THEN');
    expect(stampFunction).toContain('NEW.org_id := v_org_id');
    expect(stampFunction).toContain('NEW.org_id IS DISTINCT FROM v_org_id');
    expect(migration).toContain('CREATE TRIGGER agents_stamp_org');
    expect(migration).toContain('BEFORE INSERT ON public.agents');
    expect(migration).toContain('EXECUTE FUNCTION public.stamp_agent_active_org_id()');
  });

  it('removes overlapping legacy agents policies before creating canonical replacements', () => {
    for (const policy of [
      '"Users can view agents in their org"',
      '"Users can view their own agents"',
      'agents_select_own',
      '"Users can create their own agents"',
      'agents_insert_own',
      '"Users can update their own agents"',
      'agents_update_own',
      '"Users can delete their own agents"',
      'agents_delete_own',
    ]) {
      expect(migration).toContain(`DROP POLICY IF EXISTS ${policy} ON public.agents`);
    }
  });

  it('authorizes org-owned agent reads from authoritative active membership, not profiles.org_id', () => {
    const selectPolicy = migration.slice(
      migration.indexOf('CREATE POLICY agents_select_authorized'),
      migration.indexOf('CREATE POLICY agents_insert_authorized'),
    );
    expect(selectPolicy).toContain('(org_id IS NULL AND owner_id = auth.uid())');
    expect(selectPolicy).toContain('public.is_org_member(org_id, auth.uid())');
    expect(selectPolicy).not.toContain('public.profiles');
    expect(selectPolicy).not.toContain('profiles.org_id');
  });

  it('binds tenant inserts to the server-resolved active org and canonical writer roles', () => {
    const insertPolicy = migration.slice(
      migration.indexOf('CREATE POLICY agents_insert_authorized'),
      migration.indexOf('CREATE POLICY agents_update_authorized'),
    );
    expect(insertPolicy).toContain('owner_id = auth.uid()');
    expect(insertPolicy).toContain('(org_id IS NULL AND public.active_org_id() IS NULL)');
    expect(insertPolicy).toContain('org_id = public.active_org_id()');
    expect(insertPolicy).toContain(writerRoles);
    expect(insertPolicy).not.toContain("'executive'");
  });

  it('keeps tenant writes narrow and tenant deletes owner/admin only', () => {
    const updatePolicy = migration.slice(
      migration.indexOf('CREATE POLICY agents_update_authorized'),
      migration.indexOf('CREATE POLICY agents_delete_authorized'),
    );
    expect(updatePolicy).toContain(writerRoles);
    expect(updatePolicy).not.toContain("'executive'");

    const deletePolicy = migration.slice(
      migration.indexOf('CREATE POLICY agents_delete_authorized'),
      migration.indexOf('DROP TRIGGER IF EXISTS agents_lock_org'),
    );
    expect(deletePolicy).toContain("ARRAY['owner','admin']::text[]");
    expect(deletePolicy).not.toContain("'operator'");
    expect(deletePolicy).not.toContain("'executive'");
  });

  it('prevents authenticated organization reassignment and keeps builders-get on the RLS path', () => {
    expect(migration).toContain('CREATE TRIGGER agents_lock_org');
    expect(migration).toContain('EXECUTE FUNCTION public.prevent_org_id_reassignment()');

    const agentsLookup = builderGet.slice(
      builderGet.indexOf(".from('agents')"),
      builderGet.indexOf('let builder = fetchedBuilder'),
    );
    expect(agentsLookup).toContain(".eq('id', builderId)");
    expect(agentsLookup).not.toContain(".eq('owner_id', userId)");
  });
});
