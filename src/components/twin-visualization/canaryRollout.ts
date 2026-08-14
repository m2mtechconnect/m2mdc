/**
 * Canary rollout control for approved 3D derivatives.
 *
 * The NVIDIA-derived rack asset is mounted on exactly one rack instance until
 * the canary is promoted. Selection is deterministic and overridable from the
 * URL so an operator can reproduce or disable the canary without a rebuild:
 *
 *   ?assetCanary=off        - disable, every rack renders procedural geometry
 *   ?canaryRack=<rackId>    - move the canary onto a specific rack
 */

import { RACK_ASSET_ID } from './assetRegistry';

/** Approved, validated NVIDIA-derived rack asset. */
export const CANARY_RACK_ASSET_ID = 'nvidia.rack.42u_a_01';

export interface CanaryRolloutConfig {
  enabled: boolean;
  rackId: string | null;
}

function readParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/**
 * Resolve the canary target from the racks currently in the scene. The default
 * target is the lowest rack id, so the same rack is selected on every reload.
 */
export function resolveCanaryRollout(rackIds: string[]): CanaryRolloutConfig {
  const params = readParams();
  if (params.get('assetCanary') === 'off') return { enabled: false, rackId: null };

  const requested = params.get('canaryRack');
  if (requested && rackIds.includes(requested)) return { enabled: true, rackId: requested };

  const sorted = [...rackIds].sort((a, b) => a.localeCompare(b));
  return { enabled: true, rackId: sorted[0] ?? null };
}

/** Asset id a given rack instance must resolve at runtime. */
export function assetIdForRack(rackId: string, canary: CanaryRolloutConfig): string {
  return canary.enabled && canary.rackId === rackId ? CANARY_RACK_ASSET_ID : RACK_ASSET_ID;
}