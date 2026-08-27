/**
 * Governance allowlist drift contract.
 *
 * Two classifications regressed once already and are cheap to reintroduce by
 * accident:
 *
 *  1. /blueprint/preview and /simulation/preview were promoted into
 *     production_routes, then excluded again on 2026-08-27. They must stay
 *     production_blocked while remaining permission-guarded in the shipped
 *     router.
 *  2. teams-invite is recorded as unknown-blocked in the immutable
 *     edge-function-inventory.json and only reaches production-allowlisted
 *     through the additive edge-function-promotions.json overlay. Any consumer
 *     of the inventory that forgets the overlay reports it as blocked.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const EVIDENCE_DIR = 'docs/remediation/evidence/pr-0.1';

const allowlist = JSON.parse(read(`${EVIDENCE_DIR}/route-allowlist.json`)) as {
  production_routes: string[];
  production_blocked_routes: string[];
  development_only_routes: string[];
  redirect_only_routes: string[];
  forbidden_production_routes: string[];
  production_functions: string[];
  notes: string[];
};

const inventory = JSON.parse(read(`${EVIDENCE_DIR}/edge-function-inventory.json`)) as
  | { functions: Array<{ function: string; production_disposition: string }> }
  | Array<{ function: string; production_disposition: string }>;

const promotions = JSON.parse(read(`${EVIDENCE_DIR}/edge-function-promotions.json`)) as {
  policy: string;
  promotions: Array<{ function: string; production_disposition: string }>;
};

const inventoryEntries = Array.isArray(inventory) ? inventory : inventory.functions;

const PREVIEW_ROUTES = ['/blueprint/preview', '/simulation/preview'] as const;

describe('governance drift: preview surfaces', () => {
  const shell = read('src/AuthenticatedShell.tsx');

  for (const route of PREVIEW_ROUTES) {
    it(`keeps ${route} out of the production perimeter`, () => {
      expect(allowlist.production_routes).not.toContain(route);
      expect(allowlist.production_blocked_routes).toContain(route);
    });

    it(`classifies ${route} exactly once`, () => {
      const buckets = [
        allowlist.production_routes,
        allowlist.production_blocked_routes,
        allowlist.development_only_routes,
        allowlist.redirect_only_routes,
        allowlist.forbidden_production_routes,
      ].filter((bucket) => Array.isArray(bucket) && bucket.includes(route));
      expect(buckets).toHaveLength(1);
    });

    it(`keeps ${route} behind a permission guard in the shipped router`, () => {
      const declaration = shell
        .split('\n')
        .find((line) => line.includes(`path="${route}"`));
      expect(declaration, `expected ${route} to be declared in src/AuthenticatedShell.tsx`).toBeTruthy();
      expect(declaration).toContain('PermissionRouteGuard');
      expect(declaration).toContain('permission="twin.view"');
    });
  }

  it('records the exclusion rationale in the allowlist notes', () => {
    const note = allowlist.notes.find((entry) => entry.includes('perimeter exclusion'));
    expect(note, 'expected a perimeter exclusion note for the preview routes').toBeTruthy();
    for (const route of PREVIEW_ROUTES) {
      expect(note).toContain(route);
    }
  });

  it('does not promote preview-only Edge Functions alongside the preview routes', () => {
    for (const fn of allowlist.production_functions) {
      expect(fn).not.toMatch(/preview/i);
    }
    for (const promotion of promotions.promotions) {
      expect(promotion.function).not.toMatch(/preview/i);
    }
  });
});

describe('governance drift: teams-invite inventory disposition', () => {
  const resolveDisposition = (name: string) => {
    const promoted = promotions.promotions.find((entry) => entry.function === name);
    if (promoted) return promoted.production_disposition;
    return inventoryEntries.find((entry) => entry.function === name)?.production_disposition;
  };

  it('keeps the immutable inventory record untouched', () => {
    const records = inventoryEntries.filter((entry) => entry.function === 'teams-invite');
    expect(records).toHaveLength(1);
    expect(records[0].production_disposition).toBe('unknown-blocked');
  });

  it('resolves teams-invite to production-allowlisted only through the promotion overlay', () => {
    expect(promotions.policy).toBe('explicit-promotion-only');
    expect(resolveDisposition('teams-invite')).toBe('production-allowlisted');
    expect(allowlist.production_functions).toContain('teams-invite');
  });

  it('requires every promotion to have a matching inventory record and no duplicates', () => {
    const seen = new Set<string>();
    for (const promotion of promotions.promotions) {
      expect(seen.has(promotion.function), `duplicate promotion for ${promotion.function}`).toBe(false);
      seen.add(promotion.function);
      expect(promotion.production_disposition).toBe('production-allowlisted');
      expect(
        inventoryEntries.some((entry) => entry.function === promotion.function),
        `promotion ${promotion.function} has no inventory record`,
      ).toBe(true);
    }
  });

  it('keeps every allowlisted function resolvable as production-allowlisted', () => {
    for (const fn of allowlist.production_functions) {
      const disposition = resolveDisposition(fn);
      if (disposition === undefined) continue; // aliases/handled elsewhere
      expect(
        disposition,
        `${fn} is allowlisted but resolves to ${disposition}; add an explicit promotion entry`,
      ).toBe('production-allowlisted');
    }
  });

  it('keeps the perimeter harness mirroring the promotion ledger', () => {
    const harness = read('scripts/__tests__/productionPerimeter.test.ts');
    expect(harness).toContain('edge-function-promotions.json');
  });
});
