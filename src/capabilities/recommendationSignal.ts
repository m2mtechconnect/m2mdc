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

export const SIGNAL_BASIS = 'Derived from simulation rules. Not a validated model confidence.';
