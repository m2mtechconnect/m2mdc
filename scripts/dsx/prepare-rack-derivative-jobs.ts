#!/usr/bin/env bun
/**
 * Prepare private derivative jobs for the four first-milestone DSX rack roles.
 *
 * This command performs evidence preflight only. It does not run Blender,
 * publish a derivative, update assets/manifest.json, or copy NVIDIA geometry
 * into the repository.
 *
 * Usage:
 *   bun scripts/dsx/prepare-rack-derivative-jobs.ts \
 *     <source-map.json> <extracted-pack-root> \
 *     [--output .dsx-private/jobs/rack-derivatives.json]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DSX_ASSET_REQUIREMENTS } from '../../src/dsx/blueprintAssetRequirements';
import { layoutForRackRole } from '../../src/dsx/rackLayout';
import type { DsxRackBomRole } from '../../src/dsx/rackBomValidation';
import {
  canPromoteDsxMappingToPublicRuntime,
  parseDsxSourceMap,
  summarizeDsxSourceMap,
} from '../../src/dsx/sourceMap';

const args = process.argv.slice(2);
const sourceMapPath = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : null;
const sourceRoot = args[1] && !args[1].startsWith('--') ? path.resolve(args[1]) : null;
if (!sourceMapPath || !sourceRoot) {
  console.error('Usage: bun scripts/dsx/prepare-rack-derivative-jobs.ts <source-map.json> <extracted-pack-root> [--output <jobs.json>]');
  process.exit(2);
}

function valueAfter(flag: string): string | null {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] ?? null : null;
}

const outputPath = path.resolve(
  valueAfter('--output') ?? path.join('.dsx-private', 'jobs', 'rack-derivatives.json'),
);

function sha256(file: string): string {
  return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

const sourceMap = parseDsxSourceMap(JSON.parse(fs.readFileSync(sourceMapPath, 'utf8')));
const summary = summarizeDsxSourceMap(sourceMap);
if (summary.rackVerified !== summary.rackRequired) {
  throw new Error(
    `DSX rack derivative preflight requires ${summary.rackRequired}/${summary.rackRequired} verified rack mappings; found ${summary.rackVerified}/${summary.rackRequired}.`,
  );
}

const rootStage = path.resolve(sourceRoot, sourceMap.sourcePack.expectedRootStage);
if (!inside(sourceRoot, rootStage) || !fs.existsSync(rootStage)) {
  throw new Error(`Expected DSX root stage is unavailable inside the private source root: ${rootStage}`);
}
const rootChecksum = sha256(rootStage);
if (rootChecksum !== sourceMap.sourcePack.rootStageChecksum) {
  throw new Error(
    `DSX source-pack root checksum mismatch: expected ${sourceMap.sourcePack.rootStageChecksum}, got ${rootChecksum}.`,
  );
}

const rackRequirements = DSX_ASSET_REQUIREMENTS.filter((requirement) => requirement.gates.includes('rack'));
const jobs = rackRequirements.map((requirement) => {
  const mapping = sourceMap.mappings.find(
    (entry) => entry.semanticRole === requirement.semanticRole,
  );
  if (!mapping || mapping.mappingStatus !== 'verified') {
    throw new Error(`Verified source mapping missing for ${requirement.semanticRole}.`);
  }
  if (!mapping.sourceUsdPath || !mapping.usdPrimPath || !mapping.sourceChecksum) {
    throw new Error(`Verified source mapping is incomplete for ${requirement.semanticRole}.`);
  }

  const sourceUsd = path.resolve(sourceRoot, mapping.sourceUsdPath);
  if (!inside(sourceRoot, sourceUsd)) {
    throw new Error(`Source path escapes the approved private root: ${mapping.sourceUsdPath}`);
  }
  if (!fs.existsSync(sourceUsd) || !fs.statSync(sourceUsd).isFile()) {
    throw new Error(`Mapped source USD is unavailable: ${sourceUsd}`);
  }
  const actualChecksum = sha256(sourceUsd);
  if (actualChecksum !== mapping.sourceChecksum) {
    throw new Error(
      `Source checksum mismatch for ${requirement.semanticRole}: expected ${mapping.sourceChecksum}, got ${actualChecksum}.`,
    );
  }

  const role = requirement.semanticRole as DsxRackBomRole;
  const jobKey = role.replace(/^dsx-/, '').replace(/[^a-z0-9]+/g, '_');
  const privateRoot = path.resolve('.dsx-private', 'derivatives', jobKey);
  return {
    requirementId: requirement.id,
    semanticRole: role,
    label: requirement.label,
    modelFamily: mapping.modelFamily,
    sourceUsd,
    sourceUsdRelative: mapping.sourceUsdPath,
    sourcePrimPath: mapping.usdPrimPath,
    sourceChecksum: mapping.sourceChecksum,
    sourcePackRootChecksum: sourceMap.sourcePack.rootStageChecksum,
    expectedInstancesPerRack: requirement.quantityPerGpuRack ?? layoutForRackRole(role).length,
    rackLayout: layoutForRackRole(role),
    wrapperUsd: path.join(privateRoot, `${jobKey}.source-wrapper.usda`),
    workdir: path.join(privateRoot, 'work'),
    outputDir: path.join(privateRoot, 'output'),
    conversionPipeline: {
      extractor: 'python3 scripts/dsx/extract-source-prim.py',
      blender: 'blender -b -P scripts/asset-ingestion/convert_pack_asset.py --',
      finisher: 'node scripts/asset-ingestion/finish_derivative.mjs',
      note: 'Quality budgets must be selected from measured source complexity; this preflight intentionally does not invent decimation targets.',
    },
    publicRuntimePromotionAllowed: canPromoteDsxMappingToPublicRuntime(sourceMap, mapping),
  };
});

const result = {
  generatedAt: new Date().toISOString(),
  sourceMapPath,
  sourceRoot,
  sourcePack: sourceMap.sourcePack,
  policy: {
    mode: 'PRIVATE_EVALUATION',
    geometryCopiedToRepository: false,
    manifestUpdated: false,
    publicRuntimePromotionAllowed: jobs.every((job) => job.publicRuntimePromotionAllowed),
    note: 'Job preparation proves source bytes and lineage only. Conversion and publication remain separate controlled steps.',
  },
  rackGate: {
    roles: jobs.length,
    expectedRoles: rackRequirements.length,
    expectedObjectsPerRack: jobs.reduce((sum, job) => sum + job.expectedInstancesPerRack, 0),
  },
  jobs,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);

console.log('DSX RACK DERIVATIVE PREFLIGHT PASS');
console.log(`roles=${jobs.length}/${rackRequirements.length}`);
console.log(`objectsPerRack=${result.rackGate.expectedObjectsPerRack}`);
console.log(`publicRuntimePromotionAllowed=${result.policy.publicRuntimePromotionAllowed}`);
console.log(`output=${outputPath}`);
console.log('No derivative was generated or published.');
