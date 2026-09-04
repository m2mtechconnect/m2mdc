import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const persistence = read('src/workspace/runPersistence.ts');
const store = read('src/workspace/workspaceStore.ts');
const decisions = read('src/workspace/decisionPersistence.ts');
const decisionEndpoint = read('supabase/functions/record-decision/index.ts');
const lifecycleEndpoint = read('supabase/functions/run-lifecycle/index.ts');
const exportSource = read('src/workspace/runExport.ts');
const comparePanel = read('src/workspace/panels/ComparePanel.tsx');
const decidePanel = read('src/workspace/panels/DecidePanel.tsx');

describe('Phase 1 trusted vertical slice', () => {
  it('resolves active tenant context before the browser can invoke run persistence', () => {
    const tenantIndex = persistence.indexOf('const tenantId = await activeOrganizationId();');
    const invokeIndex = persistence.indexOf("supabase.functions.invoke('run-lifecycle'");

    expect(tenantIndex).toBeGreaterThan(-1);
    expect(invokeIndex).toBeGreaterThan(-1);
    expect(tenantIndex).toBeLessThan(invokeIndex);
    expect(persistence).toContain('An active organization is required before a simulation run can be saved.');
    expect(persistence).not.toContain('tenantId,');
  });

  it('keeps the browser execution preview-only and records every lifecycle outcome', () => {
    expect(persistence).toContain("requestedIntent: 'preview'");
    expect(persistence).toContain("requestedExecutionClass: 'browser-preview'");
    expect(persistence).toContain("to: 'running'");
    expect(persistence).toContain("to: 'succeeded'");
    expect(persistence).toContain("to: 'failed'");
    expect(lifecycleEndpoint).toContain("const SERVER_VERIFIABLE_PROVIDERS: string[] = []");
    expect(lifecycleEndpoint).toContain('Terminal states are absorbing');
    expect(lifecycleEndpoint).toContain('activeOrgId');
  });

  it('hydrates runs and decisions through the same tenant authority', () => {
    const runQuery = persistence.indexOf(".from('simulation_runs')");
    const decisionQuery = persistence.indexOf(".from('decision_records')");
    expect(runQuery).toBeGreaterThan(-1);
    expect(decisionQuery).toBeGreaterThan(runQuery);
    expect(persistence).toContain(".eq('tenant_id', tenantId)");
    expect(persistence).toContain('.in(\'run_id\', runIds)');
    expect(persistence).toContain('applyDecisionRowsToRuns');
  });

  it('requires reviewed inputs and durable persistence before the workspace shows success', () => {
    expect(store).toContain('if (isRunning) return null;');
    expect(store).toContain('if (!assumptionsReviewed)');
    expect(store).toContain('const outcome = await persistRun({');
    expect(store).toContain("if (outcome.status === 'unsaved')");
    expect(store.indexOf('const outcome = await persistRun({')).toBeLessThan(store.indexOf('runs: [run,'));
  });

  it('keeps human decisions behind the server-owned evidence boundary', () => {
    expect(decisions).toContain("supabase.functions.invoke('record-decision'");
    expect(decisions).toContain('Unverified simulation previews cannot be approved.');
    expect(decisionEndpoint).toContain("supabase.rpc('active_org_id')");
    expect(decisionEndpoint).toContain("supabase.rpc('org_has_role'");
    expect(decisionEndpoint).toContain('run.tenant_id !== activeOrgId');
    expect(decisionEndpoint).toContain("run.run_intent !== 'authoritative'");
    expect(decidePanel.indexOf('await persistDecision')).toBeLessThan(decidePanel.indexOf('recordDecision(run.id'));
  });

  it('exports only provenance-labelled records and exposes export from review surfaces', () => {
    expect(exportSource).toContain("provenance: 'simulated'");
    expect(exportSource).toContain('decisionRecords');
    expect(exportSource).toContain('buildExportOperatingState');
    expect(comparePanel).toContain('<RunExportControls run={exportRun ?? null} />');
    expect(decidePanel).toContain('<RunExportControls run={run} />');
  });
});
