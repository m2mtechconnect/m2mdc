#!/usr/bin/env node
/**
 * Regenerate the committed source stamp (`release-source.json`).
 *
 * Lovable production build images can lack Git metadata entirely. This stamp
 * is the deterministic last-resort provenance record consumed by the Vite
 * release-fingerprint plugin. It is generated from the bound source checkout -
 * never hand-edited and never a hardcoded literal in application code.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

const sha = process.env.AURA_COMMIT_SHA?.trim() || git(['rev-parse', 'HEAD']);
if (!/^[0-9a-f]{40}$/.test(sha)) {
  console.error(`stamp:release - refusing to stamp non-SHA value "${sha}"`);
  process.exit(1);
}

// The stamp records the canonical published source branch. Internal Lovable
// edit branches and detached checkouts normalize to `main`.
const rawBranch = process.env.AURA_RELEASE_BRANCH?.trim() || '';
const branch = rawBranch && !['HEAD', 'unknown', '__orphan__'].includes(rawBranch) ? rawBranch : 'main';

const payload = {
  schema: 'aura.release-source-stamp.v1',
  sha,
  branch,
  stampedAt: new Date().toISOString(),
};

const target = path.join(rootDir, 'release-source.json');
writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`stamp:release - wrote ${payload.sha} (${payload.branch}) to release-source.json`);
