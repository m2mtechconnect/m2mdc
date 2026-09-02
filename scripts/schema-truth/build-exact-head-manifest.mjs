/**
 * Deterministic generator for docs/architecture/schema-truth/exact-head-manifest.json.
 *
 * The manifest is a DERIVED artifact: every field is computed from the exact
 * repository contents (generated Supabase types + migration inventory). It must
 * never be hand-edited, because a hand-edited baseline would let real drift pass
 * the Schema Truth gate.
 *
 * Usage:
 *   node scripts/schema-truth/build-exact-head-manifest.mjs            # print JSON
 *   node scripts/schema-truth/build-exact-head-manifest.mjs --write    # rewrite the manifest
 *   node scripts/schema-truth/build-exact-head-manifest.mjs --check    # exit 1 on divergence
 *
 * `sourceSha` is derived from the latest commit that changed either generated
 * types or migration history. This avoids a self-referential commit hash while
 * still failing when schema artifacts advance beyond the committed pin.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const typesPath = resolve(root, 'src/integrations/supabase/types.ts');
const migrationsPath = resolve(root, 'supabase/migrations');
const manifestPath = resolve(root, 'docs/architecture/schema-truth/exact-head-manifest.json');

export function gitOutput(args) {
  return execFileSync('git', ['-c', `safe.directory=${root}`, '-C', root, ...args], {
    encoding: 'utf8',
  }).trim();
}

/** Latest commit that changed a Schema Truth source artifact. */
export function schemaSourceSha() {
  const sha = gitOutput([
    'log',
    '-1',
    '--format=%H',
    '--',
    'src/integrations/supabase/types.ts',
    'supabase/migrations',
  ]);
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Unable to derive schema source commit.');
  return sha;
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashList(values) {
  return sha256(values.join('\n'));
}

function section(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Missing generated schema section: ${start}`);
  return source.slice(from + start.length, to);
}

function names(source) {
  return [...source.matchAll(/^      ([a-zA-Z0-9_]+): \{/gm)].map((match) => match[1]).sort();
}

function normalizedFile(path) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
}

export function buildManifest() {
  const generated = normalizedFile(typesPath);
  const migrations = readdirSync(migrationsPath)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const migrationContents = migrations.map(
    (name) => `${name}\0${normalizedFile(resolve(migrationsPath, name))}`,
  );

  const tables = names(section(generated, '    Tables: {', '    Views: {'));
  const views = names(section(generated, '    Views: {', '    Functions: {'));
  const functions = names(section(generated, '    Functions: {', '    Enums: {'));

  return {
    schema: 'aura.schema-truth.v2',
    sourceSha: schemaSourceSha(),
    generatedTypesSha256: sha256(generated),
    tableCount: tables.length,
    tableNamesSha256: hashList(tables),
    viewCount: views.length,
    viewNamesSha256: hashList(views),
    functionCount: functions.length,
    functionNamesSha256: hashList(functions),
    migrationCount: migrations.length,
    migrationsSha256: hashList(migrations),
    migrationContentsSha256: hashList(migrationContents),
  };
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function readCommittedManifest() {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);

if (invokedDirectly) {
  const manifest = buildManifest();
  const serialized = serializeManifest(manifest);

  if (process.argv.includes('--write')) {
    writeFileSync(manifestPath, serialized);
    console.log(`Wrote ${manifestPath}`);
  } else if (process.argv.includes('--check')) {
    const committed = normalizedFile(manifestPath);
    if (committed !== serialized) {
      console.error('exact-head-manifest.json is not the deterministic derivation of the repository artifacts.');
      process.exitCode = 1;
    } else {
      console.log('exact-head-manifest.json is derived, not hand-edited.');
    }
  } else {
    process.stdout.write(serialized);
  }
}
