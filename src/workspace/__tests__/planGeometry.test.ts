/**
 * Stage 7F - the floor plan geometry must be derived from the measured
 * container, never from fixed canvas dimensions.
 */
import { describe, expect, it } from 'vitest';
import { computePlanGeometry } from '../FacilityFloorPlan';

const DESKTOPS: Array<[number, number]> = [
  [1454, 470],
  [1366, 444],
  [1292, 440],
  [958, 336],
];

describe('computePlanGeometry', () => {
  it('fills at least 75% of the canvas width on desktop containers', () => {
    for (const [w, h] of DESKTOPS) {
      const g = computePlanGeometry(w, h, 8, 5);
      const drawnBank = g.bankW * Math.min(g.fitScale, 1);
      expect(drawnBank / w, `${w}x${h} occupancy`).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('fills at least 75% of the canvas height on desktop containers', () => {
    for (const [w, h] of DESKTOPS) {
      for (const rows of [3, 5]) {
        const g = computePlanGeometry(w, h, 8, rows);
        const drawnHeight = g.contentH * Math.min(g.fitScale, 1);
        expect(drawnHeight / h, `${w}x${h} rows=${rows} height occupancy`).toBeGreaterThanOrEqual(0.75);
      }
    }
  });

  it('never needs to scale the plan down to fit the height', () => {
    for (const [w, h] of DESKTOPS) {
      const g = computePlanGeometry(w, h, 8, 5);
      expect(g.fitScale, `${w}x${h} fit scale`).toBeGreaterThanOrEqual(0.999);
    }
  });

  it('keeps rack footprints readable rather than collapsing them on mobile', () => {
    const g = computePlanGeometry(340, 316, 8, 5);
    expect(g.rackW).toBeGreaterThanOrEqual(68);
    // The bank overflows a phone canvas by design: the viewport pans.
    expect(g.bankW).toBeGreaterThan(340);
  });

  it('recomputes when the container narrows, without distorting racks', () => {
    const wide = computePlanGeometry(1366, 444, 8, 5);
    const narrow = computePlanGeometry(946, 444, 8, 5);
    expect(narrow.rackW).toBeLessThan(wide.rackW);
    expect(narrow.rackH / narrow.rackW).toBeLessThanOrEqual(1);
    expect(narrow.rackH).toBeGreaterThanOrEqual(34);
  });
});
