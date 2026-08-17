/**
 * Runtime surface migration matrix for the admin-only reference canary.
 *
 * Every authenticated route is classified here. While
 * `?dataset=nvidia-dsx-reference` is active, a REFERENCE_DATA_CONSUMER surface
 * is rendered from the centralized selectors only: the legacy page component
 * is not mounted at all, so it cannot contribute a hidden synthetic
 * dependency. A DATASET_NEUTRAL surface renders normally and is only required
 * to preserve the dataset context when navigating away.
 *
 * Framework-free so the matrix can be asserted in unit tests.
 */
import type { ReferenceDataClass } from '@/data/dsxReference';

export type SurfaceClassification =
  | 'REFERENCE_DATA_CONSUMER'
  | 'DATASET_NEUTRAL'
  | 'REFERENCE_UNAVAILABLE'
  | 'LEGACY_ONLY_BLOCKER';

/** Section renderers available to a reference surface. */
export type SurfaceSection =
  | 'kpis'
  | 'specifications'
  | 'configurations'
  | 'scenarios'
  | 'facilities'
  | 'montreal'
  | 'derivation'
  | 'run-lineage'
  | 'compare'
  | 'review'
  | 'evidence'
  | 'export'
  | 'search'
  | 'assistant'
  | 'integrations'
  | 'assets'
  | 'telemetry'
  | 'agents'
  | 'deployments'
  | 'glossary'
  | 'ngc';

export interface SurfaceEntry {
  /** Route pattern as declared in the authenticated shell. */
  path: string;
  title: string;
  classification: SurfaceClassification;
  /** Legacy data source replaced while the canary is active. */
  currentSource: string;
  /** Centralized selectors the migrated surface reads through. */
  targetSelectors: readonly string[];
  requiredRecordTypes: readonly ReferenceDataClass[];
  sections: readonly SurfaceSection[];
  /** How the surface behaves when the source does not supply a value. */
  missingBehaviour: string;
  exportImplications: string;
  assistantImplications: string;
  migrated: boolean;
}

const KPI: ReferenceDataClass = 'REFERENCE_KPI_VALUE';
const SPEC: ReferenceDataClass = 'REFERENCE_SPECIFICATION';
const CONFIG: ReferenceDataClass = 'REFERENCE_CONFIGURATION';
const SCENARIO: ReferenceDataClass = 'REFERENCE_SCENARIO';

function consumer(
  path: string,
  title: string,
  sections: readonly SurfaceSection[],
  requiredRecordTypes: readonly ReferenceDataClass[],
  overrides: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    path,
    title,
    classification: 'REFERENCE_DATA_CONSUMER',
    currentSource: 'legacy synthetic facility model',
    targetSelectors: ['referenceKpiValues', 'referenceSpecifications', 'referenceConfigurations'],
    requiredRecordTypes,
    sections,
    missingBehaviour: 'Terminal unavailable or Not supplied state; never zero, never fabricated.',
    exportImplications: 'CSV and JSON carry dataset, record and checksum lineage.',
    assistantImplications: 'Assistant may cite only the records rendered on this surface.',
    migrated: true,
    ...overrides,
  };
}

function neutral(path: string, title: string, note = 'No dataset-bound values rendered.'): SurfaceEntry {
  return {
    path,
    title,
    classification: 'DATASET_NEUTRAL',
    currentSource: note,
    targetSelectors: [],
    requiredRecordTypes: [],
    sections: [],
    missingBehaviour: 'n/a',
    exportImplications: 'n/a',
    assistantImplications: 'Dataset context preserved on navigation only.',
    migrated: true,
  };
}

/**
 * A surface whose legacy implementation reads a synthetic fixture that the
 * reference dataset cannot supply (for example per-second telemetry, which the
 * pinned NVIDIA source does not publish at all).
 *
 * While the canary is active these pages are NOT mounted: rendering them would
 * put fixture values on screen under a reference-data banner. The gate shows a
 * terminal unavailable state naming the missing source instead.
 */
function unavailable(path: string, title: string, blockingSource: string): SurfaceEntry {
  return {
    path,
    title,
    classification: 'REFERENCE_UNAVAILABLE',
    currentSource: blockingSource,
    targetSelectors: [],
    requiredRecordTypes: [],
    sections: [],
    missingBehaviour:
      'Page is not mounted in reference mode. A terminal unavailable state names the missing source.',
    exportImplications: 'No export: there is no defensible value to export.',
    assistantImplications: 'Assistant may not cite this surface while the canary is active.',
    migrated: true,
  };
}

/** Evidence workspace routes, all served by the synthetic evidence-beta fixture. */
const EVIDENCE_BETA_ROUTES: readonly [string, string][] = [
  ['/dsx/evidence-beta', 'Evidence workspaces'],
  ['/dsx/evidence-beta/overview', 'Evidence overview'],
  ['/dsx/evidence-beta/operations', 'Operations'],
  ['/dsx/evidence-beta/operations/thermal', 'Thermal'],
  ['/dsx/evidence-beta/operations/power', 'Power'],
  ['/dsx/evidence-beta/operations/cooling', 'Cooling'],
  ['/dsx/evidence-beta/operations/compute', 'Compute and network'],
  ['/dsx/evidence-beta/operations/workload', 'Workload'],
  ['/dsx/evidence-beta/sustainability', 'Sustainability'],
  ['/dsx/evidence-beta/sustainability/financial', 'Financial'],
  ['/dsx/evidence-beta/sustainability/sovereignty', 'Sovereignty'],
  ['/dsx/evidence-beta/decisions', 'Decisions'],
  ['/dsx/evidence-beta/decisions/log', 'Decision log'],
  ['/dsx/evidence-beta/assets', 'Facility assets'],
  ['/dsx/evidence-beta/thermal', 'Thermal'],
  ['/dsx/evidence-beta/power', 'Power'],
  ['/dsx/evidence-beta/cooling', 'Cooling'],
  ['/dsx/evidence-beta/network', 'Network'],
  ['/dsx/evidence-beta/facility', 'Facility'],
  ['/dsx/evidence-beta/workload', 'Workload'],
  ['/dsx/evidence-beta/simulations', 'Simulations'],
  ['/dsx/evidence-beta/sovereignty', 'Sovereignty'],
  ['/dsx/evidence-beta/carbon', 'Carbon'],
  ['/dsx/evidence-beta/financials', 'Financials'],
  ['/dsx/evidence-beta/evidence', 'Evidence log'],
];

export const SURFACE_MATRIX: readonly SurfaceEntry[] = [
  consumer('/dashboard', 'Dashboard', ['facilities', 'kpis', 'ngc'], [KPI, CONFIG]),
  consumer('/manage/facilities', 'Facilities', ['facilities', 'montreal'], [CONFIG, SPEC]),
  consumer('/blueprint/:id', 'Blueprint', ['specifications', 'configurations', 'derivation', 'evidence'], [SPEC, CONFIG]),
  consumer('/blueprint/preview', 'Blueprint preview', ['specifications', 'configurations'], [SPEC, CONFIG]),
  consumer('/data-centre-twin/:id/blueprint', 'Twin blueprint', ['specifications', 'configurations', 'derivation'], [SPEC, CONFIG]),
  consumer('/builder', 'Build twin', ['configurations', 'derivation'], [CONFIG, SPEC]),
  consumer(
    '/simulation',
    'Simulation workflow',
    ['scenarios', 'run-lineage', 'compare', 'review', 'evidence', 'export'],
    [SCENARIO, KPI, CONFIG],
  ),
  consumer('/simulation/preview', 'Simulation preview', ['scenarios', 'run-lineage'], [SCENARIO]),
  consumer('/analytics', 'Telemetry and analytics', ['telemetry', 'kpis'], [KPI], {
    missingBehaviour: 'No time series exists in the reference dataset: history is reported unavailable.',
  }),
  consumer('/search', 'Search', ['search', 'assistant'], [KPI, SPEC, CONFIG, SCENARIO]),
  consumer('/compliance', 'Evidence and compliance', ['evidence', 'export'], [KPI, SPEC, CONFIG, SCENARIO]),
  consumer('/app/agents', 'Subsystem agents', ['agents', 'ngc'], [SCENARIO]),
  consumer('/manage/integrations', 'Integrations', ['integrations'], []),
  consumer('/deploy', 'Deployment lanes', ['deployments'], []),
  consumer('/deployments', 'Deployment history', ['deployments'], []),
  consumer('/admin/asset-pipeline', 'Asset pipeline', ['assets', 'ngc'], []),
  consumer('/help', 'Support and documentation', ['glossary', 'ngc'], []),

  neutral('/data-centre-twin', '3D twin', 'Geometry provenance only, no dataset values.'),
  neutral('/data-centre-twin/:id', '3D twin detail', 'Geometry provenance only.'),
  neutral('/twin-preview', 'Twin preview', 'Geometry only.'),
  neutral('/infrastructure', 'Infrastructure', 'Asset registry only.'),
  neutral('/teams', 'Teams'),
  neutral('/marketplace', 'Marketplace'),
  neutral('/playbook', 'Playbook'),
  neutral('/settings/ai', 'AI settings', 'Provider configuration only; unchanged by dataset.'),
  neutral('/account/profile', 'Profile'),
  neutral('/account/settings', 'Account settings'),
  neutral('/account/access-control', 'Access control'),
  neutral('/admin/dataset-registry', 'Dataset registry', 'Owns the canary; reads the registry directly.'),
  neutral('/admin/dsx-capabilities', 'Capability registry'),
  neutral('/admin/user-approvals', 'User approvals'),
  neutral('/admin/signups-dashboard', 'Signups'),
  neutral('/admin/onboarding-submissions', 'Onboarding submissions'),
  neutral('/admin/asset-preview', 'Asset preview'),
  neutral('/admin/asset-validation/:assetId', 'Asset validation'),
  neutral('/admin/reference-facility-validation', 'Reference facility validation'),
  neutral('/twin-debug', 'Twin debug'),
  neutral('/sign-out', 'Sign out'),

  // Routes that exist in the authenticated shell and were previously
  // unclassified. An unclassified route is a hole: the gate never sees it, so
  // the legacy page renders while the canary claims to be active.
  neutral('/login', 'Authenticated entry redirect', 'Redirect only.'),
  neutral('/onboarding', 'Onboarding redirect', 'Redirect only.'),
  neutral('/agent/:id', 'Agent workspace', 'Server-backed agent records only.'),
  neutral('/agents/:id/chat', 'Agent chat', 'Server-backed conversation only.'),
  neutral('/agent-chat', 'Agent chat redirect', 'Redirect only.'),
  neutral('/app/agents/:slug/detail', 'Agent detail', 'Server-backed agent definition only.'),
  neutral('/app/agents/:agentId/manage', 'Twin manage', 'Server-backed twin record only.'),
  neutral('/app/agents/:agentId/operations', 'Agent operations redirect', 'Redirect only.'),
  neutral('/twins/:instanceId/manage', 'Twin manage redirect', 'Redirect only.'),
  neutral('/studio/systems/:systemId/manage', 'System manage', 'Server-backed system record only.'),
  neutral('/digital-twins-demo/funding-intake', 'Funding intake demo', 'Demonstration form only.'),
  neutral('/dev-overlays', 'Overlay fixtures', 'Development fixtures only.'),

  // AURA_IA_DUP_CLEANUP: the connections control plane now has exactly one
  // mount (/manage/integrations, classified above). These three are pure
  // redirects, kept classified so the gate never sees an unclassified route.
  neutral('/manage/connections', 'Connections redirect', 'Redirect only.'),
  neutral('/connect/monitor', 'Ingestion monitor redirect', 'Redirect only.'),
  neutral('/connect/health', 'Source health redirect', 'Redirect only.'),

  // Platform readiness reads live server-backed capability and runtime
  // records. It renders no reference facility values at all, so the canary
  // must leave it mounted.
  neutral(
    '/admin/platform-readiness',
    'Platform readiness',
    'Capability registry and runtime readiness evidence only; no facility dataset values.',
  ),

  ...EVIDENCE_BETA_ROUTES.map(([path, title]) =>
    unavailable(
      path,
      title,
      'Synthetic evidence-beta fixture (EVIDENCE_BETA_SEED) and per-interval run series, which the pinned NVIDIA reference source does not publish.',
    ),
  ),
];

export function surfacesByClassification(c: SurfaceClassification): SurfaceEntry[] {
  return SURFACE_MATRIX.filter((s) => s.classification === c);
}

/** Convert a route pattern into a matcher without pulling in the router. */
function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${source}/?$`);
}

/** The surface entry that owns a concrete pathname, if any. */
export function surfaceForPath(pathname: string): SurfaceEntry | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const exact = SURFACE_MATRIX.find((s) => s.path === path);
  if (exact) return exact;
  return SURFACE_MATRIX.find((s) => s.path.includes(':') && patternToRegExp(s.path).test(path)) ?? null;
}

/** True when the reference canary must take over rendering for a pathname. */
export function isReferenceConsumerPath(pathname: string): boolean {
  return surfaceForPath(pathname)?.classification === 'REFERENCE_DATA_CONSUMER';
}