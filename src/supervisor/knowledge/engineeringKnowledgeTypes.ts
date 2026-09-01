/**
 * AURA engineering knowledge — shared types (governed RAG corpus).
 *
 * The engineering knowledge corpus is retrieval grounding ONLY. It is not
 * model fine-tuning, it contains no third-party code, no tenant data, no
 * personal data and no secrets. Every entry is original prose written for
 * AURA with citations to public specifications, documentation or research.
 *
 * Truth rules:
 *  - Entries are conceptual engineering guidance. No entry may claim runtime
 *    integration, calibration, deployment, schema safety or production
 *    readiness — those claim categories are governed by the evidence
 *    guardrails and require evidence artifacts.
 *  - The corpus is version-pinned: a manifest version, pin date and checksum
 *    are recorded, and contract tests fail when content drifts without a
 *    version bump.
 *  - Retrieval is deterministic and tenant-safe: it reads only this static
 *    corpus, takes no tenant context and performs no network or database IO.
 */
import type { RestrictedClaimCategory } from './evidenceGuardrails';

export const ENGINEERING_KNOWLEDGE_DOMAINS = [
  'simulation-engineering',
  'openusd-assets',
  'ui-ux-patterns',
  'synthetic-data-governance',
  'platform-assurance',
] as const;

export type EngineeringKnowledgeDomain = (typeof ENGINEERING_KNOWLEDGE_DOMAINS)[number];

export const ENGINEERING_KNOWLEDGE_DOMAIN_LABEL: Record<EngineeringKnowledgeDomain, string> = {
  'simulation-engineering': 'Simulator & data-centre engineering',
  'openusd-assets': 'OpenUSD & asset structure',
  'ui-ux-patterns': 'Governed UI/UX patterns',
  'synthetic-data-governance': 'Synthetic-data governance',
  'platform-assurance': 'Platform assurance and defect prevention',
};

export type KnowledgeCitationKind =
  | 'public-specification'
  | 'public-documentation'
  | 'public-research'
  | 'repository-artifact';

export interface KnowledgeCitation {
  /** Human-readable source name. */
  label: string;
  /** URL, ISBN-style locator or repository path. Never a secret-bearing URL. */
  locator: string;
  kind: KnowledgeCitationKind;
}

export interface EngineeringKnowledgeEntry {
  id: string;
  domain: EngineeringKnowledgeDomain;
  title: string;
  /** Original prose written for AURA. Never copied third-party text or code. */
  guidance: string;
  /** Lower-case retrieval keywords. */
  keywords: string[];
  /** Every entry must ground itself in at least one citation. */
  citations: KnowledgeCitation[];
  /**
   * Claim categories this entry's topic touches. Retrieval consumers must
   * route any such claim through the evidence guardrails before asserting it.
   */
  restrictedClaimCategories: RestrictedClaimCategory[];
  /**
   * The corpus is conceptual-only. 'none' is the only legal value: no corpus
   * entry may assert that a vendor or third-party system is wired in.
   */
  runtimeIntegrationClaim: 'none';
  provenance: 'engineering-guidance';
  /** The corpus carries no tenant-scoped material. */
  tenantScope: 'global';
}
