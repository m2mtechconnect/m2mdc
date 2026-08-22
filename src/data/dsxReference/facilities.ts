/**
 * NVIDIA DSX Blueprint Reference Portfolio and the AURA-authored Montreal
 * scenario, each classified honestly.
 *
 * The three reference sites are the sites NVIDIA actually publishes in
 * `web/src/data/options.ts`. They are never merged into a single fictional
 * facility, and none of them may donate geographic or tariff facts to the
 * Montreal scenario.
 */
import { DSX_DATASET_VERSION, DSX_REFERENCE_RECORDS, DSX_SOURCE_COMMIT } from './records';
import type { ClassifiedFacility, DatasetMode, ReferenceRecord } from './types';

const REPO =
  'https://github.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories';

const REFERENCE_DISCLOSURES = [
  'NVIDIA DSX blueprint sample',
  'Pinned public demo snapshot - May 2026',
  'Not a real facility',
  'Not commissioned',
  'Not connected to telemetry',
  'Reference data - not measured, not live',
  'Upstream NVIDIA demo-source conflicts are preserved, not silently resolved',
  'For evaluation use only',
] as const;

/** Configuration identifiers present in the pinned NVIDIA source. */
export const DSX_CONFIGURATION_IDS = DSX_REFERENCE_RECORDS.filter(
  (r) => r.data_class === 'REFERENCE_CONFIGURATION' && r.source_variant === 'configs.ts:configuration',
).map((r) => r.configuration_id as string);

/** The source configuration used for the default reference facility. */
export const DEFAULT_REFERENCE_CONFIGURATION_ID = 'virginia-gb300';

function referenceSite(site: string, configurationId: string): ClassifiedFacility {
  return {
    id: `dsx-reference-${site.toLowerCase().replace(/\s+/g, '-')}`,
    name: `${site} Reference Site`,
    facilityClass: 'REFERENCE',
    truthState: 'REFERENCE_ONLY',
    authoredBy: 'NVIDIA',
    datasetId: 'nvidia-dsx-blueprint',
    datasetVersion: DSX_DATASET_VERSION,
    configurationId,
    site,
    sourceUrl: `${REPO}/blob/${DSX_SOURCE_COMMIT}/web/src/data/kpis.ts`,
    licenceStatus: 'APPROVED_AUTHENTICATED_DEMO',
    disclosures: REFERENCE_DISCLOSURES,
    missingInputs: [],
    countsTowardOperationalTotals: false,
  };
}

/** Source-supported reference sites. */
export const DSX_REFERENCE_SITES: readonly ClassifiedFacility[] = [
  referenceSite('Virginia', 'virginia-gb300'),
  referenceSite('New Mexico', 'new-mexico-gb300'),
  referenceSite('Sweden', 'sweden-gb300'),
];

/** The default demonstration baseline facility, after cutover. */
export const DSX_REFERENCE_BASELINE: ClassifiedFacility = {
  id: 'dsx-reference-baseline',
  name: 'NVIDIA Omniverse DSX Blueprint Demo Reference - May 2026',
  facilityClass: 'REFERENCE',
  truthState: 'REFERENCE_ONLY',
  authoredBy: 'NVIDIA',
  datasetId: 'nvidia-dsx-blueprint',
  datasetVersion: DSX_DATASET_VERSION,
  configurationId: DEFAULT_REFERENCE_CONFIGURATION_ID,
  site: 'Virginia',
  sourceUrl: `${REPO}/blob/${DSX_SOURCE_COMMIT}/web/src/data/configs.ts`,
  licenceStatus: 'APPROVED_AUTHENTICATED_DEMO',
  disclosures: REFERENCE_DISCLOSURES,
  missingInputs: [],
  countsTowardOperationalTotals: false,
};

/**
 * Inputs the Montreal scenario has no defensible source for. These render as
 * "Not supplied" and must never be filled from an NVIDIA reference site.
 */
export const MONTREAL_MISSING_INPUTS = [
  'Climate',
  'Electricity tariff',
  'Grid carbon intensity',
  'Water availability',
  'Facility land and building information',
  'Commissioned power',
  'Cooling design',
  'Network and storage configuration',
] as const;

/** The AURA-authored Montreal scenario, reclassified honestly. */
export const MONTREAL_DERIVED_SCENARIO: ClassifiedFacility = {
  id: 'montreal-dsx-aligned-scenario',
  name: 'Montreal DSX-Aligned AI Factory Scenario',
  facilityClass: 'DERIVED_SCENARIO',
  truthState: 'SIMULATED_NOT_MEASURED',
  authoredBy: 'AURA',
  datasetId: 'montreal-derived',
  datasetVersion: '1.0.0',
  configurationId: null,
  site: 'Montreal',
  sourceUrl: null,
  licenceStatus: null,
  disclosures: [
    'AURA-authored',
    'Derived scenario',
    'Simulated - not measured operational data',
    'Not commissioned',
    'Not connected to a real facility',
    'DSX-aligned schemas and formulas only; no NVIDIA site facts applied',
  ],
  missingInputs: MONTREAL_MISSING_INPUTS,
  countsTowardOperationalTotals: false,
};

/** Every classified facility AURA currently knows about. */
export const CLASSIFIED_FACILITIES: readonly ClassifiedFacility[] = [
  DSX_REFERENCE_BASELINE,
  ...DSX_REFERENCE_SITES,
  MONTREAL_DERIVED_SCENARIO,
];

/** Facility ids allowed to contribute to operational rollups. Currently none. */
export function operationalFacilities(
  facilities: readonly ClassifiedFacility[] = CLASSIFIED_FACILITIES,
): ClassifiedFacility[] {
  return facilities.filter((f) => f.facilityClass === 'OPERATIONAL' && f.countsTowardOperationalTotals);
}

/** Records belonging to one source configuration. */
export function recordsForConfiguration(configurationId: string): ReferenceRecord[] {
  return DSX_REFERENCE_RECORDS.filter((r) => r.configuration_id === configurationId);
}

/** A single reference KPI, or null when the source does not supply it. */
export function referenceKpi(configurationId: string, metricKey: string): ReferenceRecord | null {
  return (
    DSX_REFERENCE_RECORDS.find(
      (r) =>
        r.data_class === 'REFERENCE_KPI_VALUE' &&
        r.source_variant === 'configs.ts:configuration-kpi' &&
        r.configuration_id === configurationId &&
        r.metric_key === metricKey,
    ) ?? null
  );
}

/**
 * Guards Compare: two configurations are comparable only when they share the
 * dataset and the metric is expressed in the same unit at the same scale.
 */
export function comparableMetric(
  aConfig: string,
  bConfig: string,
  metricKey: string,
): { comparable: boolean; reason: string | null } {
  const a = referenceKpi(aConfig, metricKey);
  const b = referenceKpi(bConfig, metricKey);
  if (!a || !b) return { comparable: false, reason: 'Metric not supplied for both configurations' };
  if (a.dataset_id !== b.dataset_id) return { comparable: false, reason: 'Different datasets' };
  if (a.unit !== b.unit) return { comparable: false, reason: `Unit mismatch: ${a.unit} vs ${b.unit}` };
  return { comparable: true, reason: null };
}

/** Dataset modes exposed to the canary cutover. */
export const DATASET_MODES: readonly DatasetMode[] = [
  'legacy-synthetic',
  'nvidia-dsx-reference',
  'montreal-derived',
];

/**
 * The production default dataset is owned by
 * `src/data/dataset/datasetRegistry.ts` (`PRODUCTION_DEFAULT_DATASET`). This
 * module deliberately exports no competing default: a second constant here
 * previously claimed `nvidia-dsx-reference` was the default, which was never
 * true at runtime and is exactly the kind of contradiction the registry exists
 * to prevent.
 */
