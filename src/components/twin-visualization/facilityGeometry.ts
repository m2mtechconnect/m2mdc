/**
 * Facility geometry modes.
 *
 * AURA renders the same operational data through two geometry sources:
 *
 *  - `aura-model`      the modelled facility exactly as configured. Cabinets
 *                      are AURA procedural geometry unless an approved
 *                      derivative is assigned to that specific rack.
 *  - `nvidia-reference` a reference facility built from NVIDIA Data Center
 *                      OpenUSD derivatives wherever an approved derivative
 *                      resolves for the semantic role.
 *
 * The mode never changes operational data. It only changes which geometry is
 * mounted, and the UI must always report which roles actually resolved.
 */

import {
  SEMANTIC_ROLE_LABEL,
  resolveRoleAsset,
  type QualityLevel,
  type SemanticRole,
} from './assetRegistry';

export type FacilityGeometryMode = 'aura-model' | 'nvidia-reference';

export const FACILITY_GEOMETRY_MODES: Array<{
  id: FacilityGeometryMode;
  label: string;
  description: string;
}> = [
  {
    id: 'aura-model',
    label: 'Baseline preview',
    description:
      'The facility exactly as modelled. AURA procedural cabinets unless an approved derivative is assigned to that rack.',
  },
  {
    id: 'nvidia-reference',
    label: 'NVIDIA Reference Facility',
    description:
      'Reference geometry built from approved NVIDIA Data Center OpenUSD derivatives. Roles without an approved derivative stay procedural.',
  },
];

export function isFacilityGeometryMode(value: unknown): value is FacilityGeometryMode {
  return value === 'aura-model' || value === 'nvidia-reference';
}

/** Roles the reference facility wants to mount, in reporting order. */
const REFERENCE_ROLES: SemanticRole[] = [
  'rack-core-reference',
  'liquid-cooled-rack',
  'server-1u',
  'server-2u',
  'network-switch',
  'rack-pdu',
  'liquid-cooling-equipment',
  'cable-tray',
  'blanking-panel',
];

export interface ReferenceCoverageRow {
  role: SemanticRole;
  label: string;
  assetId: string | null;
  quality: QualityLevel | null;
  resolved: boolean;
}

/**
 * Roles the reference facility mounts, in reporting order. Exported so the
 * runtime coverage report can enumerate the same set the resolver uses.
 */
export function referenceRoles(): SemanticRole[] {
  return [...REFERENCE_ROLES];
}

/**
 * True when at least one role can actually mount an approved derivative. The
 * selector must never offer a "Reference Facility" that is 100% procedural
 * without saying so.
 */
export function referenceFacilityAvailable(): boolean {
  return referenceFacilityCoverage().some((r) => r.resolved);
}

/** Honest per-role report of what the reference facility can actually mount. */
export function referenceFacilityCoverage(): ReferenceCoverageRow[] {
  return REFERENCE_ROLES.map((role) => {
    const match = resolveRoleAsset(role);
    return {
      role,
      label: SEMANTIC_ROLE_LABEL[role],
      assetId: match?.entry.assetId ?? null,
      quality: match?.quality ?? null,
      resolved: match != null,
    };
  });
}

/**
 * Rack geometry the reference facility mounts for every cabinet, or null when
 * no approved rack derivative resolves (the scene then stays procedural).
 */
export function referenceRackAssetId(): string | null {
  const core = resolveRoleAsset('rack-core-reference');
  if (core) return core.entry.assetId;
  const liquid = resolveRoleAsset('liquid-cooled-rack');
  return liquid?.entry.assetId ?? null;
}

/** Summary string for badges: "3 of 9 roles mounted from approved derivatives". */
export function referenceCoverageSummary(): { mounted: number; total: number; label: string } {
  const rows = referenceFacilityCoverage();
  const mounted = rows.filter((r) => r.resolved).length;
  return {
    mounted,
    total: rows.length,
    label: `${mounted} of ${rows.length} roles mounted from approved NVIDIA derivatives`,
  };
}
