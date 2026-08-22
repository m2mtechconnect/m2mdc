#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const fail = (message) => {
  console.error(`DSX ASSET VERIFY FAIL: ${message}`);
  process.exitCode = 1;
};

const manifest = readJson('assets/manifest.json');
const bindings = readJson('assets/facility/aura_reference_hall/semantic_bindings.json');
const byId = new Map(manifest.assets.map((asset) => [asset.assetId, asset]));

const expectedBindings = [
  ['aura.floor.standard_tile_600.operations', 'raised-floor-tile'],
  ['aura.floor.perforated_tile_600.operations', 'perforated-floor-tile'],
  ['aura.lighting.linear_luminaire_1500.operations', 'data-hall-luminaire'],
  ['aura.structural.column_400.operations', 'structural-column'],
  ['aura.shell.facility_shell.operations', 'facility-shell'],
];

const staleAssetIds = new Set([
  'aura.floor.standard_tile_600',
  'aura.lighting.linear_luminaire_1500',
  'aura.structural.column_400',
  'aura.shell.facility_shell',
]);

for (const binding of bindings.bindings) {
  if (staleAssetIds.has(binding.auraAssetId)) {
    fail(`stale semantic binding ${binding.auraAssetId}`);
  }
  if (typeof binding.note === 'string' && binding.note.includes('No browser derivative published yet')) {
    fail(`stale no-derivative note on ${binding.auraAssetId}`);
  }
}

for (const [assetId, role] of expectedBindings) {
  const asset = byId.get(assetId);
  if (!asset) {
    fail(`approved facility derivative missing from manifest: ${assetId}`);
    continue;
  }
  if (
    asset.approvalStatus !== 'approved' ||
    asset.runtimeEligible !== true ||
    typeof asset.glbUrl !== 'string' ||
    !asset.glbUrl.endsWith('.glb') ||
    typeof asset.checksum !== 'string' ||
    !asset.checksum ||
    typeof asset.lastValidatedAt !== 'string' ||
    !asset.lastValidatedAt
  ) {
    fail(`facility derivative no longer satisfies recorded runtime evidence: ${assetId}`);
  }

  const binding = bindings.bindings.find(
    (entry) => entry.auraAssetId === assetId && entry.semanticRole === role,
  );
  if (!binding) {
    fail(`canonical semantic binding missing: ${assetId} -> ${role}`);
    continue;
  }
  if (binding.derivativeChecksum !== asset.checksum) {
    fail(`derivative checksum drift for ${assetId}`);
  }
  const usdMaster = asset.provenance?.usdMasterSha256 ?? null;
  if (usdMaster && binding.sourceChecksum !== usdMaster) {
    fail(`USD master checksum drift for ${assetId}`);
  }
}

const requirementsSource = fs.readFileSync(
  path.join(root, 'src/dsx/blueprintAssetRequirements.ts'),
  'utf8',
);
const exactDsxRoles = [
  ...requirementsSource.matchAll(/semanticRole:\s*'(dsx-[^']+)'/g),
].map((match) => match[1]);
const exactRoleSet = new Set(exactDsxRoles);
if (exactDsxRoles.length === 0) fail('no exact DSX semantic roles found in requirement catalogue');
if (exactRoleSet.size !== exactDsxRoles.length) fail('duplicate exact DSX semantic role in requirement catalogue');

for (const asset of manifest.assets) {
  if (!exactRoleSet.has(asset.semanticRole)) continue;

  // Once an exact DSX role is introduced, it cannot be runtime-eligible on a
  // partial evidence record. This is a truth invariant, not a completeness
  // assertion: source-gated roles are allowed to remain absent.
  if (asset.runtimeEligible === true) {
    if (
      asset.approvalStatus !== 'approved' ||
      typeof asset.glbUrl !== 'string' ||
      !asset.glbUrl.endsWith('.glb') ||
      typeof asset.checksum !== 'string' ||
      !asset.checksum ||
      typeof asset.lastValidatedAt !== 'string' ||
      !asset.lastValidatedAt
    ) {
      fail(`runtime-eligible DSX role lacks complete evidence: ${asset.assetId}`);
    }
  }
}

const generator = fs.readFileSync(
  path.join(root, 'scripts/asset-ingestion/author_aura_facility_stage.py'),
  'utf8',
);
const semantics = fs.readFileSync(
  path.join(root, 'assets/facility/aura_reference_hall/layers/semantic_bindings.usda'),
  'utf8',
);
const truthStatement =
  'Alignment target: NVIDIA DSX Reference Designs. Asset presence does not imply SimReady or DSX runtime validation.';
if (!generator.includes(truthStatement)) fail('facility-stage generator is missing the DSX truth statement');
if (!semantics.includes(truthStatement)) fail('generated semantic layer is missing the DSX truth statement');

if (!process.exitCode) {
  console.log(
    `DSX ASSET VERIFY PASS: ${expectedBindings.length} canonical facility bindings checked; ${exactDsxRoles.length} exact DSX roles guarded.`,
  );
}
