import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const typesPath = resolve(root, 'src/integrations/supabase/types.ts');
const migrationsPath = resolve(root, 'supabase/migrations');
const baselinePath = resolve(root, 'docs/architecture/schema-truth/exact-head-manifest.json');
const targetPath = resolve(root, 'config/aura-production-target.json');
const deployedArg = process.argv.find((arg) => arg.startsWith('--deployed='));
const deployedEnv = process.env.AURA_DEPLOYED_SCHEMA_SNAPSHOT;
const repositoryOnly = process.argv.includes('--repository-only');

function gitOutput(args) {
  return execFileSync('git', ['-c', `safe.directory=${root}`, '-C', root, ...args], {
    encoding: 'utf8',
  }).trim();
}

function auditedHeadSha() {
  return gitOutput(['rev-parse', 'HEAD']);
}

function schemaSourceSha() {
  return gitOutput([
    'log',
    '-1',
    '--format=%H',
    '--',
    'src/integrations/supabase/types.ts',
    'supabase/migrations',
  ]);
}

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
  auditedHeadSha: auditedHeadSha(),
  sourceSha: schemaSourceSha(),
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
const target = JSON.parse(readFileSync(targetPath, 'utf8'));
const allowlist = JSON.parse(readFileSync(resolve(root, target.edgeFunctionAllowlist), 'utf8'));
const failures = [];
if (target.schema !== 'aura.production-target.v1') failures.push('production target schema invalid');
if (allowlist.policy !== 'default-deny') failures.push('edge function allowlist policy invalid');
if (manifest.sourceSha !== baseline.sourceSha) failures.push('schema source commit drift');
if (manifest.generatedTypes.sha256 !== baseline.generatedTypesSha256) failures.push('generated type checksum drift');
if (manifest.generatedTypes.tables.length !== baseline.tableCount) failures.push('generated table count drift');
if (manifest.generatedTypes.views.length !== baseline.viewCount) failures.push('generated view count drift');
if (manifest.generatedTypes.functions.length !== baseline.functionCount) failures.push('generated function count drift');
if (hashList(manifest.generatedTypes.tables) !== baseline.tableNamesSha256) failures.push('generated table name drift');
if (hashList(manifest.generatedTypes.views) !== baseline.viewNamesSha256) failures.push('generated view name drift');
if (hashList(manifest.generatedTypes.functions) !== baseline.functionNamesSha256) failures.push('generated function name drift');
if (manifest.migrations.length !== baseline.migrationCount || hashList(manifest.migrations) !== baseline.migrationsSha256) failures.push('migration inventory drift');
if (manifest.migrationContentsSha256 !== baseline.migrationContentsSha256) failures.push('migration content drift');

const deployedInput = deployedArg?.slice('--deployed='.length) || deployedEnv || null;
if (repositoryOnly && deployedInput) {
  failures.push('repository-only mode cannot accept a deployed snapshot');
}

let deployed = repositoryOnly
  ? { status: 'skipped', reason: 'Repository-only mode does not qualify a deployed environment.' }
  : { status: 'not-provided', reason: 'A read-only deployed metadata snapshot is required.' };

if (!repositoryOnly && !deployedInput) {
  failures.push('deployed metadata snapshot required');
}

if (!repositoryOnly && deployedInput) {
  const deployedPath = resolve(process.cwd(), deployedInput);
  if (!existsSync(deployedPath)) failures.push(`deployed snapshot not found: ${deployedPath}`);
  else {
    const snapshot = JSON.parse(readFileSync(deployedPath, 'utf8'));
    deployed = { status: 'compared', path: deployedInput };
    if (snapshot.schema !== 'aura.deployed-schema.v2') {
      failures.push('deployed snapshot schema invalid');
    }
    if (snapshot.projectRef !== target.supabaseProjectRef) {
      failures.push('deployed snapshot project target drift');
    }
    if (snapshot.sourceSha !== manifest.auditedHeadSha) {
      failures.push('deployed snapshot source commit drift');
    }
    if (typeof snapshot.capturedAt !== 'string' || Number.isNaN(Date.parse(snapshot.capturedAt))) {
      failures.push('deployed snapshot capture time invalid');
    }
    for (const key of ['tables', 'views', 'functions']) {
      if (!Array.isArray(snapshot[key])) {
        failures.push(`deployed snapshot ${key} missing`);
        continue;
      }
      const actual = [...(snapshot[key] ?? [])].sort();
      if (JSON.stringify(actual) !== JSON.stringify(manifest.generatedTypes[key])) failures.push(`deployed ${key} drift`);
    }
    if (!Array.isArray(snapshot.edgeFunctions)) {
      failures.push('deployed snapshot edgeFunctions missing');
    } else {
      const deployedEdgeFunctions = [...snapshot.edgeFunctions].sort();
      const expectedEdgeFunctions = [...allowlist.production_functions].sort();
      if (JSON.stringify(deployedEdgeFunctions) !== JSON.stringify(expectedEdgeFunctions)) {
        failures.push('deployed edge function allowlist drift');
      }
    }
  }
}

const verdict = failures.length ? 'FAIL' : repositoryOnly ? 'PASS_REPOSITORY_ONLY' : 'PASS';
console.log(JSON.stringify({ ...manifest, mode: repositoryOnly ? 'repository-only' : 'release', deployed, verdict, failures }, null, 2));
if (failures.length) process.exitCode = 1;
