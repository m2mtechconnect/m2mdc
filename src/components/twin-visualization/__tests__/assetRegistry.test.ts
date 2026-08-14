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

  it('reports no approved derivatives in the current manifest', () => {
    expect(hasApprovedDerivatives()).toBe(false);
  });

  it('quality profile can deliberately select the procedural fallback', () => {
    expect(resolveRuntimeAsset(RACK_ASSET_ID, { preferFallback: true }).fallbackReason).toBe(
      'quality-profile-selected-fallback',
    );
  });
});
