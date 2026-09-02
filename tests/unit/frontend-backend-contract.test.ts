import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repositoryFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8').replace(/\r\n/g, '\n');

function runContract(...args: string[]) {
  return spawnSync(
    process.execPath,
    [join(process.cwd(), 'scripts/verify-frontend-backend-contract.mjs'), ...args],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
}

describe('frontend/backend release truth', () => {
  it('accepts only the reviewed current drift baseline', () => {
    const result = runContract();
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Frontend/backend contract PASS');
    expect(result.stdout).toContain('explicitly blocked');
  });

  it('fails release qualification while frontend backend blockers remain', () => {
    const result = runContract('--release');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Frontend/backend contract FAILED');
    expect(result.stderr).toContain('green-dc-recommend: release blocked (disabled)');
    expect(result.stderr).toContain('release blocked by unresolved dynamic invocation functionName');
  });

  it('does not present Workflow Editor local preview as executed evidence', () => {
    const editor = repositoryFile('src/components/workflow/WorkflowEditor.tsx');
    expect(editor).toContain('Preview Structure');
    expect(editor).toContain('No backend workflow was executed.');
    expect(editor).toContain("backend_executed: false");
    expect(editor).not.toContain('Math.random()');
    expect(editor).not.toContain('[Mock]');
    expect(editor).not.toContain('Simulation complete');
    expect(editor).not.toContain('✓ Passed');
  });

  it('makes the CI truth suite reject unconfigured backend requests', () => {
    const mock = repositoryFile('tests/truth-in-ui/_setup/supabase-mock.ts');
    const workflow = repositoryFile('.github/workflows/aura-truth-suite.yml');
    expect(mock).toContain('strictUnexpectedBackend?: boolean');
    expect(mock).toContain("code: 'UNHANDLED_SUPABASE_TEST_REQUEST'");
    expect(mock).toContain('status: 501');
    expect(workflow).toContain("AURA_STRICT_UNEXPECTED_BACKEND: '1'");
  });

  it('chains the fail-closed frontend/backend gate into release-contract validation', () => {
    const packageJson = JSON.parse(repositoryFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const productionPerimeter = repositoryFile('.github/workflows/production-perimeter.yml');
    expect(packageJson.scripts['verify:release-contract']).toBe(
      'node scripts/verify-frontend-backend-contract.mjs --release && node scripts/aura-release-contract.mjs validate',
    );
    expect(packageJson.scripts['verify:fast']).toContain('bun run verify:frontend-backend');
    expect(productionPerimeter).toContain('run: node scripts/verify-frontend-backend-contract.mjs');
  });
});
