/**
 * AURA engineering knowledge — governed retrieval module (server-side plane).
 *
 * Deterministic, read-only retrieval over the version-pinned engineering
 * corpus. This is RAG-style grounding ONLY:
 *
 *  - No model fine-tuning, no network or database IO, no tenant context.
 *    The module reads the static corpus below and nothing else, so it is
 *    safe to invoke from server-side assessment flows.
 *  - Version-pinned: `ENGINEERING_CORPUS_MANIFEST` records the corpus
 *    version, pin date and checksum. Contract tests recompute the checksum,
 *    so corpus drift without a version bump fails the build.
 *  - Citation-oriented: every grounded result returns the citations of the
 *    entries it matched. A query with no corpus support returns an explicit
 *    `no-grounding` result — never a fabricated answer.
 *  - Evidence-guarded: restricted claim categories surfaced by an entry must
 *    pass the evidence guardrails before any consumer may assert them.
 */
import { scanForSensitiveMaterial, type SensitiveMatch } from '../knowledgeRegistry';
import { detectRestrictedClaims, type RestrictedClaimCategory } from './evidenceGuardrails';
import type {
  EngineeringKnowledgeDomain,
  EngineeringKnowledgeEntry,
  KnowledgeCitation,
} from './engineeringKnowledgeTypes';
import { SIMULATOR_ENGINEERING_CORPUS } from './corpus/simulatorEngineeringCorpus';
import { OPENUSD_ASSETS_CORPUS } from './corpus/openUsdAssetsCorpus';
import { UI_UX_SYNTHETIC_GOVERNANCE_CORPUS } from './corpus/uiUxSyntheticGovernanceCorpus';
import { PLATFORM_ASSURANCE_CORPUS } from './corpus/platformAssuranceCorpus';

export const ENGINEERING_KNOWLEDGE_CORPUS: EngineeringKnowledgeEntry[] = [
  ...SIMULATOR_ENGINEERING_CORPUS,
  ...OPENUSD_ASSETS_CORPUS,
  ...UI_UX_SYNTHETIC_GOVERNANCE_CORPUS,
  ...PLATFORM_ASSURANCE_CORPUS,
];

// ------------------------------------------------------------- version pin

/**
 * Deterministic FNV-1a (32-bit) checksum over a canonical projection of the
 * corpus. Any change to entry content changes this value.
 */
export function computeCorpusChecksum(entries: EngineeringKnowledgeEntry[]): string {
  const canonical = JSON.stringify(
    [...entries]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((e) => ({
        id: e.id,
        domain: e.domain,
        title: e.title,
        guidance: e.guidance,
        keywords: e.keywords,
        citations: e.citations,
      })),
  );
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

export interface EngineeringCorpusManifest {
  /** Semantic version of the corpus content. Bump on any content change. */
  version: string;
  /** ISO date the current version was pinned. */
  pinnedAt: string;
  /** Expected checksum of the corpus at this version. */
  checksum: string;
  entryCount: number;
}

export const ENGINEERING_CORPUS_MANIFEST: EngineeringCorpusManifest = {
  version: '1.2.0',
  pinnedAt: '2026-09-01',
  checksum: 'fnv1a32:07234234',
  entryCount: 17,
};

export interface CorpusIntegrityResult {
  ok: boolean;
  expectedChecksum: string;
  actualChecksum: string;
  expectedEntryCount: number;
  actualEntryCount: number;
  reasons: string[];
}

/** Recompute and compare the pinned checksum and entry count. */
export function verifyCorpusIntegrity(): CorpusIntegrityResult {
  const actualChecksum = computeCorpusChecksum(ENGINEERING_KNOWLEDGE_CORPUS);
  const reasons: string[] = [];
  if (actualChecksum !== ENGINEERING_CORPUS_MANIFEST.checksum) {
    reasons.push(
      'Corpus checksum drifted from the pinned manifest. Bump the corpus version and re-pin the checksum.',
    );
  }
  if (ENGINEERING_KNOWLEDGE_CORPUS.length !== ENGINEERING_CORPUS_MANIFEST.entryCount) {
    reasons.push('Corpus entry count drifted from the pinned manifest.');
  }
  return {
    ok: reasons.length === 0,
    expectedChecksum: ENGINEERING_CORPUS_MANIFEST.checksum,
    actualChecksum,
    expectedEntryCount: ENGINEERING_CORPUS_MANIFEST.entryCount,
    actualEntryCount: ENGINEERING_KNOWLEDGE_CORPUS.length,
    reasons,
  };
}

// -------------------------------------------------------------- retrieval

export interface EngineeringRetrievalRequest {
  query: string;
  /** Optional domain filter. */
  domains?: EngineeringKnowledgeDomain[];
  /** Maximum matches returned; defaults to 5. */
  maxResults?: number;
}

export interface EngineeringRetrievalMatch {
  entry: EngineeringKnowledgeEntry;
  score: number;
  matchedKeywords: string[];
}

export interface EngineeringRetrievalResult {
  corpusVersion: string;
  corpusChecksum: string;
  /** `no-grounding` means the corpus cannot support the query. Fail-closed. */
  grounding: 'grounded' | 'no-grounding';
  matches: EngineeringRetrievalMatch[];
  /** De-duplicated citations of every matched entry, in match order. */
  citations: KnowledgeCitation[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenize(query: string): string[] {
  const matched = query.toLowerCase().match(/[a-z0-9]+/g);
  const raw: string[] = matched ? Array.from(matched) : [];
  return Array.from(new Set(raw.filter((token) => token.length >= 3)));
}

/**
 * Deterministic keyword retrieval. Scoring: exact keyword hit = 3, title
 * word hit = 2, guidance word hit = 1. Ties break on entry id so identical
 * inputs always produce identical output.
 */
export function retrieveEngineeringKnowledge(
  request: EngineeringRetrievalRequest,
): EngineeringRetrievalResult {
  const tokens = tokenize(request.query);
  const maxResults = request.maxResults && request.maxResults > 0 ? request.maxResults : 5;
  const domainFilter: EngineeringKnowledgeDomain[] = Array.isArray(request.domains)
    ? request.domains
    : [];
  const pool =
    domainFilter.length > 0
      ? ENGINEERING_KNOWLEDGE_CORPUS.filter((e) => domainFilter.includes(e.domain))
      : ENGINEERING_KNOWLEDGE_CORPUS;

  const scored: EngineeringRetrievalMatch[] = [];
  for (const entry of pool) {
    let score = 0;
    const matchedKeywords: string[] = [];
    for (const token of tokens) {
      const wordPattern = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i');
      if (entry.keywords.includes(token)) {
        score += 3;
        matchedKeywords.push(token);
      }
      if (wordPattern.test(entry.title)) score += 2;
      if (wordPattern.test(entry.guidance)) score += 1;
    }
    if (score > 0) scored.push({ entry, score, matchedKeywords });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  const matches = scored.slice(0, maxResults);

  const citations: KnowledgeCitation[] = [];
  const seenLocators = new Set<string>();
  for (const match of matches) {
    for (const citation of match.entry.citations) {
      if (!seenLocators.has(citation.locator)) {
        seenLocators.add(citation.locator);
        citations.push(citation);
      }
    }
  }

  return {
    corpusVersion: ENGINEERING_CORPUS_MANIFEST.version,
    corpusChecksum: ENGINEERING_CORPUS_MANIFEST.checksum,
    grounding: matches.length > 0 ? 'grounded' : 'no-grounding',
    matches,
    citations,
  };
}

// ------------------------------------------------------------ corpus audit

export interface CorpusClaimViolation {
  entryId: string;
  category: RestrictedClaimCategory;
  excerpt: string;
}

export interface EngineeringCorpusAudit {
  /** Secrets / personal-data scanner hits. Must be empty. */
  sensitiveMatches: Array<SensitiveMatch & { entryId: string }>;
  /** Restricted-claim language inside corpus prose. Must be empty. */
  claimViolations: CorpusClaimViolation[];
  clean: boolean;
}

/**
 * The corpus itself must satisfy the rules it teaches: no sensitive
 * material, and no restricted-claim language in its own prose.
 */
export function auditEngineeringCorpus(): EngineeringCorpusAudit {
  const sensitiveMatches: EngineeringCorpusAudit['sensitiveMatches'] = [];
  const claimViolations: CorpusClaimViolation[] = [];
  for (const entry of ENGINEERING_KNOWLEDGE_CORPUS) {
    const text = `${entry.title}\n${entry.guidance}\n${entry.keywords.join(' ')}`;
    for (const match of scanForSensitiveMaterial(text)) {
      sensitiveMatches.push({ ...match, entryId: entry.id });
    }
    for (const claim of detectRestrictedClaims(text)) {
      claimViolations.push({ entryId: entry.id, category: claim.category, excerpt: claim.excerpt });
    }
  }
  return {
    sensitiveMatches,
    claimViolations,
    clean: sensitiveMatches.length === 0 && claimViolations.length === 0,
  };
}
