import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
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
    expect(verifier).toContain('schema source commit drift');
    expect(verifier).toContain('deployed metadata snapshot required');
    expect(verifier).toContain('deployed snapshot source commit drift');
    expect(verifier).toContain('deployed snapshot project target drift');
    expect(verifier).toContain('deployed edge function allowlist drift');
    expect(verifier).toContain('process.exitCode = 1');
  });

  it('matches the exact repository baseline without claiming release qualification', () => {
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        ['scripts/schema-truth/verify-schema-truth.mjs', '--repository-only'],
        { encoding: 'utf8' },
      ),
    );

    expect(result.schema).toBe('aura.schema-truth.v2');
    expect(result.auditedHeadSha).toMatch(/^[a-f0-9]{40}$/);
    expect(result.sourceSha).toMatch(/^[a-f0-9]{40}$/);
    expect(result.migrationContentsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.mode).toBe('repository-only');
    expect(result.deployed.status).toBe('skipped');
    expect(result.verdict).toBe('PASS_REPOSITORY_ONLY');
    expect(result.failures).toEqual([]);
  });

  it('fails closed when release qualification has no deployed snapshot', () => {
    const result = spawnSync(process.execPath, ['scripts/schema-truth/verify-schema-truth.mjs'], {
      encoding: 'utf8',
    });
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(1);
    expect(report.mode).toBe('release');
    expect(report.verdict).toBe('FAIL');
    expect(report.deployed.status).toBe('not-provided');
    expect(report.failures).toContain('deployed metadata snapshot required');
  });

  it('accepts only a current exact-head deployed metadata snapshot', () => {
    const repository = JSON.parse(
      execFileSync(
        process.execPath,
        ['scripts/schema-truth/verify-schema-truth.mjs', '--repository-only'],
        { encoding: 'utf8' },
      ),
    );
    const snapshotPath = resolve(tmpdir(), 'aura-schema-truth-deployed-snapshot.test.json');
    const snapshot = {
      schema: 'aura.deployed-schema.v2',
      sourceSha: repository.auditedHeadSha,
      capturedAt: '2026-09-01T20:00:00.000Z',
      projectRef: 'zmewwjizebvublcsmhcz',
      tables: repository.generatedTypes.tables,
      views: repository.generatedTypes.views,
      functions: repository.generatedTypes.functions,
      edgeFunctions: JSON.parse(
        read('docs/remediation/evidence/pr-0.1/route-allowlist.json'),
      ).production_functions,
    };

    try {
      writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
      const qualified = JSON.parse(
        execFileSync(
          process.execPath,
          ['scripts/schema-truth/verify-schema-truth.mjs', `--deployed=${snapshotPath}`],
          { encoding: 'utf8' },
        ),
      );
      expect(qualified.verdict).toBe('PASS');
      expect(qualified.deployed.status).toBe('compared');

      writeFileSync(
        snapshotPath,
        `${JSON.stringify({ ...snapshot, sourceSha: '0'.repeat(40) }, null, 2)}\n`,
      );
      const stale = spawnSync(
        process.execPath,
        ['scripts/schema-truth/verify-schema-truth.mjs', `--deployed=${snapshotPath}`],
        { encoding: 'utf8' },
      );
      expect(stale.status).toBe(1);
      expect(JSON.parse(stale.stdout).failures).toContain(
        'deployed snapshot source commit drift',
      );
    } finally {
      rmSync(snapshotPath, { force: true });
    }
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
    expect(packageJson.scripts['verify:schema-truth:repository']).toBe(
      'node scripts/schema-truth/verify-schema-truth.mjs --repository-only',
    );
    expect(packageJson.scripts['verify:fast']).toContain('verify:schema-truth');
    expect(packageJson.scripts['capture:schema-truth:deployed']).toContain(
      'capture-deployed-schema.mjs',
    );
  });

  it('automatically captures production metadata in a required exact-SHA workflow', () => {
    const workflow = read('.github/workflows/aura-deployment-drift.yml');
    const releaseContract = JSON.parse(read('config/aura-release-contract.json'));

    expect(workflow).toContain('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}');
    expect(workflow).toContain('capture-deployed-schema.mjs');
    expect(workflow).toContain('verify-schema-truth.mjs --deployed=');
    expect(workflow).toContain('fetch-depth: 0');
    expect(releaseContract.workflowGates).toContainEqual({
      name: 'AURA Deployment Drift',
      mode: 'always',
    });
  });

  it('checks out complete schema history in the QA unit gate', () => {
    const workflow = read('.github/workflows/qa-suite.yml');
    const unitJob = workflow.slice(
      workflow.indexOf('  unit-tests:'),
      workflow.indexOf('  e2e-tests:'),
    );

    expect(unitJob).toContain('ref: ${{ env.AURA_SOURCE_SHA }}');
    expect(unitJob).toContain('fetch-depth: 0');
  });

  it('forbids deletion', () => {
    expect(read('docs/adr/0011-schema-truth-canonical-families.md')).toContain(
      'No table is deleted',
    );
  });
});
