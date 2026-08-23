import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function resolveBaseRef() {
  const configured = process.env.GOVERNANCE_BASE_SHA?.trim();
  if (configured && !/^0+$/.test(configured)) return configured;
  try {
    execFileSync('git', ['rev-parse', 'HEAD^'], { stdio: 'ignore' });
    return 'HEAD^';
  } catch {
    return null;
  }
}

function addedMigrationFiles() {
  const base = resolveBaseRef();
  if (!base) return [];
  const output = execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=A', `${base}...HEAD`, '--', 'supabase/migrations'],
    { encoding: 'utf8' },
  );
  return output
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.endsWith('.sql'));
}

const failures = [];
const unqualifiedCreate = /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(TABLE|VIEW|MATERIALIZED\s+VIEW|FUNCTION|PROCEDURE|TYPE|SEQUENCE)\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_]*"?)(?=\s|\()/gim;

for (const filename of addedMigrationFiles()) {
  const sql = fs.readFileSync(filename, 'utf8');

  if (/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+auth\.(?:users|identities)\b/i.test(sql)) {
    failures.push(`${filename}: migrations must not embed source-environment auth user/identity data`);
  }

  if (/\bSECURITY\s+DEFINER\b/i.test(sql) && !/\bSET\s+search_path\s*=\s*/i.test(sql)) {
    failures.push(`${filename}: SECURITY DEFINER migration requires an explicit SET search_path`);
  }

  for (const match of sql.matchAll(unqualifiedCreate)) {
    failures.push(
      `${filename}: ${match[1].replace(/\s+/g, ' ')} ${match[2]} must be schema-qualified`,
    );
  }
}

if (failures.length) {
  console.error('NEW_MIGRATION_GOVERNANCE_FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('New migration governance passed. Historical migrations were not modified or re-linted.');
