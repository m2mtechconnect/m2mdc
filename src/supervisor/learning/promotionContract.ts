/**
 * Offline evaluation and promotion contract for governed learning.
 *
 * A prompt, lesson or model-policy change may only ship when EVERY mandatory
 * gate is green and the grounded-citation rate does not drop against the
 * baseline. The evaluator fails closed: a missing, skipped, cancelled or
 * failing gate blocks promotion, and the result is immutable evidence.
 *
 * This module records rollout and rollback metadata. It never executes a
 * rollout, never changes configuration and never mutates production state.
 */

export const PROMOTION_CONTRACT_VERSION = 'aura.promotion-contract.v1';

export const MANDATORY_GATES = [
  'truth-suite',
  'authorization-suite',
  'tenant-isolation-suite',
  'provenance-suite',
  'typecheck',
  'lint',
  'architecture-governance',
  'schema-truth',
  'build',
] as const;
export type MandatoryGate = (typeof MANDATORY_GATES)[number];

export const GATE_STATUSES = ['passed', 'failed', 'skipped', 'cancelled', 'missing'] as const;
export type GateStatus = (typeof GATE_STATUSES)[number];

export interface GateResult {
  gate: MandatoryGate;
  status: GateStatus;
  detail?: string;
}

export interface EvalSnapshot {
  /** Identifier of the evaluated artifact (commit SHA, suite run id). */
  ref: string;
  totalCases: number;
  passedCases: number;
  groundedCitationRate: number;
}

export interface RolloutMetadata {
  stage: 'canary' | 'staged' | 'full';
  percentage: number;
  rollbackTarget: string;
  approver: string;
}

export interface PromotionCandidate {
  baseline: EvalSnapshot;
  candidate: EvalSnapshot;
  gates: readonly GateResult[];
  promptVersion: string;
  policyVersion: string;
  lessonIds: readonly string[];
  rollout: RolloutMetadata;
}

export interface PromotionDecision {
  contractVersion: typeof PROMOTION_CONTRACT_VERSION;
  decision: 'promote' | 'blocked';
  reasons: readonly string[];
  gateSummary: Readonly<Record<MandatoryGate, GateStatus>>;
  truthRegressions: number;
  groundedCitationDelta: number;
  rollout: RolloutMetadata;
  evaluatedAt: string;
  /** Stable digest so the decision can be stored as immutable evidence. */
  digest: string;
}

function digestOf(value: unknown): string {
  const canonical = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

/**
 * Evaluate a promotion candidate. Fails closed: `promote` requires every
 * mandatory gate to be `passed`, zero truth-case regressions and no drop in
 * the grounded-citation rate. The returned decision is frozen.
 */
export function evaluatePromotion(candidate: PromotionCandidate, evaluatedAt?: string): PromotionDecision {
  const reasons: string[] = [];
  const gateSummary = {} as Record<MandatoryGate, GateStatus>;

  for (const gate of MANDATORY_GATES) {
    const result = candidate.gates.find((g) => g.gate === gate);
    const status: GateStatus = result ? result.status : 'missing';
    gateSummary[gate] = status;
    if (status !== 'passed') reasons.push(`gate ${gate} is ${status}`);
  }

  const truthRegressions = Math.max(
    0,
    candidate.baseline.passedCases - candidate.candidate.passedCases,
  );
  if (truthRegressions > 0) reasons.push(`${truthRegressions} evaluation case regression(s) against baseline`);

  const groundedCitationDelta =
    candidate.candidate.groundedCitationRate - candidate.baseline.groundedCitationRate;
  if (groundedCitationDelta < 0) {
    reasons.push(`grounded-citation rate dropped by ${Math.abs(groundedCitationDelta).toFixed(4)}`);
  }

  if (candidate.candidate.totalCases < candidate.baseline.totalCases) {
    reasons.push('candidate evaluated fewer cases than the baseline');
  }
  if (!candidate.rollout.rollbackTarget) reasons.push('rollout has no rollback target');
  if (!candidate.rollout.approver) reasons.push('rollout has no approver');
  if (candidate.rollout.percentage <= 0 || candidate.rollout.percentage > 100) {
    reasons.push('rollout percentage is out of range');
  }

  const decision: PromotionDecision = {
    contractVersion: PROMOTION_CONTRACT_VERSION,
    decision: reasons.length === 0 ? 'promote' : 'blocked',
    reasons: Object.freeze([...reasons]),
    gateSummary: Object.freeze({ ...gateSummary }),
    truthRegressions,
    groundedCitationDelta,
    rollout: Object.freeze({ ...candidate.rollout }),
    evaluatedAt: evaluatedAt ?? new Date().toISOString(),
    digest: '',
  };

  const withDigest: PromotionDecision = { ...decision, digest: digestOf({ ...decision, digest: undefined }) };
  return Object.freeze(withDigest);
}
