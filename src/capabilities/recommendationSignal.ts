/**
 * Recommendation signal labelling (Stage 5).
 *
 * AURA has no validated model behind a numeric confidence percentage, so the
 * UI presents a qualitative, rule-derived strength instead of a fabricated
 * score. Percentages must not be shown for recommendations.
 */
export type SignalStrength = 'Strong' | 'Moderate' | 'Weak';

export function signalStrength(score: number): SignalStrength {
  if (score >= 85) return 'Strong';
  if (score >= 65) return 'Moderate';
  return 'Weak';
}

export function signalLabel(score: number): string {
  return `Rule-based signal: ${signalStrength(score)}`;
}

export const SIGNAL_BASIS =
  'Rule-based signal derived from defined simulation thresholds. Not a statistical confidence score, not a model probability, not NVIDIA-generated, and not a substitute for human review.';

/** Thresholds shown to the user so the rule basis is inspectable. */
export const SIGNAL_RULES = 'Strong >= 85, Moderate 65-84, Weak < 65 on the rule score.';
