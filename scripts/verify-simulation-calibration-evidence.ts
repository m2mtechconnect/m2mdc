#!/usr/bin/env bun

/**
 * SF-6A calibration evidence verifier.
 *
 * Zero committed evidence packages is a valid state: it means AURA makes no
 * calibrated claim. Once a JSON package is added under calibration/evidence,
 * every package must satisfy the fail-closed TypeScript contract.
 */

import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assessCalibrationEvidence,
  type CalibrationEvidencePackage,
} from '../src/simulation/calibrationEvidence';

const root = process.cwd();
const evidenceDir = resolve(root, 'calibration/evidence');

async function listPackages(): Promise<string[]> {
  try {
    const entries = await readdir(evidenceDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => resolve(evidenceDir, entry.name))
      .sort();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return [];
    throw error;
  }
}

const files = await listPackages();

if (files.length === 0) {
  console.log('[calibration-evidence] 0 evidence packages committed.');
  console.log('[calibration-evidence] No benchmarked/calibrated promotion is implied.');
  process.exit(0);
}

let failed = false;
const ids = new Set<string>();

for (const file of files) {
  let pkg: CalibrationEvidencePackage;
  try {
    pkg = JSON.parse(await readFile(file, 'utf8')) as CalibrationEvidencePackage;
  } catch (error) {
    failed = true;
    console.error(`[calibration-evidence] INVALID JSON: ${file}`);
    console.error(error instanceof Error ? error.message : String(error));
    continue;
  }

  if (ids.has(pkg.id)) {
    failed = true;
    console.error(`[calibration-evidence] DUPLICATE package id: ${pkg.id}`);
    continue;
  }
  ids.add(pkg.id);

  const decision = assessCalibrationEvidence(pkg);
  if (!decision.valid) {
    failed = true;
    console.error(`[calibration-evidence] REJECTED ${pkg.id || file}`);
    for (const reason of decision.reasons) console.error(`  - ${reason}`);
    continue;
  }

  console.log(
    `[calibration-evidence] ACCEPT ${pkg.id}: ${decision.eligibleState}` +
      `; dsxReferenceEligible=${decision.dsxReferenceEligible}` +
      `; nvidiaRuntimeEligible=${decision.nvidiaRuntimeEligible}` +
      `; criteria=${decision.passedCriteria}/${decision.totalCriteria}`,
  );
}

if (failed) process.exit(1);
console.log(`[calibration-evidence] ${files.length} package(s) passed structural and tolerance validation.`);
