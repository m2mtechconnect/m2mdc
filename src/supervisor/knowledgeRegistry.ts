/**
 * Knowledge-source registry (Phase 1).
 *
 * Indexes approved project artifacts the supervisor may reason over:
 * repository files, commits/diffs, project prompts/messages, architecture
 * decisions, test reports, incident/remediation reports, screenshots and
 * release reports.
 *
 * Non-negotiables encoded here:
 *  - Secrets, credentials, raw tenant data, personal data and service-role
 *    material are never ingested. Every source carries an explicit redaction
 *    state and only `approved-redacted` sources are ingestible.
 *  - Historical prompts and code are not automatically correct: every source
 *    carries a disposition (accepted / rejected / superseded / unresolved),
 *    and verified mistakes are converted into regression/evaluation cases.
 */
import type { KnowledgeSource, KnowledgeSourceKind } from './types';

export const KNOWLEDGE_SOURCE_KIND_LABEL: Record<KnowledgeSourceKind, string> = {
  'repository-file': 'Repository file',
  'commit-diff': 'Commit / diff',
  'project-message': 'Project prompt / message',
  'architecture-decision': 'Architecture decision',
  'test-report': 'Test report',
  'incident-remediation': 'Incident / remediation report',
  screenshot: 'Screenshot',
  'release-report': 'Release report',
};

export const REDACTION_POLICY =
  'Never ingest secrets, credentials, raw tenant data, personal data or service-role material. ' +
  'A source is indexed only after review leaves it in the approved-redacted state.';

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: 'ks-architecture-doc',
    kind: 'repository-file',
    title: 'AURA DC architecture document',
    ref: 'docs/AURA-DC-Architecture.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: null,
  },
  {
    id: 'ks-security-model',
    kind: 'repository-file',
    title: 'AURA DC security model',
    ref: 'docs/AURA-DC-Security-Model.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: null,
  },
  {
    id: 'ks-adr-provenance',
    kind: 'architecture-decision',
    title: 'ADR-0004 data provenance model',
    ref: 'docs/adr/0004-data-provenance-model.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: null,
  },
  {
    id: 'ks-adr-truth-in-ui',
    kind: 'architecture-decision',
    title: 'ADR-0006 truth-in-UI and metric provenance',
    ref: 'docs/adr/0006-truth-in-ui-and-metric-provenance.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: null,
  },
  {
    id: 'ks-testing-strategy',
    kind: 'test-report',
    title: 'Testing strategy and corrected baseline',
    ref: 'docs/AURA-DC-Testing-Strategy.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: null,
  },
  {
    id: 'ks-dsx-final-report',
    kind: 'release-report',
    title: 'DSX alignment final report',
    ref: 'docs/dsx-alignment/final-report.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: null,
  },
  {
    id: 'ks-remediation-ledger',
    kind: 'incident-remediation',
    title: 'Remediation audit ledger',
    ref: 'docs/remediation/evidence/dsx-audit/audit.jsonl',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: 'tests/unit/enterprise-audit-remediation.test.ts',
    note: 'Verified defects converted into standing contract tests.',
  },
  {
    id: 'ks-release-source-of-truth',
    kind: 'release-report',
    title: 'Production source-of-truth release practice',
    ref: 'docs/release/PRODUCTION_SOURCE_OF_TRUTH.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: null,
  },
  {
    id: 'ks-ux-audit-screenshots',
    kind: 'screenshot',
    title: 'Full UX audit capture set',
    ref: 'docs/audit/full-ux',
    disposition: 'unresolved',
    redactionState: 'pending-review',
    regressionCaseRef: null,
    note: 'Awaiting review for personal data in captures before indexing.',
  },
  {
    id: 'ks-historical-prompts',
    kind: 'project-message',
    title: 'Historical project prompts and build messages',
    ref: 'project-message-history',
    disposition: 'unresolved',
    redactionState: 'pending-review',
    regressionCaseRef: null,
    note: 'Historical prompts are not automatically correct; each requires acceptance review and redaction before use.',
  },
  {
    id: 'ks-stale-prs',
    kind: 'commit-diff',
    title: 'Stale pull requests #65-#74',
    ref: 'git:pull/65..74',
    disposition: 'superseded',
    redactionState: 'pending-review',
    regressionCaseRef: null,
    note: 'Feature library only; governance forbids direct merge. Smallest relevant changes are reconstructed onto current remediation branches.',
  },
  {
    id: 'ks-engineering-knowledge-corpus',
    kind: 'repository-file',
    title: 'Engineering knowledge corpus (governed retrieval grounding)',
    ref: 'src/supervisor/knowledge/auraEngineeringKnowledge.ts',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: 'tests/unit/aura-engineering-knowledge-contract.test.ts',
    note: 'Version-pinned, citation-oriented corpus. Conceptual guidance only; restricted claims stay behind the evidence guardrails.',
  },
  {
    id: 'ks-adr-governed-ui-synthetic-data',
    kind: 'architecture-decision',
    title: 'ADR-0010 governed UI patterns and synthetic evaluation data',
    ref: 'docs/adr/0010-governed-ui-patterns-and-synthetic-evaluation-data.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: null,
  },
  {
    id: 'ks-supervisor-engineering-evals',
    kind: 'test-report',
    title: 'Supervisor engineering evaluation suite (synthetic data class)',
    ref: 'src/supervisor/evals/supervisor-engineering-evals.json',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: 'tests/unit/supervisor-engineering-evals.test.ts',
    note: 'Synthetic evaluation cases only; never telemetry or tenant data.',
  },
  {
    id: 'ks-persona-journey-map',
    kind: 'architecture-decision',
    title: 'AURA DC persona and golden-journey presentation contract',
    ref: 'docs/ux/persona-journey-map.md',
    disposition: 'accepted',
    redactionState: 'approved-redacted',
    regressionCaseRef: 'tests/unit/persona-journey-model.test.ts',
    note: 'Presentation families may prioritize work but never grant authorization.',
  },
];

/** A source may be indexed only when reviewed, redacted and not rejected. */
export function isIngestible(source: KnowledgeSource): boolean {
  return source.redactionState === 'approved-redacted' && source.disposition !== 'rejected';
}

/**
 * Deterministic sensitive-material scanner used before any source is
 * approved. Patterns cover JWT-shaped tokens, service-role key references,
 * bearer tokens, common API-key shapes and e-mail addresses (personal data).
 */
const SENSITIVE_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  { id: 'service-role-reference', pattern: /service[_-]?role[_-]?key/i },
  { id: 'bearer-token', pattern: /bearer\s+[A-Za-z0-9._-]{16,}/i },
  { id: 'api-key-shape', pattern: /\b(?:sk|pk|ak|key)-[A-Za-z0-9]{16,}\b/ },
  { id: 'password-literal', pattern: /password\s*[:=]\s*\S+/i },
  { id: 'email-address', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];

export interface SensitiveMatch {
  patternId: string;
  index: number;
}

export function scanForSensitiveMaterial(text: string): SensitiveMatch[] {
  const matches: SensitiveMatch[] = [];
  for (const { id, pattern } of SENSITIVE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) matches.push({ patternId: id, index: match.index });
  }
  return matches;
}

/**
 * A rejected or superseded source that documents a verified mistake must be
 * convertible into a regression/evaluation case so the mistake stays fixed.
 */
export function toRegressionCase(source: KnowledgeSource): string | null {
  if (source.regressionCaseRef) return source.regressionCaseRef;
  if (source.disposition === 'rejected' || source.disposition === 'superseded') {
    return `pending-regression-case:${source.id}`;
  }
  return null;
}
