import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Schema Truth Layer', () => {
  it('fails closed on drift', () => {
    const verifier = read('scripts/schema-truth/verify-schema-truth.mjs');

    expect(verifier).toContain('migration inventory drift');
    expect(verifier).toContain('migration content drift');
    expect(verifier).toContain('generated table name drift');
    expect(verifier).toContain('generated view name drift');
    expect(verifier).toContain('generated function name drift');
    expect(verifier).toContain("status: 'not-provided'");
    expect(verifier).toContain('process.exitCode = 1');
  });

  it('matches the exact repository baseline', () => {
    const result = JSON.parse(
      execFileSync(process.execPath, ['scripts/schema-truth/verify-schema-truth.mjs'], {
        encoding: 'utf8',
      }),
    );

    expect(result.schema).toBe('aura.schema-truth.v2');
    expect(result.migrationContentsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.deployed.status).toBe('not-provided');
    expect(result.verdict).toBe('PASS');
    expect(result.failures).toEqual([]);
  });

  it('reuses rollback-only tenant denial', () => {
    expect(read('docs/architecture/schema-truth/README.md')).toContain(
      'scripts/phase3/rls-matrix.sql',
    );
    expect(read('scripts/phase3/rls-matrix.sql').trimEnd()).toMatch(/ROLLBACK;$/);
  });

  it('is required by the fast qualification gate', () => {
    const packageJson = JSON.parse(read('package.json'));

    expect(packageJson.scripts['verify:schema-truth']).toBe(
      'node scripts/schema-truth/verify-schema-truth.mjs',
    );
    expect(packageJson.scripts['verify:fast']).toContain('verify:schema-truth');
  });

  it('forbids deletion', () => {
    expect(read('docs/adr/0011-schema-truth-canonical-families.md')).toContain(
      'No table is deleted',
    );
  });
});
