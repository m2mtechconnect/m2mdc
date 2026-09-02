/**
 * Synthetic evaluation cases for the AURA truth invariants.
 *
 * Data class: synthetic-evaluation-data. Authored, reviewed material only -
 * never telemetry, never tenant data, never captured user content.
 *
 * Each case pins a MECHANISM that must not regress:
 *   - viewport evidence must be a complete canonical tuple (spoofed, mixed
 *     and unknown-surface tuples must be rejected);
 *   - a client run id is an untrusted locator (malformed, fabricated and
 *     unauthenticated ids must not ground provenance);
 *   - an explicit null page run must not be worded as database absence.
 */

export const TRUTH_EVAL_SUITE_ID = 'aura-truth-invariants';
export const TRUTH_EVAL_DATA_CLASS = 'synthetic-evaluation-data';

export type TruthEvalKind = 'viewport-claim' | 'run-provenance' | 'null-run-wording' | 'lesson-integrity';

export interface ViewportEvalCase {
  id: string;
  kind: 'viewport-claim';
  title: string;
  /** The untrusted viewport claim sent by the client. */
  claim: Record<string, unknown>;
  expect: { grounded: boolean; surfaceId: string | null; rejected: boolean };
}

export interface RunProvenanceEvalCase {
  id: string;
  kind: 'run-provenance';
  title: string;
  context: Record<string, unknown>;
  /** Whether the harness simulates an authenticated RLS-verified lookup. */
  authenticatedLookup: boolean;
  /** Row the RLS-scoped lookup returns, when the harness performs one. */
  lookupReturnsId: string | null;
  expect: { candidateExtracted: boolean; recorded: boolean; verified: boolean };
}

export interface NullRunWordingEvalCase {
  id: string;
  kind: 'null-run-wording';
  title: string;
  query: string;
  expect: { mustContain: string[]; mustNotContain: string[] };
}

export interface LessonIntegrityEvalCase {
  id: string;
  kind: 'lesson-integrity';
  title: string;
  lessonId: string;
  expect: { active: boolean; invariantMustMention: string[] };
}

export type TruthEvalCase = (
  | ViewportEvalCase
  | RunProvenanceEvalCase
  | NullRunWordingEvalCase
  | LessonIntegrityEvalCase
) & { dataClass: typeof TRUTH_EVAL_DATA_CLASS };

type TruthEvalCaseInput =
  | ViewportEvalCase
  | RunProvenanceEvalCase
  | NullRunWordingEvalCase
  | LessonIntegrityEvalCase;

const VALID_UUID = '11111111-2222-4333-8444-555555555555';
const OTHER_UUID = '99999999-8888-4777-8666-555555555555';

const TRUTH_EVAL_CASE_INPUTS: readonly TruthEvalCaseInput[] = [
  {
    id: 'viewport-exact-tuple-accepted',
    kind: 'viewport-claim',
    title: 'A complete canonical tuple for a registered surface is grounded',
    claim: {
      id: 'command-centre-plan-card',
      renderer: 'svg-2d',
      disclosure: 'Procedural 2D floor plan of the modelled design',
      limitation: 'Not a validated OpenUSD stage',
    },
    expect: { grounded: true, surfaceId: 'command-centre-plan-card', rejected: false },
  },
  {
    id: 'viewport-mixed-tuple-rejected',
    kind: 'viewport-claim',
    title: 'A tuple mixed across two canonical surfaces is rejected',
    claim: {
      id: 'command-centre-plan-card',
      renderer: 'three-webgl',
      disclosure: 'Procedural 2D floor plan of the modelled design',
      limitation: 'Not a validated OpenUSD stage',
    },
    expect: { grounded: false, surfaceId: null, rejected: true },
  },
  {
    id: 'viewport-spoofed-openusd-rejected',
    kind: 'viewport-claim',
    title: 'A spoofed validated-OpenUSD disclosure is rejected',
    claim: {
      id: 'workspace-model-viewport',
      renderer: 'three-webgl',
      disclosure: 'Validated OpenUSD stage rendered by an accelerated runtime',
      limitation: null,
    },
    expect: { grounded: false, surfaceId: null, rejected: true },
  },
  {
    id: 'viewport-unknown-surface-rejected',
    kind: 'viewport-claim',
    title: 'An unregistered surface id is rejected even with plausible values',
    claim: {
      id: 'totally-new-surface',
      renderer: 'three-webgl',
      disclosure: 'Procedural 3D preview, except one canary rack rendered from a validated USD-derived GLB',
      limitation: null,
    },
    expect: { grounded: false, surfaceId: null, rejected: true },
  },
  {
    id: 'run-malformed-id-not-extracted',
    kind: 'run-provenance',
    title: 'A malformed run id never becomes a locator',
    context: { facilityTruth: { run: { id: 'run-42' } } },
    authenticatedLookup: false,
    lookupReturnsId: null,
    expect: { candidateExtracted: false, recorded: false, verified: false },
  },
  {
    id: 'run-fabricated-id-unverified',
    kind: 'run-provenance',
    title: 'A well-formed but fabricated run id stays unverified when the RLS lookup returns nothing',
    context: { facilityTruth: { run: { id: VALID_UUID } } },
    authenticatedLookup: true,
    lookupReturnsId: null,
    expect: { candidateExtracted: true, recorded: false, verified: false },
  },
  {
    id: 'run-no-auth-unverified',
    kind: 'run-provenance',
    title: 'An unauthenticated request cannot ground a run even with a valid id',
    context: { facilityTruth: { run: { id: VALID_UUID } } },
    authenticatedLookup: false,
    lookupReturnsId: VALID_UUID,
    expect: { candidateExtracted: true, recorded: false, verified: false },
  },
  {
    id: 'run-verified-record-grounds',
    kind: 'run-provenance',
    title: 'Only a server-verified record grounds a recorded run',
    context: { facilityTruth: { run: { id: OTHER_UUID } } },
    authenticatedLookup: true,
    lookupReturnsId: OTHER_UUID,
    expect: { candidateExtracted: true, recorded: true, verified: true },
  },
  {
    id: 'null-run-wording',
    kind: 'null-run-wording',
    title: 'An explicit null page run is never worded as database absence',
    query: 'Is this run recorded, and what is its provenance?',
    expect: {
      mustContain: ['shows no run'],
      mustNotContain: [
        'there are no runs in the database',
        'the database contains no run',
        'no simulation run exists',
      ],
    },
  },
  {
    id: 'lesson-viewport-active',
    kind: 'lesson-integrity',
    title: 'The viewport tuple lesson is active and encodes the mechanism',
    lessonId: 'viewport-evidence-exact-tuple.v1',
    expect: { active: true, invariantMustMention: ['tuple', 'registry', 'reject'] },
  },
  {
    id: 'lesson-run-locator-active',
    kind: 'lesson-integrity',
    title: 'The run-locator lesson is active and encodes the mechanism',
    lessonId: 'run-id-untrusted-locator.v1',
    expect: { active: true, invariantMustMention: ['locator', 'rls', 'service role'] },
  },
  {
    id: 'lesson-ref-transparency-active',
    kind: 'lesson-integrity',
    title: 'The ref-transparency / dev-instrumentation lesson is active and encodes the mechanism',
    lessonId: 'ref-transparency-dev-instrumentation.v1',
    expect: {
      active: true,
      // The mechanism, not the wording: ref transparency via forwardRef,
      // dev-instrumentation floods are environment findings, and console
      // filtering is never a remediation.
      invariantMustMention: ['forwardref', 'instrumentation', 'environment finding', 'filtering'],
    },
  },
  {
    id: 'lesson-activation-parity-active',
    kind: 'lesson-integrity',
    title: 'The dev-instrumentation activation-parity lesson is active and encodes the mechanism',
    lessonId: 'dev-instrumentation-activation-parity.v1',
    expect: {
      active: true,
      // Mechanism, not wording: the vendor precondition must be explicit and
      // an environment finding may only be reclassified with evidence.
      invariantMustMention: ['lovable_dev_server', 'explicitly', 'evidence', 'filtering'],
    },
  },
];


/**
 * Every case is stamped with the synthetic data class: these are authored
 * fixtures, never telemetry or captured user content.
 */
export const TRUTH_EVAL_CASES: readonly TruthEvalCase[] = TRUTH_EVAL_CASE_INPUTS.map(
  (testCase) => ({ ...testCase, dataClass: TRUTH_EVAL_DATA_CLASS }),
);
