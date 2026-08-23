/**
 * Regression guard for the PR-0.1 production perimeter.
 *
 * The perimeter is default-deny: a function reaches production only when it
 * is listed in route-allowlist.json, marked production-allowlisted in the
 * inventory, and demonstrates an in-code authorization guard. These tests
 * assert the enforcer still fails closed and that the two evidence files
 * cannot drift apart.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, symlinkSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = process.cwd();
const SCRIPT = join(REPO, 'scripts/verify-production-perimeter.mjs');
const EVIDENCE_DIR = 'docs/remediation/evidence/pr-0.1';
const ALLOWLIST = join(REPO, EVIDENCE_DIR, 'route-allowlist.json');
const INVENTORY = join(REPO, EVIDENCE_DIR, 'edge-function-inventory.json');

const allowlist = JSON.parse(readFileSync(ALLOWLIST, 'utf8'));
const inventory = JSON.parse(readFileSync(INVENTORY, 'utf8'));

function runEnforcer(cwd: string): { code: number; output: string } {
  try {
    const output = execFileSync('node', [SCRIPT], { cwd, encoding: 'utf8' });
    return { code: 0, output };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

/**
 * Mirrors the repository into a temp directory: everything the enforcer reads
 * except the evidence files is symlinked, so the evidence can be mutated for
 * negative cases without touching the working tree.
 */
function mirrorRepo(mutate: (a: typeof allowlist) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 'aura-perimeter-'));
  for (const entry of ['src', 'supabase', '.github']) {
    symlinkSync(join(REPO, entry), join(dir, entry));
  }
  mkdirSync(join(dir, EVIDENCE_DIR), { recursive: true });
  const mutated = JSON.parse(JSON.stringify(allowlist));
  mutate(mutated);
  writeFileSync(join(dir, EVIDENCE_DIR, 'route-allowlist.json'), JSON.stringify(mutated, null, 2));
  writeFileSync(join(dir, EVIDENCE_DIR, 'edge-function-inventory.json'), JSON.stringify(inventory, null, 2));
  return dir;
}

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe('production perimeter enforcer', () => {
  it('passes against the committed evidence', () => {
    const result = runEnforcer(REPO);
    expect(result.output).toContain('PASSED');
    expect(result.code).toBe(0);
  });

  it('fails closed when a function without an in-code guard is allowlisted', () => {
    // agent-plan-chat routes through _shared/handler.ts but declares
    // authLevel "public", which is not an authorization decision.
    const dir = mirrorRepo((a) => {
      a.production_functions = [...a.production_functions, 'agent-plan-chat'];
    });
    temps.push(dir);
    const result = runEnforcer(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('agent-plan-chat');
  });

  it('fails closed when an allowlisted function is not production-allowlisted in the inventory', () => {
    const dir = mirrorRepo((a) => {
      a.production_functions = [...a.production_functions, 'public-intake'];
    });
    temps.push(dir);
    const result = runEnforcer(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('public-intake');
  });

  it('fails closed when a disabled function is also allowlisted', () => {
    const dir = mirrorRepo((a) => {
      a.production_functions = [...a.production_functions, 'green-dc-recommend'];
    });
    temps.push(dir);
    const result = runEnforcer(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('green-dc-recommend');
  });

  it('fails closed when a route alias is promoted to a production route', () => {
    const dir = mirrorRepo((a) => {
      a.production_routes = [...a.production_routes, '/agent-chat'];
    });
    temps.push(dir);
    const result = runEnforcer(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('/agent-chat');
  });

  it('fails closed when a route alias loses its redirect-only classification', () => {
    const dir = mirrorRepo((a) => {
      a.redirect_only_routes = a.redirect_only_routes.filter((r: string) => r !== '/integrations');
    });
    temps.push(dir);
    const result = runEnforcer(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('/integrations');
  });

  it('fails closed when a shipped router route is unclassified', () => {
    const dir = mirrorRepo((a) => {
      a.production_routes = a.production_routes.filter((r: string) => r !== '/dashboard');
    });
    temps.push(dir);
    const result = runEnforcer(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('/dashboard');
  });
});

describe('production route classification', () => {
  const prod = new Set<string>(allowlist.production_routes);

  it('keeps dev/debug/demo surfaces out of production', () => {
    for (const route of [
      '/twin-debug',
      '/digital-twins-demo/funding-intake',
      '/dev-overlays',
      '/admin/asset-preview',
      '/admin/asset-pipeline',
      '/blueprint/preview',
      '/simulation/preview',
    ]) {
      expect(prod.has(route)).toBe(false);
    }
  });

  it('classifies each route exactly once', () => {
    const buckets = [
      allowlist.production_routes,
      allowlist.production_blocked_routes,
      allowlist.development_only_routes,
      allowlist.redirect_only_routes,
    ] as string[][];
    const seen = new Map<string, number>();
    for (const bucket of buckets) {
      for (const route of bucket) seen.set(route, (seen.get(route) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()]
      .filter(([route, count]) => count > 1 && !(allowlist.alias_production_exceptions ?? []).includes(route))
      .map(([route]) => route);
    expect(duplicates).toEqual([]);
  });
});


describe('allowlist / inventory synchronisation', () => {
  const allowlisted = new Set<string>(allowlist.production_functions);
  const inventoryAllowlisted = inventory
    .filter((entry: { production_disposition: string }) => entry.production_disposition === 'production-allowlisted')
    .map((entry: { function: string }) => entry.function);

  it('has exactly the same set on both sides', () => {
    expect(new Set(inventoryAllowlisted)).toEqual(allowlisted);
  });

  it('only allowlists functions that exist on disk', () => {
    for (const name of allowlisted) {
      expect(existsSync(join(REPO, 'supabase/functions', name, 'index.ts'))).toBe(true);
    }
  });

  it('never allowlists a disabled function', () => {
    for (const name of allowlist.disabled_functions as string[]) {
      expect(allowlisted.has(name)).toBe(false);
    }
  });
});
