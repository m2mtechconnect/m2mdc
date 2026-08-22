import { describe, expect, it } from 'vitest';
import { DSX_ASSET_REQUIREMENTS } from '../blueprintAssetRequirements';
import { NVIDIA_DSX_CONTENT_PACK } from '../sourceCatalog';
import {
  DSX_SOURCE_MAP_VERSION,
  canPromoteDsxMappingToPublicRuntime,
  parseDsxSourceMap,
  summarizeDsxSourceMap,
} from '../sourceMap';

function unresolvedSourceMap() {
  return {
    sourceMapVersion: DSX_SOURCE_MAP_VERSION,
    generatedAt: '2026-08-22T13:30:00.000Z',
    sourcePack: {
      id: NVIDIA_DSX_CONTENT_PACK.id,
      version: NVIDIA_DSX_CONTENT_PACK.version,
      expectedRootStage: NVIDIA_DSX_CONTENT_PACK.expectedRootStage,
      rootStageChecksum: null,
      licenceLabel: NVIDIA_DSX_CONTENT_PACK.licenceLabel,
      productionRights: 'not-established' as const,
      redistributionRights: 'not-established' as const,
    },
    mappings: DSX_ASSET_REQUIREMENTS.map((requirement) => ({
      requirementId: requirement.id,
      semanticRole: requirement.semanticRole,
      mappingStatus: 'unresolved' as const,
      modelFamily: 'unknown' as const,
      sourceUsdPath: null,
      usdPrimPath: null,
      sourceChecksum: null,
      evidenceSource: 'private-inventory' as const,
      notes: 'Awaiting authorized private content-pack inventory.',
    })),
  };
}

function verifyFirstMapping(map: ReturnType<typeof unresolvedSourceMap>) {
  map.sourcePack.rootStageChecksum = `sha256:${'a'.repeat(64)}`;
  map.mappings[0] = {
    ...map.mappings[0],
    mappingStatus: 'verified',
    modelFamily: 'GB300',
    sourceUsdPath: 'DSX_BP/private/compute-tray.usd',
    usdPrimPath: '/DSX/Private/ComputeTray',
    sourceChecksum: `sha256:${'b'.repeat(64)}`,
    evidenceSource: 'private-inventory',
  };
}

describe('DSX source-map contract', () => {
  it('accepts a complete unresolved map without inventing source paths', () => {
    const parsed = parseDsxSourceMap(unresolvedSourceMap());
    expect(parsed.mappings).toHaveLength(23);
    const summary = summarizeDsxSourceMap(parsed);
    expect(summary.unresolved).toBe(23);
    expect(summary.verified).toBe(0);
    expect(summary.rackVerified).toBe(0);
    expect(summary.rackRequired).toBe(4);
  });

  it('requires every DSX requirement to have exactly one source-map entry', () => {
    const map = unresolvedSourceMap();
    map.mappings.pop();
    expect(() => parseDsxSourceMap(map)).toThrow(/Missing DSX source-map entry/);
  });

  it('rejects duplicate exact-role mappings', () => {
    const map = unresolvedSourceMap();
    map.mappings.push({ ...map.mappings[0] });
    expect(() => parseDsxSourceMap(map)).toThrow(/Duplicate/);
  });

  it('does not allow unresolved mappings to carry guessed paths', () => {
    const map = unresolvedSourceMap();
    map.mappings[0] = {
      ...map.mappings[0],
      sourceUsdPath: 'DSX_BP/guessed.usd',
    };
    expect(() => parseDsxSourceMap(map)).toThrow(/must not carry guessed/);
  });

  it('requires exact path, prim and checksum before a mapping is verified', () => {
    const map = unresolvedSourceMap();
    map.sourcePack.rootStageChecksum = `sha256:${'a'.repeat(64)}`;
    map.mappings[0] = {
      ...map.mappings[0],
      mappingStatus: 'verified',
      modelFamily: 'GB300',
      evidenceSource: 'private-inventory',
    };
    expect(() => parseDsxSourceMap(map)).toThrow(/Verified mapping requires/);
  });

  it('rejects public application code as sole evidence for a verified proprietary prim mapping', () => {
    const map = unresolvedSourceMap();
    map.sourcePack.rootStageChecksum = `sha256:${'a'.repeat(64)}`;
    map.mappings[0] = {
      ...map.mappings[0],
      mappingStatus: 'verified',
      modelFamily: 'GB300',
      sourceUsdPath: 'DSX_BP/Assets/ComputeTray.usd',
      usdPrimPath: '/World/ComputeTray',
      sourceChecksum: `sha256:${'b'.repeat(64)}`,
      evidenceSource: 'public-blueprint-code',
    };
    expect(() => parseDsxSourceMap(map)).toThrow(/cannot verify a proprietary USD/);
  });

  it('summarizes a fully verified rack independently from unresolved facility roles', () => {
    const map = unresolvedSourceMap();
    map.sourcePack.rootStageChecksum = `sha256:${'a'.repeat(64)}`;
    const rackRoles = new Set(
      DSX_ASSET_REQUIREMENTS.filter((requirement) => requirement.gates.includes('rack')).map(
        (requirement) => requirement.semanticRole,
      ),
    );
    map.mappings = map.mappings.map((mapping, index) =>
      rackRoles.has(mapping.semanticRole)
        ? {
            ...mapping,
            mappingStatus: 'verified' as const,
            modelFamily: 'GB300' as const,
            sourceUsdPath: `DSX_BP/private/${index}.usd`,
            usdPrimPath: `/DSX/Private/Asset_${index}`,
            sourceChecksum: `sha256:${String(index + 1).padStart(64, '0')}`,
            evidenceSource: 'private-inventory' as const,
          }
        : mapping,
    );
    const summary = summarizeDsxSourceMap(parseDsxSourceMap(map));
    expect(summary.rackVerified).toBe(4);
    expect(summary.rackRequired).toBe(4);
    expect(summary.allMappingsVerified).toBe(false);
    expect(summary.productionRightsEstablished).toBe(false);
  });

  it('allows private verification without granting public runtime promotion', () => {
    const map = unresolvedSourceMap();
    verifyFirstMapping(map);
    const parsed = parseDsxSourceMap(map);
    expect(canPromoteDsxMappingToPublicRuntime(parsed, parsed.mappings[0])).toBe(false);
  });

  it('requires both production and redistribution approval for public runtime promotion', () => {
    const map = unresolvedSourceMap();
    verifyFirstMapping(map);
    map.sourcePack.productionRights = 'approved';
    const productionOnly = parseDsxSourceMap(map);
    expect(canPromoteDsxMappingToPublicRuntime(productionOnly, productionOnly.mappings[0])).toBe(false);

    map.sourcePack.redistributionRights = 'approved';
    const fullyApproved = parseDsxSourceMap(map);
    expect(canPromoteDsxMappingToPublicRuntime(fullyApproved, fullyApproved.mappings[0])).toBe(true);
  });
});