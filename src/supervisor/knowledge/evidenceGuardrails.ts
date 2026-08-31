/**
 * Evidence guardrails (supervisor knowledge plane).
 *
 * Fail-closed policy for restricted engineering claims. A statement may not
 * assert integration, calibration, deployment, schema safety or production
 * readiness unless an evidence artifact of a class that can actually prove
 * that claim is supplied and valid. Prose, intent or retrieved guidance never
 * upgrade a claim.
 *
 * This mirrors the existing supervisor truth rules: configured is not
 * connected, connected is not healthy, simulated is not measured, and missing
 * evidence is never rendered as available.
 */

export const RESTRICTED_CLAIM_CATEGORIES = [
  'integration',
  'calibration',
  'deployment',
  'schema-safety',
  'production-readiness',
] as const;

export type RestrictedClaimCategory = (typeof RESTRICTED_CLAIM_CATEGORIES)[number];

export const RESTRICTED_CLAIM_CATEGORY_LABEL: Record<RestrictedClaimCategory, string> = {
  integration: 'Runtime / vendor integration',
  calibration: 'Model calibration',
  deployment: 'Deployment state',
  'schema-safety': 'Schema / migration safety',
  'production-readiness': 'Production readiness',
};

/** Evidence artifact classes the guardrails understand. */
export const CLAIM_EVIDENCE_KINDS = [
  'runtime-probe',
  'test-report',
  'calibration-record',
  'deployment-log',
  'migration-review',
  'release-qualification',
] as const;

export type ClaimEvidenceKind = (typeof CLAIM_EVIDENCE_KINDS)[number];

/**
 * Which artifact classes can prove which claim category. A claim supported
 * only by an artifact outside its allowed classes stays blocked.
 */
export const CATEGORY_EVIDENCE_REQUIREMENTS: Record<
  RestrictedClaimCategory,
  readonly ClaimEvidenceKind[]
> = {
  integration: ['runtime-probe', 'test-report'],
  calibration: ['calibration-record'],
  deployment: ['deployment-log', 'release-qualification'],
  'schema-safety': ['migration-review', 'test-report'],
  'production-readiness': ['release-qualification'],
};

export interface ClaimEvidence {
  /** Repository path, document or record locator that holds the proof. */
  artifactRef: string;
  kind: ClaimEvidenceKind;
  /** SHA-256 of the artifact contents when available; null otherwise. */
  sha256: string | null;
  /** ISO-8601 timestamp of when the evidencing activity ran. */
  performedAt: string;
}

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const SHA256 = /^[a-f0-9]{64}$/i;

export interface ClaimEvidenceValidation {
  valid: boolean;
  reasons: string[];
}

export function validateClaimEvidence(evidence: unknown): ClaimEvidenceValidation {
  const reasons: string[] = [];
  const e = evidence as Partial<ClaimEvidence> | null;
  if (!e || typeof e !== 'object') {
    return { valid: false, reasons: ['evidence must be an object'] };
  }
  if (typeof e.artifactRef !== 'string' || e.artifactRef.trim().length === 0) {
    reasons.push('artifactRef is required and must be a non-empty string');
  }
  if (!CLAIM_EVIDENCE_KINDS.includes(e.kind as ClaimEvidenceKind)) {
    reasons.push(`kind must be one of: ${CLAIM_EVIDENCE_KINDS.join(', ')}`);
  }
  if (typeof e.performedAt !== 'string' || !ISO_8601.test(e.performedAt)) {
    reasons.push('performedAt must be an ISO-8601 timestamp');
  }
  if (e.sha256 !== null && e.sha256 !== undefined && !SHA256.test(String(e.sha256))) {
    reasons.push('sha256 must be null or a 64-character hex digest');
  }
  return { valid: reasons.length === 0, reasons };
}

export type ClaimVerdict =
  /** A valid artifact of an allowed class supports the claim. */
  | 'allowed-evidenced'
  /** No evidence supplied. Default, fail-closed outcome. */
  | 'blocked-unevidenced'
  /** Evidence supplied, but no artifact class can prove this category. */
  | 'blocked-wrong-evidence-kind'
  /** Every supplied artifact failed validation. */
  | 'blocked-invalid-evidence';

export interface RestrictedClaimEvaluation {
  category: RestrictedClaimCategory;
  verdict: ClaimVerdict;
  requiredEvidenceKinds: readonly ClaimEvidenceKind[];
  /** Artifact refs that support the claim; empty unless allowed-evidenced. */
  supportingArtifactRefs: string[];
  reasons: string[];
}

export function evaluateRestrictedClaim(input: {
  category: RestrictedClaimCategory;
  statement: string;
  evidence: unknown[];
}): RestrictedClaimEvaluation {
  const requiredEvidenceKinds = CATEGORY_EVIDENCE_REQUIREMENTS[input.category];
  const reasons: string[] = [];

  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    return {
      category: input.category,
      verdict: 'blocked-unevidenced',
      requiredEvidenceKinds,
      supportingArtifactRefs: [],
      reasons: [
        `No evidence supplied. A ${RESTRICTED_CLAIM_CATEGORY_LABEL[input.category]} claim requires ` +
          `an artifact of class: ${requiredEvidenceKinds.join(' or ')}.`,
      ],
    };
  }

  const validEvidence: ClaimEvidence[] = [];
  input.evidence.forEach((candidate, index) => {
    const validation = validateClaimEvidence(candidate);
    if (validation.valid) {
      validEvidence.push(candidate as ClaimEvidence);
    } else {
      reasons.push(`evidence[${index}] invalid: ${validation.reasons.join('; ')}`);
    }
  });

  if (validEvidence.length === 0) {
    return {
      category: input.category,
      verdict: 'blocked-invalid-evidence',
      requiredEvidenceKinds,
      supportingArtifactRefs: [],
      reasons,
    };
  }

  const supporting = validEvidence.filter((e) => requiredEvidenceKinds.includes(e.kind));
  if (supporting.length === 0) {
    return {
      category: input.category,
      verdict: 'blocked-wrong-evidence-kind',
      requiredEvidenceKinds,
      supportingArtifactRefs: [],
      reasons: [
        ...reasons,
        `Supplied evidence classes (${validEvidence.map((e) => e.kind).join(', ')}) cannot prove a ` +
          `${RESTRICTED_CLAIM_CATEGORY_LABEL[input.category]} claim; required: ${requiredEvidenceKinds.join(' or ')}.`,
      ],
    };
  }

  return {
    category: input.category,
    verdict: 'allowed-evidenced',
    requiredEvidenceKinds,
    supportingArtifactRefs: supporting.map((e) => e.artifactRef),
    reasons,
  };
}

// ---------------------------------------------------------------- detection

/**
 * Vendor / third-party system names whose pairing with integration language
 * always constitutes an integration claim. Provider-neutral wording is
 * required wherever runtime evidence is absent.
 */
export const VENDOR_RUNTIME_TERMS = ['nvidia', 'omniverse', 'opendc', 'opendt', 'dsx'] as const;

interface ClaimPattern {
  category: RestrictedClaimCategory;
  pattern: RegExp;
}

const CLAIM_PATTERNS: ClaimPattern[] = [
  { category: 'integration', pattern: /\bintegrat(?:ed|es|ion)\s+(?:with|into)\b/i },
  { category: 'integration', pattern: /\b(?:is|are|was|were|now)\s+(?:fully\s+)?wired\s+(?:to|into)\b/i },
  { category: 'calibration', pattern: /\b(?:is|are|was|were|has been|have been|fully|successfully)\s+calibrated\b/i },
  { category: 'calibration', pattern: /\bcalibrated\s+against\b/i },
  { category: 'deployment', pattern: /\b(?:is|are|was|were|has been|have been|successfully)\s+deployed\b/i },
  { category: 'deployment', pattern: /\bdeployed\s+to\s+(?:production|prod|staging)\b/i },
  { category: 'schema-safety', pattern: /\b(?:schema|migration)s?\s+(?:is|are|was|were)\s+safe\b/i },
  { category: 'schema-safety', pattern: /\bsafe\s+to\s+(?:apply|migrate|run)\b/i },
  { category: 'production-readiness', pattern: /\bproduction[- ]ready\b/i },
  { category: 'production-readiness', pattern: /\bready\s+for\s+production\b/i },
];

export interface DetectedClaim {
  category: RestrictedClaimCategory;
  /** The matched fragment, for audit display. */
  excerpt: string;
}

/**
 * Deterministic restricted-claim scanner. Also treats the combination of a
 * vendor runtime term with integration/runtime language as an integration
 * claim, so provider naming without runtime evidence stays blocked.
 */
export function detectRestrictedClaims(text: string): DetectedClaim[] {
  const detected: DetectedClaim[] = [];
  for (const { category, pattern } of CLAIM_PATTERNS) {
    const match = pattern.exec(text);
    if (match) detected.push({ category, excerpt: match[0] });
  }
  const vendorTerm = VENDOR_RUNTIME_TERMS.find((term) =>
    new RegExp(`\\b${term}\\b`, 'i').test(text),
  );
  if (vendorTerm && /\b(?:runtime|integrat\w*)\b/i.test(text)) {
    if (!detected.some((d) => d.category === 'integration')) {
      detected.push({ category: 'integration', excerpt: vendorTerm });
    }
  }
  return detected;
}

// ---------------------------------------------------------- answer guarding

export interface GroundedAnswerGuardResult {
  status: 'pass' | 'blocked';
  detectedCategories: RestrictedClaimCategory[];
  violations: RestrictedClaimEvaluation[];
}

/**
 * Guard a grounded answer before it is surfaced. Every restricted claim the
 * answer makes must be supported by a valid artifact of an allowed class,
 * otherwise the whole answer is blocked. Fail-closed: an answer with no
 * restricted claims passes; an answer with any unevidenced claim is blocked.
 */
export function guardGroundedAnswer(
  answerText: string,
  evidence: unknown[],
): GroundedAnswerGuardResult {
  const detected = detectRestrictedClaims(answerText);
  const categories = Array.from(new Set(detected.map((d) => d.category)));
  const violations: RestrictedClaimEvaluation[] = [];
  for (const category of categories) {
    const evaluation = evaluateRestrictedClaim({
      category,
      statement: answerText,
      evidence,
    });
    if (evaluation.verdict !== 'allowed-evidenced') violations.push(evaluation);
  }
  return {
    status: violations.length > 0 ? 'blocked' : 'pass',
    detectedCategories: categories,
    violations,
  };
}
