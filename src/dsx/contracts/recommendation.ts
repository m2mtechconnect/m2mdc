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

/** Guard used by tests: AURA must expose no control dispatch surface. */
export const PHYSICAL_CONTROL_ENABLED = false;