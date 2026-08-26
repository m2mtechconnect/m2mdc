/**
 * Release gate (Phase 1).
 *
 * Pure, deterministic evaluation: the same findings always produce the same
 * decision, with no clock, network or environment input. The gate defaults to
 * No-Go: a Go requires a passing finding in every mandatory category and no
 * unresolved blocker-severity finding anywhere.
 */
import type { ReadinessCategory, ReadinessFinding, ReleaseGateDecision } from './types';

/** Categories that must carry passing evidence before a Go is possible. */
export const MANDATORY_GATE_CATEGORIES: ReadinessCategory[] = [
  'security',
  'tenancy',
  'auth',
  'data-provenance',
  'runtime',
  'qualification',
  'release',
];

export function evaluateReleaseGate(findings: ReadinessFinding[]): ReleaseGateDecision {
  const blockers: string[] = [];

  const categoryResults = MANDATORY_GATE_CATEGORIES.map((category) => {
    const inCategory = findings.filter((f) => f.category === category);
    const hasPass = inCategory.some((f) => f.status === 'pass');
    const blockingFindings = inCategory
      .filter((f) => f.severity === 'blocker' && f.status !== 'pass')
      .map((f) => f.id);

    if (!hasPass) {
      blockers.push(`No passing evidence in mandatory category "${category}".`);
    }
    for (const id of blockingFindings) {
      blockers.push(`Unresolved blocker finding "${id}" in "${category}".`);
    }
    return { category, mandatory: true as const, hasPass, blockingFindings };
  });

  // Non-mandatory categories can still hold blocker-severity findings.
  const mandatorySet = new Set<ReadinessCategory>(MANDATORY_GATE_CATEGORIES);
  const categoryIds = new Set(categoryResults.map((r) => r.category));
  for (const finding of findings) {
    if (mandatorySet.has(finding.category) && categoryIds.has(finding.category)) continue;
    if (finding.severity === 'blocker' && finding.status !== 'pass') {
      blockers.push(`Unresolved blocker finding "${finding.id}" in "${finding.category}".`);
    }
  }

  return {
    decision: blockers.length === 0 ? 'go' : 'no-go',
    mandatoryCategories: [...MANDATORY_GATE_CATEGORIES],
    blockers,
    categoryResults,
  };
}
