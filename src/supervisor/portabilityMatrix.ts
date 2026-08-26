/**
 * Multicloud portability evidence matrix (supervisor plane).
 *
 * Each target reports the four portability stages separately:
 * designed, configured, tested, verified. A stage may only be marked
 * evidenced with a concrete artifact reference, and `verified` requires every
 * lower stage to be evidenced first — no deployment support may be implied
 * without artifacts.
 */

export const PORTABILITY_STAGES = ['designed', 'configured', 'tested', 'verified'] as const;
export type PortabilityStage = (typeof PORTABILITY_STAGES)[number];

export interface PortabilityStageEvidence {
  stage: PortabilityStage;
  state: 'evidenced' | 'not-evidenced';
  /** Repository path, document or record. Required when evidenced. */
  evidenceRef: string | null;
  note?: string;
}

export interface PortabilityTarget {
  id: string;
  label: string;
  kind: 'current-stack' | 'hyperscaler' | 'private-infrastructure';
  stages: PortabilityStageEvidence[];
  /** Plain-language statement of what may be claimed today. */
  currentClaim: string;
}

const stage = (
  s: PortabilityStage,
  state: 'evidenced' | 'not-evidenced',
  evidenceRef: string | null,
  note?: string,
): PortabilityStageEvidence => ({ stage: s, state, evidenceRef, note });

export const PORTABILITY_MATRIX: readonly PortabilityTarget[] = [
  {
    id: 'lovable-cloud-stack',
    label: 'Lovable Cloud stack (current production)',
    kind: 'current-stack',
    stages: [
      stage('designed', 'evidenced', 'docs/AURA-DC-Architecture.md'),
      stage('configured', 'evidenced', 'supabase/config.toml'),
      stage('tested', 'evidenced', 'docs/AURA-DC-Testing-Strategy.md'),
      stage('verified', 'evidenced', 'docs/release/PRODUCTION_SOURCE_OF_TRUTH.md', 'SHA-bound live fingerprint attestation practice.'),
    ],
    currentClaim: 'Deployed and verified on the current managed stack only.',
  },
  {
    id: 'aws',
    label: 'AWS (Bedrock, SageMaker, EKS, HyperPod)',
    kind: 'hyperscaler',
    stages: [
      stage('designed', 'evidenced', 'infra/aws/publication-architecture.md', 'Publication architecture document only.'),
      stage('configured', 'not-evidenced', null),
      stage('tested', 'not-evidenced', null),
      stage('verified', 'not-evidenced', null),
    ],
    currentClaim: 'Design-stage only. No configured, tested or verified AWS deployment exists.',
  },
  {
    id: 'microsoft-azure',
    label: 'Microsoft Azure (Foundry, AI Search, AKS)',
    kind: 'hyperscaler',
    stages: [
      stage('designed', 'not-evidenced', null),
      stage('configured', 'not-evidenced', null),
      stage('tested', 'not-evidenced', null),
      stage('verified', 'not-evidenced', null),
    ],
    currentClaim: 'No portability artifacts recorded. Compatibility is not claimed.',
  },
  {
    id: 'google-cloud',
    label: 'Google Cloud (Vertex AI, Agent Engine, GKE)',
    kind: 'hyperscaler',
    stages: [
      stage('designed', 'not-evidenced', null),
      stage('configured', 'not-evidenced', null),
      stage('tested', 'not-evidenced', null),
      stage('verified', 'not-evidenced', null),
    ],
    currentClaim: 'No portability artifacts recorded. Compatibility is not claimed.',
  },
  {
    id: 'oci',
    label: 'OCI (Generative AI, OKE)',
    kind: 'hyperscaler',
    stages: [
      stage('designed', 'not-evidenced', null),
      stage('configured', 'not-evidenced', null),
      stage('tested', 'not-evidenced', null),
      stage('verified', 'not-evidenced', null),
    ],
    currentClaim: 'No portability artifacts recorded. Compatibility is not claimed.',
  },
  {
    id: 'private-kubernetes',
    label: 'Private / on-prem Kubernetes',
    kind: 'private-infrastructure',
    stages: [
      stage('designed', 'evidenced', 'deploy/private/README.md'),
      stage('configured', 'evidenced', 'deploy/private/helm/aura-web/Chart.yaml', 'Helm chart, container image and nginx configuration exist.'),
      stage('tested', 'not-evidenced', null, 'No recorded deployment of the chart against a cluster.'),
      stage('verified', 'not-evidenced', null),
    ],
    currentClaim: 'Designed and configured artifacts exist; not tested or verified against a live cluster.',
  },
];

/** Guardrail: verified requires every lower stage evidenced. */
export function portabilityClaimIsSound(target: PortabilityTarget): boolean {
  const byStage = Object.fromEntries(target.stages.map((s) => [s.stage, s])) as Record<
    PortabilityStage,
    PortabilityStageEvidence
  >;
  for (const s of PORTABILITY_STAGES) {
    const entry = byStage[s];
    if (!entry) return false;
    if (entry.state === 'evidenced' && !entry.evidenceRef) return false;
  }
  if (byStage.verified.state === 'evidenced') {
    return byStage.designed.state === 'evidenced'
      && byStage.configured.state === 'evidenced'
      && byStage.tested.state === 'evidenced';
  }
  return true;
}
