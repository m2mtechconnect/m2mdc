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
 * The audited HEAD is pinned in SOURCE_SHA below and is recorded in the manifest
 * so a reviewer can tie the baseline to one exact commit.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const typesPath = resolve(root, 'src/integrations/supabase/types.ts');
const migrationsPath = resolve(root, 'supabase/migrations');
const manifestPath = resolve(root, 'docs/architecture/schema-truth/exact-head-manifest.json');

/**
 * Audited HEAD whose generated types were verified, read-only, against the
 * connected live database metadata (public tables, views and Data-API functions
 * matched exactly, with no object present on only one side).
 */
export const SOURCE_SHA = 'a448801c78bf064c3acd80f8566833fcdb47e139';

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
    sourceSha: SOURCE_SHA,
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
