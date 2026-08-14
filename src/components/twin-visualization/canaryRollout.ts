/**
 * Canary rollout control for approved 3D derivatives.
 *
 * The NVIDIA-derived rack asset (`Rack_42U_A_01`) is a liquid-cooled cabinet
 * with a rear-door heat exchanger and chilled-water risers. It may therefore
 * only be mounted on a rack whose DOMAIN DATA explicitly declares the matching
 * cooling capability. Position, row, utilisation and rack id are NOT
 * compatibility signals and must never be used to infer one.
 *
 * When the facility dataset contains no compatible rack, the asset is not
 * mounted in the facility at all - it is only available in the Admin Asset
 * Preview, labelled as unassigned.
 *
 * URL controls (authenticated admin/developer only):
 *   ?assetCanary=off        - disable the canary entirely
 *   ?canaryRack=<rackId>    - move the canary onto a specific COMPATIBLE rack
 */

import { RACK_ASSET_ID } from './assetRegistry';

/** Approved, validated NVIDIA-derived rack asset. */
export const CANARY_RACK_ASSET_ID = 'nvidia.rack.42u_a_01';

/** Explicit cooling capability declared by the facility dataset. */
export interface RackCoolingCapability {
  liquidCooled?: boolean;
  rearDoorHeatExchanger?: boolean;
  chilledWaterConnected?: boolean;
}

export interface CanaryCandidate {
  id: string;
  cooling?: RackCoolingCapability | null;
}

export type CanarySelectionReason =
  | 'disabled-by-url'
  | 'admin-override'
  | 'compatible-rack'
  | 'no-compatible-rack';

export interface CanaryRolloutConfig {
  enabled: boolean;
  rackId: string | null;
  reason: CanarySelectionReason;
  /** True when the asset may only be shown in the Admin Asset Preview. */
  adminPreviewOnly: boolean;
  /** Ids of racks whose domain data declares full compatibility. */
  compatibleRackIds: string[];
}

/**
 * A rack is compatible only when all three capabilities are explicitly true in
 * the dataset. Missing or unknown capability is treated as incompatible.
 */
export function isCanaryCompatible(rack: CanaryCandidate): boolean {
  const c = rack.cooling;
  return (
    c?.liquidCooled === true &&
    c?.rearDoorHeatExchanger === true &&
    c?.chilledWaterConnected === true
  );
}

function readParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function resolveCanaryRollout(
  racks: CanaryCandidate[],
  options: { isAdmin?: boolean } = {},
): CanaryRolloutConfig {
  const compatibleRackIds = racks.filter(isCanaryCompatible).map((r) => r.id).sort((a, b) => a.localeCompare(b));
  const none = (reason: CanarySelectionReason): CanaryRolloutConfig => ({
    enabled: false,
    rackId: null,
    reason,
    adminPreviewOnly: reason === 'no-compatible-rack',
    compatibleRackIds,
  });

  const params = readParams();
  if (params.get('assetCanary') === 'off') return none('disabled-by-url');

  // The override is a testing affordance for authenticated admins/developers
  // and can still only target a rack the dataset says is compatible.
  const requested = options.isAdmin ? params.get('canaryRack') : null;
  if (requested && compatibleRackIds.includes(requested)) {
    return { enabled: true, rackId: requested, reason: 'admin-override', adminPreviewOnly: false, compatibleRackIds };
  }

  if (compatibleRackIds.length === 0) return none('no-compatible-rack');

  return {
    enabled: true,
    rackId: compatibleRackIds[0],
    reason: 'compatible-rack',
    adminPreviewOnly: false,
    compatibleRackIds,
  };
}

/** Asset id a given rack instance must resolve at runtime. */
export function assetIdForRack(rackId: string, canary: CanaryRolloutConfig): string {
  return canary.enabled && canary.rackId === rackId ? CANARY_RACK_ASSET_ID : RACK_ASSET_ID;
}
