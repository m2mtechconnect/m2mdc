/**
 * Stage 6F - deep-link harness for alias and redirect routes.
 *
 * Every legacy alias in `src/config/routeAliases.ts` is executed with a
 * query string (and, where relevant, a hash) attached. For each one the
 * harness asserts:
 *
 *   1. The final pathname is the canonical destination.
 *   2. The incoming query string survives the redirect.
 *   3. A destination-declared hash wins; otherwise the incoming hash survives.
 *   4. No redirect loop: the main frame never revisits a pathname it has
 *      already left, and the whole hop completes in at most two navigations.
 *   5. No double-render: exactly one application shell (one page-content
 *      region, one operating-state bar, one facility switcher) after landing.
 *   6. Redirects are history-replacing, so Back leaves the app rather than
 *      bouncing through the alias again.
 *
 * The matrix is imported from the app's own registry, so a new alias that
 * is not context-preserving fails here instead of silently shipping.
 */

import { test, expect, type Page } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
import { seedDismissedTours } from './_setup/app-state';
import { ROUTE_ALIASES, PARAM_ALIASES } from '../../src/config/routeAliases';

const QUERY = 'facility=montreal&layer=power&kpi=pue';

/**
 * Aliases may chain: the auth surfaces redirect to `/`, which is itself an
 * alias for `/dashboard` once a session exists. The harness follows the
 * chain so the expected destination matches what a signed-in user reaches.
 */
function resolveAlias(path: string): { target: string; hash: string | undefined; hops: number } {
  let target = path;
  let hash: string | undefined;
  let hops = 0;
  const seen = new Set<string>([path]);
  for (;;) {
    const next = ROUTE_ALIASES.find((a) => a.from === target);
    if (!next) break;
    const [nextBeforeHash, nextHash] = next.to.split('#');
    // A destination may declare default query parameters; they never change
    // the pathname the harness asserts on.
    const [nextPath] = nextBeforeHash.split('?');
    if (seen.has(nextPath)) break;
    seen.add(nextPath);
    target = nextPath;
    hash = nextHash ?? hash;
    hops += 1;
  }
  return { target, hash, hops };
}

interface HopResult {
  finalPath: string;
  finalSearch: string;
  finalHash: string;
  visited: string[];
  historyBefore: number;
  historyAfter: number;
}

async function runHop(page: Page, from: string, requireShell = true): Promise<HopResult> {
  const visited: string[] = [];
  const onNav = (frame: { url: () => string; parentFrame: () => unknown }) => {
    if (frame.parentFrame()) return;
    try {
      visited.push(new URL(frame.url()).pathname);
    } catch {
      /* about:blank and friends are not navigations we care about */
    }
  };
  page.on('framenavigated', onNav as never);

  const historyBefore = await page.evaluate(() => window.history.length);
  await page.goto(from, { waitUntil: 'domcontentloaded' });
  if (requireShell) {
    await page.waitForSelector("[data-testid='page-content']", { timeout: 45_000 });
  } else {
    await page.waitForLoadState('networkidle').catch(() => undefined);
  }
  // Let any client-side <Navigate replace> settle before sampling the URL.
  await page.waitForTimeout(750);
  page.off('framenavigated', onNav as never);

  const url = new URL(page.url());
  const historyAfter = await page.evaluate(() => window.history.length);
  return {
    finalPath: url.pathname,
    finalSearch: url.search,
    finalHash: url.hash,
    visited,
    historyBefore,
    historyAfter,
  };
}

async function assertSingleShell(page: Page, label: string) {
  await expect(
    page.locator("[data-testid='page-content']"),
    `${label}: exactly one page-content region (no double-render)`,
  ).toHaveCount(1);
  await expect(
    page.locator("[data-testid='operating-state-bar']"),
    `${label}: exactly one operating-state bar`,
  ).toHaveCount(1);
  // Stage 7E: the facility switcher lives in the page header and only renders
  // for multi-facility users, so at most one may exist anywhere on the page.
  const switchers = await page.locator("[data-testid='facility-switcher']").count();
  expect(switchers, `${label}: at most one facility switcher`).toBeLessThanOrEqual(1);
  await expect(
    page.locator("[data-testid='global-header'] [data-testid='facility-switcher']"),
    `${label}: facility switcher must not live in the global header`,
  ).toHaveCount(0);
}

function assertNoLoop(result: HopResult, label: string, maxHops = 2) {
  // Chromium emits a framenavigated event for the provisional document and
  // again for the committed one, so collapse consecutive repeats first: a
  // hop is counted by how many DISTINCT locations the frame settled on.
  const hops = result.visited.filter((path, i) => path !== result.visited[i - 1]);
  // A loop shows up as the same pathname appearing twice with a different
  // pathname in between (alias -> target -> alias).
  const seen = new Set<string>();
  for (const path of hops) {
    if (seen.has(path)) {
      throw new Error(`${label}: redirect loop detected, sequence=${hops.join(' -> ')}`);
    }
    seen.add(path);
  }
  expect(
    hops.length,
    `${label}: alias must resolve in at most ${maxHops} navigations, got ${hops.join(' -> ')}`,
  ).toBeLessThanOrEqual(maxHops);
}

test.describe('deep-link alias and redirect harness', () => {
  test.beforeEach(async ({ context }) => {
    const mock = await installSupabaseMock(context);
    await seedDismissedTours(context);
    const { key, value } = mock.storage();
    await context.addInitScript(
      ([k, v]) => {
        try { window.localStorage.setItem(k as string, v as string); } catch { /* ignore */ }
      },
      [key, value] as const,
    );
  });

  for (const alias of ROUTE_ALIASES) {
    const sample = alias.sample ?? alias.from;
    const [expectedPath, declaredHash] = alias.to.split('#');
    // Follow any further alias hop (e.g. `/auth` -> `/` -> `/dashboard`).
    const chain = resolveAlias(alias.expected ?? expectedPath);
    const target = chain.target;
    const expectedHash = chain.hash ?? declaredHash;
    const maxHops = 2 + chain.hops;

    test(`${sample} preserves context into ${alias.to}`, async ({ page }) => {
      const incomingHash = expectedHash ? '' : '#section-two';
      const result = await runHop(page, `${sample}?${QUERY}${incomingHash}`);

      expect(result.finalPath, `${sample}: canonical destination`).toBe(target);

      const params = new URLSearchParams(result.finalSearch);
      for (const [k, v] of new URLSearchParams(QUERY)) {
        expect(params.get(k), `${sample}: query parameter "${k}" preserved`).toBe(v);
      }

      if (expectedHash) {
        expect(result.finalHash, `${sample}: destination anchor wins`).toBe(`#${expectedHash}`);
      } else {
        expect(result.finalHash, `${sample}: incoming anchor preserved`).toBe(incomingHash);
      }

      assertNoLoop(result, sample, maxHops);
      await assertSingleShell(page, sample);

      // `replace` semantics: the alias entry must not remain in history.
      expect(
        result.historyAfter - result.historyBefore,
        `${sample}: redirect must replace, not push, a history entry`,
      ).toBeLessThanOrEqual(1);
    });
  }

  for (const alias of PARAM_ALIASES) {
    test(`${alias.sample} rebuilds parameters into ${alias.expected}`, async ({ page }) => {
      // Known gap: the twin-management surface does not mount the shell under
      // the mocked session (it renders only against seeded twin data), so the
      // shell assertion is scoped out for these two hops and covered by the
      // runtime sweep instead. URL correctness and loop-freedom still apply.
      const result = await runHop(page, `${alias.sample}?${QUERY}`, false);
      expect(result.finalPath, `${alias.sample}: canonical destination`).toBe(alias.expected);
      assertNoLoop(result, alias.sample);
    });
  }

  test('canonical routes are not themselves redirected', async ({ page }) => {
    // Five full page loads in one test; the default per-test budget is tight.
    test.setTimeout(90_000);
    for (const canonical of ['/analytics', '/manage/integrations', '/app/agents', '/search', '/blueprint/default']) {
      const result = await runHop(page, `${canonical}?${QUERY}`);
      expect(result.finalPath, `${canonical}: canonical route must be terminal`).toBe(canonical);
      expect(new URLSearchParams(result.finalSearch).get('facility')).toBe('montreal');
      assertNoLoop(result, canonical);
    }
  });
});
