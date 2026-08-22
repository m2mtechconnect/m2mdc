#!/usr/bin/env bun
/**
 * Convert a private DSX content-pack inventory into a validated candidate
 * source map. Unique filename candidates become `candidate`; ambiguous or
 * missing roles stay `unresolved`. No candidate is ever promoted to `verified`
 * because file-name matching cannot establish an exact USD prim mapping.
 *
 * Usage:
 *   bun scripts/dsx/build-source-map-from-inventory.ts \
 *     .dsx-private/inventory/dsx-content-pack-2.1.json \
 *     [--output .dsx-private/source-map/dsx-source-map.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DSX_ASSET_REQUIREMENTS } from '../../src/dsx/blueprintAssetRequirements';
import {
  DSX_SOURCE_MAP_VERSION,
  parseDsxSourceMap,
  summarizeDsxSourceMap,
} from '../../src/dsx/sourceMap';
import { NVIDIA_DSX_CONTENT_PACK } from '../../src/dsx/sourceCatalog';

const args = process.argv.slice(2);
const inventoryPath = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : null;
if (!inventoryPath) {
  console.error('Usage: bun scripts/dsx/build-source-map-from-inventory.ts <inventory.json> [--output <source-map.json>]');
  process.exit(2);
}

function valueAfter(flag: string): string | null {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] ?? null : null;
}

const outputPath = path.resolve(
  valueAfter('--output') ?? path.join('.dsx-private', 'source-map', 'dsx-source-map.json'),
);
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) as {
  generatedAt: string;
  source: { id: string; version: string; expectedRootStage: string; licence: string };
  rootStage: { sha256: string };
  candidateRoles: Record<
    string,
    {
      count: number;
      candidates: Array<{ path: string; sha256: string | null }>;
    }
  >;
};

if (inventory.source?.id !== NVIDIA_DSX_CONTENT_PACK.id) {
  throw new Error(`Unexpected DSX source id: ${inventory.source?.id ?? 'missing'}`);
}
if (inventory.source.version !== NVIDIA_DSX_CONTENT_PACK.version) {
  throw new Error(`Unexpected DSX source version: ${inventory.source.version}`);
}
if (inventory.source.expectedRootStage !== NVIDIA_DSX_CONTENT_PACK.expectedRootStage) {
  throw new Error(`Unexpected DSX root stage: ${inventory.source.expectedRootStage}`);
}

const mappings = DSX_ASSET_REQUIREMENTS.map((requirement) => {
  const candidates = inventory.candidateRoles?.[requirement.semanticRole]?.candidates ?? [];
  const unique = candidates.length === 1 ? candidates[0] : null;
  return {
    requirementId: requirement.id,
    semanticRole: requirement.semanticRole,
    mappingStatus: unique ? ('candidate' as const) : ('unresolved' as const),
    modelFamily: 'unknown' as const,
    sourceUsdPath: unique?.path ?? null,
    usdPrimPath: null,
    sourceChecksum: unique?.sha256 ?? null,
    evidenceSource: 'private-inventory' as const,
    notes:
      candidates.length === 0
        ? 'No filename candidate found. Inspect the composed DSX stage and referenced assets manually.'
        : candidates.length === 1
          ? 'Unique filename candidate from private inventory. Exact prim mapping still requires manual USD-stage inspection.'
          : `${candidates.length} filename candidates found. Mapping remains unresolved until an operator selects and verifies the exact source/prim.`,
  };
});

const sourceMap = parseDsxSourceMap({
  sourceMapVersion: DSX_SOURCE_MAP_VERSION,
  generatedAt: inventory.generatedAt,
  sourcePack: {
    id: NVIDIA_DSX_CONTENT_PACK.id,
    version: NVIDIA_DSX_CONTENT_PACK.version,
    expectedRootStage: NVIDIA_DSX_CONTENT_PACK.expectedRootStage,
    rootStageChecksum: inventory.rootStage.sha256,
    licenceLabel: NVIDIA_DSX_CONTENT_PACK.licenceLabel,
    productionRights: 'not-established',
    redistributionRights: 'not-established',
  },
  mappings,
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(sourceMap, null, 2)}\n`);

const summary = summarizeDsxSourceMap(sourceMap);
console.log('DSX SOURCE MAP DRAFT COMPLETE');
console.log(`candidate=${summary.candidate}`);
console.log(`unresolved=${summary.unresolved}`);
console.log(`verified=${summary.verified}`);
console.log(`rackVerified=${summary.rackVerified}/${summary.rackRequired}`);
console.log(`output=${outputPath}`);
console.log('No mapping was promoted to verified; exact USD prim review is still required.');
