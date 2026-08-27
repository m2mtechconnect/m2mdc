import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

const read = (relativePath: string) =>
  readFileSync(resolve(ROOT, relativePath), 'utf8');

const endpoints = [
  'supabase/functions/aoc-runtime-action/index.ts',
  'supabase/functions/aoc-runtime-control/index.ts',
  'supabase/functions/aoc-environment-promotion/index.ts',
];

describe('AOC runtime truth boundary', () => {
  it.each(endpoints)('%s fails closed without a verified runtime provider', (path) => {
    const source = read(path);
    expect(source).toContain("error_code: 'runtime_not_configured'");
    expect(source).toContain('runtime_verified: false');
    expect(source).toContain('status: 409');
  });

  it('does not manufacture runtime health or deployment success', () => {
    const runtimeAction = read(endpoints[0]);
    const runtimeControl = read(endpoints[1]);
    const promotion = read(endpoints[2]);

    expect(runtimeAction).not.toContain("health_status: 'healthy'");
    expect(runtimeAction).not.toContain('.from(\'agent_runtime_status\')');
    expect(runtimeControl).not.toContain("health: action === 'stop' ? 'stopped' : 'healthy'");
    expect(runtimeControl).not.toContain('.from(\'deployments\')');
    expect(promotion).not.toContain("status: 'active'");
    expect(promotion).not.toContain('.from(\'deployments\')');
  });
});
