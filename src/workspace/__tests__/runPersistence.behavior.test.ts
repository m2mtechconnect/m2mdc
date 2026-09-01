import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRun } from '../scenarioEngine';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(() => { throw new Error('direct table persistence is forbidden'); }),
  },
}));

import { persistRun } from '../runPersistence';

const run: WorkspaceRun = {
  id: 'SIM-2026-09-01-001',
  scenarioId: 'baseline',
  scenarioLabel: 'Baseline operations',
  facilityId: '22222222-2222-4222-8222-222222222222',
  facilityName: 'QA Facility',
  startedAt: '2026-09-01T10:00:00.000Z',
  completedAt: '2026-09-01T10:01:00.000Z',
  overrides: { coolingSetpointC: 22, gpuPowerCapPct: 90, workloadDensityPct: 70, renewableMixPct: 80 },
  baseline: { pue: 1.4 } as WorkspaceRun['baseline'],
  result: { pue: 1.3 } as WorkspaceRun['result'],
  events: [],
  recommendations: [],
  decisions: {},
};

describe('server-bound run persistence', () => {
  beforeEach(() => invoke.mockReset());

  it('creates, runs and completes through the trusted lifecycle boundary', async () => {
    invoke
      .mockResolvedValueOnce({
        data: { success: true, data: { run: { id: 'run-row', lifecycle_status: 'queued' }, idempotent: false } },
        error: null,
      })
      .mockResolvedValueOnce({ data: { run: { id: 'run-row', lifecycle_status: 'running' } }, error: null })
      .mockResolvedValueOnce({ data: { run: { id: 'run-row', lifecycle_status: 'succeeded' } }, error: null });

    await expect(persistRun({
      run,
      twinId: run.facilityId,
      idempotencyKey: 'idempotency-1',
    })).resolves.toEqual({ status: 'saved', id: 'run-row', runKey: run.id });

    expect(invoke).toHaveBeenCalledTimes(3);
    expect(invoke.mock.calls[0][1].body).toMatchObject({
      op: 'create', runKey: run.id, requestedIntent: 'preview', requestedExecutionClass: 'browser-preview',
    });
    expect(invoke.mock.calls[1][1].body).toEqual({ op: 'transition', runId: 'run-row', to: 'running' });
    expect(invoke.mock.calls[2][1].body).toMatchObject({
      op: 'transition', runId: 'run-row', to: 'succeeded', actualProvider: 'aura-deterministic-browser',
    });
  });

  it('returns an existing completed idempotent run without reopening it', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        success: true,
        data: { run: { id: 'run-row', lifecycle_status: 'succeeded' }, idempotent: true },
      },
      error: null,
    });
    await expect(persistRun({ run, twinId: run.facilityId, idempotencyKey: 'idempotency-1' }))
      .resolves.toEqual({ status: 'duplicate', id: 'run-row', runKey: run.id });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('never reports success when result persistence fails', async () => {
    invoke
      .mockResolvedValueOnce({ data: { run: { id: 'run-row', lifecycle_status: 'queued' }, idempotent: false }, error: null })
      .mockResolvedValueOnce({ data: { run: { id: 'run-row', lifecycle_status: 'running' } }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'output rejected' } })
      .mockResolvedValueOnce({ data: { run: { id: 'run-row', lifecycle_status: 'failed' } }, error: null });
    const result = await persistRun({ run, twinId: run.facilityId, idempotencyKey: 'idempotency-1' });
    expect(result).toMatchObject({ status: 'unsaved' });
    expect(invoke.mock.calls[3][1].body).toMatchObject({ to: 'failed', failureCode: 'CLIENT_RESULT_PERSIST_FAILED' });
  });
});
