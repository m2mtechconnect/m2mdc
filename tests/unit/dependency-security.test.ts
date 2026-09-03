import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('dependency security overrides', () => {
  it('pins fflate to the reviewed patched release', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      overrides?: Record<string, string>;
    };

    expect(packageJson.overrides?.fflate).toBe('0.8.2');
  });

  it('resolves the fflate override in the Bun lockfile', () => {
    const lockfile = read('bun.lock');

    expect(lockfile).toContain('"fflate": ["fflate@0.8.2"');
    expect(lockfile).not.toContain('"fflate": ["fflate@0.6.10"');
  });
});
