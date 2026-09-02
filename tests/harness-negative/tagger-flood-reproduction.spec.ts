/**
 * Negative reproduction: the lovable-tagger ref-injection warning flood.
 *
 * Runs ONLY under playwright.tagger-repro.config.ts, whose web server starts
 * dev-mode Vite WITH the component tagger enabled (no
 * AURA_DISABLE_COMPONENT_TAGGER). The tagger attaches a callback `ref` to
 * every JSX element, so every function component receives a ref it cannot
 * hold and React 18 emits "Function components cannot be given refs" via
 * console.error once per unique JSX call site.
 *
 * Purpose: keep the mechanism observable. The truth suite's
 * console-cleanliness assertions (tests/truth-in-ui, `toEqual([])`) can only
 * be trusted while the console capture path demonstrably still sees this
 * warning when instrumentation is on. If this spec ever FAILS, either the
 * capture path was filtered/suppressed (forbidden) or the tagger no longer
 * injects refs (re-evaluate the environment policy in
 * scripts/componentTaggerPolicy.ts) - both need human review, not a skip.
 */

import { test, expect } from '@playwright/test';

const FORWARD_REF_WARNING = 'Function components cannot be given refs';

test.describe('negative reproduction: tagger ref-injection flood', () => {
  test('a dev server WITH the tagger observably emits the forwardRef warning through console.error', async ({ page }) => {
    const forwardRefWarnings: string[] = [];
    const otherConsoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (text.includes(FORWARD_REF_WARNING)) forwardRefWarnings.push(text);
      else otherConsoleErrors.push(text);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Let the provider tree mount and hydrate; the warning fires during
    // render, so the app shell being present is sufficient.
    await page.locator('#root > *').first().waitFor({ state: 'attached', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    // The flood mechanism must be OBSERVABLE under instrumentation. On head
    // 0371589a the public landing page alone produced thousands of entries;
    // requiring at least one keeps the assertion robust without depending on
    // exact page composition.
    expect(
      forwardRefWarnings.length,
      'expected the tagger-instrumented dev server to emit the React forwardRef warning; ' +
        'if it no longer does, verify no console filtering was introduced and review scripts/componentTaggerPolicy.ts',
    ).toBeGreaterThan(0);
  });
});
