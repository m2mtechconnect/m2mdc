/**
 * Truthful page positioning.
 *
 * Each primary AURA page gets a short purpose statement, a breadcrumb trail,
 * a document title and the capability id that governs its status treatment.
 * The registry owns the claim; this map only owns wording and placement.
 */
export interface PagePositioning {
  /** Canonical route. Never changed - old aliases keep redirecting here. */
  route: string;
  /** Display title used in the drawer, the breadcrumb and the document title. */
  title: string;
  purpose: string;
  breadcrumb: string[];
  capabilityId: string;
}

export const PAGE_POSITIONING: PagePositioning[] = [
  {
    route: '/dashboard',
    title: 'AI Factory Overview',
    purpose:
      'Unified facility status, simulated outcomes, operational data availability and efficiency indicators.',
    breadcrumb: ['Overview', 'AI Factory Overview'],
    capabilityId: 'aif-overview',
  },
  {
    route: '/blueprint',
    title: 'Facility Blueprint',
    purpose:
      'Manage facility topology, OpenUSD assemblies, configurations, versions and validation.',
    breadcrumb: ['Design', 'Facility Blueprint'],
    capabilityId: 'facility-blueprint',
  },
  {
    route: '/builder',
    title: 'OpenUSD Asset Pipeline',
    purpose:
      'Manage the asset journey from source acquisition to canonical OpenUSD masters and approved browser derivatives.',
    breadcrumb: ['Design', 'OpenUSD Asset Pipeline'],
    capabilityId: 'openusd-asset-pipeline',
  },
  {
    route: '/manage/facilities',
    title: 'Facilities',
    purpose: 'Manage sites, halls, capacity, infrastructure scope and lifecycle state.',
    breadcrumb: ['Design', 'Facilities'],
    capabilityId: 'facilities',
  },
  {
    route: '/dsx/evidence-beta/overview',
    title: 'Validation & Evidence',
    purpose:
      'Validation results, provenance, simulation evidence, exports and audit history for a specific facility, blueprint version, run or asset.',
    breadcrumb: ['Design', 'Validation & Evidence'],
    capabilityId: 'validation-evidence',
  },
  {
    route: '/simulation',
    title: 'Simulation Studio',
    purpose: 'Configure, execute, compare and review simulation-backed scenarios.',
    breadcrumb: ['Simulate', 'Simulation Studio'],
    capabilityId: 'simulation-studio',
  },
  {
    route: '/analytics',
    title: 'Operations & Telemetry',
    purpose:
      'Measured operational data, simulation outputs and data availability across facility systems.',
    breadcrumb: ['Operate', 'Operations & Telemetry'],
    capabilityId: 'operations-telemetry',
  },
  {
    route: '/manage/integrations',
    title: 'Connections',
    purpose:
      'Connect facility systems, edge gateways, twin runtimes, storage and enterprise workflows to AURA.',
    breadcrumb: ['Manage', 'Connections'],
    capabilityId: 'integrations',
  },
  {
    route: '/app/agents',
    title: 'Agents & Optimization',
    purpose:
      'AURA agents, their scopes, data access, recommendations, execution state and audit history.',
    breadcrumb: ['Operate', 'Agents & Optimization'],
    capabilityId: 'agents-optimization',
  },
  {
    route: '/deployments',
    title: 'Runtime Environments',
    purpose:
      'Where AURA applications, validation workloads and production services execute today, and what is still planned.',
    breadcrumb: ['Operate', 'Runtime Environments'],
    capabilityId: 'runtime-environments',
  },
  {
    route: '/settings/ai',
    title: 'Agent Configuration',
    purpose: 'Configure AURA agent policy, approved providers, knowledge boundaries and governance.',
    breadcrumb: ['Govern', 'Agent Configuration'],
    capabilityId: 'agent-configuration',
  },
  {
    route: '/search',
    title: 'Search',
    purpose: 'Find facilities, assets, agents and evidence you are authorized to see.',
    breadcrumb: ['Support', 'Search'],
    capabilityId: 'search',
  },
];

export function positioningFor(route: string): PagePositioning | undefined {
  return PAGE_POSITIONING.find((p) => p.route === route);
}
