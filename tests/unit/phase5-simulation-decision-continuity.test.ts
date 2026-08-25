import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const runs = read('src/workspace/runPersistence.ts');
const decisions = read('src/workspace/decisionPersistence.ts');
const panel = read('src/workspace/panels/DecidePanel.tsx');
const endpoint = read('supabase/functions/record-decision/index.ts');
const store = read('src/workspace/workspaceStore.ts');

describe('Phase 5 simulation and decision continuity', () => {
  it('persists browser simulations as active-org preview evidence only', () => {
    expect(runs).toContain("rpc('active_org_id')");
    expect(runs).toContain('tenant_id: tenantId');
    expect(runs).toContain("lifecycle_status: 'succeeded'");
    expect(runs).toContain("run_intent: 'preview'");
    expect(runs).toContain("verification_level: 'client-produced-unverified'");
    expect(runs).toContain("execution_origin: 'client-browser'");
  });

  it('hydrates durable decision outcomes back into workspace runs', () => {
    expect(runs).toContain("from('decision_records')");
    expect(runs).toContain("outcome === 'approved'");
    expect(runs).toContain("outcome === 'escalated'");
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
