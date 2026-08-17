/**
 * AURA <-> NVIDIA Omniverse DSX capability registry.
 *
 * This module is the ONLY place where a DSX / NVIDIA / OpenUSD / SimReady
 * status may be asserted. Page components must read from here; they must
 * never hardcode a claim, and a status must never be promoted because of a
 * page label, a manifest entry or a marketing description.
 *
 * Official references used to define the DSX areas below:
 *   https://docs.omniverse.nvidia.com/dsx/latest/system-architecture.html
 *   https://docs.omniverse.nvidia.com/dsx/latest/overview.html
 *   https://build.nvidia.com/nvidia/omniverse-dsx-blueprint-for-ai-factories/blueprintcard
 *   https://www.nvidia.com/en-us/data-center/products/dsx/
 */

export const DSX_STATUSES = [
  'AURA_NATIVE',
  'DSX_ALIGNED',
  'NVIDIA_INTEGRATED',
  'SIMREADY_VALIDATED',
  'PLANNED',
  'BLOCKED',
  'UNAVAILABLE',
] as const;

export type DsxStatus = (typeof DSX_STATUSES)[number];

export type DsxArea =
  | 'AIF-DT application layer'
  | 'Data lake'
  | 'PLM/CAD/BIM assembly'
  | 'USD storage'
  | 'Simulation layer'
  | 'Simulation Data Delegate'
  | 'DSX Exchange integration boundary'
  | 'AI Agent'
  | 'Operations optimization'
  | 'AI-factory site definition'
  | 'Runtime and execution environment'
  | 'Not a DSX component';

export type ImplementationOwner =
  | 'AURA'
  | 'AURA + NVIDIA-derived assets'
  | 'NVIDIA'
  | 'Third party'
  | 'Unassigned';

export type ValidationMethod =
  | 'unit-test'
  | 'runtime-observation'
  | 'published-host-verification'
  | 'static-inspection'
  | 'asset-validation-record'
  | 'none';

export interface DsxCapability {
  /** Stable capability id. Never renamed once published. */
  id: string;
  name: string;
  /** AURA page or canonical route this capability is surfaced on. */
  route: string;
  /** DSX architectural area this capability maps to. */
  dsxArea: DsxArea;
  owner: ImplementationOwner;
  status: DsxStatus;
  /** Where the runtime evidence for the status lives (path or URL). */
  runtimeEvidence: string | null;
  /** Where the data rendered by the capability comes from. */
  dataSource: string;
  /** ISO date of the last validation, or null when never validated. */
  lastValidatedAt: string | null;
  validationMethod: ValidationMethod;
  limitations: string[];
  blockers: string[];
  /** Official NVIDIA reference for the DSX area, when one applies. */
  nvidiaReference: string | null;
  /** True only when NVIDIA code or an NVIDIA service actually executes. */
  nvidiaCodeOrServiceIntegrated: boolean;
  /** True when an OpenUSD master is the canonical source for this capability. */
  openUsdCanonical: boolean;
  /** True only when SimReady metadata has passed validation. */
  simReadyValidated: boolean;
  /** True when the runtime path is an AURA implementation. */
  auraRuntime: boolean;
  /** False keeps the capability inside the admin console only. */
  safeOutsideAdmin: boolean;
}

const DSX_ARCH = 'https://docs.omniverse.nvidia.com/dsx/latest/system-architecture.html';
const DSX_OVERVIEW = 'https://docs.omniverse.nvidia.com/dsx/latest/overview.html';
const DSX_BLUEPRINT =
  'https://build.nvidia.com/nvidia/omniverse-dsx-blueprint-for-ai-factories/blueprintcard';

export const DSX_CAPABILITIES: DsxCapability[] = [
  {
    id: 'aif-overview',
    name: 'AI Factory Overview',
    route: '/dashboard',
    dsxArea: 'AIF-DT application layer',
    owner: 'AURA',
    status: 'DSX_ALIGNED',
    runtimeEvidence: 'src/workspace/dashboard',
    dataSource: 'AURA blueprint model and durable simulation runs',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'unit-test',
    limitations: [
      'Efficiency indicators are simulated or estimated, never measured facility data.',
      'No Max-Q implementation is connected; Max-Q language must not be used.',
    ],
    blockers: [],
    nvidiaReference: DSX_OVERVIEW,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'facility-blueprint',
    name: 'Facility Blueprint',
    route: '/blueprint',
    dsxArea: 'PLM/CAD/BIM assembly',
    owner: 'AURA + NVIDIA-derived assets',
    status: 'DSX_ALIGNED',
    runtimeEvidence: 'src/stores/blueprintStore.ts',
    dataSource: 'AURA blueprint store, canonical OpenUSD masters under assets/',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'unit-test',
    limitations: [
      'Facility assemblies are not SimReady validated.',
      'USD authoring round-trip from the browser is not implemented.',
    ],
    blockers: [],
    nvidiaReference: DSX_ARCH,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: true,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'openusd-asset-pipeline',
    name: 'OpenUSD Asset Pipeline',
    route: '/builder',
    dsxArea: 'USD storage',
    owner: 'AURA + NVIDIA-derived assets',
    status: 'DSX_ALIGNED',
    runtimeEvidence: 'scripts/asset-ingestion/, docs/evidence/nvidia-pack/',
    dataSource: 'Asset manifests, ingestion records, approval and publication records',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'asset-validation-record',
    limitations: [
      'Geometry is NVIDIA-derived OpenUSD; electrical, thermal and connection-point metadata are not validated.',
      'GLB derivatives are delivery artefacts only and never replace the OpenUSD master.',
    ],
    blockers: [],
    nvidiaReference: DSX_BLUEPRINT,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: true,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'simready-validation',
    name: 'SimReady asset validation',
    route: '/admin/asset-pipeline',
    dsxArea: 'USD storage',
    owner: 'AURA',
    status: 'UNAVAILABLE',
    runtimeEvidence: null,
    dataSource: 'No SimReady validation record exists',
    lastValidatedAt: null,
    validationMethod: 'none',
    limitations: [
      'No asset carries validated electrical, thermal/cooling and connection-point metadata.',
    ],
    blockers: ['SimReady validation tooling and metadata schema are not implemented.'],
    nvidiaReference: DSX_BLUEPRINT,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: true,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'simulation-studio',
    name: 'Simulation Studio',
    route: '/simulation',
    dsxArea: 'Simulation layer',
    owner: 'AURA',
    status: 'AURA_NATIVE',
    runtimeEvidence: 'src/workspace/scenarioEngine.ts, src/workspace/runPersistence.ts',
    dataSource: 'Deterministic AURA solvers, durable server-side simulation runs',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'unit-test',
    limitations: [
      'Models are uncalibrated. Results are simulated, never measured.',
      'NVIDIA DSX Sim is not invoked; no CFD or PhysicsX solver is reachable.',
    ],
    blockers: [],
    nvidiaReference: DSX_ARCH,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'validation-evidence',
    name: 'Validation & Evidence',
    route: '/dsx/evidence-beta/overview',
    dsxArea: 'Data lake',
    owner: 'AURA',
    status: 'AURA_NATIVE',
    runtimeEvidence: 'src/dsx/, src/workspace/runPersistence.ts',
    dataSource: 'Durable simulation run records and asset validation records',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'unit-test',
    limitations: ['Evidence covers simulated runs and asset records only.'],
    blockers: [],
    nvidiaReference: DSX_ARCH,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'facilities',
    name: 'Facilities',
    route: '/manage/facilities',
    dsxArea: 'AI-factory site definition',
    owner: 'AURA',
    status: 'AURA_NATIVE',
    runtimeEvidence: 'src/pages/manage/Facilities.tsx',
    dataSource: 'AURA facility records in the backend database',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'runtime-observation',
    limitations: [
      'Capacity figures are modelled. Commissioned and live capacity are not instrumented.',
    ],
    blockers: [],
    nvidiaReference: DSX_OVERVIEW,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'integrations',
    name: 'Integrations',
    route: '/manage/integrations',
    dsxArea: 'DSX Exchange integration boundary',
    owner: 'AURA',
    status: 'DSX_ALIGNED',
    runtimeEvidence: 'src/pages/Connections.tsx',
    dataSource: 'Connector configuration records',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'static-inspection',
    limitations: [
      'No DSX Exchange distribution is deployed; the boundary is aligned, not connected.',
      'Sample values are never presented as connected telemetry.',
    ],
    blockers: ['Official DSX Exchange distribution is not available to this project.'],
    nvidiaReference: DSX_ARCH,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'operations-telemetry',
    name: 'Operations & Telemetry',
    route: '/analytics',
    dsxArea: 'Simulation Data Delegate',
    owner: 'AURA',
    status: 'DSX_ALIGNED',
    runtimeEvidence: 'src/dsx/adapters/',
    dataSource: 'Simulated and replayed datasets. No live facility source is connected.',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'unit-test',
    limitations: [
      'Live telemetry sources: 0. Every value is simulated or estimated.',
      'Live, delayed, stale, simulated, estimated, not-connected and error states stay separate.',
    ],
    blockers: ['No facility telemetry source has been connected or verified.'],
    nvidiaReference: DSX_ARCH,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'agents-optimization',
    name: 'Agents & Optimization',
    route: '/app/agents',
    dsxArea: 'AI Agent',
    owner: 'AURA',
    status: 'AURA_NATIVE',
    runtimeEvidence: 'src/pages/ManageAgents.tsx',
    dataSource: 'AURA agent definitions and deterministic analytics',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'runtime-observation',
    limitations: [
      'Agents are AURA deterministic automation and analytical services.',
      'No NVIDIA NIM runtime is invoked.',
      'No agent performs closed-loop control of physical infrastructure.',
    ],
    blockers: [],
    nvidiaReference: DSX_ARCH,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'runtime-environments',
    name: 'Runtime Environments',
    route: '/deployments',
    dsxArea: 'Runtime and execution environment',
    owner: 'AURA',
    status: 'AURA_NATIVE',
    runtimeEvidence: 'src/pages/DeploymentHistory.tsx',
    dataSource: 'Deployment records and published build fingerprints',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'published-host-verification',
    limitations: [
      'The browser renderer is the AURA Web Runtime. It is not Omniverse Kit and not RTX streaming.',
    ],
    blockers: [],
    nvidiaReference: DSX_OVERVIEW,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'brev-gpu-lane',
    name: 'Brev GPU validation lane',
    route: '/deployments',
    dsxArea: 'Runtime and execution environment',
    owner: 'AURA',
    status: 'PLANNED',
    runtimeEvidence: 'docs/evidence/cloud-gpu/brev/phase-1-preflight.json',
    dataSource: 'Preflight record only. No Brev instance has been provisioned.',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'static-inspection',
    limitations: ['Preflight only. No GPU validation run has executed.'],
    blockers: ['Brev credentials and a provisioned GPU instance are required.'],
    nvidiaReference: DSX_OVERVIEW,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: false,
    safeOutsideAdmin: true,
  },
  {
    id: 'aws-production-lane',
    name: 'AWS production and GPU lane',
    route: '/deployments',
    dsxArea: 'Runtime and execution environment',
    owner: 'AURA',
    status: 'PLANNED',
    runtimeEvidence: 'infra/aws/publication-architecture.md',
    dataSource: 'Architecture document only. No AWS resource is provisioned.',
    lastValidatedAt: null,
    validationMethod: 'none',
    limitations: ['Design only.'],
    blockers: ['AWS account, deployment pipeline and GPU capacity are not provisioned.'],
    nvidiaReference: null,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: false,
    safeOutsideAdmin: true,
  },
  {
    id: 'agent-configuration',
    name: 'Agent Configuration',
    route: '/settings/ai',
    dsxArea: 'Not a DSX component',
    owner: 'AURA',
    status: 'AURA_NATIVE',
    runtimeEvidence: 'src/pages/AISettings.tsx',
    dataSource: 'AURA provider and policy configuration',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'runtime-observation',
    limitations: ['Generic provider settings are not part of NVIDIA DSX.'],
    blockers: [],
    nvidiaReference: null,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'search',
    name: 'Search',
    route: '/search',
    dsxArea: 'Not a DSX component',
    owner: 'AURA',
    status: 'AURA_NATIVE',
    runtimeEvidence: 'src/pages/Search.tsx',
    dataSource: 'Authorized AURA records',
    lastValidatedAt: '2026-08-17',
    validationMethod: 'unit-test',
    limitations: ['A product utility. Not a DSX component.'],
    blockers: [],
    nvidiaReference: null,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: true,
    safeOutsideAdmin: true,
  },
  {
    id: 'omniverse-kit-session',
    name: 'Omniverse Kit / RTX streaming session',
    route: '/deployments',
    dsxArea: 'Runtime and execution environment',
    owner: 'NVIDIA',
    status: 'UNAVAILABLE',
    runtimeEvidence: null,
    dataSource: 'No Kit instance is reachable',
    lastValidatedAt: null,
    validationMethod: 'none',
    limitations: ['AURA renders through its own WebGL runtime.'],
    blockers: ['No Omniverse Kit instance, entitlement or GPU runner is available.'],
    nvidiaReference: DSX_ARCH,
    nvidiaCodeOrServiceIntegrated: false,
    openUsdCanonical: false,
    simReadyValidated: false,
    auraRuntime: false,
    safeOutsideAdmin: true,
  },
];

/** Human-readable label for a status. */
export const DSX_STATUS_LABEL: Record<DsxStatus, string> = {
  AURA_NATIVE: 'AURA native',
  DSX_ALIGNED: 'DSX-aligned',
  NVIDIA_INTEGRATED: 'NVIDIA integrated',
  SIMREADY_VALIDATED: 'SimReady validated',
  PLANNED: 'Planned',
  BLOCKED: 'Blocked',
  UNAVAILABLE: 'Unavailable',
};

export function getCapability(id: string): DsxCapability | undefined {
  return DSX_CAPABILITIES.find((c) => c.id === id);
}

export function capabilitiesForRoute(route: string): DsxCapability[] {
  return DSX_CAPABILITIES.filter((c) => c.route === route);
}

export function capabilityCountsByStatus(): Record<DsxStatus, number> {
  const counts = Object.fromEntries(DSX_STATUSES.map((s) => [s, 0])) as Record<DsxStatus, number>;
  for (const c of DSX_CAPABILITIES) counts[c.status] += 1;
  return counts;
}

/**
 * Evidence gate. A status may only be asserted when its evidence exists.
 * Returns the list of violations; an empty list means the record is valid.
 */
export function validateCapability(c: DsxCapability): string[] {
  const problems: string[] = [];

  if (c.status === 'NVIDIA_INTEGRATED') {
    if (!c.nvidiaCodeOrServiceIntegrated) {
      problems.push('NVIDIA_INTEGRATED requires nvidiaCodeOrServiceIntegrated to be true.');
    }
    if (!c.runtimeEvidence) problems.push('NVIDIA_INTEGRATED requires runtime evidence.');
    if (c.validationMethod === 'none') {
      problems.push('NVIDIA_INTEGRATED requires a validation method.');
    }
  }

  if (c.status === 'SIMREADY_VALIDATED') {
    if (!c.simReadyValidated) {
      problems.push('SIMREADY_VALIDATED requires validated SimReady metadata.');
    }
    if (!c.openUsdCanonical) {
      problems.push('SIMREADY_VALIDATED requires a canonical OpenUSD source.');
    }
    if (!c.runtimeEvidence) problems.push('SIMREADY_VALIDATED requires validation evidence.');
  }

  if (c.simReadyValidated && c.status !== 'SIMREADY_VALIDATED') {
    problems.push('simReadyValidated may only be true on a SIMREADY_VALIDATED capability.');
  }

  if (c.nvidiaCodeOrServiceIntegrated && c.status !== 'NVIDIA_INTEGRATED') {
    problems.push(
      'nvidiaCodeOrServiceIntegrated may only be true on an NVIDIA_INTEGRATED capability.',
    );
  }

  if (c.status === 'BLOCKED' && c.blockers.length === 0) {
    problems.push('BLOCKED requires at least one documented blocker.');
  }

  if (c.status !== 'UNAVAILABLE' && c.status !== 'PLANNED' && !c.runtimeEvidence) {
    problems.push(`${c.status} requires a runtime evidence source.`);
  }

  if (c.lastValidatedAt && !/^\d{4}-\d{2}-\d{2}$/.test(c.lastValidatedAt)) {
    problems.push('lastValidatedAt must be an ISO date (YYYY-MM-DD).');
  }

  return problems;
}

/** Validates every record. Used by tests and by the admin registry view. */
export function validateRegistry(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const c of DSX_CAPABILITIES) {
    const problems = validateCapability(c);
    if (problems.length) result[c.id] = problems;
  }
  return result;
}

/**
 * Status changes are an administrative act. Client users can never promote a
 * capability into a claim-bearing status.
 */
export const PROMOTABLE_ONLY_BY_ADMIN: DsxStatus[] = ['NVIDIA_INTEGRATED', 'SIMREADY_VALIDATED'];

export function canSetStatus(next: DsxStatus, isAdmin: boolean): boolean {
  if (PROMOTABLE_ONLY_BY_ADMIN.includes(next)) return isAdmin;
  return isAdmin;
}