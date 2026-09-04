import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..');

describe('unit runner isolation contract', () => {
  it('keeps the standard unit commands deterministic for shared browser/store modules', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };

    for (const scriptName of ['test:unit', 'test:unit:coverage']) {
      const script = packageJson.scripts?.[scriptName] ?? '';
      expect(script, `${scriptName} must exist`).toContain('--no-file-parallelism');
      expect(script, `${scriptName} must cap workers`).toContain('--maxWorkers=1');
    }
  });

  it('keeps the QA workflow on the deterministic coverage command', () => {
    const workflow = readFileSync(
      resolve(repoRoot, '.github/workflows/qa-suite.yml'),
      'utf8',
    );

    expect(workflow).toContain('run: bun run test:unit:coverage');
    expect(workflow).toContain('deterministic isolation and coverage');
  });
});
