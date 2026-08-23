import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('deployment control boundary', () => {
  it('keeps Builder Step 5 as review/handoff rather than a direct deployment executor', () => {
    const source = read('src/components/builder/steps/Step5Deploy.tsx');
    expect(source).not.toContain('deployBuilder(');
    expect(source).not.toContain(".update({ status: 'active' })");
    expect(source).not.toContain('Deploy to Production');
    expect(source).toContain('Open deployment review');
  });

  it('keeps the deployment page free of direct agent activation writes', () => {
    const source = read('src/pages/Deploy.tsx');
    expect(source).not.toMatch(/from\(['"]agents['"]\)[\s\S]{0,500}\.update\(/);
    expect(source).toContain('builderService.deploy(systemId)');
    expect(source).toContain("can('deployment.execute')");
  });

  it('delegates the Edge Function mutation to the DB-authorized transaction RPC', () => {
    const source = read('supabase/functions/builders-deploy/index.ts');
    expect(source).toContain("'activate_builder_deployment'");
    expect(source).not.toMatch(/from\(['"]agents['"]\)[\s\S]{0,500}\.update\(/);
    expect(source).not.toMatch(/from\(['"]deployments['"]\)[\s\S]{0,500}\.insert\(/);
  });

  it('requires approval, an active global deployment role and caller ownership in SQL', () => {
    const sql = read('supabase/migrations/20260823131500_secure_builder_deployment_activation.sql');
    expect(sql).toContain('p.is_approved');
    expect(sql).toContain('v_profile_count <> 1');
    expect(sql).toContain('public.user_roles');
    expect(sql).toContain("ur.scope = 'global'");
    expect(sql).toContain('ur.expires_at > now()');
    expect(sql).toContain('a.owner_id = v_user_id');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('SET search_path = pg_catalog, public');
  });
});
