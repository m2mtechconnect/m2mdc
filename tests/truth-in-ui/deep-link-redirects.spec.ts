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

interface HopResult {
  finalPath: string;
  finalSearch: string;
  finalHash: string;
  visited: string[];
  historyBefore: number;
  historyAfter: number;
}

async function runHop(page: Page, from: string): Promise<HopResult> {
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
  await page.waitForSelector("[data-testid='page-content']", { timeout: 45_000 });
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
  const switchers =
    (await page.locator("[data-testid='facility-switcher']").count()) +
    (await page.locator("[data-testid='facility-switcher-mobile']").count());
  expect(switchers, `${label}: exactly one facility switcher`).toBe(1);
}

function assertNoLoop(result: HopResult, label: string) {
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
    `${label}: alias must resolve in at most two navigations, got ${hops.join(' -> ')}`,
  ).toBeLessThanOrEqual(2);
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
    const [expectedPath, expectedHash] = alias.to.split('#');
    const target = alias.expected ?? expectedPath;

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

      assertNoLoop(result, sample);
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
      const result = await runHop(page, `${alias.sample}?${QUERY}`);
      expect(result.finalPath, `${alias.sample}: canonical destination`).toBe(alias.expected);
      assertNoLoop(result, alias.sample);
      await assertSingleShell(page, alias.sample);
    });
  }

  test('canonical routes are not themselves redirected', async ({ page }) => {
    for (const canonical of ['/analytics', '/integrations', '/app/agents', '/search', '/blueprint/default']) {
      const result = await runHop(page, `${canonical}?${QUERY}`);
      expect(result.finalPath, `${canonical}: canonical route must be terminal`).toBe(canonical);
      expect(new URLSearchParams(result.finalSearch).get('facility')).toBe('montreal');
      assertNoLoop(result, canonical);
    }
  });
});
