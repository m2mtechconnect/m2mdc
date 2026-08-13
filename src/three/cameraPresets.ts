/**
 * Camera presets for digital-twin navigation.
 *
 * Each preset returns a spherical placement (distance / azimuth / polar) plus
 * a look-at target, so the existing spherical camera controller can consume it
 * without changing its interaction model.
 */

export type CameraPresetId =
  | 'fitFacility'
  | 'fitSelection'
  | 'rackFront'
  | 'rackRear'
  | 'topDown'
  | 'powerTopology'
  | 'coolingTopology'
  | 'frontAisles'
  | 'rearInfrastructure'
  | 'reset';

export interface CameraPlacement {
  /** Distance from the look-at target, in metres. */
  distance: number;
  /** Azimuth angle in radians. */
  theta: number;
  /** Polar angle in radians (0 = straight above). */
  phi: number;
  target: [number, number, number];
}

export interface FacilityBounds {
  centre: [number, number, number];
  /** Radius of the bounding sphere around all facility geometry, in metres. */
  radius: number;
}

export const CAMERA_PRESET_LABELS: Record<CameraPresetId, string> = {
  fitFacility: 'Fit facility',
  fitSelection: 'Fit selection',
  rackFront: 'Front rack view',
  rackRear: 'Rear rack view',
  topDown: 'Top down',
  powerTopology: 'Power topology',
  coolingTopology: 'Cooling topology',
  frontAisles: 'Front aisles',
  rearInfrastructure: 'Rear infrastructure',
  reset: 'Reset camera',
};

const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 220;

function clampDistance(d: number) {
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d));
}

/**
 * Resolve a preset into a camera placement.
 *
 * `selection` is the world position of the selected asset, when one exists.
 * Presets that need a selection fall back to the facility fit so the camera
 * never lands inside geometry.
 */
export function resolveCameraPreset(
  preset: CameraPresetId,
  bounds: FacilityBounds,
  selection?: [number, number, number],
): CameraPlacement {
  // 40 degree vertical FOV. A 0.62 fill factor keeps every row inside the
  // frame while removing the empty foreground the previous fit produced.
  const facility: CameraPlacement = {
    distance: clampDistance((bounds.radius * 0.5) / Math.tan((40 * Math.PI) / 180 / 2)),
    theta: 0.55,
    phi: 1.12,
    target: [bounds.centre[0], bounds.centre[1] + 0.5, bounds.centre[2]],
  };

  switch (preset) {
    case 'fitFacility':
    case 'reset':
      return facility;

    case 'fitSelection':
      if (!selection) return facility;
      return { distance: clampDistance(4.5), theta: 0.5, phi: 1.15, target: selection };

    case 'rackFront':
      if (!selection) return facility;
      return { distance: clampDistance(3.2), theta: Math.PI / 2, phi: 1.45, target: selection };

    case 'rackRear':
      if (!selection) return facility;
      return { distance: clampDistance(3.2), theta: -Math.PI / 2, phi: 1.45, target: selection };

    case 'frontAisles':
      return {
        distance: clampDistance(bounds.radius * 0.85),
        theta: Math.PI / 2,
        phi: 1.35,
        target: [bounds.centre[0], 1.2, bounds.centre[2]],
      };

    case 'rearInfrastructure':
      return {
        distance: clampDistance(bounds.radius * 0.95),
        theta: -Math.PI / 2,
        phi: 1.25,
        target: [bounds.centre[0], 1.6, bounds.centre[2]],
      };

    case 'topDown':
      return { distance: clampDistance(bounds.radius * 1.9), theta: 0.001, phi: 0.05, target: bounds.centre };

    case 'powerTopology':
      return { distance: clampDistance(bounds.radius * 1.7), theta: 2.2, phi: 0.7, target: bounds.centre };

    case 'coolingTopology':
      return { distance: clampDistance(bounds.radius * 1.7), theta: -0.9, phi: 0.75, target: bounds.centre };

    default:
      return facility;
  }
}

/** Compute a bounding sphere from rack world positions. */
export function facilityBoundsFromPositions(
  positions: Array<[number, number, number]>,
): FacilityBounds {
  if (positions.length === 0) {
    return { centre: [0, 1, 0], radius: 8 };
  }
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, , z] of positions) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const halfX = (maxX - minX) / 2 + 2;
  const halfZ = (maxZ - minZ) / 2 + 2;
  return {
    centre: [cx, 1.1, cz],
    radius: Math.max(6, Math.hypot(halfX, halfZ)),
  };
}