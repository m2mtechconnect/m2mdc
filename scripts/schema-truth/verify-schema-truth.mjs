import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const typesPath = resolve(root, 'src/integrations/supabase/types.ts');
const migrationsPath = resolve(root, 'supabase/migrations');
const baselinePath = resolve(root, 'docs/architecture/schema-truth/exact-head-manifest.json');
const deployedArg = process.argv.find((arg) => arg.startsWith('--deployed='));

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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

function hashList(values) {
  return sha256(values.join('\n'));
}

const generated = normalizedFile(typesPath);
const migrations = readdirSync(migrationsPath).filter((name) => name.endsWith('.sql')).sort();
const migrationContents = migrations.map((name) => `${name}\0${normalizedFile(resolve(migrationsPath, name))}`);
const manifest = {
  schema: 'aura.schema-truth.v2',
  sourceSha: '64da468804a426dcdd356912c4a68ba60f73bdf7',
  generatedTypes: {
    path: 'src/integrations/supabase/types.ts',
    sha256: sha256(generated),
    tables: names(section(generated, '    Tables: {', '    Views: {')),
    views: names(section(generated, '    Views: {', '    Functions: {')),
    functions: names(section(generated, '    Functions: {', '    Enums: {')),
  },
  migrations,
  migrationContentsSha256: hashList(migrationContents),
};

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const failures = [];
if (manifest.generatedTypes.sha256 !== baseline.generatedTypesSha256) failures.push('generated type checksum drift');
if (manifest.generatedTypes.tables.length !== baseline.tableCount) failures.push('generated table count drift');
if (manifest.generatedTypes.views.length !== baseline.viewCount) failures.push('generated view count drift');
if (manifest.generatedTypes.functions.length !== baseline.functionCount) failures.push('generated function count drift');
if (hashList(manifest.generatedTypes.tables) !== baseline.tableNamesSha256) failures.push('generated table name drift');
if (hashList(manifest.generatedTypes.views) !== baseline.viewNamesSha256) failures.push('generated view name drift');
if (hashList(manifest.generatedTypes.functions) !== baseline.functionNamesSha256) failures.push('generated function name drift');
if (manifest.migrations.length !== baseline.migrationCount || hashList(manifest.migrations) !== baseline.migrationsSha256) failures.push('migration inventory drift');
if (manifest.migrationContentsSha256 !== baseline.migrationContentsSha256) failures.push('migration content drift');

let deployed = { status: 'not-provided', reason: 'No read-only deployed metadata snapshot was supplied.' };
if (deployedArg) {
  const deployedPath = resolve(process.cwd(), deployedArg.slice('--deployed='.length));
  if (!existsSync(deployedPath)) failures.push(`deployed snapshot not found: ${deployedPath}`);
  else {
    const snapshot = JSON.parse(readFileSync(deployedPath, 'utf8'));
    deployed = { status: 'compared', path: deployedArg.slice('--deployed='.length) };
    for (const key of ['tables', 'views', 'functions']) {
      const actual = [...(snapshot[key] ?? [])].sort();
      if (JSON.stringify(actual) !== JSON.stringify(manifest.generatedTypes[key])) failures.push(`deployed ${key} drift`);
    }
  }
}

console.log(JSON.stringify({ ...manifest, deployed, verdict: failures.length ? 'FAIL' : 'PASS', failures }, null, 2));
if (failures.length) process.exitCode = 1;
