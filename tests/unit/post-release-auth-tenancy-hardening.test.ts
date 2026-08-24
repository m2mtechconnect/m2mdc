import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260824170000_post_release_authorization_tenancy_hardening.sql'),
  'utf8',
);
const builderCreate = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/builders-create/index.ts'),
  'utf8',
);
const builderGet = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/builders-get/index.ts'),
  'utf8',
);
const rbac = fs.readFileSync(path.resolve(process.cwd(), 'src/contexts/RBACContext.tsx'), 'utf8');

describe('post-release authorization and tenancy hardening', () => {
  it('requires global/null scope for platform role helpers and profile authority', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.has_role');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.check_user_has_role');
    expect(migration).toContain("ur.scope = 'global' OR ur.scope IS NULL");
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_columns');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.dsx_current_user_is_operator_in_org');
    expect(migration).toContain("r.scope = 'global' OR r.scope IS NULL");
  });

  it('keeps replaced role helpers default-deny for anonymous callers', () => {
    expect(migration).toContain(
      'REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role',
    );
  });

  it('adds organization write policies using only canonical tenant writer roles', () => {
    for (const table of [
      'twin_sovereignty_events',
      'twin_carbon_emissions',
      'twin_financial_records',
    ]) {
      expect(migration).toContain(`${table}_org_write`);
      expect(migration).toContain(`ON public.${table} FOR ALL TO authenticated`);
    }
    expect(migration).toContain(
      "ARRAY['owner','admin','operator','engineer','manager']::text[]",
    );
    expect(migration).not.toContain(
      "ARRAY['owner','admin','operator','engineer','manager','executive']::text[]",
    );
  });

  it('binds builder drafts to the server-resolved active organization', () => {
    expect(builderCreate).toContain("supabase.rpc('active_org_id')");
    expect(builderCreate).toContain('org_id: activeOrgId');
    expect(builderCreate).not.toMatch(/InputSchema[\s\S]*org_id/);
  });

  it('uses RLS for current builder reads and keeps legacy drafts owner-only', () => {
    const agentsLookup = builderGet.slice(
      builderGet.indexOf(".from('agents')"),
      builderGet.indexOf('let builder = fetchedBuilder'),
    );
    expect(agentsLookup).toContain(".eq('id', builderId)");
    expect(agentsLookup).not.toContain(".eq('owner_id', userId)");

    const legacyLookup = builderGet.slice(
      builderGet.indexOf(".from('agent_drafts')"),
      builderGet.indexOf('if (legacyError || !legacyDraft)'),
    );
    expect(legacyLookup).toContain(".eq('owner_id', userId)");
    expect(builderGet).toContain("supabase.rpc('active_org_id')");
    expect(builderGet).toContain('org_id: activeOrgId');
  });

  it('purges legacy tenant state after the server approves an organization switch', () => {
    expect(rbac.indexOf("tenantDb.rpc('set_active_org'"))
      .toBeLessThan(rbac.indexOf('clearTenantScopedClientState(window.localStorage, window.sessionStorage)'));
    expect(rbac.indexOf('clearTenantScopedClientState(window.localStorage, window.sessionStorage)'))
      .toBeLessThan(rbac.indexOf("window.location.assign('/dashboard')"));
  });
});
