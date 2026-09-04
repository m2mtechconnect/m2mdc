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

export const LESSON_REGISTRY_VERSION = '2026-09-04.2';

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
    id: 'auth-email-hook-signed-webhook.v1',
    version: 1,
    title: 'Auth email callbacks require a signed-webhook perimeter disposition',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'An auth email provider callback with gateway JWT disabled is not an anonymous API: it must be classified as a signed webhook, verify the provider signature and timestamp before parsing payload data or creating a privileged database client, require a supported payload version and run identifier, and fail closed for invalid signature, stale timestamp, malformed payload, unknown action or missing identifier. Preview rendering remains separately authenticated with scoped CORS; neither path may grant wildcard CORS or claim browser-accessible auth.',
    guidance:
      'When assessing an auth-email-hook, treat verify_jwt=false as a deliberate server-to-server webhook boundary only when the inventory records signed-webhook disposition and the handler verifies the provider signature and timestamp before privileged work. Keep preview and webhook paths separate, require the documented payload version and identifier, and describe invalid or unverified callbacks as rejected. Do not classify the hook as an anonymous browser API or infer production readiness from source code alone.',
    citations: [
      'tests/unit/auth-email-hook-contract.test.ts',
      'supabase/functions/auth-email-hook/index.ts',
      'supabase/config.toml#functions.auth-email-hook',
      'docs/remediation/evidence/pr-0.1/edge-function-inventory.json',
    ],
    triggers: [
      'auth-email-hook',
      'email hook',
      'signed webhook',
      'webhook signature',
      'lovable signature',
      'webhook timestamp',
      'provider callback',
      'verify_jwt',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-04T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'physics-model-claim-grounding.v1',
    version: 1,
    title: 'Physics-ML and NVIDIA claims require exact runtime evidence',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'Physics-ML, NVIDIA runtime, OpenUSD, DSX, NIM, SimReady and calibrated-model claims may be stated only when the canonical capability registry carries runtime evidence for the exact claim. Public source, reference documentation, mock data, a planned dependency or an AURA-authored browser derivative does not prove runtime integration, a trained model, calibrated output or production readiness. Unsupported claims remain unavailable or explicitly planned, and simulated values remain distinct from measured telemetry.',
    guidance:
      'When asked whether AURA uses a physics model or NVIDIA runtime, distinguish public reference code, a planned dependency, a model or checkpoint, a deployed runtime and measured production evidence. If the capability registry lacks exact runtime evidence, say unavailable or not configured. Label scripted or synthetic output as simulated, never as model-predicted or live. Require a model version, dataset provenance, held-out metrics, calibration and fallback evidence before promotion.',
    citations: [
      'src/config/dsxClaimsPolicy.ts',
      'src/config/dsxCapabilityRegistry.ts',
      'docs/dsx/nvidia-upstream-manifest.json',
      'src/simulation/providers/omniverseProvider.ts',
      'tests/unit/neutral-stack-surface-contract.test.ts',
    ],
    triggers: [
      'physics model',
      'physics-ml',
      'physicsnemo',
      'nvidia runtime',
      'omniverse',
      'openusd stage',
      'dsx exchange',
      'nim',
      'simready',
      'calibrated model',
      'model checkpoint',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-04T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'frontend-backend-api-contract.v1',
    version: 1,
    title: 'Frontend actions must be verified against canonical backend contracts',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'An end-to-end feature is real only when the frontend action calls the canonical API or RPC with the expected tenant and context fields, validates the response shape, persists the authoritative result, survives reload, and renders explicit loading, empty, error, cancellation and denial states. A mock, fixture, optimistic local state or successful route mount cannot stand in for backend persistence or authorization.',
    guidance:
      'When auditing a UI feature, trace one primary action from control to request, backend validation, durable write/read, response handling and reload. Check the response schema and tenant context at each boundary. Label mock or fixture output as simulated and keep it out of operational claims. Require explicit loading, empty, error, cancellation and denied states; a mounted route or optimistic state is not proof of a working integration.',
    citations: [
      'tests/unit/facilities-api.test.ts',
      'tests/unit/final-bounded-remediation.test.ts',
      'tests/unit/phase8-golden-journey-contract.test.ts',
      'docs/audit/deep-page-wiring/data-contract-matrix.csv',
    ],
    triggers: [
      'frontend backend api',
      'api contract',
      'persist after reload',
      'end-to-end wiring',
      'response schema',
      'mock api',
      'optimistic state',
      'loading error denial',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-04T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'fixture-isolation-and-provenance.v1',
    version: 1,
    title: 'Synthetic fixtures stay isolated from operational truth',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'Fixture and synthetic data must carry explicit provenance and mode and remain isolated from operational surfaces; route-local labels cannot override the backend source. A default facility, persona or demo record must never appear as selected, live or production data, and reload and cross-route transitions must preserve source and tenant context.',
    guidance:
      'When a page uses demo or synthetic data, keep its provenance and simulated mode visible at the point of use and preserve them across navigation and reload. Do not let a fixture populate an operational KPI, selected facility, audit record or production claim. Verify the backend source and tenant context rather than trusting a route-local label or a default object.',
    citations: [
      'tests/unit/facility-builder-context-integrity.test.ts',
      'tests/unit/evidence-facility-context-contract.test.ts',
      'tests/unit/data-centre-simulation-preview-contract.test.ts',
      'tests/unit/enterprise-qa-organization-fixture.test.ts',
    ],
    triggers: [
      'fixture leakage',
      'synthetic data',
      'demo data',
      'fixture provenance',
      'selected facility',
      'live data',
      'production claim',
      'cross-route context',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-04T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'artifact-sha-provenance.v1',
    version: 1,
    title: 'Qualification evidence must bind to an existing artifact and exact candidate SHA',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'Release or qualification evidence is valid only when the artifact exists, its kind, schema and digest are valid, the candidate SHA matches the exact audited head, and its status is passed. Missing, stale, blocked, skipped, downloaded-but-unverified or different-SHA evidence remains unverified and blocks promotion; the production fingerprint must bind to that same SHA.',
    guidance:
      'When assessing a release, join the candidate SHA, workflow result, artifact reference and digest, approval, and production fingerprint into one evidence chain. Treat missing, queued, blocked, skipped, stale, or downloaded-but-unverified artifacts as unverified. Never promote from a green result belonging to another commit or from a browser download whose path and contents were not confirmed.',
    citations: [
      'tests/unit/evidence-guardrails-contract.test.ts',
      'tests/unit/e2e-evidence-quality.test.ts',
      'tests/unit/release-target-verification-contract.test.ts',
      'docs/evidence/phase-1/README.md',
    ],
    triggers: [
      'artifact evidence',
      'exact sha',
      'candidate commit',
      'release fingerprint',
      'stale artifact',
      'workflow evidence',
      'qualification evidence',
      'promotion gate',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-04T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'tenant-rls-caller-boundary.v1',
    version: 1,
    title: 'Tenant authority derives from the authenticated caller and active organization',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'Tenant data authority must derive server-side from the authenticated caller and active organization, be enforced by RLS and policies, and remain separate from platform roles. Null or mismatched tenant context, browser-supplied organization identifiers, and privileged clients used for browser reads or writes fail closed; cross-tenant access is never inferred from UI role labels.',
    guidance:
      'For every tenant read or write, verify the caller identity, active organization, server-resolved tenant key, policy path and denied case. Do not trust an organization id or role supplied by the browser, and do not let a null tenant fall through to a global result. Keep platform administration separate from tenant membership and test a cross-tenant denial.',
    citations: [
      'tests/unit/phase3-connections-authority.test.ts',
      'tests/unit/post-release-auth-tenancy-hardening.test.ts',
      'tests/unit/agents-tenancy-hardening.test.ts',
      'docs/AURA-DC-Security-Model.md',
    ],
    triggers: [
      'tenant rls',
      'caller boundary',
      'active organization',
      'cross-tenant',
      'organization id',
      'tenant key',
      'rls policy',
      'null tenant',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-04T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'physics-model-qualification.v1',
    version: 1,
    title: 'Physics-ML promotion requires a reproducible model and dataset qualification record',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'Promoting a physics-ML model requires a versioned model card, dataset provenance and licensing, deterministic preprocessing, held-out metrics, calibration or uncertainty evidence, resource and runtime records, fallback behavior, and reproducible artifact digests for the exact candidate. Without this evidence the model remains research, planned or unavailable and cannot label synthetic output as measured.',
    guidance:
      'Before treating a physics model as production-capable, require an immutable model version, dataset lineage and license, reproducible preprocessing, held-out performance, calibration or uncertainty, resource and runtime evidence, fallback behavior and artifact digests. If any item is absent, describe the capability as research, planned or unavailable and label generated values simulated.',
    citations: [
      'src/config/dsxClaimsPolicy.ts',
      'src/config/dsxCapabilityRegistry.ts',
      'docs/dsx/nvidia-upstream-manifest.json',
      'src/simulation/providers/omniverseProvider.ts',
      'tests/unit/enterprise-qa-organization-fixture.test.ts',
    ],
    triggers: [
      'model qualification',
      'model card',
      'dataset provenance',
      'held-out metrics',
      'calibration evidence',
      'physics model promotion',
      'fallback behavior',
      'reproducible checkpoint',
    ],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-04T00:00:00.000Z',
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
