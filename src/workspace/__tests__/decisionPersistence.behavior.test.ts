import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRun } from '../scenarioEngine';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
  },
}));

import { persistDecision } from '../decisionPersistence';

const run = {
  id: 'SIM-2026-09-04-001',
  serverId: '11111111-1111-4111-8111-111111111111',
  validationStatus: 'client-produced-unverified',
} as WorkspaceRun;

describe('durable decision response handling', () => {
  beforeEach(() => invoke.mockReset());

  it('unwraps the standardized Edge response envelope', async () => {
    const decision = {
      id: '22222222-2222-4222-8222-222222222222',
      run_id: run.serverId,
      outcome: 'rejected' as const,
      decided_at: '2026-09-04T20:00:00.000Z',
      snapshot_hash: 'sha256:snapshot',
      decision_hash: 'sha256:decision',
    };
    invoke.mockResolvedValue({
      data: { success: true, data: { decision }, error: null, correlationId: 'corr-1' },
      error: null,
    });

    await expect(persistDecision({
      run,
      recommendationId: 'rec-1',
      outcome: 'rejected',
      rationale: 'QA rejected the simulated evidence for review.',
    })).resolves.toEqual(decision);
    expect(invoke).toHaveBeenCalledWith('record-decision', expect.objectContaining({
      body: expect.objectContaining({ runId: run.serverId, outcome: 'rejected' }),
    }));
  });

  it('retains compatibility with the legacy flat response shape', async () => {
    const decision = {
      id: '33333333-3333-4333-8333-333333333333',
      run_id: run.serverId,
      outcome: 'escalated' as const,
      decided_at: '2026-09-04T20:01:00.000Z',
      snapshot_hash: 'sha256:snapshot-2',
      decision_hash: 'sha256:decision-2',
    };
    invoke.mockResolvedValue({ data: { decision }, error: null });

    await expect(persistDecision({
      run,
      recommendationId: 'rec-2',
      outcome: 'escalated',
      rationale: 'QA escalated the simulated evidence for review.',
    })).resolves.toEqual(decision);
  });
});
