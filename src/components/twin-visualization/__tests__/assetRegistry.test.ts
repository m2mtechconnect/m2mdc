import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RACK_ASSET_ID,
  getAsset,
  hasApprovedDerivatives,
  resolveGlbDerivative,
  resolveRuntimeAsset,
} from '../assetRegistry';
import { CANARY_RACK_ASSET_ID, assetIdForRack, resolveCanaryRollout } from '../canaryRollout';

const root = resolve(__dirname, '../../../../');
const rackDir = resolve(root, 'assets/rack/generic_42u_rack');

describe('rack USD asset completeness', () => {
  const master = readFileSync(resolve(rackDir, 'generic_42u_rack.usda'), 'utf8');

  it('master references payloads that do not exist, so the asset is incomplete', () => {
    expect(master).toContain('payloads/');
    expect(existsSync(resolve(rackDir, 'payloads/external.usdc'))).toBe(false);
    expect(existsSync(resolve(rackDir, 'payloads/internal.usdc'))).toBe(false);
  });

  it('records the missing-payload blocker instead of claiming validation', () => {
    const data = JSON.parse(readFileSync(resolve(rackDir, 'data/manifest.json'), 'utf8'));
    expect(data.approvalStatus).toBe('blocked-missing-payloads');
    expect(data.runtimeEligible).toBe(false);
    expect(data.lastValidatedAt).toBeNull();
    expect(data.glbUrl).toBeNull();
    expect(data.blockers.map((b: { id: string }) => b.id)).toContain('missing-payloads');
    expect(existsSync(resolve(rackDir, 'web'))).toBe(false);
  });
});

describe('asset registry runtime gating', () => {
  it('blocked assets never resolve a derivative', () => {
    const r = resolveRuntimeAsset(RACK_ASSET_ID);
    expect(getAsset(RACK_ASSET_ID)?.approvalStatus).toBe('blocked-missing-payloads');
    expect(r.glbUrl).toBeNull();
    expect(r.fallbackReason).toBe('asset-not-approved');
    expect(resolveGlbDerivative(RACK_ASSET_ID)).toBeNull();
  });

  it('unknown assets fall back with an explicit reason', () => {
    expect(resolveRuntimeAsset('does.not.exist').fallbackReason).toBe('no-asset-assigned');
  });

  it('reports the approved NVIDIA derivative in the current manifest', () => {
    expect(hasApprovedDerivatives()).toBe(true);
  });

  it('quality profile can deliberately select the procedural fallback', () => {
    expect(resolveRuntimeAsset(RACK_ASSET_ID, { preferFallback: true }).fallbackReason).toBe(
      'quality-profile-selected-fallback',
    );
  });
});

describe('approved NVIDIA rack derivative', () => {
  const entry = getAsset(CANARY_RACK_ASSET_ID);

  it('is approved, runtime eligible, validated and checksummed', () => {
    expect(entry?.approvalStatus).toBe('approved');
    expect(entry?.runtimeEligible).toBe(true);
    expect(entry?.lastValidatedAt).toBeTruthy();
    expect(entry?.checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(entry?.glbUrl).toMatch(/\.glb$/);
  });

  it('resolves a loadable derivative with no fallback reason', () => {
    const r = resolveRuntimeAsset(CANARY_RACK_ASSET_ID);
    expect(r.glbUrl).toBe(entry?.glbUrl);
    expect(r.fallbackReason).toBeNull();
    expect(resolveGlbDerivative(CANARY_RACK_ASSET_ID)).toBe(entry?.glbUrl);
  });

  it('carries EIA-310 consistent footprint dimensions in metres', () => {
    expect(entry?.dimensionsMeters?.x).toBeCloseTo(0.6, 1);
    expect(entry?.dimensionsMeters?.z).toBeCloseTo(1.42, 2);
  });

  it('a checksum mismatch blocks the derivative', () => {
    const r = resolveRuntimeAsset(CANARY_RACK_ASSET_ID, { expectedChecksum: 'sha256:deadbeef' });
    expect(r.glbUrl).toBeNull();
    expect(r.fallbackReason).toBe('checksum-mismatch');
  });
});

describe('canary rollout compatibility gating', () => {
  const incompatible = [
    { id: 'R-01' },
    { id: 'R-02', cooling: { liquidCooled: true } },
    { id: 'R-03', cooling: { liquidCooled: true, rearDoorHeatExchanger: true } },
  ];
  const compatible = {
    id: 'R-09',
    cooling: { liquidCooled: true, rearDoorHeatExchanger: true, chilledWaterConnected: true },
  };

  it('never mounts the asset when no rack declares full compatibility', () => {
    const canary = resolveCanaryRollout(incompatible);
    expect(canary.enabled).toBe(false);
    expect(canary.reason).toBe('no-compatible-rack');
    expect(canary.adminPreviewOnly).toBe(true);
    expect(incompatible.map((r) => assetIdForRack(r.id, canary))).toEqual([
      RACK_ASSET_ID,
      RACK_ASSET_ID,
      RACK_ASSET_ID,
    ]);
  });

  it('does not infer compatibility from rack id or ordering', () => {
    const canary = resolveCanaryRollout([{ id: 'A-00' }, compatible]);
    expect(canary.rackId).toBe('R-09');
  });

  it('mounts the asset on exactly one compatible rack', () => {
    const racks = [...incompatible, compatible];
    const canary = resolveCanaryRollout(racks);
    const mounted = racks.filter((r) => assetIdForRack(r.id, canary) === CANARY_RACK_ASSET_ID);
    expect(mounted.map((r) => r.id)).toEqual(['R-09']);
  });

  it('ignores ?canaryRack for non-admins and for incompatible racks', () => {
    const racks = [...incompatible, compatible];
    const original = window.location.search;
    history.replaceState(null, '', '?canaryRack=R-01');
    try {
      expect(resolveCanaryRollout(racks, { isAdmin: true }).rackId).toBe('R-09');
      history.replaceState(null, '', '?canaryRack=R-09');
      expect(resolveCanaryRollout(racks, { isAdmin: false }).reason).toBe('compatible-rack');
      expect(resolveCanaryRollout(racks, { isAdmin: true }).reason).toBe('admin-override');
    } finally {
      history.replaceState(null, '', original || '/');
    }
  });

  it('rolls back to procedural geometry for every rack when disabled', () => {
    const canary = resolveCanaryRollout([compatible], {});
    const disabled = { ...canary, enabled: false, rackId: null };
    expect(assetIdForRack(compatible.id, disabled)).toBe(RACK_ASSET_ID);
  });
});
