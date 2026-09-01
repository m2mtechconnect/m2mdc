import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const runs = read('src/workspace/runPersistence.ts');
const decisions = read('src/workspace/decisionPersistence.ts');
const panel = read('src/workspace/panels/DecidePanel.tsx');
const endpoint = read('supabase/functions/record-decision/index.ts');
const lifecycle = read('supabase/functions/run-lifecycle/index.ts');
const store = read('src/workspace/workspaceStore.ts');
const handoffMigration = read('supabase/migrations/20260901093000_cross_persona_decision_handoff.sql');
const dashboard = read('src/workspace/CommandCentre.tsx');

describe('Phase 5 simulation and decision continuity', () => {
  it('persists browser simulations as active-org preview evidence only', () => {
    expect(runs).toContain("supabase.functions.invoke('run-lifecycle'");
    expect(runs).toContain("requestedIntent: 'preview'");
    expect(runs).toContain("requestedProvider: 'aura-deterministic-browser'");
    expect(lifecycle).toContain("const SERVER_VERIFIABLE_PROVIDERS: string[] = []");
    expect(lifecycle).toContain('const runIntent = verifiable');
    expect(lifecycle).toContain('tenant_id: activeOrgId');
  });

  it('hydrates durable decision outcomes back into workspace runs', () => {
    expect(runs).toContain("from('decision_records')");
    expect(runs).toContain("outcome === 'approved'");
    expect(runs).toContain("outcome === 'escalated'");
    expect(runs).toContain('decisionRecords');
    expect(dashboard).toContain('useDurableWorkspaceRuns(facility.id)');
  });

  it('allows active members to read the tenant handoff without widening write authority', () => {
    expect(handoffMigration).toContain('CREATE POLICY simulation_runs_org_read');
    expect(handoffMigration).toContain('CREATE POLICY decision_records_org_read');
    expect(handoffMigration).toContain('DROP POLICY IF EXISTS "simulation_runs_select_admin"');
    expect(handoffMigration).toContain('DROP POLICY IF EXISTS "simulation_runs_select_own"');
    expect(handoffMigration).toContain('DROP POLICY IF EXISTS "decision_records_select_own"');
    expect(handoffMigration.match(/public\.active_org_id\(\)/g)).toHaveLength(2);
    expect(handoffMigration.match(/public\.is_org_member\(tenant_id, auth\.uid\(\)\)/g)).toHaveLength(2);
    expect(handoffMigration.match(/tenant_id IS NULL OR tenant_id = user_id/g)).toHaveLength(2);
    expect(handoffMigration).not.toMatch(/FOR (?:INSERT|UPDATE|DELETE|ALL)/);
  });

  it('derives decision tenant and authority server-side', () => {
    expect(endpoint).toContain("supabase.rpc('active_org_id')");
    expect(endpoint).toContain("supabase.rpc('org_has_role'");
    expect(endpoint).toContain('tenant_id: activeOrgId');
    expect(endpoint).not.toContain('tenant_id: userId');
    expect(endpoint).toContain("run.tenant_id !== activeOrgId");
    expect(endpoint).toContain("run.run_intent !== 'authoritative'");
  });

  it('records server evidence before updating local presentation state', () => {
    expect(decisions).toContain("supabase.functions.invoke('record-decision'");
    expect(panel).toContain('await persistDecision');
    expect(panel.indexOf('await persistDecision')).toBeLessThan(panel.indexOf('recordDecision(run.id'));
  });

  it('does not offer approval for unverified client runs', () => {
    expect(panel).toContain("run.validationStatus === 'server-validated'");
    expect(panel).toContain('it cannot be approved');
    expect(decisions).toContain("input.outcome === 'approved'");
    expect(decisions).toContain("input.run.validationStatus !== 'server-validated'");
  });

  it('still requires explicit assumption review before executing a simulation', () => {
    expect(store).toContain('if (!assumptionsReviewed)');
    expect(store).toContain('Execution was not attempted.');
  });
});
