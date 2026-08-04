/**
 * Recommendation + human-decision contract.
 *
 * HARD RULE: a recommendation can never issue a physical control command.
 * `proposed_action` is descriptive text for a human operator only.
 */

export type RecommendationSeverity = 'info' | 'advisory' | 'warning' | 'critical';
export type DecisionOutcome = 'approved' | 'rejected' | 'escalated';
export type ExecutionStatus = 'not_executed' | 'manual_execution_pending' | 'manual_execution_recorded';

export interface RecommendationEvidence {
  event_ids: string[];
  metric_names: string[];
  simulation_run_id: string | null;
  asset_ids: string[];
}

export interface Recommendation {
  recommendation_id: string;
  created_at: string;
  evidence: RecommendationEvidence;
  text: string;
  severity: RecommendationSeverity;
  expected_effect: string;
  confidence: number | null;
  limitations: string[];
  /** Human-executed action description. Never dispatched by AURA. */
  proposed_action: string;
  requires_human_decision: true;
  data_mode: 'SIMULATED' | 'REPLAYED';
}

export interface HumanDecision {
  decision_id: string;
  recommendation_id: string;
  outcome: DecisionOutcome;
  rationale: string;
  approver: string;
  decided_at: string;
  execution_status: ExecutionStatus;
  comment?: string;
}

/**
 * Immutable snapshot of the evidence a human saw at the moment of decision.
 * Recorded so a later reader can reconstruct the basis of the decision even
 * if the scenario is replayed, reset or advanced afterwards.
 */
export interface DecisionEvidenceSnapshot {
  captured_at: string;
  observation_tick: number;
  data_mode: 'SIMULATED' | 'REPLAYED';
  timeline_id: string;
  severity: RecommendationSeverity;
  recommendation_text: string;
  expected_effect: string;
  proposed_action: string;
  confidence: number | null;
  limitations: string[];
  evidence: RecommendationEvidence;
  metrics: { name: string; value: number | null; unit: string | null }[];
  snapshot_hash: string;
}

export interface DecisionRecord extends HumanDecision {
  /** Free-text operator comment, separate from the required rationale. */
  comment?: string;
  /** Required when outcome is `escalated`. */
  escalated_to?: string;
  evidence_snapshot: DecisionEvidenceSnapshot;
}

/** Every recommendation is pending until a human records a decision. */
export type DecisionState = 'pending_human_decision' | DecisionOutcome;

export function decisionStateFor(record: DecisionRecord | undefined): DecisionState {
  return record ? record.outcome : 'pending_human_decision';
}

/** Validation shared by UI and tests: no decision may be recorded without a rationale. */
export function validateDecisionInput(input: {
  outcome: DecisionOutcome;
  rationale: string;
  escalated_to?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.rationale.trim()) errors.push('A written rationale is required for every decision.');
  if (input.outcome === 'escalated' && !(input.escalated_to ?? '').trim()) {
    errors.push('An escalation target is required when escalating.');
  }
  return { valid: errors.length === 0, errors };
}

/** Guard used by tests: AURA must expose no control dispatch surface. */
export const PHYSICAL_CONTROL_ENABLED = false;