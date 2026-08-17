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

export const SURFACE_MATRIX: readonly SurfaceEntry[] = [
  consumer('/dashboard', 'Dashboard', ['facilities', 'kpis', 'ngc'], [KPI, CONFIG]),
  consumer('/manage/facilities', 'Facilities', ['facilities', 'montreal'], [CONFIG, SPEC]),
  consumer('/blueprint/:id', 'Blueprint', ['specifications', 'configurations', 'derivation'], [SPEC, CONFIG]),
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
  consumer('/connect/monitor', 'Ingestion monitor', ['integrations', 'ngc'], []),
  consumer('/connect/health', 'Source health', ['integrations', 'ngc'], []),
  consumer('/manage/integrations', 'Integrations', ['integrations'], []),
  consumer('/deploy', 'Deployment lanes', ['deployments'], []),
  consumer('/deployments', 'Deployment history', ['deployments'], []),
  consumer('/admin/asset-pipeline', 'Asset pipeline', ['assets', 'ngc'], []),
  consumer('/help', 'Support and documentation', ['glossary'], []),

  neutral('/data-centre-twin', '3D twin', 'Geometry provenance only, no dataset values.'),
  neutral('/data-centre-twin/:id', '3D twin detail', 'Geometry provenance only.'),
  neutral('/omniverse-scene', 'Omniverse scene', 'Geometry only.'),
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