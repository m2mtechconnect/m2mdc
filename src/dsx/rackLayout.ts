import type { DsxRackBomRole } from './rackBomValidation';

/** EIA rack-unit height in metres. */
export const RACK_UNIT_METERS = 0.04445;
export const DSX_RACK_UNITS = 48;

export interface DsxRackLayoutEntry {
  role: DsxRackBomRole;
  deviceIndex: number;
  rackUnit: number;
  label: string;
}

function numbered(
  role: DsxRackBomRole,
  label: string,
  startIndex: number,
  rackUnits: number[],
): DsxRackLayoutEntry[] {
  return rackUnits.map((rackUnit, offset) => ({
    role,
    deviceIndex: startIndex + offset,
    rackUnit,
    label: `${label} ${String(startIndex + offset).padStart(2, '0')}`,
  }));
}

/**
 * NVIDIA Mission Control GB200/GB300 48U rack position reference.
 * Infrastructure/empty positions are intentionally omitted from the exact-role
 * BOM because they are not one of the four first rack-gate device classes.
 */
export const DSX_RACK_LAYOUT_48U: readonly DsxRackLayoutEntry[] = [
  ...numbered('dsx-power-shelf', 'Power shelf', 1, [6, 7, 8, 9]),
  ...numbered('dsx-compute-tray', 'Compute tray', 1, [11, 12, 13, 14, 15, 16, 17, 18]),
  ...numbered('dsx-nvlink-switch-tray', 'NVLink switch tray', 1, [19, 20, 21, 22, 23, 24, 25, 26, 27]),
  ...numbered('dsx-compute-tray', 'Compute tray', 9, [28, 29, 30, 31, 32, 33, 34, 35, 36, 37]),
  ...numbered('dsx-power-shelf', 'Power shelf', 5, [39, 40, 41, 42]),
  ...numbered('dsx-tor-oob-switch', 'TOR/OOB switch', 1, [44, 45]),
] as const;

/** Bottom Y coordinate for a 1RU device normalized to floor-contact Y=0. */
export function rackUnitBottomY(rackUnit: number): number {
  if (!Number.isInteger(rackUnit) || rackUnit < 1 || rackUnit > DSX_RACK_UNITS) {
    throw new Error(`Rack unit must be an integer from 1 to ${DSX_RACK_UNITS}.`);
  }
  return (rackUnit - 1) * RACK_UNIT_METERS;
}

export function layoutForRackRole(role: DsxRackBomRole): DsxRackLayoutEntry[] {
  return DSX_RACK_LAYOUT_48U.filter((entry) => entry.role === role);
}
