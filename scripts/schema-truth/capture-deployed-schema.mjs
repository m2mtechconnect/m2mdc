/**
 * Captures metadata-only deployed schema evidence from the reviewed production
 * target. The Supabase access token stays in the process environment and is
 * never written to the snapshot.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const targetPath = resolve(root, 'config/aura-production-target.json');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function section(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Missing generated schema section: ${start}`);
  return source.slice(from + start.length, to);
}

export function schemaNames(generatedTypes) {
  const names = (source) =>
    [...source.matchAll(/^      ([a-zA-Z0-9_]+): \{/gm)]
      .map((match) => match[1])
      .sort();

  return {
    tables: names(section(generatedTypes, '    Tables: {', '    Views: {')),
    views: names(section(generatedTypes, '    Views: {', '    Functions: {')),
    functions: names(section(generatedTypes, '    Functions: {', '    Enums: {')),
  };
}

export function edgeFunctionNames(rawJson) {
  const parsed = JSON.parse(rawJson);
  const entries = Array.isArray(parsed) ? parsed : parsed.functions;
  if (!Array.isArray(entries)) throw new Error('Supabase function inventory is not an array.');

  return entries
    .map((entry) => entry?.slug ?? entry?.name ?? entry?.NAME ?? entry?.SLUG)
    .filter((name) => typeof name === 'string' && name.length > 0)
    .sort();
}

function gitHead() {
  return execFileSync(
    'git',
    ['-c', `safe.directory=${root}`, '-C', root, 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim();
}

function runCli(cli, args, env) {
  const result = spawnSync(cli, args, {
    cwd: root,
    env,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `Supabase CLI exited ${result.status}.`);
  }
  return result.stdout;
}

export function buildSnapshot({ generatedTypes, functionInventory, sourceSha, projectRef, capturedAt }) {
  return {
    schema: 'aura.deployed-schema.v2',
    sourceSha,
    capturedAt,
    projectRef,
    ...schemaNames(generatedTypes),
    edgeFunctions: edgeFunctionNames(functionInventory),
  };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);

if (invokedDirectly) {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  if (!outputArg) {
    fail('Usage: capture-deployed-schema.mjs --output=<metadata-snapshot.json>');
  } else {
    try {
      const target = JSON.parse(readFileSync(targetPath, 'utf8'));
      if (target.schema !== 'aura.production-target.v1') throw new Error('Production target schema is invalid.');
      if (!/^[a-z0-9]{20}$/.test(target.supabaseProjectRef)) throw new Error('Production project reference is invalid.');
      if (!process.env.SUPABASE_ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN is required.');

      const cli = process.env.SUPABASE_CLI_PATH ||
        resolve(root, 'node_modules/.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase');
      const env = { ...process.env };
      const generatedTypes = runCli(
        cli,
        ['gen', 'types', 'typescript', '--project-id', target.supabaseProjectRef, '--schema', 'public'],
        env,
      );
      const functionInventory = runCli(
        cli,
        ['functions', 'list', '--project-ref', target.supabaseProjectRef, '--output', 'json'],
        env,
      );
      const snapshot = buildSnapshot({
        generatedTypes,
        functionInventory,
        sourceSha: gitHead(),
        projectRef: target.supabaseProjectRef,
        capturedAt: new Date().toISOString(),
      });
      const outputPath = resolve(process.cwd(), outputArg.slice('--output='.length));
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
      console.log(`Captured metadata-only deployed schema snapshot at ${outputPath}`);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }
}
