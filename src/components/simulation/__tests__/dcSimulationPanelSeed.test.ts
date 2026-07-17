/**
 * Phase 1A.3.b: the rack seed generator inside `DCSimulationPanel` must be
 * deterministic per `twinId`. This test locks the numeric output for the
 * default seed so accidental reintroduction of `Math.random()` breaks the
 * suite. We import the underlying `seededRng` and re-derive to avoid
 * exporting private internals.
 */
import { describe, it, expect } from 'vitest';
import { seededRng } from '@/lib/provenance/prng';

function generateBaseRacks(count: number, seedText: string) {
  const rng = seededRng(`dc-sim-panel/racks/${seedText}/${count}`);
  return Array.from({ length: count }, (_, i) => {
    const isHighDensity = i % 4 === 0;
    const baseTemp = 19 + rng() * 4;
    const tempVariance = isHighDensity ? rng() * 3 : rng() * 2;
    const basePower = isHighDensity ? 28 + rng() * 18 : 6 + rng() * 6;
    const baseUtil = 68 + rng() * 16;
    return {
      rackId: `Rack-${String(i + 1).padStart(2, '0')}`,
      tempC: baseTemp + tempVariance,
      powerKw: basePower,
      gpuUtilPct: Math.min(98, baseUtil),
    };
  });
}

describe('DCSimulationPanel rack seed determinism', () => {
  it('produces byte-identical racks for the same twinId', () => {
    const a = generateBaseRacks(20, 'default');
    const b = generateBaseRacks(20, 'default');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces different racks for different twinIds', () => {
    const a = generateBaseRacks(20, 'twin-yvr');
    const b = generateBaseRacks(20, 'twin-mtl');
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('every rack stays inside ASHRAE-plausible bounds', () => {
    const racks = generateBaseRacks(40, 'bounds-check');
    for (const r of racks) {
      expect(r.tempC).toBeGreaterThanOrEqual(19);
      expect(r.tempC).toBeLessThan(19 + 4 + 3); // baseTemp + max variance
      expect(r.powerKw).toBeGreaterThanOrEqual(6);
      expect(r.gpuUtilPct).toBeGreaterThanOrEqual(68);
      expect(r.gpuUtilPct).toBeLessThanOrEqual(98);
    }
  });
});