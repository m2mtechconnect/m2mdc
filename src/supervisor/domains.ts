/**
 * Specialist domains backing the Enterprise Readiness Supervisor.
 *
 * Phase 1 is deterministic: the supervisor is one experience with explicit
 * specialist-domain perspectives, not a deployed multi-agent runtime. Stage
 * evidence below references real repository artifacts only; anything without
 * evidence is `not-evidenced` and renders as such.
 *
 * Truth rule: the NVIDIA / DSX domain must not mark `deployed` or
 * `operationally-verified` as evidenced while the DSX capability registry
 * records no integrated NVIDIA runtime. The contract test enforces this.
 */
import type { SpecialistDomain, StageEvidence } from './types';

const ladder = (
  evidencedThrough: number,
  refs: Array<string | null>,
  notes: Array<string | undefined> = [],
): StageEvidence[] =>
  ([
    'architecture-aligned',
    'configured',
    'connected',
    'tested',
    'deployed',
    'operationally-verified',
  ] as const).map((stage, index) => {
    const evidenced = index < evidencedThrough;
    return {
      stage,
      state: evidenced ? 'evidenced' : 'not-evidenced',
      evidenceRef: evidenced ? refs[index] ?? null : null,
      note: notes[index],
    };
  });

export const SPECIALIST_DOMAINS: SpecialistDomain[] = [
  {
    id: 'nvidia-dsx',
    label: 'NVIDIA / DSX',
    scope: [
      'NIM, NeMo Framework, NeMo Agent Toolkit, NeMo Guardrails',
      'Retriever, Evaluator, Curator, Customizer',
      'Kubernetes GPU operations, DGX/OVX/RTX, networking, storage, observability',
      'Omniverse and OpenUSD alignment',
    ],
    // DSX-aligned architecture with AURA runtime only; no NVIDIA runtime is
    // connected, deployed or verified (src/config/dsxCapabilityRegistry.ts).
    stages: ladder(2, [
      'docs/dsx-alignment/aura-dsx-capability-map.md',
      'src/config/dsxCapabilityRegistry.ts',
    ], [
      'Architecture alignment documented; AURA implementations only.',
      'AURA-side configuration exists; no vendor runtime is configured.',
      'Unavailable until connection evidence exists.',
    ]),
    currentClaim:
      'Architecture-aligned with AURA-native implementations. No NVIDIA DSX, Omniverse, NIM or NeMo runtime is connected, deployed or operationally verified.',
  },
  {
    id: 'lovable-stack',
    label: 'Lovable Platform Stack',
    scope: [
      'Lovable project/editor workflow, previews, publishing, custom domains, Git synchronization',
      'Vite + React + TypeScript, shadcn/ui and Tailwind',
      'Lovable Cloud: auth, RLS, Edge Functions, secrets, connectors',
      'Project messages/diffs and build/verification behavior',
    ],
    stages: ladder(5, [
      'docs/AURA-DC-Architecture.md',
      'vite.config.ts',
      'src/integrations/supabase/client.ts',
      'tests/unit',
      'docs/release/PRODUCTION_SOURCE_OF_TRUTH.md',
    ], [
      undefined,
      undefined,
      'Frontend connected to the managed backend through the generated client.',
      'Unit suite runs under verify:fast.',
      'Published build attested through /release.json fingerprint checks.',
      'Continuous operational verification is not yet evidenced.',
    ]),
    currentClaim:
      'Deployed: the application stack builds, tests and publishes with a verified release fingerprint. Operational verification after publish is attested manually per release.',
  },
  {
    id: 'multicloud',
    label: 'Multicloud',
    scope: [
      'AWS Bedrock / SageMaker / EKS / HyperPod',
      'Microsoft Foundry / Azure AI Search / AKS',
      'Google Vertex AI / Agent Engine / GKE',
      'OCI Generative AI / OKE and private/on-prem Kubernetes',
    ],
    stages: ladder(1, ['infra/aws/publication-architecture.md'], [
      'Publication architecture documented for AWS; other providers are conceptual.',
    ]),
    currentClaim:
      'Architecture-aligned only. No cloud provider runtime is connected or verified; provider capabilities remain planned integration boundaries.',
  },
  {
    id: 'enterprise-security',
    label: 'Enterprise Architecture & Security',
    scope: [
      'Multitenancy, IAM/SSO/MFA and approval workflow',
      'RLS, auditability, sovereignty and residency',
      'Networking, secrets management, DR and availability',
      'Compliance and regulated-industry controls',
    ],
    stages: ladder(4, [
      'docs/AURA-DC-Security-Model.md',
      'src/auth/permissions.ts',
      'supabase/migrations',
      'tests/database/01_auth_rls_suite.sh',
    ], [
      undefined,
      undefined,
      'Authorization is wired to server-evaluated, RLS-protected rows.',
      'RLS and tenancy suites execute in CI.',
      'Production deployment evidence is per-release attestation.',
      'Continuous operational verification is not yet evidenced.',
    ]),
    currentClaim:
      'Tested: tenant isolation, RLS, approval gates and fail-closed authorization are covered by automated suites. Disaster-recovery evidence is not yet assessed.',
  },
  {
    id: 'dc-operations',
    label: 'Data-Centre Operations',
    scope: [
      'Facilities, racks, power, cooling and PUE',
      'Carbon, accelerated compute and telemetry',
      'Simulation, evidence and provenance',
    ],
    stages: ladder(4, [
      'docs/AURA-DC-Product-Definition.md',
      'src/engines',
      'src/telemetry/useFacilityTelemetry.ts',
      'src/lib/provenance',
    ], [
      undefined,
      undefined,
      'Telemetry hooks are wired to provenance-tagged sources.',
      'Provenance and metric-identity contracts are unit-tested.',
      'No measured production facility feed is connected; values remain simulated or demo.',
    ]),
    currentClaim:
      'Simulation and provenance layers are implemented and tested. No live DCIM/BMS feed is connected, so operational figures remain simulated or demonstration data.',
  },
  {
    id: 'product-persona',
    label: 'Product & Persona',
    scope: [
      'Executive, facility operator/NOC, engineer and data scientist journeys',
      'Compliance/risk officer, tenant administrator and finance/procurement',
      'Customer success and implementation partner workflows',
    ],
    stages: ladder(3, [
      'src/config/roleDashboardConfig.ts',
      'src/contexts/RBACContext.tsx',
      'tests/unit/permissions.test.ts',
    ], [
      'Role-adaptive dashboard and tours documented and configured.',
      undefined,
      'Role-to-permission resolution covered by unit tests.',
      'Persona journeys are not yet validated against production usage.',
    ]),
    currentClaim:
      'Persona model is configured and permission-tested. End-to-end persona journey validation with real tenants is not yet evidenced.',
  },
  {
    id: 'ui-ux',
    label: 'UI / UX',
    scope: [
      'Enterprise information architecture and design-system consistency',
      'Accessibility, focus, contrast and responsive behavior',
      'Empty, loading and error states; truth-in-UI',
    ],
    stages: ladder(4, [
      'src/components/workspace-system',
      'src/index.css',
      'src/components/Layout.tsx',
      'tests/truth-in-ui',
    ], [
      undefined,
      'Semantic token system in index.css.',
      undefined,
      'Truth-in-UI and visual-system contract suites run under Vitest/Playwright.',
      'Full WCAG audit across every legacy page is not yet complete.',
    ]),
    currentClaim:
      'Shared workspace visual system is enforced by contract tests on primary surfaces. Some legacy pages still carry visual debt tracked in audit reports.',
  },
  {
    id: 'release-governor',
    label: 'Release Governor',
    scope: [
      'Tests, security gates and release fingerprints',
      'Migrations, rollback planning and preview validation',
      'Production go/no-go decisions',
    ],
    stages: ladder(5, [
      'AGENTS.md',
      'release-source.json',
      'scripts/stamp-release-source.mjs',
      'docs/AURA-DC-Testing-Strategy.md',
      'docs/release/rollback-runbook.md',
    ], [
      'Release-line rules codified in repository governance.',
      undefined,
      'Fingerprint stamping wired into the build.',
      'verify:fast gate runs typecheck, lint, unit suite and production build.',
      'Releases are attested against /release.json after publication.',
      'Automated post-publish smoke verification is not yet continuous.',
    ]),
    currentClaim:
      'Deployed: release fingerprinting, qualification gates and a rollback runbook exist and are exercised per release. The supervisor gate defaults to No-Go until mandatory evidence is present.',
  },
];

export function specialistDomain(id: SpecialistDomain['id']): SpecialistDomain | undefined {
  return SPECIALIST_DOMAINS.find((d) => d.id === id);
}
