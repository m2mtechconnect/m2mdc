/**
 * AURA Enterprise Readiness Supervisor — canonical types (Phase 1).
 *
 * The supervisor is a governed, read-only assessment surface. Its cardinal
 * truth rules:
 *
 *  - A capability is never presented as complete or self-sufficient and never claims runtime behavior
 *    without evidence. Capability maturity is reported as separate stages:
 *    architecture-aligned, configured, connected, tested, deployed and
 *    operationally verified.
 *  - Absent evidence renders as "Not assessed" or "Unavailable". No score,
 *    status or health value may be fabricated.
 *  - The release gate defaults to No-Go until mandatory evidence is present.
 *  - Phase 1 assessment is deterministic and read-only: it reads repository
 *    and route metadata only and ships no production mutation tooling.
 */

/** Ordered maturity ladder. A stage may only be marked evidenced with a ref. */
export const CAPABILITY_STAGES = [
  'architecture-aligned',
  'configured',
  'connected',
  'tested',
  'deployed',
  'operationally-verified',
] as const;

export type CapabilityStage = (typeof CAPABILITY_STAGES)[number];

export interface StageEvidence {
  stage: CapabilityStage;
  state: 'evidenced' | 'not-evidenced';
  /** Repository path, document or record that proves the stage. Required when evidenced. */
  evidenceRef: string | null;
  note?: string;
}

export type SpecialistDomainId =
  | 'nvidia-dsx'
  | 'lovable-stack'
  | 'multicloud'
  | 'enterprise-security'
  | 'dc-operations'
  | 'product-persona'
  | 'ui-ux'
  | 'release-governor';

export interface SpecialistDomain {
  id: SpecialistDomainId;
  label: string;
  /** What the specialist is accountable for reviewing. */
  scope: string[];
  /** Maturity ladder for the domain's runtime ambition. */
  stages: StageEvidence[];
  /** Plain-language statement of what this domain may claim today. */
  currentClaim: string;
}

/** Evidence-backed readiness categories assessed by the supervisor. */
export const READINESS_CATEGORIES = [
  'security',
  'tenancy',
  'auth',
  'data-provenance',
  'runtime',
  'integrations',
  'observability',
  'resilience',
  'ux-accessibility',
  'qualification',
  'release',
] as const;

export type ReadinessCategory = (typeof READINESS_CATEGORIES)[number];

export const READINESS_CATEGORY_LABEL: Record<ReadinessCategory, string> = {
  security: 'Security',
  tenancy: 'Tenancy & isolation',
  auth: 'Authentication & access',
  'data-provenance': 'Data & provenance',
  runtime: 'Runtime',
  integrations: 'Integrations',
  observability: 'Observability',
  resilience: 'Resilience & DR',
  'ux-accessibility': 'UX & accessibility',
  qualification: 'Qualification',
  release: 'Release governance',
};

export type FindingStatus =
  /** Evidence confirms the control or capability. */
  | 'pass'
  /** Evidence shows a concrete defect or missing control. */
  | 'gap'
  /** No assessment evidence exists yet. Never rendered as a fabricated score. */
  | 'not-assessed'
  /** The underlying capability or source is unavailable. */
  | 'unavailable';

export type FindingSeverity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

export type SupervisorPersonaId =
  | 'executive'
  | 'facility-operator'
  | 'engineer'
  | 'data-scientist'
  | 'compliance-risk'
  | 'tenant-admin'
  | 'finance-procurement'
  | 'customer-success'
  | 'implementation-partner';

export interface ReadinessFinding {
  id: string;
  category: ReadinessCategory;
  title: string;
  status: FindingStatus;
  severity: FindingSeverity;
  /** Human description of where the evidence comes from. */
  evidenceSource: string;
  /** Concrete pointer (path, doc, record). Null only when status is not-assessed. */
  evidenceRef: string | null;
  affectedRoutes: string[];
  affectedFiles: string[];
  recommendedAction: string;
  ownerPersona: SupervisorPersonaId;
  /** How a reviewer proves the finding is resolved. */
  verificationMethod: string;
}

export interface SupervisorPersona {
  id: SupervisorPersonaId;
  label: string;
  /** One-paragraph explanation shown when the persona is selected. */
  narrative: string;
  /** Categories this persona cares about first, in priority order. */
  priorityCategories: ReadinessCategory[];
}

/** Knowledge-source kinds the registry may index. */
export type KnowledgeSourceKind =
  | 'repository-file'
  | 'commit-diff'
  | 'project-message'
  | 'architecture-decision'
  | 'test-report'
  | 'incident-remediation'
  | 'screenshot'
  | 'release-report';

/**
 * Historical prompts and code are not automatically correct. Every knowledge
 * source carries an explicit disposition.
 */
export type KnowledgeDisposition = 'accepted' | 'rejected' | 'superseded' | 'unresolved';

/**
 * Secrets, credentials, raw tenant data, personal data and service-role
 * material are never ingested. Sources carry an explicit redaction state.
 */
export type RedactionState =
  /** Not yet reviewed; cannot be indexed. */
  | 'pending-review'
  /** Reviewed, sensitive material removed, approved for indexing. */
  | 'approved-redacted'
  /** Contains sensitive material; permanently excluded. */
  | 'rejected-sensitive';

export interface KnowledgeSource {
  id: string;
  kind: KnowledgeSourceKind;
  title: string;
  /** Repository path, record id or locator. Never a secret-bearing URL. */
  ref: string;
  disposition: KnowledgeDisposition;
  redactionState: RedactionState;
  /** When a rejected/superseded mistake became a regression or eval case. */
  regressionCaseRef: string | null;
  note?: string;
}

export interface ReleaseGateDecision {
  decision: 'go' | 'no-go';
  /** Mandatory categories that must each carry at least one passing finding. */
  mandatoryCategories: ReadinessCategory[];
  /** Why the gate is No-Go; empty on Go. */
  blockers: string[];
  /** Per-category evaluation detail for audit. */
  categoryResults: Array<{
    category: ReadinessCategory;
    mandatory: boolean;
    hasPass: boolean;
    blockingFindings: string[];
  }>;
}
