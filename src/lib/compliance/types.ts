/**
 * Types for compliance-claim presentation (Phase 1A, ADR-0005).
 *
 * This module introduces the vocabulary needed to correct unsupported
 * product claims (PIPEDA, Quebec Law 25, ISO 27001, SOC 2, HIPAA, OSFI,
 * Canadian residency, carbon neutrality, tier certification).
 *
 * Phase 1A ships types + a registry helper only. Populating an evidence
 * database is deferred to Phase 1B / 2 as noted in `external-blockers.md`.
 */

export type ClaimStatus =
  | 'applicable'    // Framework is in scope for the product.
  | 'configured'    // Product has a requirement configured for this framework.
  | 'evidence'      // Evidence has been collected but not independently assessed.
  | 'assessed'      // Internal or external assessment complete; result recorded.
  | 'certified'     // Third-party certification issued by a recognized body.
  | 'not-assessed'; // No defensible claim available.

export type ComplianceFrameworkId =
  | 'PIPEDA'
  | 'QC-LAW25'
  | 'ISO-27001'
  | 'SOC-2'
  | 'HIPAA'
  | 'OSFI-B13'
  | 'CA-RESIDENCY'
  | 'CARBON-NEUTRAL'
  | 'UPTIME-TIER';

export interface ComplianceClaim {
  framework: ComplianceFrameworkId;
  status: ClaimStatus;
  /** Free-text scope for the claim (e.g. "Quebec-hosted workloads only"). */
  scope?: string;
  /** Who assessed / certified, when. Present only for `assessed` / `certified`. */
  attestation?: {
    assessor: string;
    date: string;         // ISO date
    certificateId?: string;
    expiresOn?: string;
  };
  /** Short reason string when `status === 'not-assessed'`. */
  notAssessedReason?: string;
}

/** Human label for a claim status — used by UI badges. */
export function claimStatusLabel(s: ClaimStatus): string {
  switch (s) {
    case 'applicable':   return 'Applicable framework';
    case 'configured':   return 'Configured requirement';
    case 'evidence':     return 'Evidence collected';
    case 'assessed':     return 'Assessed';
    case 'certified':    return 'Certified';
    case 'not-assessed': return 'Not assessed';
  }
}

/**
 * Default registry — every framework starts as `not-assessed` with an
 * explicit reason. UI surfaces that render compliance claims MUST look up
 * status via this registry rather than hard-coding "certified" strings.
 */
export const DEFAULT_COMPLIANCE_REGISTRY: Record<ComplianceFrameworkId, ComplianceClaim> = {
  'PIPEDA':         { framework: 'PIPEDA',         status: 'applicable',   scope: 'Personal information in AURA persistence.', notAssessedReason: 'Applicable framework; no independent assessment on file yet.' },
  'QC-LAW25':       { framework: 'QC-LAW25',       status: 'applicable',   scope: 'Personal information of Quebec residents.', notAssessedReason: 'Applicable framework; no independent assessment on file yet.' },
  'ISO-27001':      { framework: 'ISO-27001',      status: 'not-assessed', notAssessedReason: 'Product is not currently in an ISO 27001 certification scope.' },
  'SOC-2':          { framework: 'SOC-2',          status: 'not-assessed', notAssessedReason: 'No SOC 2 Type I or Type II report on file for the AURA product.' },
  'HIPAA':          { framework: 'HIPAA',          status: 'not-assessed', notAssessedReason: 'HIPAA applicability depends on customer PHI handling; not evaluated at product level.' },
  'OSFI-B13':       { framework: 'OSFI-B13',       status: 'not-assessed', notAssessedReason: 'OSFI B-13 attestation requires customer-specific technology-risk assessment.' },
  'CA-RESIDENCY':   { framework: 'CA-RESIDENCY',   status: 'configured',   scope: 'Backend hosted in the managed cloud region as configured by project.', notAssessedReason: 'Requirement configured; residency evidence pipeline pending (Phase 2).' },
  'CARBON-NEUTRAL': { framework: 'CARBON-NEUTRAL', status: 'not-assessed', notAssessedReason: 'Carbon reporting is currently derived from demo fixtures; not audited.' },
  'UPTIME-TIER':    { framework: 'UPTIME-TIER',    status: 'not-assessed', notAssessedReason: 'Uptime Institute tier certification is a facility property; product does not certify facilities.' },
};