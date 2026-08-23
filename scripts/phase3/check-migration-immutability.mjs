#!/usr/bin/env node
/**
 * Production migration-history guard.
 *
 * Existing migration files are immutable once they are on the base branch.
 * This check allows new forward migrations but rejects modifications, deletes,
 * copies, or renames of migration files that already exist in the release
 * history. Clean-replay compatibility belongs in the ephemeral validation
 * overlay, never in committed historical SQL.
 */
import { execFileSync } from 'node:child_process';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const isMain = process.env.GITHUB_REF_NAME === 'main';
const baseRef = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : isMain
    ? 'HEAD^'
    : 'origin/main';

try {
  git(['rev-parse', '--verify', baseRef]);
} catch {
  console.error(`MIGRATION_IMMUTABILITY: FAIL - unable to resolve base ref ${baseRef}`);
  process.exit(1);
}

const range = `${baseRef}...HEAD`;
const output = git(['diff', '--name-status', range, '--', 'supabase/migrations']);
const violations = [];
const additions = [];

for (const line of output.split('\n').filter(Boolean)) {
  const fields = line.split('\t');
  const status = fields[0];
  const paths = fields.slice(1);
  if (status.startsWith('A')) {
    additions.push(paths.at(-1));
    continue;
  }
  violations.push(`${status} ${paths.join(' -> ')}`);
}

if (violations.length) {
  console.error('MIGRATION_IMMUTABILITY: FAIL');
  console.error('Historical migration files must never be modified, deleted, copied, or renamed:');
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log(
  `MIGRATION_IMMUTABILITY: PASS - ${additions.length} forward migration(s) added; ` +
    '0 historical migrations modified',
);
