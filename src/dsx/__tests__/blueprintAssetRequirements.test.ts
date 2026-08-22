import { describe, expect, it } from 'vitest';
import {
  DSX_ASSET_REQUIREMENTS,
  DSX_RACK_BOM,
  dsxRequirementsForGate,
  hasCompleteDsxAssetCoverage,
  reconcileDsxAssetRequirements,
} from '../blueprintAssetRequirements';

const completeRackAssets = [
  'dsx-compute-tray',
  'dsx-nvlink-switch-tray',
  'dsx-power-shelf',
  'dsx-tor-oob-switch',
].map((semanticRole, index) => ({
  assetId: `asset-${index}`,
  semanticRole,
  approvalStatus: 'approved',
  runtimeEligible: true,
  glbUrl: `/assets/${index}.glb`,
  checksum: `sha256:${index}`,
  lastValidatedAt: '2026-08-22T00:00:00Z',
}));

describe('NVIDIA DSX blueprint asset requirements', () => {
  it('locks the public NVL72 rack BOM counts', () => {
    expect(DSX_RACK_BOM.computeTraysPerRack).toBe(18);
    expect(DSX_RACK_BOM.nvlinkSwitchTraysPerRack).toBe(9);
    expect(DSX_RACK_BOM.powerShelvesPerRack).toBe(8);
    expect(DSX_RACK_BOM.torOobSwitchesPerRack).toBe(2);
  });

  it('never allows generic substitution for generation-specific rack hardware', () => {
    const rack = dsxRequirementsForGate('rack');
    expect(rack).toHaveLength(4);
    expect(rack.every((requirement) => requirement.genericSubstitutionAllowed === false)).toBe(true);
    expect(rack.every((requirement) => requirement.exactVendorGeometryRequired === true)).toBe(true);
  });

  it('does not count current approximation roles as exact DSX coverage', () => {
    const approximations = [
      {
        assetId: 'generic-server',
        semanticRole: 'server-1u',
        approvalStatus: 'approved',
        runtimeEligible: true,
        glbUrl: '/server.glb',
        checksum: 'sha256:server',
        lastValidatedAt: '2026-08-22T00:00:00Z',
      },
      {
        assetId: 'generic-rpdu',
        semanticRole: 'rack-pdu',
        approvalStatus: 'approved',
        runtimeEligible: true,
        glbUrl: '/rpdu.glb',
        checksum: 'sha256:rpdu',
        lastValidatedAt: '2026-08-22T00:00:00Z',
      },
    ];
    const rows = reconcileDsxAssetRequirements(approximations, 'rack');
    expect(rows.every((row) => row.state === 'source-gated')).toBe(true);
    expect(hasCompleteDsxAssetCoverage(approximations, 'rack')).toBe(false);
  });

  it('requires full evidence before an exact role becomes runtime eligible', () => {
    const row = reconcileDsxAssetRequirements(
      [
        {
          assetId: 'compute-tray-source-only',
          semanticRole: 'dsx-compute-tray',
          approvalStatus: 'pending-review',
          runtimeEligible: false,
          glbUrl: null,
          checksum: null,
          lastValidatedAt: null,
        },
      ],
      'rack',
    ).find((entry) => entry.requirement.semanticRole === 'dsx-compute-tray');

    expect(row?.state).toBe('published-not-runtime-eligible');
  });

  it('can prove rack coverage only when every exact rack role is validated', () => {
    expect(hasCompleteDsxAssetCoverage(completeRackAssets, 'rack')).toBe(true);
  });

  it('locks the current facility and campus requirement breadth', () => {
    expect(dsxRequirementsForGate('facility')).toHaveLength(18);
    expect(dsxRequirementsForGate('full-reference')).toHaveLength(23);
    expect(DSX_ASSET_REQUIREMENTS.some((requirement) => requirement.semanticRole === 'dsx-crah')).toBe(true);
    expect(DSX_ASSET_REQUIREMENTS.some((requirement) => requirement.semanticRole === 'dsx-high-speed-storage')).toBe(true);
    expect(DSX_ASSET_REQUIREMENTS.some((requirement) => requirement.semanticRole === 'dsx-general-purpose-node')).toBe(true);
    expect(DSX_ASSET_REQUIREMENTS.some((requirement) => requirement.semanticRole === 'dsx-utility-cluster')).toBe(true);
    expect(DSX_ASSET_REQUIREMENTS.some((requirement) => requirement.semanticRole === 'dsx-dc-edge-cluster')).toBe(true);
    expect(DSX_ASSET_REQUIREMENTS.some((requirement) => requirement.semanticRole === 'dsx-grid-substation')).toBe(true);
    expect(DSX_ASSET_REQUIREMENTS.some((requirement) => requirement.semanticRole === 'dsx-central-utility-building')).toBe(true);
  });
});
