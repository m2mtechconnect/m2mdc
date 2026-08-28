/**
 * Release qualification profiles (supervisor plane).
 *
 * Two governed profiles:
 *
 *  - accelerated-runtime-enterprise (DEFAULT): the full gate. NVIDIA
 *    NIM/NeMo/DSX/Omniverse runtime evidence remains mandatory; an unresolved
 *    accelerated-runtime blocker keeps the gate at No-Go.
 *  - enterprise-pilot-simulated: may exempt the accelerated-runtime blocker
 *    ONLY when that capability is visibly marked `unavailable` (honestly
 *    out-of-scope, not defective) AND every data-provenance finding is free
 *    of `gap` status (all truth/provenance controls pass). The exemption is
 *    explicit and reported — never a silent downgrade.
 *
 * Default behavior is conservative: callers that do not name a profile get
 * the accelerated-runtime-enterprise gate, unchanged.
 */
import { evaluateReleaseGate } from './releaseGate';
import type { ReadinessFinding, ReleaseGateDecision } from './types';

export const RELEASE_PROFILES = [
  'accelerated-runtime-enterprise',
  'enterprise-pilot-simulated',
] as const;

export type ReleaseProfileId = (typeof RELEASE_PROFILES)[number];

/** Conservative default: the full gate with no exemptions. */
export const DEFAULT_RELEASE_PROFILE: ReleaseProfileId = 'accelerated-runtime-enterprise';

export const RELEASE_PROFILE_LABEL: Record<ReleaseProfileId, string> = {
  'accelerated-runtime-enterprise': 'Accelerated-runtime enterprise',
  'enterprise-pilot-simulated': 'Enterprise pilot (simulated)',
};

export const RELEASE_PROFILE_DESCRIPTION: Record<ReleaseProfileId, string> = {
  'accelerated-runtime-enterprise':
    'Full gate. Accelerated AI runtime evidence (NIM/NeMo/DSX/Omniverse) is mandatory. This is the default and never downgrades blockers.',
  'enterprise-pilot-simulated':
    'May exempt only the accelerated-runtime blocker while that capability is visibly Unavailable and out-of-scope. Exact-SHA qualification, post-publish smoke, security and truth/provenance blockers remain mandatory.',
};

/** The only finding a pilot profile may exempt, and only when honestly unavailable. */
export const PILOT_EXEMPTIBLE_FINDING_ID = 'runtime-accelerated-ai';

export interface ReleaseProfileDecision extends ReleaseGateDecision {
  profile: ReleaseProfileId;
  /** Exemptions applied by the profile, with the reason each was permitted. */
  exemptedFindings: Array<{ id: string; reason: string }>;
}

export function evaluateReleaseGateForProfile(
  findings: ReadinessFinding[],
  profile: ReleaseProfileId = DEFAULT_RELEASE_PROFILE,
): ReleaseProfileDecision {
  const base = evaluateReleaseGate(findings);

  if (profile === 'accelerated-runtime-enterprise') {
    return { ...base, profile, exemptedFindings: [] };
  }

  // enterprise-pilot-simulated
  const exemptible = findings.find((f) => f.id === PILOT_EXEMPTIBLE_FINDING_ID);

  // The capability must be honestly marked Unavailable — a `gap` (defect)
  // or a fabricated `pass` never qualifies for exemption.
  const exemptibleIsOutOfScope = exemptible?.status === 'unavailable';

  // All truth/provenance controls must pass: no gap in data-provenance.
  const provenanceControlsPass = !findings.some(
    (f) => f.category === 'data-provenance' && f.status === 'gap',
  );

  if (!exemptible || !exemptibleIsOutOfScope || !provenanceControlsPass) {
    // Preconditions unmet: the profile changes nothing.
    return { ...base, profile, exemptedFindings: [] };
  }

  const exemptionReason =
    'Accelerated runtime is visibly marked Unavailable and out of pilot scope; all truth/provenance controls pass. All other release blockers remain mandatory.';

  const blockers = base.blockers.filter((b) => !b.includes(PILOT_EXEMPTIBLE_FINDING_ID));
  const categoryResults = base.categoryResults.map((result) => ({
    ...result,
    blockingFindings: result.blockingFindings.filter((id) => id !== PILOT_EXEMPTIBLE_FINDING_ID),
  }));

  return {
    decision: blockers.length === 0 ? 'go' : 'no-go',
    mandatoryCategories: base.mandatoryCategories,
    blockers,
    categoryResults,
    profile,
    exemptedFindings: [{ id: PILOT_EXEMPTIBLE_FINDING_ID, reason: exemptionReason }],
  };
}
