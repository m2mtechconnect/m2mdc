/**
 * Evidence guardrails contract (ADR-0010).
 *
 * Proves fail-closed behaviour for every restricted claim category:
 * integration, calibration, deployment, schema safety and production
 * readiness stay blocked without a valid artifact of an allowed class,
 * and vendor runtime terms without evidence always block.
 */
import { describe, expect, it } from 'vitest';

import {
  CATEGORY_EVIDENCE_REQUIREMENTS,
  CLAIM_EVIDENCE_KINDS,
  RESTRICTED_CLAIM_CATEGORIES,
  VENDOR_RUNTIME_TERMS,
  detectRestrictedClaims,
  evaluateRestrictedClaim,
  guardGroundedAnswer,
  validateClaimEvidence,
  type ClaimEvidenceKind,
  type RestrictedClaimCategory,
} from '../../src/supervisor/knowledge/evidenceGuardrails';

const validEvidenceOf = (kind: ClaimEvidenceKind) => ({
  artifactRef: `docs/evidence/synthetic-${kind}.md`,
  kind,
  sha256: null,
  performedAt: '2026-08-31T10:00:00Z',
});

describe('restricted claim categories', () => {
  it('covers exactly the five governed categories', () => {
    expect([...RESTRICTED_CLAIM_CATEGORIES].sort()).toEqual(
      ['calibration', 'deployment', 'integration', 'production-readiness', 'schema-safety'].sort(),
    );
  });

  it('every category requires at least one provable evidence class', () => {
    for (const category of RESTRICTED_CLAIM_CATEGORIES) {
      const kinds = CATEGORY_EVIDENCE_REQUIREMENTS[category];
      expect(kinds.length).toBeGreaterThan(0);
      for (const kind of kinds) expect(CLAIM_EVIDENCE_KINDS).toContain(kind);
    }
  });
});

describe('fail-closed claim evaluation', () => {
  it.each([...RESTRICTED_CLAIM_CATEGORIES])(
    '%s claim without evidence is blocked-unevidenced',
    (category) => {
      const evaluation = evaluateRestrictedClaim({
        category,
        statement: 'synthetic statement',
        evidence: [],
      });
      expect(evaluation.verdict).toBe('blocked-unevidenced');
      expect(evaluation.supportingArtifactRefs).toEqual([]);
      expect(evaluation.reasons.length).toBeGreaterThan(0);
    },
  );

  it.each([...RESTRICTED_CLAIM_CATEGORIES])(
    '%s claim with a valid allowed-class artifact is allowed-evidenced',
    (category) => {
      const kind = CATEGORY_EVIDENCE_REQUIREMENTS[category][0];
      const evaluation = evaluateRestrictedClaim({
        category,
        statement: 'synthetic statement',
        evidence: [validEvidenceOf(kind)],
      });
      expect(evaluation.verdict).toBe('allowed-evidenced');
      expect(evaluation.supportingArtifactRefs.length).toBe(1);
    },
  );

  it('wrong evidence class stays blocked', () => {
    const evaluation = evaluateRestrictedClaim({
      category: 'production-readiness',
      statement: 'synthetic statement',
      evidence: [validEvidenceOf('deployment-log')],
    });
    expect(evaluation.verdict).toBe('blocked-wrong-evidence-kind');
  });

  it('invalid evidence stays blocked with reasons', () => {
    const evaluation = evaluateRestrictedClaim({
      category: 'deployment',
      statement: 'synthetic statement',
      evidence: [{ artifactRef: '', kind: 'deployment-log', sha256: null, performedAt: 'yesterday' }],
    });
    expect(evaluation.verdict).toBe('blocked-invalid-evidence');
    expect(evaluation.reasons.length).toBeGreaterThan(0);
  });
});

describe('evidence validation', () => {
  it('accepts a well-formed artifact with or without sha256', () => {
    expect(validateClaimEvidence(validEvidenceOf('test-report')).valid).toBe(true);
    expect(
      validateClaimEvidence({
        ...validEvidenceOf('test-report'),
        sha256: 'a'.repeat(64),
      }).valid,
    ).toBe(true);
  });

  it('rejects missing artifactRef, bad kind, bad timestamp and bad digest', () => {
    expect(validateClaimEvidence({ ...validEvidenceOf('test-report'), artifactRef: ' ' }).valid).toBe(false);
    expect(validateClaimEvidence({ ...validEvidenceOf('test-report'), kind: 'promise' }).valid).toBe(false);
    expect(validateClaimEvidence({ ...validEvidenceOf('test-report'), performedAt: 'soon' }).valid).toBe(false);
    expect(validateClaimEvidence({ ...validEvidenceOf('test-report'), sha256: 'xyz' }).valid).toBe(false);
  });
});

describe('claim detection', () => {
  const detectionCases: Array<[RestrictedClaimCategory, string]> = [
    ['integration', 'The platform is now integrated with the facility bus.'],
    ['calibration', 'The cooling model was successfully calibrated last quarter.'],
    ['deployment', 'The evidence service has been deployed.'],
    ['schema-safety', 'The migration is safe to apply tonight.'],
    ['production-readiness', 'This build is production ready.'],
  ];

  it.each(detectionCases)('detects %s claims', (category, statement) => {
    const detected = detectRestrictedClaims(statement);
    expect(detected.map((d) => d.category)).toContain(category);
  });

  it.each([...VENDOR_RUNTIME_TERMS])(
    'vendor term "%s" plus runtime language is an integration claim',
    (term) => {
      const detected = detectRestrictedClaims(`The ${term} runtime handles the twin.`);
      expect(detected.map((d) => d.category)).toContain('integration');
    },
  );

  it('does not flag neutral methodology prose', () => {
    expect(
      detectRestrictedClaims(
        'Calibration compares modelled outputs against measured series over a defined window.',
      ),
    ).toEqual([]);
    expect(
      detectRestrictedClaims('USD layers compose opinions under a deterministic strength ordering.'),
    ).toEqual([]);
  });
});

describe('grounded answer guarding', () => {
  it('blocks an unevidenced vendor integration answer', () => {
    const result = guardGroundedAnswer('AURA is integrated with the OpenDC runtime simulator.', []);
    expect(result.status).toBe('blocked');
    expect(result.detectedCategories).toContain('integration');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('passes the same claim when a valid runtime probe artifact backs it', () => {
    const result = guardGroundedAnswer(
      'AURA is integrated with the OpenDC runtime simulator.',
      [validEvidenceOf('runtime-probe')],
    );
    expect(result.status).toBe('pass');
    expect(result.violations).toEqual([]);
  });

  it('passes claim-free answers untouched', () => {
    const result = guardGroundedAnswer(
      'Package heavy geometry behind a payload so large scenes load structure first.',
      [],
    );
    expect(result.status).toBe('pass');
    expect(result.detectedCategories).toEqual([]);
  });

  it('blocks when any one of several claims lacks matching evidence', () => {
    const result = guardGroundedAnswer(
      'The service was successfully deployed and the release is production ready.',
      [validEvidenceOf('deployment-log')],
    );
    expect(result.status).toBe('blocked');
    expect(result.violations.map((v) => v.category)).toEqual(['production-readiness']);
  });
});
