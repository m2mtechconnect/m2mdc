/**
 * Phase 12 - durable persistence for human decisions on recommendations.
 *
 * `public.decision_records` is the canonical, append-only decision log:
 *  - rows are immutable (no update or delete grants exist),
 *  - every row carries the frozen evidence snapshot the operator saw plus its
 *    hash, so a later reader can reconstruct the basis of the decision,
 *  - ownership comes from the authenticated session, never from caller data.
 *
 * When no session exists (demo / signed-out preview) the workspace still
 * works, but decisions stay in memory only and are reported as unsaved. We
 * never claim a decision was recorded durably when it was not.
 */
import { supabase } from '@/integrations/supabase/client';
import type { DecisionRecord } from '../contracts/recommendation';

export const DECISION_RECORD_TABLE = 'decision_records';

export type DecisionPersistOutcome =
  | { status: 'saved'; id: string }
  | { status: 'duplicate' }
  | { status: 'unsaved'; reason: string };

interface DecisionRow {
  id: string;
  recommendation_id: string;
  outcome: string;
  rationale: string;
  approver: string;
  comment: string | null;
  escalated_to: string | null;
  execution_status: string;
  decided_at: string;
  snapshot_hash: string;
  evidence_snapshot: unknown;
}

/** Maps a durable row back to the runtime decision contract. */
export function rowToDecision(row: DecisionRow): DecisionRecord {
  return {
    decision_id: row.id,
    recommendation_id: row.recommendation_id,
    outcome: row.outcome as DecisionRecord['outcome'],
    rationale: row.rationale,
    approver: row.approver,
    comment: row.comment ?? undefined,
    escalated_to: row.escalated_to ?? undefined,
    decided_at: row.decided_at,
    execution_status: row.execution_status as DecisionRecord['execution_status'],
    evidence_snapshot: row.evidence_snapshot as DecisionRecord['evidence_snapshot'],
  };
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Appends one decision. Duplicate re-submissions resolve to the original row. */
export async function persistDecision(decision: DecisionRecord): Promise<DecisionPersistOutcome> {
  const userId = await currentUserId();
  if (!userId) return { status: 'unsaved', reason: 'no-session' };

  const snapshot = decision.evidence_snapshot;
  const payload = {
      user_id: userId,
      recommendation_id: decision.recommendation_id,
      outcome: decision.outcome,
      rationale: decision.rationale,
      approver: decision.approver,
      comment: decision.comment ?? null,
      escalated_to: decision.escalated_to ?? null,
      execution_status: decision.execution_status,
      decided_at: decision.decided_at,
      timeline_id: snapshot.timeline_id,
      data_mode: snapshot.data_mode,
      observation_tick: snapshot.observation_tick,
      evidence_snapshot: snapshot as unknown,
      snapshot_hash: snapshot.snapshot_hash,
  };

  const { data, error } = await supabase
    .from(DECISION_RECORD_TABLE)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any)
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') return { status: 'duplicate' };
    return { status: 'unsaved', reason: error.message };
  }
  return data?.id ? { status: 'saved', id: data.id } : { status: 'unsaved', reason: 'no-row-returned' };
}

/** Loads the durable decision log for the signed-in operator. */
export async function loadDecisions(): Promise<DecisionRecord[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from(DECISION_RECORD_TABLE)
    .select(
      'id, recommendation_id, outcome, rationale, approver, comment, escalated_to, execution_status, decided_at, snapshot_hash, evidence_snapshot',
    )
    .order('decided_at', { ascending: true });
  if (error || !data) return [];
  return (data as unknown as DecisionRow[]).map(rowToDecision);
}
