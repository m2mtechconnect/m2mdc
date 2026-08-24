/**
 * Canonical AURA frontend stack / capability manifest.
 *
 * One governed place that separates:
 *  - the product-visible capability name a customer may read,
 *  - the internal implementation/provider identifiers (never rendered),
 *  - the evidence/claim status behind the capability,
 *  - whether the capability is customer-visible at all,
 *  - which surfaces/categories may present it,
 *  - the canonical customer-facing description.
 *
 * Truth rules encoded here:
 *  - Named third-party technology may only appear when `namedTechnology` is
 *    set, which is permitted only where existing capability/evidence policy
 *    allows it (see `src/config/dsxClaimsPolicy.ts` and
 *    `src/config/dsxCapabilityRegistry.ts`).
 *  - No entry may claim an active NVIDIA / Omniverse / DSX runtime. Alignment
 *    and design-time wording only.
 *  - SIMULATED / REFERENCE / NOT MEASURED / UNAVAILABLE remain truthful and are
 *    never hidden by white-labelling: `evidenceStatus` carries that truth and
 *    surfaces must render it alongside the label.
 */

/** How well-evidenced the capability is today. */
export type StackEvidenceStatus =
  /** Runs in production with verified runtime evidence. */
  | 'AVAILABLE'
  /** Implemented, but results are modelled rather than measured. */
  | 'SIMULATED'
  /** Ships as reference/sample content only. */
  | 'REFERENCE'
  /** Surface exists, no measurement source is bound. */
  | 'NOT_MEASURED'
  /** Declared capability with no runtime today. */
  | 'UNAVAILABLE';

/** Product-facing grouping shown to customers. */
export type StackCategory =
  | 'platform'
  | 'digital-twin'
  | 'accelerated-ai'
  | 'managed-ai'
  | 'data-storage'
  | 'connections'
  | 'simulation'
  | 'evidence'
  | 'governance';

/** Where an entry may be rendered. */
export type StackSurface =
  | 'landing'
  | 'integrations'
  | 'builder'
  | 'blueprint'
  | 'deploy'
  | 'connections'
  | 'help'
  | 'readiness'
  | 'template-preview'
  | 'provenance';

export interface StackCapability {
  /** Stable internal key. Never rendered. */
  id: string;
  /** Approved product-visible name. */
  label: string;
  category: StackCategory;
  /** Canonical customer-facing description. Provider-neutral. */
  description: string;
  evidenceStatus: StackEvidenceStatus;
  /** False keeps the entry internal-only; UI must not render it. */
  customerVisible: boolean;
  allowedSurfaces: StackSurface[];
  /**
   * Internal implementation/provider identifiers. Diagnostics and engineering
   * only - rendering any of these in customer UI is a defect.
   */
  internalIdentifiers: string[];
  /**
   * A named third-party technology this entry is explicitly approved to
   * mention, with the policy reason. Omit unless policy allows it.
   */
  namedTechnology?: { name: string; policyReason: string };
}

export const AURA_STACK_MANIFEST: StackCapability[] = [
  {
    id: 'platform.command',
    label: 'AURA Platform / Command & Operations',
    category: 'platform',
    description:
      'The AURA operating surface for data centre command, operations and day-to-day workspace navigation.',
    evidenceStatus: 'AVAILABLE',
    customerVisible: true,
    allowedSurfaces: ['landing', 'help', 'readiness'],
    internalIdentifiers: ['react', 'vite', 'tailwind', 'supabase'],
  },
  {
    id: 'twin.openusd',
    label: 'Digital Twin / OpenUSD',
    category: 'digital-twin',
    description:
      'Facility, rack and system models built on OpenUSD-derived geometry and rendered in the AURA Web Runtime.',
    evidenceStatus: 'AVAILABLE',
    customerVisible: true,
    allowedSurfaces: ['landing', 'builder', 'blueprint', 'template-preview', 'help'],
    internalIdentifiers: ['three.js', 'glb-derivative-pipeline', 'usda-source'],
    namedTechnology: {
      name: 'OpenUSD',
      policyReason:
        'Open standard, and asset provenance records an approved OpenUSD source for published derivatives.',
    },
  },
  {
    id: 'ai.accelerated',
    label: 'Accelerated AI',
    category: 'accelerated-ai',
    description:
      'DSX-aligned architecture for accelerated data centre design and analysis. Alignment only: no accelerated vendor runtime is deployed by AURA.',
    evidenceStatus: 'UNAVAILABLE',
    customerVisible: true,
    allowedSurfaces: ['landing', 'readiness', 'help'],
    internalIdentifiers: ['dsx-capability-registry'],
  },
  {
    id: 'ai.managed',
    label: 'Managed AI',
    category: 'managed-ai',
    description:
      'AURA-managed assistance and analysis capacity. Model providers are operated by AURA and are not customer configuration.',
    evidenceStatus: 'AVAILABLE',
    customerVisible: true,
    allowedSurfaces: ['landing', 'builder', 'deploy', 'help', 'readiness'],
    internalIdentifiers: ['managed-ai-gateway', 'model-id', 'project-id', 'region-id'],
  },
  {
    id: 'data.storage',
    label: 'Data & Storage',
    category: 'data-storage',
    description:
      'Facility datasets, evidence artefacts and exports held under tenant isolation with provenance retained.',
    evidenceStatus: 'AVAILABLE',
    customerVisible: true,
    allowedSurfaces: ['integrations', 'connections', 'blueprint', 'provenance'],
    internalIdentifiers: ['object-storage', 'warehouse-connectors'],
  },
  {
    id: 'connections.enterprise',
    label: 'Connections & APIs',
    category: 'connections',
    description:
      'Enterprise connection catalogue, API endpoints and workflow integration for facility and telemetry sources.',
    evidenceStatus: 'AVAILABLE',
    customerVisible: true,
    allowedSurfaces: ['landing', 'integrations', 'connections', 'builder', 'help'],
    internalIdentifiers: ['connector_definitions', 'mqtt-runtime', 'edge-functions'],
  },
  {
    id: 'simulation.engine',
    label: 'Simulation',
    category: 'simulation',
    description:
      'Deterministic scenario modelling for thermal, power, cooling and workload outcomes. Results are simulated, not measured.',
    evidenceStatus: 'SIMULATED',
    customerVisible: true,
    allowedSurfaces: ['landing', 'builder', 'blueprint', 'help', 'provenance'],
    internalIdentifiers: ['simulation-api', 'run-persistence'],
  },
  {
    id: 'evidence.workspace',
    label: 'Evidence & Provenance',
    category: 'evidence',
    description:
      'Every rendered figure carries its source, method and status so operators can trace a claim to its evidence.',
    evidenceStatus: 'AVAILABLE',
    customerVisible: true,
    allowedSurfaces: ['landing', 'help', 'provenance', 'readiness'],
    internalIdentifiers: ['canonical-evidence', 'metric-identity'],
  },
  {
    id: 'governance.controls',
    label: 'Governance & Access',
    category: 'governance',
    description:
      'Tenant isolation, role-based access, approval workflow and audited release controls.',
    evidenceStatus: 'AVAILABLE',
    customerVisible: true,
    allowedSurfaces: ['landing', 'help', 'readiness'],
    internalIdentifiers: ['rbac', 'rls', 'active_org_id'],
  },
];

/** Provider/implementation names that must never reach customer-visible copy. */
export const FORBIDDEN_CUSTOMER_STRINGS = [
  'Lovable',
  'Supabase',
  'Gemini',
  'OpenAI',
  'Anthropic',
  'Vertex AI',
] as const;

export function stackCapability(id: string): StackCapability | undefined {
  return AURA_STACK_MANIFEST.find((c) => c.id === id);
}

export function customerVisibleStack(surface?: StackSurface): StackCapability[] {
  return AURA_STACK_MANIFEST.filter(
    (c) => c.customerVisible && (!surface || c.allowedSurfaces.includes(surface)),
  );
}

/** Human-readable truth suffix for a capability, or null when unqualified. */
export function evidenceQualifier(status: StackEvidenceStatus): string | null {
  switch (status) {
    case 'SIMULATED':
      return 'Simulated';
    case 'REFERENCE':
      return 'Reference data';
    case 'NOT_MEASURED':
      return 'Not measured';
    case 'UNAVAILABLE':
      return 'Not available';
    default:
      return null;
  }
}
