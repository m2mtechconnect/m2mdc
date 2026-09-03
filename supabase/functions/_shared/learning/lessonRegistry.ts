/**
 * Canonical, code-owned AURA lesson registry.
 *
 * ONE source of truth, shared verbatim by the edge runtime and by vitest.
 * There is no mirror to drift from.
 *
 * Each reviewed lesson encodes the MECHANISM, not the current wording of any
 * single answer, so a rephrased regression still fails the eval suite.
 */
import { lessonSetDigest, validateLesson, type AuraLesson } from './lessonTypes.ts';

export const LESSON_REGISTRY_VERSION = '2026-09-03.1';

const LESSONS: readonly AuraLesson[] = Object.freeze([
  Object.freeze({
    id: 'viewport-evidence-exact-tuple.v1',
    version: 1,
    title: 'Viewport evidence is a complete canonical tuple keyed by a registered surface id',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'A visualisation claim is grounded only when the client-supplied surface id names a record in the canonical viewport registry AND the renderer, disclosure and limitation match that one record exactly as a complete tuple. Unknown ids, partial tuples and values mixed across surfaces are rejected. Grounded values are copied from the registry record, never echoed from client strings, and no viewport claim can assert a validated OpenUSD stage.',
    guidance:
      'When describing what a viewport shows, use only the visualisation values the server envelope marks as grounded, and name the canonical surface id they came from. If the envelope reports the visualisation as not grounded, say the visualisation is not verified rather than describing a renderer, disclosure or limitation. Procedural 2D or 3D preview is never a validated OpenUSD stage.',
    citations: [
      'supabase/functions/_shared/assistantTruth.ts#CANONICAL_VIEWPORT_SURFACES',
      'src/workspace/viewportRegistry.ts',
      'tests/unit/assistant-truth-grounding-contract.test.ts',
    ],
    triggers: ['viewport', 'visualisation', 'visualization', 'render', 'openusd', 'usd', '3d', 'stage', 'preview'],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-01T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'run-id-untrusted-locator.v1',
    version: 1,
    title: 'A client run id is an untrusted locator; provenance needs an authenticated RLS-scoped read',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'A run id supplied by the client is only a locator. It becomes provenance solely after an authenticated, caller-scoped read of public.simulation_runs under RLS, never through the service role and never by echoing the identifier. Malformed or fabricated ids, unauthenticated requests and rows the caller cannot see all fail closed to not verified. An explicit null page run states that the current page shows no run; it is never evidence that no run exists in the database.',
    guidance:
      'Only call a run recorded when the server envelope marks it verified. Never repeat a run identifier supplied by the page as proof that the run exists. When the page shows no run, say the current AURA page shows no run and state that this is not proof that no run exists in the database. When a run id could not be verified, say the run is not verified instead of describing its results.',
    citations: [
      'supabase/functions/_shared/assistantTruth.ts#extractCandidateRunId',
      'supabase/functions/copilot-stream/index.ts#run-provenance-lookup',
      'tests/unit/assistant-truth-grounding-contract.test.ts',
    ],
    triggers: ['run', 'run id', 'provenance', 'simulation run', 'recorded', 'results', 'history'],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-01T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'ref-transparency-dev-instrumentation.v1',
    version: 1,
    title:
      'Ref transparency for Slot/asChild/clone consumers; a dev-server-only warning flood is an environment finding first',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'An app-owned function component consumed by Slot/asChild, cloneElement or any ref-bearing parent must be ref-transparent through React.forwardRef, with correct element and ref types and the ref reaching the real DOM node. A console warning flood that appears only under a development-mode tooling server - with zero page errors and a clean production-mode run of the same head - is an environment finding caused by the instrumentation, not an application defect, until a production-mode reproduction proves otherwise. The remediation is environment policy that disables the instrumentation for automated runs; console filtering, warning suppression, relaxed assertions, retries and skips are never acceptable remediations.',
    guidance:
      'When a console warning flood names refs on function components across the whole tree, first check whether it appears only under a development-mode tooling server: compare a production-mode run of the same head and the pageerror count. If only the dev server floods and page errors are zero, treat it as an environment finding and correct the environment policy; never filter console output, relax assertions, or add retries and skips. If a warning survives with the instrumentation off, use its Check-the-render-method frame to name the app-owned recipient, convert that component to React.forwardRef with the ref forwarded to the real DOM node, and sweep every sibling consumed by Slot, asChild, cloneElement or another ref-bearing parent in the same change.',
    citations: [
      'scripts/componentTaggerPolicy.ts',
      'vite.config.ts#shouldEnableComponentTagger',
      'playwright.truth.config.ts#AURA_DISABLE_COMPONENT_TAGGER',
      'tests/unit/component-tagger-policy.test.ts',
      'tests/harness-negative/tagger-flood-reproduction.spec.ts',
    ],
    triggers: [
      'forwardref',
      'function components cannot be given refs',
      'warning flood',
      'console warning',
      'ref transparency',
      'aschild',
      'slot',
      'cloneelement',
      'component tagger',
      'dev instrumentation',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-01T16:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'dev-instrumentation-activation-parity.v1',
    version: 1,
    title:
      'Vendor activation preconditions must be declared explicitly in portable qualification',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'A development-instrumentation plugin must never rely on an undeclared vendor environment precondition. lovable-tagger defaults jsxSource and tailwindConfig to LOVABLE_DEV_SERVER === true, so a plugin the AURA activation policy selected can silently no-op outside the hosted dev server and make a negative reproduction gate environment-dependent. Activation options must therefore be passed explicitly by the build config, and any harness that depends on the instrumentation must declare the same precondition. An environment-only failure may be reclassified only with evidence from an explicit, portable reproduction; it may never be reclassified by console filtering, warning suppression, retries, skips or relaxed assertions. This is governed retrieval and evaluation learning only; it never authorises autonomous model-weight training or self-modification of code, prompts, policies or production configuration.',
    guidance:
      'When development-only instrumentation appears to behave differently on two machines or between local development and a qualification gate, check the vendor activation preconditions before concluding anything about the application. State the exact environment variables and options that enable the tooling, pass those options explicitly in the build configuration, and set the same variables in the harness that reproduces the behaviour. Reclassify an environment finding only with an explicit portable reproduction as evidence; never by filtering console output, adding retries or skips, or relaxing an assertion.',
    citations: [
      'scripts/componentTaggerPolicy.ts#componentTaggerOptions',
      'vite.config.ts#componentTaggerOptions',
      'playwright.tagger-repro.config.ts#LOVABLE_DEV_SERVER',
      'tests/unit/component-tagger-policy.test.ts',
      'tests/unit/dev-instrumentation-activation-parity-lesson.test.ts',
    ],
    triggers: [
      'lovable_dev_server',
      'lovable dev server',
      'activation parity',
      'vendor default',
      'tagger options',
      'jsxsource',
      'tailwindconfig',
      'no-op plugin',
      'environment precondition',
      'reproduction gate',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-01T18:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'release-workflow-shell-syntax-parity.v1',
    version: 1,
    title: 'Release workflow shell fragments must remain valid after YAML block indentation is removed',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'Every release-gating shell fragment must be validated in the exact representation executed by the workflow runner after YAML block indentation is removed. A Bash heredoc terminator must begin at column zero unless the tab-stripping form is used; nesting an indented heredoc in a loop is therefore release-blocking even when the product, fingerprint and routes are healthy. Prefer shell-safe inline execution for nested scripts, preserve fail-closed security checks, and require a platform-neutral contract test that parses the workflow and rejects unterminated heredocs before deployment verification.',
    guidance:
      'When a release workflow fails after the source build and live fingerprint pass, separate product evidence from verifier execution evidence. Inspect the runner-expanded shell, not only the YAML source. For a heredoc inside a loop or conditional, either keep its terminator at the exact Bash-required column or replace it with a shell-safe inline script. Retain origin, fingerprint and route assertions unchanged, then run a workflow-parsing regression test before re-dispatching the exact candidate.',
    citations: [
      '.github/workflows/release-target-verification.yml#Smoke-published-routes-without-cross-origin-redirects',
      'tests/unit/release-target-verification-contract.test.ts',
      'https://github.com/m2mtechconnect/m2mdc/actions/runs/33673228870',
    ],
    triggers: [
      'release workflow',
      'github actions',
      'heredoc',
      'unexpected end of file',
      'workflow syntax',
      'route smoke',
      'release verifier',
      'deployment blocked',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-02T19:32:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'cross-layer-product-truth-parity.v1',
    version: 1,
    title: 'A feature is complete only when product identity, data binding, UI, routes and release evidence agree',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'A successful component test or policy classification never proves end-to-end product truth. For every changed feature, the persisted product identity and facility binding, backend query and authorization path, frontend route mount and navigation, UI labels and unavailable states, synthetic evaluation, production build artifact and runtime journey must describe the same capability. Unit, integration, visual and browser-journey contracts must encode the same authority rule; a stale fixture that requires a fallback forbidden by the runtime is a release failure, not permission to weaken the runtime. A production-blocked route must be absent from the production build, an unbound facility product must never borrow generic agent evidence, and missing authoritative context must fail closed rather than substitute a demonstration dataset or invented value.',
    guidance:
      'Before calling an AURA change complete, build a cross-layer trace from persona intent to persisted identity, authorized data source, API/function, UI state, route/navigation, production artifact and runtime evidence. When an authority or fallback rule changes, search for every assertion of the replaced state or label and sweep every unit, integration, visual and browser-journey assertion in the same change, including redirect aliases and generated screenshot evidence; reject contradictory expectations before CI. A test for facility-bound content must create an explicit active facility fixture, while a test without authoritative facility context must assert the fail-closed state. Test the exact, analogous and adversarial cases. Treat a taxonomy label without a build-time guard, a UI card without a bound dataset, a stale fixture that invents context, or a passing mocked journey without verified backend evidence as incomplete. Persist every confirmed miss as a focused regression and synthetic lesson evaluation. This governed learning adds reviewed guidance only; it does not perform autonomous model-weight training or change production configuration.',
    citations: [
      'scripts/verify-production-perimeter.mjs#NEG-A',
      'src/dsx/runtime/evidenceFacilityScope.ts',
      'src/components/builder/steps/Step5Deploy.tsx',
      'tests/unit/builder-deployment-truth-contract.test.ts',
      'tests/unit/evidence-facility-context-contract.test.ts',
      'tests/visual/snapshots.spec.ts#expectLifecycleNavigation',
      'tests/truth-in-ui/auth-surfaces.spec.ts#/infrastructure',
      'tests/truth-in-ui/screenshots.spec.ts#infrastructure',
      'tests/truth-in-ui/_setup/supabase-mock.ts#installDsxSupabaseMock',
      'tests/truth-in-ui/navigation-click-audit.spec.ts#expectEvidenceContext',
    ],
    triggers: [
      'end to end',
      'frontend backend parity',
      'route blocked',
      'production perimeter',
      'facility binding',
      'demo dataset',
      'mock data',
      'ui api mismatch',
      'super agent missed',
      'cross layer',
      'stale test contract',
      'visual regression',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-02T21:15:00.000Z',
    supersedes: null,
  } as AuraLesson),
]);


export const LESSON_REGISTRY: readonly AuraLesson[] = LESSONS;

/** Integrity digest of the whole registry (all statuses). */
export const LESSON_REGISTRY_DIGEST = lessonSetDigest(LESSONS);

export function allLessons(): readonly AuraLesson[] {
  return LESSONS;
}

export function lessonById(id: string): AuraLesson | null {
  return LESSONS.find((l) => l.id === id) ?? null;
}

/**
 * Active lessons only. A draft or retired lesson can never reach the runtime,
 * and neither can a lesson that fails contract validation.
 */
export function activeLessons(): readonly AuraLesson[] {
  return LESSONS.filter((l) => l.status === 'active' && validateLesson(l).valid);
}

export interface RegistryIntegrityResult {
  ok: boolean;
  digest: string;
  problems: string[];
}

/** Fail-closed integrity check over the registry. */
export function verifyLessonRegistryIntegrity(): RegistryIntegrityResult {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const lesson of LESSONS) {
    if (seen.has(lesson.id)) problems.push(`duplicate lesson id: ${lesson.id}`);
    seen.add(lesson.id);
    const result = validateLesson(lesson);
    if (!result.valid) problems.push(`${lesson.id}: ${result.violations.join('; ')}`);
  }
  return { ok: problems.length === 0, digest: LESSON_REGISTRY_DIGEST, problems };
}
