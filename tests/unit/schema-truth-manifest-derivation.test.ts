/**
 * Proves the Schema Truth baseline is DERIVED from the repository artifacts,
 * not hand-edited to make the gate pass.
 *
 * The failure mode this guards against: a red `verify:schema-truth` being
 * "fixed" by pasting the current hashes into exact-head-manifest.json, which
 * would silently re-baseline real schema drift instead of resolving it.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const GENERATOR = 'scripts/schema-truth/build-exact-head-manifest.mjs';
const MANIFEST = 'docs/architecture/schema-truth/exact-head-manifest.json';
const VERIFIER = 'scripts/schema-truth/verify-schema-truth.mjs';
const TYPES = 'src/integrations/supabase/types.ts';

const read = (path: string) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const hashList = (values: string[]) => sha256(values.join('\n'));

describe('Schema Truth manifest derivation', () => {
  it('committed manifest is byte-identical to the deterministic derivation', () => {
    const derived = execFileSync(process.execPath, [GENERATOR], { encoding: 'utf8' });

    expect(read(MANIFEST)).toBe(derived.replaceAll('\r\n', '\n'));
  });

  it('generator --check fails closed when the manifest is not derived', () => {
    expect(() =>
      execFileSync(process.execPath, [GENERATOR, '--check'], { encoding: 'utf8' }),
    ).not.toThrow();

    const generator = read(GENERATOR);
    expect(generator).toContain('process.exitCode = 1');
    expect(generator).toContain('is not the deterministic derivation');
  });

  it('recomputes every baseline field independently of the generator', () => {
    const manifest = JSON.parse(read(MANIFEST));
    const generated = read(TYPES);

    const names = (start: string, end: string) => {
      const from = generated.indexOf(start);
      const to = generated.indexOf(end, from + start.length);
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeGreaterThan(from);
      return [...generated.slice(from + start.length, to).matchAll(/^ {6}([a-zA-Z0-9_]+): \{/gm)]
        .map((match) => match[1])
        .sort();
    };

    const tables = names('    Tables: {', '    Views: {');
    const views = names('    Views: {', '    Functions: {');
    const functions = names('    Functions: {', '    Enums: {');

    const migrations = readdirSync('supabase/migrations')
      .filter((name) => name.endsWith('.sql'))
      .sort();
    const migrationContents = migrations.map(
      (name) => `${name}\0${read(resolve('supabase/migrations', name))}`,
    );

    expect(manifest.generatedTypesSha256).toBe(sha256(generated));
    expect(manifest.tableCount).toBe(tables.length);
    expect(manifest.tableNamesSha256).toBe(hashList(tables));
    expect(manifest.viewCount).toBe(views.length);
    expect(manifest.viewNamesSha256).toBe(hashList(views));
    expect(manifest.functionCount).toBe(functions.length);
    expect(manifest.functionNamesSha256).toBe(hashList(functions));
    expect(manifest.migrationCount).toBe(migrations.length);
    expect(manifest.migrationsSha256).toBe(hashList(migrations));
    expect(manifest.migrationContentsSha256).toBe(hashList(migrationContents));
  });

  it('pins the baseline to one audited commit shared with the verifier', () => {
    const manifest = JSON.parse(read(MANIFEST));

    expect(manifest.schema).toBe('aura.schema-truth.v2');
    expect(manifest.sourceSha).toMatch(/^[a-f0-9]{40}$/);
    expect(read(VERIFIER)).toContain(`sourceSha: '${manifest.sourceSha}'`);
    expect(read(GENERATOR)).toContain(`SOURCE_SHA = '${manifest.sourceSha}'`);
  });

  it('keeps the gate wired and unskipped', () => {
    const packageJson = JSON.parse(read('package.json'));

    expect(packageJson.scripts['verify:schema-truth']).toBe(`node ${VERIFIER}`);
    expect(packageJson.scripts['verify:fast']).toContain('verify:schema-truth');
    expect(read(VERIFIER)).toContain('process.exitCode = 1');
  });
});
