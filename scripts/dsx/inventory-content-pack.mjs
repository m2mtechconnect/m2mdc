#!/usr/bin/env node
/**
 * Inventory an extracted NVIDIA DSX NGC content pack without copying any
 * licence-governed geometry into the AURA repository.
 *
 * Usage:
 *   node scripts/dsx/inventory-content-pack.mjs /secure/path/to/extracted-pack
 *
 * Optional:
 *   --output /secure/path/report.json
 *   --hash-candidates   hash candidate DSX asset files (can be slow)
 *
 * The default output lives under `.dsx-private/`, which is gitignored.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE = Object.freeze({
  id: 'nvidia.omniverse.dsx_dataset',
  version: '2.1',
  expectedRootStage: 'DSX_BP/Assembly/DSX_Main_BP.usda',
  catalogue: 'https://catalog.ngc.nvidia.com/orgs/nvidia/omniverse/resources/dsx_dataset/2.1',
  licence: 'NVIDIA Sample Data License for Evaluation',
});

const args = process.argv.slice(2);
const rootArg = args[0] && !args[0].startsWith('--') ? args[0] : null;
if (!rootArg) {
  console.error('Usage: node scripts/dsx/inventory-content-pack.mjs <extracted-pack-root> [--output <file>] [--hash-candidates]');
  process.exit(2);
}

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

const extractedRoot = path.resolve(rootArg);
const output = path.resolve(
  valueAfter('--output') ?? path.join('.dsx-private', 'inventory', `dsx-content-pack-${SOURCE.version}.json`),
);
const hashCandidates = args.includes('--hash-candidates');
const expectedRoot = path.join(extractedRoot, SOURCE.expectedRootStage);

if (!fs.existsSync(expectedRoot)) {
  console.error(`DSX CONTENT PACK INVALID: expected root stage not found: ${expectedRoot}`);
  process.exit(1);
}

function sha256(file) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(file);
  hash.update(data);
  return `sha256:${hash.digest('hex')}`;
}

const HINTS = [
  ['dsx-compute-tray', /compute[_ -]?tray|gb(?:200|300).*compute/i],
  ['dsx-nvlink-switch-tray', /nvlink.*switch.*tray|switch.*tray.*nvlink/i],
  ['dsx-power-shelf', /power[_ -]?shelf/i],
  ['dsx-tor-oob-switch', /sn2201|tor[_ -]?oob|oob.*switch/i],
  ['dsx-tan-switch', /tenant.*access|\btan\b/i],
  ['dsx-smn-switch', /secure.*management|\bsmn\b/i],
  ['dsx-cin-switch', /cluster.*interconnect|\bcin\b/i],
  ['dsx-cdu', /\bcdu\b|cooling.*distribution/i],
  ['dsx-crah', /\bcrah\b/i],
  ['dsx-chiller', /chiller/i],
  ['dsx-pump', /pump/i],
  ['dsx-dry-cooler', /dry[_ -]?cooler/i],
  ['dsx-ups', /(^|[/_. -])ups([/_. -]|$)/i],
  ['dsx-control-node', /control[_ -]?node/i],
  ['dsx-general-purpose-node', /general[_ -]?purpose.*node|gen[_ -]?purpose.*node/i],
  ['dsx-utility-cluster', /utility[_ -]?cluster/i],
  ['dsx-dc-edge-cluster', /dc[_ -]?edge|edge[_ -]?cluster/i],
  ['dsx-high-speed-storage', /high[_ -]?speed.*storage|storage.*high[_ -]?speed/i],
  ['dsx-grid-substation', /substation|utility[_ -]?interconnect/i],
  ['dsx-backup-generator', /generator|genset/i],
  ['dsx-bess', /\bbess\b|battery.*storage/i],
  ['dsx-central-utility-building', /central[_ -]?utility|(^|[/_. -])cub([/_. -]|$)/i],
  ['dsx-fiber-spine', /fiber.*spine|fibre.*spine/i],
];

const interestingExt = new Set(['.usd', '.usda', '.usdc', '.png', '.jpg', '.jpeg', '.exr', '.hdr', '.mdl']);
const extensions = {};
const candidates = new Map(HINTS.map(([role]) => [role, []]));
let fileCount = 0;
let usdFileCount = 0;
let totalBytes = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }
    if (!entry.isFile()) continue;

    fileCount += 1;
    const stat = fs.statSync(absolute);
    totalBytes += stat.size;
    const relative = path.relative(extractedRoot, absolute).split(path.sep).join('/');
    const ext = path.extname(entry.name).toLowerCase() || '<none>';
    extensions[ext] = (extensions[ext] ?? 0) + 1;
    if (['.usd', '.usda', '.usdc'].includes(ext)) usdFileCount += 1;

    if (!interestingExt.has(ext)) continue;
    for (const [role, pattern] of HINTS) {
      if (!pattern.test(relative)) continue;
      const candidate = {
        path: relative,
        bytes: stat.size,
        extension: ext,
        sha256: hashCandidates ? sha256(absolute) : null,
      };
      candidates.get(role).push(candidate);
    }
  }
}

walk(extractedRoot);

const report = {
  generatedAt: new Date().toISOString(),
  source: SOURCE,
  policy: {
    classification: 'PRIVATE_EVALUATION_SOURCE',
    publicRepositoryCopyAllowed: false,
    productionRightsEstablished: false,
    redistributionRightsEstablished: false,
    note: 'This report inventories local source paths and evidence only. It does not copy or publish NVIDIA DSX content.',
  },
  rootStage: {
    relativePath: SOURCE.expectedRootStage,
    bytes: fs.statSync(expectedRoot).size,
    sha256: sha256(expectedRoot),
  },
  totals: {
    files: fileCount,
    usdFiles: usdFileCount,
    bytes: totalBytes,
    gibibytes: Number((totalBytes / 1024 ** 3).toFixed(3)),
    extensions,
  },
  candidateRoles: Object.fromEntries(
    [...candidates.entries()].map(([role, rows]) => [role, {
      count: rows.length,
      candidates: rows.sort((a, b) => a.path.localeCompare(b.path)),
    }]),
  ),
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log('DSX CONTENT PACK INVENTORY COMPLETE');
console.log(`source=${SOURCE.id}@${SOURCE.version}`);
console.log(`rootStage=${SOURCE.expectedRootStage}`);
console.log(`usdFiles=${usdFileCount}`);
console.log(`files=${fileCount}`);
console.log(`output=${output}`);
console.log('Geometry was not copied into the AURA repository.');
