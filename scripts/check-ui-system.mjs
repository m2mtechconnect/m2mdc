import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const isProductionSource = (file) => {
  const normalized = file.replaceAll('\\', '/');
  return /\.(ts|tsx)$/.test(file)
    && !normalized.includes('/__tests__/')
    && !/\.(test|spec)\.(ts|tsx)$/.test(file);
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (isProductionSource(full)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const corpus = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

function count(re) {
  return [...corpus.matchAll(re)].length;
}

const metrics = {
  microText9: count(/text-\[9px\]/g),
  microText10: count(/text-\[10px\]/g),
  microText11: count(/text-\[11px\]/g),
  rawCard: count(/<Card(?:\s|>)/g),
  rawTable: count(/<Table(?:\s|>)/g),
  v2Panel: count(/<Panel(?:\s|>)/g),
  operationalTable: count(/<OperationalTable(?:\s|>)/g),
  stateView: count(/<StateView(?:\s|>)/g),
  gradients: count(/bg-gradient-to-/g),
  glow: count(/glow/g),
  backdropBlur: count(/backdrop-blur/g),
  pulse: count(/animate-pulse/g),
  ping: count(/animate-ping/g),
  bounce: count(/animate-bounce/g),
  uppercase: count(/uppercase/g),
  hardcodedColor: count(/(?:text-white|bg-black|bg-white|text-black|#[0-9A-Fa-f]{6})/g),
  fixedWidth: count(/(?:min-)?w-\[[0-9]{3,}px\]/g),
};

// UI debt ceilings ratcheted after Phase 4 Builder layout cleanup. These are
// maximums, not targets: later phases must keep moving the values downward.
const baselineCeilings = {
  microText9: 18,
  microText10: 253,
  microText11: 186,
  rawCard: 592,
  rawTable: 17,
  gradients: 78,
  glow: 34,
  backdropBlur: 47,
  pulse: 99,
  ping: 9,
  bounce: 8,
  uppercase: 172,
  hardcodedColor: 324,
  fixedWidth: 91,
};

const adoptionFloors = {
  v2Panel: 22,
  operationalTable: 1,
  stateView: 2,
};

const requiredV2Tokens = [
  '--v2-canvas:',
  '--v2-panel:',
  '--v2-graphite:',
  '--v2-tech:',
  '--v2-tech-strong:',
  '--v2-verified:',
  '--v2-simulated:',
  '--v2-critical:',
  '--v2-shadow-panel:',
];

const requiredV2Exports = [
  'Panel',
  'TelemetryRail',
  'Instrument',
  'ProvenanceBadgeV2',
  'CommandHeader',
  'InspectorPanel',
  'OperationalTable',
  'StateView',
];

const indexCss = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
const v2Index = fs.readFileSync(path.join(SRC, 'components/v2/index.ts'), 'utf8');

const failures = [];

for (const [metric, ceiling] of Object.entries(baselineCeilings)) {
  if (metrics[metric] > ceiling) {
    failures.push(`${metric} regressed: ${metrics[metric]} > baseline ceiling ${ceiling}`);
  }
}

for (const [metric, floor] of Object.entries(adoptionFloors)) {
  if (metrics[metric] < floor) {
    failures.push(`${metric} adoption regressed: ${metrics[metric]} < floor ${floor}`);
  }
}

for (const token of requiredV2Tokens) {
  if (!indexCss.includes(token)) failures.push(`missing required AURA V2 token ${token}`);
}

for (const primitive of requiredV2Exports) {
  if (!v2Index.includes(primitive)) failures.push(`missing required AURA V2 primitive export ${primitive}`);
}

const report = {
  microTextTotal: metrics.microText9 + metrics.microText10 + metrics.microText11,
  ...metrics,
};

console.log('[AURA UI SYSTEM]', JSON.stringify(report));

if (failures.length) {
  console.error('[AURA UI SYSTEM] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[AURA UI SYSTEM] PASS — UI debt did not increase; later phases should ratchet ceilings downward.');
