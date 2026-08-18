/**
 * Phase 3 - server-owned human decisions.
 *
 * The browser submits intent only. Approver identity, tenant, timestamp,
 * evidence snapshot, snapshot hash and record hash are all derived by the
 * `record-decision` edge function. `decision_records` is append-only in the
 * database, so a mistake is corrected by appending a superseding record.
 */
import { supabase } from '@/integrations/supabase/client';

export type DecisionOutcomeInput = 'approved' | 'rejected' | 'escalated';

export interface DecisionSubmission {
  /** `simulation_runs.id` - the canonical run identity. */
  runId: string;
  recommendationId: string;
  outcome: DecisionOutcomeInput;
  rationale: string;
  comment?: string | null;
  escalatedTo?: string | null;
  idempotencyKey?: string;
  /** Output hash the operator saw; a mismatch is rejected as stale. */
  expectedOutputHash?: string | null;
  supersedesDecisionId?: string | null;
}

export interface PersistedDecision {
  id: string;
  run_id: string;
  outcome: string;
  decided_at: string;
  snapshot_hash: string;
  decision_hash: string;
}

export type DecisionOutcomeResult =
  | { status: 'recorded'; decision: PersistedDecision; idempotent: boolean }
  | { status: 'rejected'; reason: string };

/** Fields the browser is forbidden from authoring. Asserted by tests. */
export const SERVER_OWNED_DECISION_FIELDS = [
  'approver',
  'tenant_id',
  'decided_at',
  'evidence_snapshot',
  'snapshot_hash',
  'decision_hash',
  'prior_decision_id',
  'prior_decision_hash',
  'decision_status',
] as const;

export async function submitDecision(
  submission: DecisionSubmission,
): Promise<DecisionOutcomeResult> {
  const { data, error } = await supabase.functions.invoke('record-decision', {
    body: submission,
  });
  if (error) {
    return { status: 'rejected', reason: error.message ?? 'The decision was not recorded.' };
  }
  const envelope = data as {
    success?: boolean;
    data?: { decision?: PersistedDecision; idempotent?: boolean };
    error?: { message?: string };
  };
  if (envelope?.success === false) {
    return { status: 'rejected', reason: envelope.error?.message ?? 'The decision was not recorded.' };
  }
  const decision = envelope?.data?.decision;
  if (!decision?.id) {
    return { status: 'rejected', reason: 'The server returned no durable decision record.' };
  }
  return { status: 'recorded', decision, idempotent: Boolean(envelope?.data?.idempotent) };
}

/** Loads the append-only decision log for the signed-in operator. */
export async function loadCanonicalDecisions(runId?: string) {
  let query = supabase
    .from('decision_records')
    .select(
      'id, run_id, recommendation_id, outcome, rationale, approver, comment, escalated_to, ' +
        'execution_status, decided_at, snapshot_hash, decision_hash, prior_decision_id, ' +
        'prior_decision_hash, supersedes_decision_id, evidence_schema_version, decision_status, ' +
        'authored_by, evidence_snapshot',
    )
    .order('decided_at', { ascending: true });
  if (runId) query = query.eq('run_id', runId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as Array<Record<string, unknown>>;
}