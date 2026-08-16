/**
 * NVIDIA Reference Facility hardware visual-acceptance specification.
 *
 * Every expected value is read from the published asset manifest. Nothing is
 * inferred from filenames, and nothing is claimed that the runtime coverage
 * store has not reported.
 */

import {
  SEMANTIC_ROLE_LABEL,
  listAssets,
  listAssetsForRole,
  resolveRoleAssetForBand,
  type AssetManifestEntry,
  type SemanticRole,
} from '@/components/twin-visualization/assetRegistry';
import type { RoleCoverage } from '@/components/twin-visualization/runtimeCoverageStore';
import type { CameraPresetId } from '@/three/cameraPresets';

export const REFERENCE_FACILITY_ID = 'nvidia.reference-facility';
export const REFERENCE_FACILITY_ROUTE = '/data-centre-twin?geometry=nvidia-reference';

/** Roles the reference facility is expected to represent. */
export const REFERENCE_ROLES: SemanticRole[] = [
  'server-1u',
  'server-2u',
  'network-switch',
  'rack-pdu',
  'blanking-panel',
  'cable-tray',
  'liquid-cooling-equipment',
  'liquid-cooled-rack',
  'rack-core-reference',
];

export type RoleVerdict =
  | 'openusd-derived'
  | 'procedural-fallback'
  | 'blocked'
  | 'preparing'
  | 'not-published'
  | 'not-mounted';

export interface RoleReconciliation {
  role: SemanticRole;
  label: string;
  /** Manifest rows declaring this role that are runtime resolvable. */
  publishedAssets: number;
  /** Derivative the manifest quality policy selects for a nearby camera. */
  expectedAssetId: string | null;
  mountedAssetId: string | null;
  mountedObjects: number;
  glbInstances: number;
  derivativeUrl: string | null;
  verdict: RoleVerdict;
  detail: string;
}

export interface FacilityReconciliation {
  rows: RoleReconciliation[];
  rolesDerived: number;
  rolesExpected: number;
  mountedObjects: number;
  uniqueDerivatives: number;
  /** Manifest rows the runtime never requested, listed for audit honesty. */
  unusedPublishedAssets: string[];
}

/** Reconcile manifest expectation against what the runtime actually mounted. */
export function reconcileReferenceFacility(
  coverage: Record<string, RoleCoverage>,
): FacilityReconciliation {
  const used = new Set<string>();
  const rows = REFERENCE_ROLES.map<RoleReconciliation>((role) => {
    const published = listAssetsForRole(role);
    const expected = resolveRoleAssetForBand(role, 'nearby')?.entry ?? null;
    const report = coverage[role];
    if (report?.assetId && report.mountedObjects > 0) used.add(report.assetId);

    let verdict: RoleVerdict;
    if (published.length === 0) verdict = 'not-published';
    else if (!report) verdict = 'not-mounted';
    else if (report.state === 'openusd-derived' && report.mountedObjects > 0) verdict = 'openusd-derived';
    else if (report.state === 'blocked') verdict = 'blocked';
    else if (report.state === 'preparing') verdict = 'preparing';
    else if (report.state === 'procedural-fallback') verdict = 'procedural-fallback';
    else verdict = 'not-mounted';

    return {
      role,
      label: SEMANTIC_ROLE_LABEL[role],
      publishedAssets: published.length,
      expectedAssetId: expected?.assetId ?? null,
      mountedAssetId: report?.assetId ?? null,
      mountedObjects: report?.mountedObjects ?? 0,
      glbInstances: report?.glbInstances ?? 0,
      derivativeUrl: report?.derivativeUrl ?? null,
      verdict,
      detail:
        report?.detail ??
        (published.length === 0
          ? 'No published derivative declares this role.'
          : 'The runtime did not request this role in the current view.'),
    };
  });

  const unusedPublishedAssets = listAssets()
    .filter(
      (a: AssetManifestEntry) =>
        a.semanticRole != null && a.runtimePreferred !== false && !used.has(a.assetId),
    )
    .map((a) => a.assetId);

  return {
    rows,
    rolesDerived: rows.filter((r) => r.verdict === 'openusd-derived').length,
    rolesExpected: rows.filter((r) => r.publishedAssets > 0).length,
    mountedObjects: rows.reduce((n, r) => n + r.mountedObjects, 0),
    uniqueDerivatives: new Set(
      rows.filter((r) => r.mountedObjects > 0 && r.derivativeUrl).map((r) => r.derivativeUrl as string),
    ).size,
    unusedPublishedAssets,
  };
}

/** Standardised facility benchmark. Changing it invalidates comparison. */
export const FACILITY_BENCHMARK = {
  route: REFERENCE_FACILITY_ROUTE,
  qualityProfile: 'balanced' as const,
  viewport: { width: 1920, height: 1080 },
  devicePixelRatioCap: 1,
  stabilizationMs: 5_000,
  segments: [
    { id: 'fitFacility', preset: 'fitFacility' as CameraPresetId, label: 'Facility overview', durationMs: 6_000 },
    { id: 'frontAisles', preset: 'frontAisles' as CameraPresetId, label: 'Front aisles', durationMs: 6_000 },
    { id: 'rearInfrastructure', preset: 'rearInfrastructure' as CameraPresetId, label: 'Rear infrastructure', durationMs: 6_000 },
    { id: 'coolingTopology', preset: 'coolingTopology' as CameraPresetId, label: 'Cooling area', durationMs: 6_000 },
    { id: 'topDown', preset: 'topDown' as CameraPresetId, label: 'Top down', durationMs: 6_000 },
  ],
};

export const FACILITY_BENCHMARK_MS =
  FACILITY_BENCHMARK.stabilizationMs +
  FACILITY_BENCHMARK.segments.reduce((n, s) => n + s.durationMs, 0);

/** Acceptance thresholds for the standardised facility run. */
export const FACILITY_THRESHOLDS = {
  passAverageFps: 45,
  passOnePercentLowFps: 30,
  warnAverageFpsFloor: 30,
  maxMainThreadStallMs: 500,
};

export interface GuidedView {
  id: string;
  label: string;
  preset: CameraPresetId;
  instruction: string;
}

/** Guided visual inspection views. Each requires an explicit human verdict. */
export const GUIDED_VIEWS: GuidedView[] = [
  {
    id: 'overview',
    label: 'Facility overview',
    preset: 'fitFacility',
    instruction:
      'Rows, aisles and the cooling area read as one coherent hall. No floating or intersecting equipment.',
  },
  {
    id: 'front-aisle',
    label: 'Front aisle at eye level',
    preset: 'frontAisles',
    instruction:
      'Rack-mounted equipment sits inside the cabinet envelope, at plausible U positions, with no clipping through doors.',
  },
  {
    id: 'rear',
    label: 'Rear infrastructure',
    preset: 'rearInfrastructure',
    instruction:
      'PDUs, cabling and rear structure are oriented correctly; nothing faces backwards or is mirrored.',
  },
  {
    id: 'cooling',
    label: 'Liquid-cooling area',
    preset: 'coolingTopology',
    instruction:
      'Cooling equipment stands on the floor plane at a believable scale relative to the cabinets.',
  },
  {
    id: 'overhead',
    label: 'Overhead containment',
    preset: 'topDown',
    instruction:
      'Cable trays follow the rows, clear of the cabinets, without intersecting the ceiling frame.',
  },
];

export interface VisualCheck {
  id: string;
  label: string;
}

/** Visual realism criteria assessed by the operator on hardware. */
export const VISUAL_CHECKS: VisualCheck[] = [
  { id: 'scale', label: 'Scale and proportion are consistent across all mounted geometry' },
  { id: 'floor-contact', label: 'Every object contacts the floor or its mount, with no floating geometry' },
  { id: 'orientation', label: 'Front and rear orientation is correct for all equipment' },
  { id: 'intersections', label: 'No geometry intersects a cabinet, wall, floor or ceiling' },
  { id: 'materials', label: 'Materials read as metal/plastic under the facility lighting, not flat grey' },
  { id: 'z-fighting', label: 'No z-fighting, shadow acne or flickering surfaces during camera motion' },
  { id: 'overlap', label: 'Scene controls, legend and KPI chrome never obscure the inspected subject' },
  { id: 'legibility', label: 'Labels and annotations stay legible at 1920x1080' },
];

export type CheckVerdict = 'pass' | 'fail' | 'na';
