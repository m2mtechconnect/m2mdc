import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Schema Truth Layer', () => {
  it('fails closed on drift', () => {
    const verifier = read('scripts/schema-truth/verify-schema-truth.mjs');

    expect(verifier).toContain('migration inventory drift');
    expect(verifier).toContain("status: 'not-provided'");
    expect(verifier).toContain('process.exitCode = 1');
  });

  it('reuses rollback-only tenant denial', () => {
    expect(read('docs/architecture/schema-truth/README.md')).toContain(
      'scripts/phase3/rls-matrix.sql',
    );
    expect(read('scripts/phase3/rls-matrix.sql').trimEnd()).toMatch(/ROLLBACK;$/);
  });

  it('forbids deletion', () => {
    expect(read('docs/adr/0011-schema-truth-canonical-families.md')).toContain(
      'No table is deleted',
    );
  });
});
