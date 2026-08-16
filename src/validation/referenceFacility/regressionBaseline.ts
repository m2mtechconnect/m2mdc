/**
 * Reference-facility runtime regression baseline.
 *
 * These numbers are the verified live-host mount evidence for the NVIDIA
 * Reference Facility. They exist so a refactor cannot silently drop mounts:
 * a regression run reads the runtime coverage store and compares against
 * this floor. Nothing here is inferred from the manifest.
 *
 * Verified build: bmsv58pp8 (route /data-centre-twin?geometry=nvidia-reference).
 */

import type { RoleCoverage } from '@/components/twin-visualization/runtimeCoverageStore';
import type {
  FacilityFamily,
  FacilityFamilyState,
} from '@/components/twin-visualization/facilityDerivativeStore';

/** NVIDIA-derived objects, cabinets included (138 equipment + 40 cabinets). */
export const BASELINE_NVIDIA_OBJECTS = 178;
/** Cabinets that must mount an approved NVIDIA rack derivative. */
export const BASELINE_RACK_CABINETS = 40;
/** NVIDIA semantic roles that must report OpenUSD-derived geometry. */
export const BASELINE_NVIDIA_ROLES = 7;
/** AURA-authored OpenUSD facility families that must mount. */
export const BASELINE_FACILITY_FAMILIES: FacilityFamily[] = [
  'raised-floor-tile',
  'perforated-floor-tile',
  'data-hall-luminaire',
  'structural-column',
  'facility-shell',
];
/** AURA-authored OpenUSD-derived facility objects (instanced placements). */
export const BASELINE_AURA_FACILITY_OBJECTS = 916;

export interface RegressionInput {
  roles: Record<string, RoleCoverage>;
  rackMounts: Record<string, { mounted: boolean }>;
  families: Record<FacilityFamily, FacilityFamilyState>;
  /** True when the role's asset is an AURA-authored USD master. */
  isAuraAuthored: (assetId: string | null) => boolean;
}

export interface RegressionCheck {
  id: string;
  label: string;
  expected: number | string;
  actual: number | string;
  ok: boolean;
}

export interface RegressionResult {
  checks: RegressionCheck[];
  passed: boolean;
  nvidiaObjects: number;
  auraFacilityObjects: number;
  cabinetsMounted: number;
  nvidiaDerivedRoles: number;
  missingFamilies: FacilityFamily[];
}

/**
 * Compare live runtime evidence against the verified baseline. Counts above
 * the baseline pass (the facility may grow); counts below it fail.
 */
export function evaluateRuntimeRegression(input: RegressionInput): RegressionResult {
  const { roles, rackMounts, families, isAuraAuthored } = input;

  let nvidiaObjects = 0;
  let auraFacilityObjects = 0;
  let nvidiaDerivedRoles = 0;
  for (const role of Object.values(roles)) {
    if (role.mountedObjects <= 0) continue;
    if (isAuraAuthored(role.assetId)) {
      auraFacilityObjects += role.mountedObjects;
    } else {
      nvidiaObjects += role.mountedObjects;
      if (role.state === 'openusd-derived') nvidiaDerivedRoles += 1;
    }
  }

  const cabinetsMounted = Object.values(rackMounts).filter((r) => r.mounted).length;
  nvidiaObjects += cabinetsMounted;

  const missingFamilies = BASELINE_FACILITY_FAMILIES.filter((f) => families[f] !== 'mounted');

  const checks: RegressionCheck[] = [
    {
      id: 'nvidia-objects',
      label: 'NVIDIA OpenUSD-derived objects mounted',
      expected: `>= ${BASELINE_NVIDIA_OBJECTS}`,
      actual: nvidiaObjects,
      ok: nvidiaObjects >= BASELINE_NVIDIA_OBJECTS,
    },
    {
      id: 'rack-cabinets',
      label: 'Cabinets mounted from the approved NVIDIA rack derivative',
      expected: `>= ${BASELINE_RACK_CABINETS}`,
      actual: cabinetsMounted,
      ok: cabinetsMounted >= BASELINE_RACK_CABINETS,
    },
    {
      id: 'nvidia-roles',
      label: 'NVIDIA semantic roles reporting OpenUSD-derived geometry',
      expected: `>= ${BASELINE_NVIDIA_ROLES}`,
      actual: nvidiaDerivedRoles,
      ok: nvidiaDerivedRoles >= BASELINE_NVIDIA_ROLES,
    },
    {
      id: 'facility-families',
      label: 'AURA-authored OpenUSD facility families mounted',
      expected: BASELINE_FACILITY_FAMILIES.join(', '),
      actual: missingFamilies.length === 0 ? 'all mounted' : `missing: ${missingFamilies.join(', ')}`,
      ok: missingFamilies.length === 0,
    },
    {
      id: 'facility-objects',
      label: 'AURA OpenUSD-derived facility objects mounted',
      expected: `>= ${BASELINE_AURA_FACILITY_OBJECTS}`,
      actual: auraFacilityObjects,
      ok: auraFacilityObjects >= BASELINE_AURA_FACILITY_OBJECTS,
    },
  ];

  return {
    checks,
    passed: checks.every((c) => c.ok),
    nvidiaObjects,
    auraFacilityObjects,
    cabinetsMounted,
    nvidiaDerivedRoles,
    missingFamilies,
  };
}
