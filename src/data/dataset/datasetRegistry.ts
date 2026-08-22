/**
 * Centralized dataset registry (canary phase).
 *
 * ONE typed owner of dataset selection for the whole application.
 *
 * Truth rules encoded here:
 *  - the URL query parameter `?dataset=` is the canonical owner of the canary
 *    selection; nothing else may silently override it;
 *  - an invalid, unknown or unauthorized value fails safely to the PRODUCTION
 *    default, which remains `legacy-synthetic`;
 *  - `nvidia-dsx-reference` requires an authenticated administrator, because
 *    the raw NVIDIA source is still REQUIRES_LEGAL_REVIEW;
 *  - selecting the reference dataset never promotes a capability and never
 *    implies live, measured, commissioned, integrated or validated state.
 */
import {
  DATASET_MODES,
  DSX_DATASET_VERSION,
  DSX_RETRIEVED_AT,
  DSX_SOURCE_COMMIT,
  type DatasetMode,
} from '@/data/dsxReference';

/** The dataset the production default experience uses. NOT flipped in this phase. */
export const PRODUCTION_DEFAULT_DATASET: DatasetMode = 'legacy-synthetic';

/** URL parameter that owns canary selection. */
export const DATASET_PARAM = 'dataset';

/** Datasets that may only be activated by an authenticated administrator. */
export const ADMIN_ONLY_DATASETS: readonly DatasetMode[] = ['nvidia-dsx-reference'];

export interface DatasetDescriptor {
  id: DatasetMode;
  label: string;
  description: string;
  adminOnly: boolean;
  datasetId: string | null;
  datasetVersion: string | null;
  sourceCommit: string | null;
  ingestedAt: string | null;
  licenceStatement: string;
}

export const DATASET_DESCRIPTORS: Readonly<Record<DatasetMode, DatasetDescriptor>> = {
  'legacy-synthetic': {
    id: 'legacy-synthetic',
    label: 'Legacy synthetic (production default)',
    description:
      'The existing generated demonstration dataset. Preserved unchanged for rollback and regression comparison.',
    adminOnly: false,
    datasetId: 'aura-legacy-synthetic',
    datasetVersion: 'AURA_LEGACY_SYNTHETIC_BASELINE_V1',
    sourceCommit: null,
    ingestedAt: null,
    licenceStatement: 'AURA-authored synthetic content.',
  },
  'nvidia-dsx-reference': {
    id: 'nvidia-dsx-reference',
    label: 'NVIDIA Omniverse DSX Blueprint Demo Reference — May 2026 — Read-only',
    description:
      'Source-complete normalized reference data from the pinned public NVIDIA Omniverse DSX Blueprint demo snapshot at d940314. Includes preserved upstream duplicates, scoped variants and source conflicts rather than silently selecting one value. Administrator-only and read-only. Not operational telemetry, not commissioned, not a current NVIDIA DSX reference-design claim, not an NVIDIA DSX runtime service, and not SimReady validation. NGC-dependent fields remain unavailable. The production default is unchanged.',
    adminOnly: true,
    datasetId: 'nvidia-dsx-blueprint',
    datasetVersion: DSX_DATASET_VERSION,
    sourceCommit: DSX_SOURCE_COMMIT,
    ingestedAt: DSX_RETRIEVED_AT,
    licenceStatement:
      'Raw NVIDIA source remains REQUIRES_LEGAL_REVIEW. Normalized records are restricted to authenticated administrators.',
  },
  'montreal-derived': {
    id: 'montreal-derived',
    label: 'Montreal DSX-aligned scenario (AURA-authored)',
    description:
      'AURA-authored derived scenario. Simulated, not commissioned, not connected. Eight inputs are Not supplied and are never filled from an NVIDIA site.',
    adminOnly: false,
    datasetId: 'aura-montreal-derived',
    datasetVersion: 'montreal-derived@1',
    sourceCommit: null,
    ingestedAt: null,
    licenceStatement: 'AURA-authored scenario. Contains no NVIDIA facts.',
  },
};

export function isDatasetMode(value: unknown): value is DatasetMode {
  return typeof value === 'string' && (DATASET_MODES as readonly string[]).includes(value);
}

export function isAdminOnlyDataset(mode: DatasetMode): boolean {
  return ADMIN_ONLY_DATASETS.includes(mode);
}

export type DatasetResolutionReason =
  | 'default'
  | 'requested'
  | 'invalid-value-fallback'
  | 'unauthorized-fallback';

export interface DatasetResolution {
  /** Dataset actually in effect. */
  mode: DatasetMode;
  /** Raw requested value, verbatim, for evidence. */
  requested: string | null;
  reason: DatasetResolutionReason;
  /** True when the effective dataset differs from the production default. */
  canaryActive: boolean;
  descriptor: DatasetDescriptor;
}

/**
 * Resolve the effective dataset from a raw URL value plus caller authority.
 * Pure: no globals, no side effects.
 */
export function resolveDataset(
  requestedRaw: string | null | undefined,
  options: { isAdmin: boolean },
): DatasetResolution {
  const requested = requestedRaw ?? null;
  const fallback = (reason: DatasetResolutionReason): DatasetResolution => ({
    mode: PRODUCTION_DEFAULT_DATASET,
    requested,
    reason,
    canaryActive: false,
    descriptor: DATASET_DESCRIPTORS[PRODUCTION_DEFAULT_DATASET],
  });

  if (requested === null || requested === '') return fallback('default');
  if (!isDatasetMode(requested)) return fallback('invalid-value-fallback');
  if (isAdminOnlyDataset(requested) && !options.isAdmin) return fallback('unauthorized-fallback');

  return {
    mode: requested,
    requested,
    reason: 'requested',
    canaryActive: requested !== PRODUCTION_DEFAULT_DATASET,
    descriptor: DATASET_DESCRIPTORS[requested],
  };
}

/** Read the raw dataset value from a query string. */
export function readDatasetParam(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get(DATASET_PARAM);
}

/**
 * Build a URL that preserves the current dataset selection across navigation.
 * Passing `null` produces the one-action rollback link to the default.
 */
export function withDataset(path: string, mode: DatasetMode | null): string {
  const [base, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  if (mode === null || mode === PRODUCTION_DEFAULT_DATASET) params.delete(DATASET_PARAM);
  else params.set(DATASET_PARAM, mode);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
