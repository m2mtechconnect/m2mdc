/**
 * Shared `test.extend` fixtures for the truth-in-UI suite.
 *
 *  • `guard`   — network guard, auto-asserted on teardown.
 *  • `page`    — augmented to install the deterministic clock and
 *                the network guard BEFORE the first navigation.
 *
 * Individual specs opt into Kit mocks by calling `mockKit()` inline
 * so different specs can express different runtime states without
 * fixture explosion.
 */

import { test as base, expect, type BrowserContext } from '@playwright/test';
import { installNetworkGuard, type NetworkGuardHandle } from './network-guard';
import { installDeterministicClock } from './clock';

type Fixtures = {
  guard: NetworkGuardHandle;
};

/**
 * Phase 1A.3.e.1 — install guard at browser-CONTEXT level, BEFORE
 * any page is created. The default `context` fixture is overridden
 * so `installNetworkGuard(context)` runs before Playwright ever
 * hands out a `page`.
 *
 * Registration order (LIFO):
 *   1. Guard is registered here (context-level, runs LAST).
 *   2. Per-test setup installs the deterministic clock on the page.
 *   3. Per-test `installSupabaseMock(context)` registers the mock
 *      LATER, so it runs FIRST and can `route.fallback()` down to
 *      the guard for non-supabase URLs.
 */
// Shared handle key so `guard` and `context` fixtures see the same
// install. We store it on the context object under a private symbol.
const GUARD_KEY = Symbol.for('truth-suite.network-guard');

export const test = base.extend<Fixtures>({
  context: async ({ context }, use) => {
    const handle = await installNetworkGuard(context as BrowserContext);
    (context as unknown as Record<symbol, NetworkGuardHandle>)[GUARD_KEY] = handle;
    await use(context);
  },
  page: async ({ page }, use) => {
    // Clock is per-page — install it before the first navigation.
    await installDeterministicClock(page);
    await use(page);
  },
  guard: async ({ context }, use, testInfo) => {
    const handle = (context as unknown as Record<symbol, NetworkGuardHandle>)[GUARD_KEY];
    if (!handle) throw new Error('network guard fixture not installed on context');
    await use(handle);
    const violations = handle.violations();
    if (violations.length > 0) {
      testInfo.annotations.push({
        type: 'network-egress',
        description: JSON.stringify(violations, null, 2),
      });
    }
    expect(violations, 'no unexpected external network requests').toEqual([]);
  },
});

export { expect };