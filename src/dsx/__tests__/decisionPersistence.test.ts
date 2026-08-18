import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const selectMock = vi.fn();
const results: { insert: any; select: any } = { insert: null, select: null };
const getUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => getUser() },
    from: (table: string) => {
      expect(table).toBe('decision_records');
      return {
        insert: (payload: unknown) => {
          insertMock(payload);
          return { select: () => ({ maybeSingle: async () => results.insert }) };
        },
        select: (cols: string) => {
          selectMock(cols);
          return { order: async () => results.select };
        },
      };
    },
  },
}));

import { persistDecision, loadDecisions, rowToDecision } from '../runtime/decisionPersistence';
import type { DecisionRecord } from '../contracts/recommendation';

const decision: DecisionRecord = {
  decision_id: 'd1',
  recommendation_id: 'rec-1',
  outcome: 'approved',
  rationale: 'cooling margin recovered after review',
  approver: 'operator',
  decided_at: '2026-01-01T00:00:00.000Z',
  execution_status: 'manual_execution_pending',
  evidence_snapshot: {
    captured_at: '2026-01-01T00:00:00.000Z',
    observation_tick: 4,
    data_mode: 'SIMULATED',
    timeline_id: 'cooling_degradation',
    severity: 'warning',
    recommendation_text: 'text',
    expected_effect: 'effect',
    proposed_action: 'action',
    confidence: 0.8,
    limitations: [],
    evidence: { event_ids: [], metric_names: [], simulation_run_id: null, asset_ids: [] },
    metrics: [],
    snapshot_hash: 'fnv1a32:abc',
  },
};

beforeEach(() => {
  insertMock.mockClear();
  selectMock.mockClear();
  getUser.mockReset();
});

describe('decision persistence (Phase 12 canonical decision log)', () => {
  it('reports unsaved without a session and never writes', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await persistDecision(decision);
    expect(r).toEqual({ status: 'unsaved', reason: 'no-session' });
    expect(insertMock).not.toHaveBeenCalled();
    expect(await loadDecisions()).toEqual([]);
  });

  it('writes session ownership and the frozen snapshot hash', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    results.insert = { data: { id: 'row-1' }, error: null };
    const r = await persistDecision(decision);
    expect(r).toEqual({ status: 'saved', id: 'row-1' });
    const payload = insertMock.mock.calls[0][0];
    expect(payload.user_id).toBe('user-1');
    expect(payload.snapshot_hash).toBe('fnv1a32:abc');
    expect(payload.observation_tick).toBe(4);
    expect(payload.timeline_id).toBe('cooling_degradation');
  });

  it('treats a unique-violation replay as a duplicate, not a new record', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    results.insert = { data: null, error: { code: '23505', message: 'dup' } };
    expect(await persistDecision(decision)).toEqual({ status: 'duplicate' });
  });

  it('restores durable rows into the runtime contract', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    results.select = {
      data: [
        {
          id: 'row-1',
          recommendation_id: 'rec-1',
          outcome: 'escalated',
          rationale: 'needs facility sign-off',
          approver: 'operator',
          comment: null,
          escalated_to: 'duty manager',
          execution_status: 'not_executed',
          decided_at: '2026-01-01T00:00:00.000Z',
          snapshot_hash: 'fnv1a32:abc',
          evidence_snapshot: decision.evidence_snapshot,
        },
      ],
      error: null,
    };
    const rows = await loadDecisions();
    expect(rows).toHaveLength(1);
    expect(rows[0].decision_id).toBe('row-1');
    expect(rows[0].escalated_to).toBe('duty manager');
    expect(rows[0].comment).toBeUndefined();
    expect(rowToDecision({ ...(results.select as any).data[0], comment: 'note' }).comment).toBe('note');
  });
});
