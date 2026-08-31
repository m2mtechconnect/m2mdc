/**
 * Engineering knowledge corpus contract (ADR-0010).
 *
 * Proves: retrieval grounding is deterministic and citation-oriented, the
 * corpus is version-pinned with a checksum, no tenant/secret material is
 * present, corpus prose makes no restricted claims, and unknown queries
 * return explicit no-grounding instead of fabrication.
 */
import { describe, expect, it } from 'vitest';

import {
  ENGINEERING_CORPUS_MANIFEST,
  ENGINEERING_KNOWLEDGE_CORPUS,
  auditEngineeringCorpus,
  computeCorpusChecksum,
  retrieveEngineeringKnowledge,
  verifyCorpusIntegrity,
} from '../../src/supervisor/knowledge/auraEngineeringKnowledge';
import {
  ENGINEERING_KNOWLEDGE_DOMAINS,
} from '../../src/supervisor/knowledge/engineeringKnowledgeTypes';
import { KNOWLEDGE_SOURCES, isIngestible } from '../../src/supervisor/knowledgeRegistry';

describe('corpus version pinning', () => {
  it('manifest carries a semantic version and ISO pin date', () => {
    expect(ENGINEERING_CORPUS_MANIFEST.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(ENGINEERING_CORPUS_MANIFEST.pinnedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('pinned checksum matches the recomputed corpus checksum', () => {
    expect(computeCorpusChecksum(ENGINEERING_KNOWLEDGE_CORPUS)).toBe(
      ENGINEERING_CORPUS_MANIFEST.checksum,
    );
  });

  it('pinned entry count matches the corpus', () => {
    expect(ENGINEERING_KNOWLEDGE_CORPUS.length).toBe(ENGINEERING_CORPUS_MANIFEST.entryCount);
  });

  it('verifyCorpusIntegrity reports ok', () => {
    const integrity = verifyCorpusIntegrity();
    expect(integrity.reasons).toEqual([]);
    expect(integrity.ok).toBe(true);
  });

  it('checksum changes when content changes', () => {
    const mutated = ENGINEERING_KNOWLEDGE_CORPUS.map((entry, index) =>
      index === 0 ? { ...entry, guidance: `${entry.guidance} drifted` } : entry,
    );
    expect(computeCorpusChecksum(mutated)).not.toBe(ENGINEERING_CORPUS_MANIFEST.checksum);
  });
});

describe('corpus entry invariants', () => {
  it('ids are unique', () => {
    const ids = ENGINEERING_KNOWLEDGE_CORPUS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry is cited, domain-valid and conceptual-only', () => {
    for (const entry of ENGINEERING_KNOWLEDGE_CORPUS) {
      expect(ENGINEERING_KNOWLEDGE_DOMAINS).toContain(entry.domain);
      expect(entry.guidance.length).toBeGreaterThan(100);
      expect(entry.citations.length).toBeGreaterThan(0);
      for (const citation of entry.citations) {
        expect(citation.label.length).toBeGreaterThan(0);
        expect(citation.locator.length).toBeGreaterThan(0);
      }
      expect(entry.runtimeIntegrationClaim).toBe('none');
      expect(entry.provenance).toBe('engineering-guidance');
      expect(entry.tenantScope).toBe('global');
      expect(entry.keywords.length).toBeGreaterThan(0);
      for (const keyword of entry.keywords) {
        expect(keyword).toBe(keyword.toLowerCase());
      }
    }
  });

  it('covers all four knowledge domains', () => {
    const domains = new Set(ENGINEERING_KNOWLEDGE_CORPUS.map((e) => e.domain));
    for (const domain of ENGINEERING_KNOWLEDGE_DOMAINS) {
      expect(domains.has(domain)).toBe(true);
    }
  });

  it('holds no tenant/secret material and no restricted-claim prose', () => {
    const audit = auditEngineeringCorpus();
    expect(audit.sensitiveMatches).toEqual([]);
    expect(audit.claimViolations).toEqual([]);
    expect(audit.clean).toBe(true);
  });
});

describe('deterministic retrieval grounding', () => {
  it('grounded results echo the corpus pin and carry citations', () => {
    const result = retrieveEngineeringKnowledge({ query: 'PUE efficiency metrics boundary' });
    expect(result.grounding).toBe('grounded');
    expect(result.corpusVersion).toBe(ENGINEERING_CORPUS_MANIFEST.version);
    expect(result.corpusChecksum).toBe(ENGINEERING_CORPUS_MANIFEST.checksum);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.matches[0].entry.id).toBe('se-pue-efficiency-metrics');
  });

  it('is pure: identical input yields identical output', () => {
    const a = retrieveEngineeringKnowledge({ query: 'usd composition layers prim opinions' });
    const b = retrieveEngineeringKnowledge({ query: 'usd composition layers prim opinions' });
    expect(a).toEqual(b);
  });

  it('ranks matches by descending score with deterministic tie-break', () => {
    const result = retrieveEngineeringKnowledge({ query: 'simulation calibration workload' });
    for (let i = 1; i < result.matches.length; i += 1) {
      expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score);
    }
  });

  it('honours the domain filter', () => {
    const result = retrieveEngineeringKnowledge({
      query: 'asset payload pipeline',
      domains: ['openusd-assets'],
    });
    for (const match of result.matches) {
      expect(match.entry.domain).toBe('openusd-assets');
    }
  });

  it('respects maxResults', () => {
    const result = retrieveEngineeringKnowledge({ query: 'data simulation usd dashboard', maxResults: 2 });
    expect(result.matches.length).toBeLessThanOrEqual(2);
  });

  it('returns explicit no-grounding for out-of-corpus queries', () => {
    const result = retrieveEngineeringKnowledge({ query: 'quantum blockchain nft staking metaverse' });
    expect(result.grounding).toBe('no-grounding');
    expect(result.matches).toEqual([]);
    expect(result.citations).toEqual([]);
  });

  it('takes no tenant context: request shape is query, domains, maxResults only', () => {
    const request = { query: 'pue', domains: undefined, maxResults: undefined };
    expect(Object.keys(request).sort()).toEqual(['domains', 'maxResults', 'query']);
  });
});

describe('knowledge registry integration', () => {
  const expectedRefs = [
    'src/supervisor/knowledge/auraEngineeringKnowledge.ts',
    'docs/adr/0010-governed-ui-patterns-and-synthetic-evaluation-data.md',
    'src/supervisor/evals/supervisor-engineering-evals.json',
  ];

  it.each(expectedRefs)('indexes %s as an ingestible source', (ref) => {
    const source = KNOWLEDGE_SOURCES.find((s) => s.ref === ref);
    expect(source).toBeDefined();
    expect(isIngestible(source!)).toBe(true);
  });
});
