#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve(process.argv[2] || 'visual-current-head');
const manifestPath = resolve(process.argv[3] || 'tests/visual/approved-linux-visuals.json');

function fail(message) {
  console.error(`[visual-fingerprint] ${message}`);
  process.exitCode = 1;
}

function pngDimensions(buffer) {
  const signature = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error('not a valid PNG');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

if (!existsSync(manifestPath)) {
  fail(`manifest missing: ${manifestPath}`);
  process.exit();
}
if (!existsSync(outputDir)) {
  fail(`visual output directory missing: ${outputDir}`);
  process.exit();
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.schema !== 'aura.visual-fingerprint.v1') {
  fail(`unexpected manifest schema: ${manifest.schema}`);
  process.exit();
}

const expected = [...manifest.screenshots].sort((a, b) => a.file.localeCompare(b.file));
const actualFiles = readdirSync(outputDir).filter((name) => name.endsWith('.png')).sort();
const expectedFiles = expected.map((item) => item.file);

if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  fail(`screenshot set mismatch\nexpected: ${expectedFiles.join(', ')}\nactual:   ${actualFiles.join(', ')}`);
}

for (const item of expected) {
  const path = resolve(outputDir, item.file);
  if (!existsSync(path)) {
    fail(`${item.file}: missing`);
    continue;
  }
  const buffer = readFileSync(path);
  let dimensions;
  try {
    dimensions = pngDimensions(buffer);
  } catch (error) {
    fail(`${item.file}: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  if (dimensions.width !== item.width) {
    fail(`${item.file}: width ${dimensions.width} != approved ${item.width}`);
  }
  if (item.height != null && dimensions.height !== item.height) {
    fail(`${item.file}: height ${dimensions.height} != approved ${item.height}`);
  }
  if (item.minHeight != null && dimensions.height < item.minHeight) {
    fail(`${item.file}: height ${dimensions.height} < minimum ${item.minHeight}`);
  }

  if (item.mode === 'sha256') {
    const digest = createHash('sha256').update(buffer).digest('hex');
    if (digest !== item.sha256) {
      fail(`${item.file}: SHA-256 drift\n  approved ${item.sha256}\n  current  ${digest}`);
    } else {
      console.log(`[visual-fingerprint] PASS ${item.file} ${dimensions.width}x${dimensions.height} ${digest.slice(0, 12)}…`);
    }
  } else if (item.mode === 'responsive') {
    console.log(`[visual-fingerprint] PASS responsive invariant ${item.file} ${dimensions.width}x${dimensions.height}`);
  } else {
    fail(`${item.file}: unsupported verification mode ${item.mode}`);
  }
}

if (process.exitCode) {
  console.error('[visual-fingerprint] FAILED');
  process.exit(process.exitCode);
}
console.log(`[visual-fingerprint] PASS ${expected.length} supported screenshots; baseline source ${manifest.baselineSource.sha}`);
