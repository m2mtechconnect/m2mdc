/**
 * AURA platform compliance claim boundary (Phase 9).
 *
 * Separates two vocabularies that were previously mixed in the UI:
 *
 *  1. Platform claims - statements about the AURA product itself
 *     ("AURA is SOC 2 compliant"). These may only be shown when a claim
 *     record here carries `status: 'certified'` with an evidence reference.
 *     No AURA platform claim is certified today; certification is an external
 *     blocker (see docs/remediation/external-blockers.md section 5).
 *
 *  2. Modelled facility attributes - compliance frameworks a *customer
 *     facility* is configured against inside a twin blueprint. Those are
 *     data, not AURA assertions, and are unaffected by this module.
 */

export type ComplianceClaimStatus =
  /** Independently audited, evidence on file. Publishable as a claim. */
  | 'certified'
  /** Controls implemented in the product, no external audit. */
  | 'implemented-uncertified'
  /** Neither implemented nor audited. Never publishable. */
  | 'not-established';

export interface PlatformComplianceClaim {
  id: string;
  /** Framework or control the claim refers to. */
  label: string;
  status: ComplianceClaimStatus;
  /** Copy that may be rendered. Empty when nothing may be shown. */
  publicStatement: string;
  /** Why the status is what it is - shown in tooltips and audits. */
  evidence: string;
}

export const PLATFORM_COMPLIANCE_CLAIMS: readonly PlatformComplianceClaim[] = [
  {
    id: 'soc2',
    label: 'SOC 2',
    status: 'not-established',
    publicStatement: '',
    evidence: 'No Type I or Type II audit has been commissioned for AURA.',
  },
  {
    id: 'iso27001',
    label: 'ISO/IEC 27001',
    status: 'not-established',
    publicStatement: '',
    evidence: 'No ISMS certification scope has been defined for AURA.',
  },
  {
    id: 'pipeda',
    label: 'PIPEDA / Quebec Law 25',
    status: 'not-established',
    publicStatement: '',
    evidence:
      'Frameworks are configurable per facility twin. AURA itself has no legal opinion on file, so no readiness claim may be published.',
  },
  {
    id: 'transport-encryption',
    label: 'Transport encryption',
    status: 'implemented-uncertified',
    publicStatement: 'Encrypted in transit',
    evidence: 'All backend traffic uses TLS via the managed backend endpoint.',
  },
  {
    id: 'at-rest-encryption',
    label: 'Storage encryption',
    status: 'implemented-uncertified',
    publicStatement: 'Encrypted at rest',
    evidence: 'Managed Postgres storage is encrypted at rest by the provider.',
  },
  {
    id: 'rbac',
    label: 'Role-based access control',
    status: 'implemented-uncertified',
    publicStatement: 'Role-based access control',
    evidence:
      'Roles are stored in public.user_roles and enforced with row-level security policies.',
  },
] as const;

/** Phrases that assert certification or legal readiness for AURA itself. */
export const PROHIBITED_PLATFORM_CLAIM_PATTERNS: readonly RegExp[] = [
  /\bSOC ?2 (?:compliant|certified|ready)\b/i,
  /\bISO ?27001 (?:compliant|certified|ready)\b/i,
  /\bPIPEDA (?:compliant|certified|ready)\b/i,
  /\b(?:Quebec )?Law ?25 (?:compliant|certified|ready)\b/i,
  /\bLoi ?25 (?:conforme|certifi)/i,
  /\bfully compliant\b/i,
  /\bsovereign cloud\b/i,
];

export function getPlatformComplianceClaim(
  id: string,
): PlatformComplianceClaim | undefined {
  return PLATFORM_COMPLIANCE_CLAIMS.find((claim) => claim.id === id);
}

/** Claims that may be rendered in product chrome, in declaration order. */
export function publishablePlatformClaims(): PlatformComplianceClaim[] {
  return PLATFORM_COMPLIANCE_CLAIMS.filter(
    (claim) => claim.status !== 'not-established' && claim.publicStatement.length > 0,
  );
}

export function assertNoProhibitedPlatformClaim(copy: string): string[] {
  return PROHIBITED_PLATFORM_CLAIM_PATTERNS.filter((pattern) => pattern.test(copy)).map(
    (pattern) => pattern.source,
  );
}
