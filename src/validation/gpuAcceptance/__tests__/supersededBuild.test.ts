/**
 * The superseded 1.0.0-ops build must never resolve or mount. It is retained
 * only as audit history.
 */
import { describe, expect, it } from 'vitest';
import {
  getAsset,
  isSupersededChecksum,
  resolveByChecksum,
  resolveRuntimeAsset,
} from '@/components/twin-visualization/assetRegistry';
import { buildAssetExpectation, VALIDATION_ASSET_ID } from '../spec';

const SUPERSEDED_CHECKSUM =
  'sha256:f60ca0b53656fb501a6f27714f11e27dc66c2571cc24d45ee277408af3968f97';
const APPROVED_CHECKSUM =
  'sha256:2db61ead578559c2a5c2e98a0c75da31485b90445ed0d96118fc521bc83d0e46';

describe('superseded operations build', () => {
  it('is flagged as superseded and not runtime eligible', () => {
    const entry = getAsset('nvidia.rack.42u_a_01.ops@1.0.0');
    expect(entry).toBeDefined();
    expect(entry?.superseded).toBe(true);
    expect(entry?.runtimeEligible).toBe(false);
    expect(entry?.supersededBy).toBe(VALIDATION_ASSET_ID);
  });

  it('cannot resolve a loadable derivative', () => {
    const resolution = resolveRuntimeAsset('nvidia.rack.42u_a_01.ops@1.0.0');
    expect(resolution.glbUrl).toBeNull();
    expect(resolution.fallbackReason).toBe('build-superseded');
  });

  it('cannot mount through the approved asset id using the old checksum', () => {
    const resolution = resolveRuntimeAsset(VALIDATION_ASSET_ID, {
      expectedChecksum: SUPERSEDED_CHECKSUM,
    });
    expect(resolution.glbUrl).toBeNull();
    expect(resolution.fallbackReason).toBe('checksum-superseded');
  });

  it('is not resolvable by checksum lookup', () => {
    expect(isSupersededChecksum(SUPERSEDED_CHECKSUM)).toBe(true);
    expect(resolveByChecksum(SUPERSEDED_CHECKSUM)).toBeNull();
  });

  it('still resolves the approved build', () => {
    expect(resolveByChecksum(APPROVED_CHECKSUM)?.assetId).toBe(VALIDATION_ASSET_ID);
    const resolution = resolveRuntimeAsset(VALIDATION_ASSET_ID, {
      expectedChecksum: APPROVED_CHECKSUM,
    });
    expect(resolution.glbUrl).toContain('/__l5e/assets-v1/');
  });
});

describe('capability map', () => {
  it('advertises only parts proven addressable by validation evidence', () => {
    const expected = buildAssetExpectation();
    expect(expected).not.toBeNull();
    const parts = Object.fromEntries(
      expected!.addressableParts.map((p) => [p.id, p.addressable]),
    );
    expect(parts).toEqual({
      rack_core: true,
      rear_cooler_door: true,
      chilled_water_risers: true,
      front_door: false,
    });
  });

  it('carries the recorded derivative expectations', () => {
    const expected = buildAssetExpectation()!;
    expect(expected.checksum).toBe(APPROVED_CHECKSUM);
    expect(expected.triangleCount).toBe(133173);
    expect(expected.assetDrawCalls).toBe(6);
    expect(expected.bounds).toEqual({ x: 0.6035, y: 3.1663, z: 1.4215 });
    expect(expected.minY).toBe(0);
    expect(expected.frontAxis).toBe('+Z');
    expect(expected.textureCount).toBe(0);
    expect(expected.convertedMaterialCount).toBe(1);
  });
});