/**
 * Route-specific reference adapters.
 *
 * The first canary implementation rendered ONE generic reference surface for
 * all 19 REFERENCE_DATA_CONSUMER routes. That prevented synthetic leakage but
 * destroyed page identity: unrelated routes rendered the same card stack with
 * the same header and the same controls.
 *
 * An adapter restores page identity while keeping the centralized selectors as
 * the only data path. Each route declares its own title, navigation group,
 * user job, tab structure, controls and export identity, plus an explicit,
 * honest statement of which legacy interactions are not available while the
 * reference dataset is active (and why).
 *
 * Framework-free so parity can be asserted in unit tests.
 */
import type { SurfaceSection } from './surfaceRegistry';

export interface ReferenceTab {
  id: string;
  label: string;
  sections: readonly SurfaceSection[];
  /** Shown above the tab body: what this tab is for on THIS page. */
  intent: string;
}

export interface ReferenceAdapter {
  /** Canonical route pattern; must match a surfaceRegistry entry. */
  path: string;
  /** Stable per-page identifier, asserted unique in tests. */
  pageId: string;
  /** The page's real product name, matching navigation. */
  pageTitle: string;
  navGroup: 'overview' | 'design' | 'simulate' | 'operate' | 'govern' | 'support';
  /** The user job this page exists to serve. */
  userJob: string;
  tabs: readonly ReferenceTab[];
  /** Reference configuration picker is only meaningful on some pages. */
  showConfigurationSelector: boolean;
  /** Export filename stem; per page so downloads are attributable. */
  exportStem: string;
  /** Assistant scope statement for this page. */
  assistantContext: string;
  /**
   * Legacy interactions that are intentionally unavailable in reference mode,
   * each with the reason. Never an empty promise, never a silent removal.
   */
  workflowLimitations: readonly string[];
}

function adapter(a: ReferenceAdapter): ReferenceAdapter {
  return a;
}

export const REFERENCE_ADAPTERS: readonly ReferenceAdapter[] = [
  adapter({
    path: '/dashboard',
    pageId: 'overview',
    pageTitle: 'AI Factory Overview',
    navGroup: 'overview',
    userJob: 'Judge factory-wide status and data availability at a glance.',
    showConfigurationSelector: true,
    exportStem: 'aura-overview',
    assistantContext: 'Facility classification and published reference KPI values only.',
    tabs: [
      { id: 'status', label: 'Status', sections: ['facilities'], intent: 'Facility inventory by classification. Reference and derived facilities never count as operational.' },
      { id: 'kpis', label: 'Key values', sections: ['kpis'], intent: 'Published reference KPI values for the selected configuration. Single values, no trend.' },
      { id: 'availability', label: 'Data availability', sections: ['ngc'], intent: 'What is unavailable and why.' },
    ],
    workflowLimitations: [
      'Live tiles, trend arrows and refresh intervals are hidden: the pinned source publishes single values with no time series.',
      'Action Centre items are hidden: they act on operational facilities, and no facility is operational in this dataset.',
    ],
  }),
  adapter({
    path: '/manage/facilities',
    pageId: 'facilities',
    pageTitle: 'Facilities',
    navGroup: 'design',
    userJob: 'Find a site, understand its classification and open its detail.',
    showConfigurationSelector: false,
    exportStem: 'aura-facilities',
    assistantContext: 'Facility records and the AURA-authored Montreal scenario.',
    tabs: [
      { id: 'reference', label: 'Reference facilities', sections: ['facilities'], intent: 'The four NVIDIA reference sites, kept separate from operational inventory.' },
      { id: 'derived', label: 'AURA-derived', sections: ['montreal'], intent: 'Montreal remains AURA-authored: derived, simulated, not commissioned.' },
    ],
    workflowLimitations: [
      'Create, edit and delete are disabled: reference records are immutable by licence and classification.',
    ],
  }),
  adapter({
    path: '/blueprint/:id',
    pageId: 'blueprint',
    pageTitle: 'Facility Blueprint',
    navGroup: 'design',
    userJob: 'Inspect the facility model, its specifications and its versions.',
    showConfigurationSelector: true,
    exportStem: 'aura-blueprint',
    assistantContext: 'Specifications and configurations for the selected reference site.',
    tabs: [
      { id: 'model', label: 'Model', sections: ['configurations'], intent: 'Configuration records that define this reference model.' },
      { id: 'specifications', label: 'Specifications', sections: ['specifications'], intent: 'Site specifications. Fields the source does not publish read Not supplied.' },
      { id: 'derive', label: 'Derive', sections: ['derivation'], intent: 'Create a separate AURA-owned design from this reference configuration.' },
      { id: 'versions', label: 'Versions', sections: ['evidence'], intent: 'Dataset version, commit and checksum stand in for the version history of this model.' },
    ],
    workflowLimitations: [
      'Editing the model is disabled: reference specifications are immutable. Derive an AURA design to make changes.',
    ],
  }),
  adapter({
    path: '/blueprint/preview',
    pageId: 'blueprint-preview',
    pageTitle: 'Blueprint Preview',
    navGroup: 'design',
    userJob: 'Read the resolved model without entering the editor.',
    showConfigurationSelector: true,
    exportStem: 'aura-blueprint-preview',
    assistantContext: 'Resolved specification and configuration values only.',
    tabs: [
      { id: 'resolved', label: 'Resolved values', sections: ['specifications', 'configurations'], intent: 'Read-only resolution of the selected reference configuration.' },
    ],
    workflowLimitations: ['Editing is unavailable here: preview is read-only in every dataset, by design.'],
  }),
  adapter({
    path: '/data-centre-twin/:id/blueprint',
    pageId: 'twin-blueprint',
    pageTitle: 'Twin Blueprint',
    navGroup: 'design',
    userJob: 'Reconcile the 3D twin with the model that drives it.',
    showConfigurationSelector: true,
    exportStem: 'aura-twin-blueprint',
    assistantContext: 'Model values behind the twin. Geometry provenance is reported by the twin route itself.',
    tabs: [
      { id: 'model', label: 'Model', sections: ['configurations', 'specifications'], intent: 'Values bound to the twin.' },
      { id: 'derive', label: 'Derive', sections: ['derivation'], intent: 'Fork an AURA design from the reference model behind this twin.' },
    ],
    workflowLimitations: [
      'Geometry is not swapped by the dataset selector: NVIDIA OpenUSD-derived geometry is reported as provenance on the twin route, not as reference data.',
    ],
  }),
  adapter({
    path: '/builder',
    pageId: 'builder',
    pageTitle: 'Build Twin',
    navGroup: 'design',
    userJob: 'Turn a reference configuration into an AURA-owned design.',
    showConfigurationSelector: true,
    exportStem: 'aura-build-twin',
    assistantContext: 'Reference configurations available as derivation parents.',
    tabs: [
      { id: 'source', label: 'Choose source', sections: ['configurations'], intent: 'Pick the reference configuration to derive from.' },
      { id: 'derive', label: 'Derive design', sections: ['derivation'], intent: 'Explicit confirmation creates a new AURA identity with parent lineage and non-commissioned status.' },
    ],
    workflowLimitations: [
      'Free-form authoring steps are unavailable until a design is derived: authoring against an immutable reference record would silently fork it.',
    ],
  }),
  adapter({
    path: '/simulation',
    pageId: 'simulation',
    pageTitle: 'Simulation Studio',
    navGroup: 'simulate',
    userJob: 'Configure, run, compare and review a scenario.',
    showConfigurationSelector: true,
    exportStem: 'aura-simulation',
    assistantContext: 'Scenario records, run lineage and the values that fed the run.',
    tabs: [
      { id: 'configure', label: 'Configure', sections: ['scenarios'], intent: 'Reference scenarios available as run inputs.' },
      { id: 'simulate', label: 'Simulate', sections: ['run-lineage'], intent: 'Run lineage, or an explicit blocked state listing every missing input.' },
      { id: 'compare', label: 'Compare', sections: ['compare'], intent: 'Configuration-to-configuration comparison. Incomparable pairs are reported, never coerced.' },
      { id: 'review', label: 'Review', sections: ['review'], intent: 'Run, dataset version and input lineage bound together for sign-off.' },
      { id: 'evidence', label: 'Evidence', sections: ['evidence', 'export'], intent: 'Record-level evidence and lineage-complete export.' },
    ],
    workflowLimitations: [
      'Execution is refused, not approximated, when a required engineering input is unavailable: no value is substituted.',
    ],
  }),
  adapter({
    path: '/simulation/preview',
    pageId: 'simulation-preview',
    pageTitle: 'Simulation Preview',
    navGroup: 'simulate',
    userJob: 'Preview a scenario and its lineage without executing it.',
    showConfigurationSelector: true,
    exportStem: 'aura-simulation-preview',
    assistantContext: 'Scenario definitions and prospective run lineage.',
    tabs: [
      { id: 'scenarios', label: 'Scenarios', sections: ['scenarios'], intent: 'Scenario records in the reference dataset.' },
      { id: 'lineage', label: 'Prospective lineage', sections: ['run-lineage'], intent: 'What a run would record, or why it would be blocked.' },
    ],
    workflowLimitations: ['Nothing is persisted here: preview never writes a run record.'],
  }),
  adapter({
    path: '/analytics',
    pageId: 'analytics',
    pageTitle: 'Telemetry & Analytics',
    navGroup: 'operate',
    userJob: 'Analyse behaviour over time.',
    showConfigurationSelector: true,
    exportStem: 'aura-analytics',
    assistantContext: 'Published single values. No history exists to analyse.',
    tabs: [
      { id: 'history', label: 'History', sections: ['telemetry'], intent: 'Why no time series is rendered.' },
      { id: 'values', label: 'Published values', sections: ['kpis'], intent: 'The single published values that would otherwise be charted.' },
    ],
    workflowLimitations: [
      'Date-range, granularity and refresh controls are hidden: there is no time-series source to scope.',
    ],
  }),
  adapter({
    path: '/search',
    pageId: 'search',
    pageTitle: 'Search',
    navGroup: 'overview',
    userJob: 'Find any record across the active dataset.',
    showConfigurationSelector: false,
    exportStem: 'aura-search',
    assistantContext: 'Every record the caller is authorized to read in the active dataset.',
    tabs: [
      { id: 'results', label: 'Results', sections: ['search'], intent: 'Dataset-scoped results. Legacy results never leak into reference mode.' },
      { id: 'ask', label: 'Ask', sections: ['assistant'], intent: 'Grounded answers citing record IDs, abstaining when unsupported.' },
    ],
    workflowLimitations: [],
  }),
  adapter({
    path: '/compliance',
    pageId: 'compliance',
    pageTitle: 'Validation & Evidence',
    navGroup: 'govern',
    userJob: 'Prove where every value came from and export the proof.',
    showConfigurationSelector: false,
    exportStem: 'aura-evidence',
    assistantContext: 'Record-level provenance only.',
    tabs: [
      { id: 'records', label: 'Records', sections: ['evidence'], intent: 'Record id, source, commit, checksum, normalization rule, classification and licence.' },
      { id: 'export', label: 'Export', sections: ['export'], intent: 'CSV and JSON carrying the same lineage as the screen.' },
    ],
    workflowLimitations: [
      'Attestation and sign-off actions are disabled: nothing in this dataset is commissioned or measured.',
    ],
  }),
  adapter({
    path: '/app/agents',
    pageId: 'agents',
    pageTitle: 'Subsystem Agents',
    navGroup: 'operate',
    userJob: 'Understand which subsystem behaviours are modelled.',
    showConfigurationSelector: false,
    exportStem: 'aura-agents',
    assistantContext: 'Scenario definitions bound to subsystem behaviour.',
    tabs: [
      { id: 'definitions', label: 'Definitions', sections: ['agents'], intent: 'Reference-aligned scenario definitions. No NIM or DSX runtime agent is active.' },
      { id: 'availability', label: 'Availability', sections: ['ngc'], intent: 'What the pinned source does not supply.' },
    ],
    workflowLimitations: [
      'Enable, configure and dispatch are disabled: an agent would need a connected facility, and none is connected.',
    ],
  }),
      adapter({
    path: '/manage/integrations',
    pageId: 'integrations',
    pageTitle: 'Integrations',
    navGroup: 'operate',
    userJob: 'Manage what AURA is connected to.',
    showConfigurationSelector: false,
    exportStem: 'aura-integrations',
    assistantContext: 'Reference source registrations only.',
    tabs: [
      { id: 'connected', label: 'Sources', sections: ['integrations'], intent: 'Reference sources backing the active dataset.' },
    ],
    workflowLimitations: [
      'Connect and disconnect are disabled: the pinned reference snapshot has no mutable connection.',
    ],
  }),
  adapter({
    path: '/deploy',
    pageId: 'deploy',
    pageTitle: 'Deployment Lanes',
    navGroup: 'govern',
    userJob: 'Promote a validated design.',
    showConfigurationSelector: false,
    exportStem: 'aura-deployment-lanes',
    assistantContext: 'Deployment eligibility only.',
    tabs: [
      { id: 'eligibility', label: 'Eligibility', sections: ['deployments'], intent: 'Why nothing in this dataset is deployable.' },
    ],
    workflowLimitations: [
      'Deployment is refused: a reference facility is not commissioned and cannot be a deployment target.',
    ],
  }),
  adapter({
    path: '/deployments',
    pageId: 'deployments',
    pageTitle: 'Deployment History',
    navGroup: 'govern',
    userJob: 'Audit what was deployed and when.',
    showConfigurationSelector: false,
    exportStem: 'aura-deployment-history',
    assistantContext: 'Deployment records only.',
    tabs: [
      { id: 'history', label: 'History', sections: ['deployments'], intent: 'No deployment exists against reference data; the empty state is truthful, not a loading state.' },
    ],
    workflowLimitations: [],
  }),
  adapter({
    path: '/admin/asset-pipeline',
    pageId: 'asset-pipeline',
    pageTitle: 'Asset Pipeline',
    navGroup: 'govern',
    userJob: 'Track asset ingestion and publication.',
    showConfigurationSelector: false,
    exportStem: 'aura-asset-pipeline',
    assistantContext: 'Asset provenance only.',
    tabs: [
      { id: 'assets', label: 'Assets', sections: ['assets'], intent: 'OpenUSD-derived asset provenance, reported as provenance rather than DSX integration.' },
      { id: 'blockers', label: 'Blockers', sections: ['ngc'], intent: 'Source availability.' },
    ],
    workflowLimitations: ['Publication actions are not shown here: asset publication stays with the legacy pipeline and is not driven by the dataset selector.'],
  }),
  adapter({
    path: '/help',
    pageId: 'help',
    pageTitle: 'Support & Documentation',
    navGroup: 'support',
    userJob: 'Understand the vocabulary and the limits of the active dataset.',
    showConfigurationSelector: false,
    exportStem: 'aura-glossary',
    assistantContext: 'Definitions and dataset policy only.',
    tabs: [
      { id: 'glossary', label: 'Glossary', sections: ['glossary'], intent: 'Classification and provenance vocabulary used across AURA.' },
      { id: 'limits', label: 'Known limits', sections: ['ngc'], intent: 'Documented, current blockers.' },
    ],
    workflowLimitations: [],
  }),
];

export function adapterForPath(path: string): ReferenceAdapter | null {
  return REFERENCE_ADAPTERS.find((a) => a.path === path) ?? null;
}
