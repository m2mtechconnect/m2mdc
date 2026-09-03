// @vitest-environment node

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
 *
 * The additive promotion ledger is copied verbatim. The historical inventory
 * is immutable, so teams-invite is still recorded there as "unknown-blocked";
 * its effective disposition comes from edge-function-promotions.json. Without
 * copying that ledger, every negative fixture reported a spurious
 * "allowlist/teams-invite: inventory disposition is unknown-blocked" failure
 * that had nothing to do with the case under test.
 */
function mirrorRepo(mutate: (a: typeof allowlist) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 'aura-perimeter-'));
  for (const entry of ['src', 'supabase', '.github']) {
    symlinkSync(
      join(REPO, entry),
      join(dir, entry),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
  mkdirSync(join(dir, EVIDENCE_DIR), { recursive: true });
  const mutated = JSON.parse(JSON.stringify(allowlist));
  mutate(mutated);
  writeFileSync(join(dir, EVIDENCE_DIR, 'route-allowlist.json'), JSON.stringify(mutated, null, 2));
  writeFileSync(join(dir, EVIDENCE_DIR, 'edge-function-inventory.json'), JSON.stringify(inventory, null, 2));
  const promotionSource = join(REPO, EVIDENCE_DIR, 'edge-function-promotions.json');
  if (existsSync(promotionSource)) {
    writeFileSync(
      join(dir, EVIDENCE_DIR, 'edge-function-promotions.json'),
      readFileSync(promotionSource, 'utf8'),
    );
  }
  return dir;
}

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe('production perimeter enforcer', () => {
  it('installs the verifier dependencies before enforcing the perimeter in CI', () => {
    const workflow = readFileSync(
      join(REPO, '.github/workflows/production-perimeter.yml'),
      'utf8',
    );
    const installAt = workflow.indexOf('bun install --frozen-lockfile');
    const enforceAt = workflow.indexOf('node scripts/verify-production-perimeter.mjs');

    expect(workflow).toContain('oven-sh/setup-bun@v2');
    expect(installAt).toBeGreaterThan(-1);
    expect(enforceAt).toBeGreaterThan(installAt);
  });

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

  it('fails closed when a production route is reclassified as blocked without a DEV gate', () => {
    const dir = mirrorRepo((a) => {
      a.production_routes = a.production_routes.filter((r: string) => r !== '/dashboard');
      a.production_blocked_routes = [...a.production_blocked_routes, '/dashboard'];
    });
    temps.push(dir);
    const result = runEnforcer(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('production-blocked route without DEV gate: /dashboard');
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
    ]) {
      expect(prod.has(route)).toBe(false);
    }
  });

  /**
   * The recommendation preview routes are excluded from the production
   * perimeter (2026-08-27). They remain available only in development behind
   * a permission guard and must stay classified as production_blocked.
   */
  it('excludes the recommendation preview routes from the production perimeter', () => {
    const blocked = new Set<string>(allowlist.production_blocked_routes);
    const shell = readFileSync(join(REPO, 'src/AuthenticatedShell.tsx'), 'utf8');
    for (const route of ['/blueprint/preview', '/simulation/preview']) {
      expect(prod.has(route)).toBe(false);
      expect(blocked.has(route)).toBe(true);
      const declaration = shell
        .split('\n')
        .find((line) => line.includes(`path="${route}"`));
      expect(declaration, `${route} must be declared in the authenticated router`).toBeDefined();
      expect(declaration).toContain('import.meta.env.DEV');
      expect(declaration).toContain('PermissionRouteGuard');
    }
  });

  it('keeps the production function allowlist free of preview-only promotions', () => {
    for (const fn of allowlist.production_functions as string[]) {
      expect(fn).not.toMatch(/preview/i);
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
  // Mirrors the enforcer: the historical inventory is immutable, so explicit
  // promotions from the additive ledger are overlaid before comparison.
  const promotionPath = join(REPO, EVIDENCE_DIR, 'edge-function-promotions.json');
  const promoted = new Set<string>(
    existsSync(promotionPath)
      ? (JSON.parse(readFileSync(promotionPath, 'utf8')).promotions ?? [])
          .filter((p: { production_disposition: string }) => p.production_disposition === 'production-allowlisted')
          .map((p: { function: string }) => p.function)
      : [],
  );
  const inventoryAllowlisted = inventory
    .filter(
      (entry: { function: string; production_disposition: string }) =>
        entry.production_disposition === 'production-allowlisted' || promoted.has(entry.function),
    )
    .map((entry: { function: string }) => entry.function);

  it('only promotes functions that exist in the inventory', () => {
    const known = new Set(inventory.map((entry: { function: string }) => entry.function));
    for (const name of promoted) expect(known.has(name)).toBe(true);
  });

  it('has exactly the same set on both sides', () => {
    expect(new Set(inventoryAllowlisted)).toEqual(allowlisted);
  });

  /**
   * teams-invite is allowlisted through the additive promotion ledger, not by
   * rewriting the historical inventory. Its effective disposition must resolve
   * to production-allowlisted, and no enforcer run may report it as
   * unknown-blocked.
   */
  it('resolves teams-invite to production-allowlisted through the promotion ledger', () => {
    expect(allowlisted.has('teams-invite')).toBe(true);
    expect(promoted.has('teams-invite')).toBe(true);
    const dir = mirrorRepo(() => {});
    temps.push(dir);
    const result = runEnforcer(dir);
    expect(result.output).not.toContain('teams-invite');
    expect(result.code).toBe(0);
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
