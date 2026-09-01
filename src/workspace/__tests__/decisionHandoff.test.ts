import { describe, expect, it } from 'vitest';
import { applyDecisionRowsToRuns } from '../runPersistence';
import { durableRunOwnerKey } from '../useDurableWorkspaceRuns';
import type { WorkspaceRun } from '../scenarioEngine';

const run: WorkspaceRun = {
  id: 'SIM-1',
  serverId: '11111111-1111-4111-8111-111111111111',
  persistence: 'server',
  scenarioId: 'baseline',
  scenarioLabel: 'Baseline',
  facilityId: '22222222-2222-4222-8222-222222222222',
  facilityName: 'QA Facility',
  startedAt: '2026-09-01T10:00:00.000Z',
  completedAt: '2026-09-01T10:01:00.000Z',
  overrides: { coolingSetpointC: 22, gpuPowerCapPct: 90, workloadDensityPct: 70, renewableMixPct: 80 },
  baseline: {} as WorkspaceRun['baseline'],
  result: {} as WorkspaceRun['result'],
  events: [],
  recommendations: [],
  decisions: {},
};

describe('cross-persona decision handoff', () => {
  it('hydrates the latest state and preserves the complete append-only evidence chain', () => {
    const hydrated = applyDecisionRowsToRuns([run], [
      {
        id: 'd1', run_id: run.serverId!, recommendation_id: 'rec-1', outcome: 'escalated',
        rationale: 'More evidence is required.', approver: 'manager@example.invalid',
        decided_at: '2026-09-01T10:02:00.000Z', snapshot_hash: 'snapshot-1',
        decision_hash: 'decision-1', evidence_schema_version: 'aura-evidence-v1',
      },
      {
        id: 'd2', run_id: run.serverId!, recommendation_id: 'rec-1', outcome: 'rejected',
        rationale: 'The limitation remains unresolved.', approver: 'manager@example.invalid',
        decided_at: '2026-09-01T10:03:00.000Z', snapshot_hash: 'snapshot-2',
        decision_hash: 'decision-2', evidence_schema_version: 'aura-evidence-v1',
      },
    ]);

    expect(hydrated[0].decisions).toEqual({ 'rec-1': 'rejected' });
    expect(hydrated[0].decisionRecords).toHaveLength(2);
    expect(hydrated[0].decisionRecords?.[0]).toMatchObject({ id: 'd1', state: 'deferred' });
    expect(hydrated[0].decisionRecords?.[1]).toMatchObject({ id: 'd2', state: 'rejected' });
  });

  it('keys cached records by identity and active organization', () => {
    expect(durableRunOwnerKey('user-1', 'org-1')).toBe('user-1:org-1');
    expect(durableRunOwnerKey('user-1', null)).toBeNull();
    expect(durableRunOwnerKey(null, 'org-1')).toBeNull();
  });
});
