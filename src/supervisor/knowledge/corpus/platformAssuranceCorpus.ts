/**
 * Platform-assurance knowledge learned from confirmed AURA failure families.
 *
 * These entries are preventative engineering guidance. They do not assert a
 * deployment, schema-safety or production-readiness result. Those assertions
 * remain subject to evidence guardrails and independent qualification.
 */
import type { EngineeringKnowledgeEntry } from '../engineeringKnowledgeTypes';

export const PLATFORM_ASSURANCE_CORPUS: EngineeringKnowledgeEntry[] = [
  {
    id: 'pa-exact-head-evidence-integrity',
    domain: 'platform-assurance',
    title: 'Exact-head evidence and fail-closed release gates',
    guidance:
      'A release gate is valid only when every generated manifest, type snapshot and qualification artifact ' +
      'identifies the exact commit under review. A missing deployed-schema snapshot, stale source commit or ' +
      'unresolved environment must produce a blocked or unverified result, never a green release result. ' +
      'The gate must validate the meaning and freshness of its inputs in addition to checking process exit codes.',
    keywords: ['exact', 'head', 'commit', 'stale', 'manifest', 'snapshot', 'release', 'gate', 'freshness'],
    citations: [
      {
        label: 'AURA schema truth verification',
        locator: 'scripts/schema-truth/verify-schema-truth.mjs',
        kind: 'repository-artifact',
      },
      {
        label: 'AURA exact-head schema manifest builder',
        locator: 'scripts/schema-truth/build-exact-head-manifest.mjs',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['schema-safety', 'production-readiness'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'pa-database-reachability-matrix',
    domain: 'platform-assurance',
    title: 'Database reachability requires grants, policies and an active caller',
    guidance:
      'A row-level policy proves only one part of database reachability. For every protected operation, ' +
      'qualification must combine object privileges, row-level policy predicates, column privileges, trigger ' +
      'effects and a request executed as the intended caller role. Treat policy text without role-level ' +
      'read and write probes as incomplete evidence, including both allowed and denied cases.',
    keywords: ['database', 'reachability', 'grant', 'privilege', 'policy', 'rls', 'caller', 'allowed', 'denied'],
    citations: [
      {
        label: 'AURA authorization architecture evidence',
        locator: 'docs/architecture/authorization-model.md',
        kind: 'repository-artifact',
      },
      {
        label: 'PostgreSQL privileges documentation',
        locator: 'https://www.postgresql.org/docs/current/ddl-priv.html',
        kind: 'public-documentation',
      },
    ],
    restrictedClaimCategories: ['schema-safety'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'pa-actor-context-and-definer-boundaries',
    domain: 'platform-assurance',
    title: 'Actor-bound transactions and security-definer execution context',
    guidance:
      'Service credentials and security-definer routines change the database execution identity. Authorization ' +
      'logic must carry the authenticated actor explicitly into a trusted transaction and must test trigger ' +
      'behavior under the effective execution context. Validate both the application path and a direct database ' +
      'attempt so elevated service access cannot silently replace actor-bound authorization.',
    keywords: ['actor', 'service', 'credential', 'security', 'definer', 'trigger', 'transaction', 'identity'],
    citations: [
      {
        label: 'AURA decision recording Edge boundary',
        locator: 'supabase/functions/record-decision/index.ts',
        kind: 'repository-artifact',
      },
      {
        label: 'PostgreSQL function security documentation',
        locator: 'https://www.postgresql.org/docs/current/sql-createfunction.html',
        kind: 'public-documentation',
      },
    ],
    restrictedClaimCategories: ['schema-safety'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'pa-harness-and-journey-observability',
    domain: 'platform-assurance',
    title: 'Deterministic harnesses and observable cross-persona journeys',
    guidance:
      'A test harness must neutralize ambient cloud credentials before importing helpers, use explicit local ' +
      'configuration and treat unexpected error-level output as a failure or a reviewed exception. A complete ' +
      'persona journey creates durable state, reloads it through the next persona, proves the handoff and tests ' +
      'revocation or denial. Route visibility and permission matrices are supporting checks, not substitutes for ' +
      'the end-to-end job outcome.',
    keywords: ['harness', 'ambient', 'environment', 'stderr', 'journey', 'persona', 'handoff', 'reload', 'revocation'],
    citations: [
      {
        label: 'AURA test harness safety contract',
        locator: 'tests/unit/test-harness-safety.test.ts',
        kind: 'repository-artifact',
      },
      {
        label: 'AURA persona and journey map',
        locator: 'docs/ux/persona-journey-map.md',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['production-readiness'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'pa-portable-qualification-and-perimeter-parity',
    domain: 'platform-assurance',
    title: 'Portable qualification, evidence isolation and production-perimeter parity',
    guidance:
      'Repository qualification must execute Node utilities in a Node environment on every supported host, ' +
      'preserve command-line launchers in production source while removing them before test transformation, ' +
      'and use platform-appropriate directory links or copies in isolated fixtures. Production-perimeter ' +
      'evidence is consistent only when the effective inventory, additive promotion ledger and executable ' +
      'allowlist agree exactly; a promotion record alone does not make a function reachable or release-ready. ' +
      'Tests for append-only logs, manifests or other durable evidence must inject a temporary output path so ' +
      'synthetic qualification runs never modify the committed evidence they are supposed to verify.',
    keywords: [
      'windows', 'portable', 'vitest', 'node', 'shebang', 'transform', 'junction', 'symlink',
      'perimeter', 'inventory', 'promotion', 'allowlist', 'drift', 'parity',
      'audit', 'ledger', 'temporary', 'isolation', 'synthetic', 'evidence',
    ],
    citations: [
      {
        label: 'AURA Node-script test transformer',
        locator: 'scripts/vitestScriptShebang.ts',
        kind: 'repository-artifact',
      },
      {
        label: 'AURA production perimeter regression suite',
        locator: 'scripts/__tests__/productionPerimeter.test.ts',
        kind: 'repository-artifact',
      },
      {
        label: 'AURA isolated disposable-verification audit test',
        locator: 'scripts/__tests__/dsxDisposableVerify.test.ts',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['production-readiness'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'pa-executable-readiness-gates',
    domain: 'platform-assurance',
    title: 'Readiness findings must control deployment actions',
    guidance:
      'A readiness score, warning list or no-go label is ineffective when activation and environment deployment ' +
      'controls remain executable. Compute one canonical server-validated readiness decision from required ' +
      'simulations, KPI coverage, governance, versioning, runtime bindings and target-environment policy. Use that ' +
      'decision to disable or reject every activation and deployment path, including direct requests and stale ' +
      'browser state. Warnings may remain advisory only when their non-blocking status is explicit and tested.',
    keywords: [
      'readiness', 'warning', 'score', 'activate', 'deployment', 'production', 'simulation', 'kpi',
      'disabled', 'server', 'policy', 'stale',
    ],
    citations: [
      {
        label: 'AURA Builder deployment step',
        locator: 'src/components/builder/steps/Step5Deploy.tsx',
        kind: 'repository-artifact',
      },
      {
        label: 'AURA Builder readiness checklist',
        locator: 'src/components/builder/step5/deploy/ReadinessChecklist.tsx',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['deployment', 'production-readiness'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'pa-context-continuity-and-demo-isolation',
    domain: 'platform-assurance',
    title: 'Facility, run and source context must survive route transitions',
    guidance:
      'A governed journey carries the canonical organization, facility, run, source mode and observation timestamp ' +
      'through every dashboard, simulation, analytics and evidence route. A direct route may show an explicit ' +
      'unselected state, but it must not silently replace an active tenant facility with a demonstration facility ' +
      'or unrelated run. Test link navigation, copied URLs, reloads and absent parameters, and fail closed when the ' +
      'requested facility has no bound evidence instead of substituting fixtures.',
    keywords: [
      'context', 'facility', 'run', 'source', 'route', 'transition', 'reload', 'direct', 'demo',
      'substitution', 'evidence', 'tenant',
    ],
    citations: [
      {
        label: 'AURA evidence facility scope resolver',
        locator: 'src/dsx/runtime/evidenceFacilityScope.ts',
        kind: 'repository-artifact',
      },
      {
        label: 'AURA evidence workspace shell',
        locator: 'src/pages/dsx/EvidenceBetaShell.tsx',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['production-readiness'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'pa-runtime-asset-and-post-publish-proof',
    domain: 'platform-assurance',
    title: 'Runtime assets and deployed releases require exact observation evidence',
    guidance:
      'Approved manifests, structural stage checks and public-route smoke checks do not prove a mounted runtime ' +
      'asset or an authenticated deployed journey. Release qualification must match the exact deployed commit, ' +
      'complete every required authenticated check and preserve evidence without concurrent-writer races. Asset ' +
      'qualification must record the exact derivative checksum, mounted object coverage, target hardware, benchmark ' +
      'and human visual verdict. Missing credentials, zero mounted roles or an absent run identifier are blockers.',
    keywords: [
      'runtime', 'asset', 'mounted', 'coverage', 'hardware', 'benchmark', 'visual', 'smoke',
      'authenticated', 'deployed', 'commit', 'credentials', 'evidence', 'race',
    ],
    citations: [
      {
        label: 'AURA post-publish smoke workflow',
        locator: '.github/workflows/post-publish-smoke.yml',
        kind: 'repository-artifact',
      },
      {
        label: 'AURA reference-facility validation',
        locator: 'src/pages/admin/ReferenceFacilityValidation.tsx',
        kind: 'repository-artifact',
      },
      {
        label: 'AURA GPU acceptance benchmark scene',
        locator: 'src/validation/gpuAcceptance/BenchmarkScene.tsx',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['deployment', 'production-readiness'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
];
