import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('Phase 9 - deployment records are event-driven, not timer-driven', () => {
  it('Deploy page advances no stage on a timer', () => {
    const source = read('src/pages/Deploy.tsx');
    expect(source).not.toMatch(/setTimeout\(resolve/);
    expect(source).not.toMatch(/setTimeout\(/);
  });

  it('Sovereign deployment steps no longer script phases on timers', () => {
    const source = read('src/twins/sovereignDataCenter/components/SovereignDCDeploymentSteps.tsx');
    expect(source).not.toMatch(/setTimeout/);
    expect(source).not.toMatch(/Simulate phased deployment/);
  });

  it('Deploy page writes through the canonical deployment model', () => {
    const source = read('src/pages/Deploy.tsx');
    expect(source).toContain('@/workspace/deploymentRecords');
    expect(source).toContain('appendDeploymentEvent');
    expect(source).toContain('closeDeployment');
    expect(source).toContain('Failed to append activation failure evidence');
  });

  it('the deprecated deployment_tracking table has no remaining writers', () => {
    const source = read('src/pages/Deploy.tsx');
    expect(source).not.toContain('deployment_tracking');
  });

  it('the event log module never updates or deletes recorded events', () => {
    const source = read('src/workspace/deploymentRecords.ts');
    const eventWrites = source.slice(source.indexOf('appendDeploymentEvent'));
    expect(eventWrites).not.toMatch(/from\('deployment_events'\)\s*\.\s*(update|delete)/);
  });

  it('fails closed when immutable event evidence cannot be appended', () => {
    const source = read('src/workspace/deploymentRecords.ts');
    const append = source.slice(
      source.indexOf('export async function appendDeploymentEvent'),
      source.indexOf('/** Records the terminal database state'),
    );
    expect(append).toContain('if (error) throw error');
    expect(append).not.toContain('console.error');
  });

  it('preserves deployment evidence when a system is removed', () => {
    const source = read('supabase/functions/systems-delete/index.ts');
    expect(source).toContain(".from('deployments')");
    expect(source).toContain(".select('id', { count: 'exact', head: true })");
    expect(source).not.toMatch(/from\('deployments'\)\s*\.\s*delete/);
    expect(source).toContain('Archive it to preserve the audit trail');
  });

  it('hardens organization ownership, relations and grants in one forward migration', () => {
    const source = read('supabase/migrations/20260830184500_harden_deployment_ownership.sql');
    expect(source).toContain('ADD COLUMN IF NOT EXISTS org_id uuid');
    expect(source).toContain('FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE RESTRICT');
    expect(source).toContain('FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT');
    expect(source).toContain('FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE RESTRICT');
    expect(source).toContain('FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE RESTRICT');
    expect(source).toContain('CREATE POLICY deployments_select_authorized');
    expect(source).toContain('REVOKE ALL ON public.deployments FROM anon, authenticated');
    expect(source).toContain('GRANT SELECT, INSERT ON public.deployment_events TO authenticated');
  });
});
