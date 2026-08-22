import { describe, expect, it } from 'vitest';
import {
  DSX_RACK_LAYOUT_48U,
  DSX_RACK_UNITS,
  RACK_UNIT_METERS,
  layoutForRackRole,
  rackUnitBottomY,
} from '../rackLayout';

describe('NVIDIA GB200/GB300 48U rack layout', () => {
  it('contains the exact 18/9/8/2 first-milestone device positions', () => {
    expect(layoutForRackRole('dsx-compute-tray').map((entry) => entry.rackUnit)).toEqual([
      11, 12, 13, 14, 15, 16, 17, 18,
      28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
    ]);
    expect(layoutForRackRole('dsx-nvlink-switch-tray').map((entry) => entry.rackUnit)).toEqual([
      19, 20, 21, 22, 23, 24, 25, 26, 27,
    ]);
    expect(layoutForRackRole('dsx-power-shelf').map((entry) => entry.rackUnit)).toEqual([
      6, 7, 8, 9, 39, 40, 41, 42,
    ]);
    expect(layoutForRackRole('dsx-tor-oob-switch').map((entry) => entry.rackUnit)).toEqual([44, 45]);
    expect(DSX_RACK_LAYOUT_48U).toHaveLength(37);
  });

  it('uses a 48U rack and standard 44.45 mm rack-unit pitch', () => {
    expect(DSX_RACK_UNITS).toBe(48);
    expect(RACK_UNIT_METERS).toBe(0.04445);
    expect(rackUnitBottomY(1)).toBe(0);
    expect(rackUnitBottomY(48)).toBeCloseTo(47 * 0.04445, 10);
  });

  it('rejects invalid rack positions', () => {
    expect(() => rackUnitBottomY(0)).toThrow(/1 to 48/);
    expect(() => rackUnitBottomY(49)).toThrow(/1 to 48/);
    expect(() => rackUnitBottomY(1.5)).toThrow(/1 to 48/);
  });
});
