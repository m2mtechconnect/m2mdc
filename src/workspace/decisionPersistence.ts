import { supabase } from '@/integrations/supabase/client';
import type { WorkspaceRun } from './scenarioEngine';
import { runChecksum } from './runPersistence';

export type DurableDecisionOutcome = 'approved' | 'rejected' | 'escalated';

export interface DurableDecisionInput {
  run: WorkspaceRun;
  recommendationId: string;
  outcome: DurableDecisionOutcome;
  rationale: string;
  escalatedTo?: string | null;
}

export interface DurableDecisionResult {
  id: string;
  run_id: string;
  outcome: DurableDecisionOutcome;
  decided_at: string;
  snapshot_hash: string;
  decision_hash: string;
}

interface RecordDecisionPayload {
  decision?: DurableDecisionResult;
}

/** Accept the standardized Edge envelope and the legacy flat response shape. */
function recordDecisionPayload(raw: unknown): RecordDecisionPayload {
  if (!raw || typeof raw !== 'object') return {};
  const outer = raw as Record<string, unknown>;
  const nested = outer.data;
  return nested && typeof nested === 'object'
    ? (nested as RecordDecisionPayload)
    : (outer as RecordDecisionPayload);
}

/**
 * Append a human decision to the server-owned evidence chain.
 * The client sends intent only. Identity, active organization, evidence
 * snapshot, hashes and authoritative eligibility are derived server-side.
 */
export async function persistDecision(input: DurableDecisionInput): Promise<DurableDecisionResult> {
  if (!input.run.serverId) {
    throw new Error('This run has no durable server record, so a decision cannot be recorded.');
  }
  const rationale = input.rationale.trim();
  if (rationale.length < 10) {
    throw new Error('Add at least 10 characters of rationale before recording a decision.');
  }
  if (input.outcome === 'approved' && input.run.validationStatus !== 'server-validated') {
    throw new Error('Unverified simulation previews cannot be approved. Reject or escalate this run instead.');
  }

  const idempotencyKey = runChecksum({
    runId: input.run.serverId,
    recommendationId: input.recommendationId,
    outcome: input.outcome,
    rationale,
  });

  const { data, error } = await supabase.functions.invoke('record-decision', {
    body: {
      runId: input.run.serverId,
      recommendationId: input.recommendationId,
      outcome: input.outcome,
      rationale,
      escalatedTo: input.escalatedTo ?? null,
      idempotencyKey,
    },
  });
  if (error) {
    throw new Error(error.message || 'The decision service rejected the request.');
  }
  const decision = recordDecisionPayload(data).decision;
  if (!decision?.id) {
    throw new Error('The decision service returned no durable decision record.');
  }
  return decision;
}
